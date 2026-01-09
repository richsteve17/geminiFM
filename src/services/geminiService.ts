
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
// Switched to 2.0 Flash Exp for stability as requested
const model = 'gemini-2.0-flash-exp';

// Helper: check if player is physically on the pitch, even if injured
const isOnPitch = (status: Player["status"], matchCard?: Player["matchCard"]) => {
    if (matchCard === 'red') return false; // Sent off
    if (status.type === 'SentOff') return false; // Sent off
    if (status.type === 'On International Duty') return false;
    if (status.type === 'Suspended') return false;
    // Note: 'Injured' players might still be on pitch if 0 subs left. We handle this in the prompt builder.
    return true;
};

const cleanJson = (text?: string) => (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();

const parseJsonSafely = <T>(text?: string): T | null => {
    try {
        return JSON.parse(cleanJson(text));
    } catch {
        return null;
    }
};

// "Hawk-Eye" Validation Layer
const validateSimulationResult = (
    simulation: any,
    homeName: string,
    awayName: string,
    allowedPlayers: string[],
    minuteStart: number,
    minuteEnd: number
): boolean => {
    if (!simulation || typeof simulation !== 'object') return false;
    if (!Array.isArray(simulation.events)) return false;
    if (typeof simulation.homeScoreAdded !== 'number' || typeof simulation.awayScoreAdded !== 'number') return false;

    let homeGoals = 0;
    let awayGoals = 0;

    for (const ev of simulation.events) {
        if (typeof ev.minute !== 'number' || ev.minute < minuteStart || ev.minute > minuteEnd) return false;
        if (!['goal', 'card', 'injury', 'sub', 'commentary', 'whistle'].includes(ev.type)) return false;
        if (ev.teamName && ev.teamName !== homeName && ev.teamName !== awayName) return false;
        if (ev.player && !allowedPlayers.includes(ev.player)) return false; // Strict Hawk-Eye check
        if (ev.type === 'goal') {
            if (ev.teamName === homeName) homeGoals += 1;
            if (ev.teamName === awayName) awayGoals += 1;
        }
    }

    if (homeGoals !== simulation.homeScoreAdded || awayGoals !== simulation.awayScoreAdded) return false;
    return true;
};

export const simulateMatchSegment = async (homeTeam: Team, awayTeam: Team, currentMatchState: MatchState, targetMinute: number, context: { shout?: string, userTeamName?: string }) => {
    const minuteStart = currentMatchState.currentMinute;
    const minuteEnd = targetMinute;

    // Logic: Identify who is actually on the grass and their condition
    const getPromptList = (t: Team, subsUsed: number) => {
        return t.players
            .filter(p => p.isStarter && isOnPitch(p.status, p.matchCard))
            .map(p => {
                let flags = [];
                if (p.condition < 70) flags.push("TIRED (High Error Rate)");
                if (p.personality === 'Leader') flags.push("LEADER");
                if (p.personality === 'Volatile') flags.push("VOLATILE (Risk)");
                if (p.status.type === 'Injured') flags.push("INJURED");
                // Check if this player is impacted by a chemistry rift with someone ON THE PITCH
                const rift = p.effects.find(e => e.type === 'BadChemistry');
                if (rift && rift.type === 'BadChemistry') flags.push(`HATES ${rift.with} (Poor Communication)`);
                
                const flagStr = flags.length > 0 ? `[${flags.join(',')}]` : '';
                return `${p.name} (${p.position}, ${p.rating})${flagStr}`;
            });
    };

    const homePromptList = getPromptList(homeTeam, currentMatchState.subsUsed.home);
    const awayPromptList = getPromptList(awayTeam, currentMatchState.subsUsed.away);
    
    // For validation, we need raw names
    const allowedPlayers = [...homeTeam.players, ...awayTeam.players].map(p => p.name);

    // Inject Manager Shout
    let tacticalContext = "";
    if (context.shout && context.userTeamName) {
        const isHome = context.userTeamName === homeTeam.name;
        tacticalContext = `
        *** MANAGER INTERVENTION ***
        The ${context.userTeamName} manager has shouted: "${context.shout}".
        
        IMPACT RULES:
        - "Demand More": Increase event frequency. Slightly higher chance of goals for BOTH sides.
        - "Tighten Up": Decrease goal probability for ${context.userTeamName}. Lower entertainment value.
        - "Encourage": Boost morale of players with rating < 80.
        - "Push Forward": ${context.userTeamName} takes huge risks. High chance of scoring OR conceding on counter.
        `;
    }

    const prompt = `
*** FOOTBALL MATCH CONTRACT ***
You are simulating a football match segment. Return ONLY JSON.

*** STATE SNAPSHOT (AUTHORITATIVE) ***
Minute: ${minuteStart} -> ${minuteEnd}
Score: ${homeTeam.name} ${currentMatchState.homeScore} - ${currentMatchState.awayScore} ${awayTeam.name}
Players on Pitch (Home): ${homePromptList.join(', ')}
Players on Pitch (Away): ${awayPromptList.join(', ')}
Subs Remaining (home/away): ${5 - currentMatchState.subsUsed.home}/5 , ${5 - currentMatchState.subsUsed.away}/5
Momentum (current): ${currentMatchState.momentum}

${tacticalContext}

*** TRAIT LOGIC RULES (MUST FOLLOW) ***
1) **TIRED players**: If involved in an event, they MUST make a mistake, lose a race, or get injured. Mention fatigue in commentary.
2) **LEADER players**: If team is losing after 75', increase chance of them assisting or scoring. Mention them "driving the team on".
3) **VOLATILE players**: If team is losing, high chance of Yellow/Red card for arguing or rash tackle.
4) **INJURED players**: If still on pitch, opponent MUST target them for an easy goal.
5) **CHEMISTRY RIFTS**: If two players hate each other, they should fail to pass to each other or collide.

*** REQUIRED JSON FORMAT ***
{
  "homeScoreAdded": number,
  "awayScoreAdded": number,
  "momentum": number,
  "tacticalAnalysis": "short string, mention specific player traits influencing game",
  "events": [
     { "minute": number, "type": "goal"|"card"|"injury"|"sub"|"commentary"|"whistle", "teamName": "${homeTeam.name}"|"${awayTeam.name}", "player": "string optional", "description": "string" }
  ]
}
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(cleanJson(response.text));
        // Validate against the "Hawk-Eye" rules
        const isValid = validateSimulationResult(parsed, homeTeam.name, awayTeam.name, allowedPlayers, minuteStart, minuteEnd);
        if (!isValid) {
            console.warn("Simulation failed validation, falling back to safe state.");
            throw new Error("Simulation failed validation");
        }
        return parsed;
    } catch (error) {
        console.error("Match Sim Error", error);
        return {
            homeScoreAdded: 0,
            awayScoreAdded: 0,
            momentum: currentMatchState.momentum,
            tacticalAnalysis: "The game steadies as both sides probe without breakthrough.",
            events: []
        };
    }
};

// *** GEMINI SCOUT - Natural Language Semantic Scouting ***
export const scoutPlayers = async (request: string): Promise<Player[]> => {
    const prompt = `
*** GEMINI SCOUT - SEMANTIC PLAYER SEARCH ***
You are an elite football scout with encyclopedic knowledge of world football.
The manager has made this scouting request: "${request}"

Your job is to INTERPRET the request semantically and find players who match the INTENT, not just keywords.

*** INTERPRETATION RULES ***
1. If they mention a player name (e.g., "a young Neymar"), identify KEY TRAITS of that player:
   - Neymar: High Dribbling, High Flair, Volatile Personality, Cuts Inside from Left
   - Messi: Elite Vision, Low Center of Gravity, Playmaker, Consistent
   - Haaland: Physical Power, Clinical Finishing, Fast, Target Man
   - Kante: High Work Rate, Ball Winner, Humble Personality, Box-to-Box

2. If they mention style (e.g., "break legs but won't get sent off"):
   - Interpret: High Aggression + High Composure + Professional personality
   - NOT: Low Discipline or Volatile

3. If they mention value (e.g., "bargain", "cheap", "undervalued"):
   - Generate players with rating higher than their wage/market value would suggest
   - Include the VALUE SCORE in the scouting report

4. If they mention a league (e.g., "best in Eredivisie"):
   - Generate players from clubs in that specific league

5. If they mention personality traits (e.g., "leader", "dressing room joker", "mentor"):
   - Map to personality: Leader, Professional, Loyal, Volatile, Ambitious, Mercenary

*** RESPONSE FORMAT ***
Generate 3-5 players matching the semantic interpretation.
Return ONLY valid JSON:
{
    "interpretation": "How you understood the request (1 sentence)",
    "players": [
        {
            "name": "Realistic generated name",
            "position": "GK|LB|CB|RB|LWB|RWB|DM|CM|AM|LM|RM|LW|RW|ST|CF",
            "rating": number (50-95),
            "age": number (16-38),
            "nationality": "Flag emoji",
            "personality": "Professional|Leader|Volatile|Ambitious|Loyal|Mercenary",
            "scoutingReport": "2-3 sentence report mentioning specific traits and potential",
            "wage": number (weekly wage in £),
            "marketValue": number (transfer value in £),
            "currentClub": "Real club name",
            "valueScore": number (1-10, how good the value is),
            "keyTraits": ["trait1", "trait2", "trait3"]
        }
    ]
}
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const res = parseJsonSafely<{ interpretation: string; players: any[] }>(response.text);

        if (!res?.players) return [];

        return res.players.map((p: any) => ({
            name: p.name || "Unknown Player",
            position: p.position || "CM",
            rating: Math.min(95, Math.max(50, p.rating || 70)),
            age: Math.min(40, Math.max(16, p.age || 22)),
            nationality: p.nationality || "🌍",
            personality: p.personality || "Professional",
            scoutingReport: p.scoutingReport || "A solid professional.",
            wage: p.wage || 50000,
            marketValue: p.marketValue || 5000000,
            currentClub: p.currentClub || "Free Agent",
            status: { type: 'Available' as const },
            effects: [],
            contractExpires: 3,
            isStarter: false,
            condition: 100
        }));
    } catch (e) {
        console.error("Scout error:", e);
        return [];
    }
};

export const generatePressConference = async (context: string): Promise<string[]> => {
    const prompt = `Press conference. Context: ${context}. Ask 3 questions. JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).questions;
    } catch (e) { return ["How do you feel?", "What's next?"]; }
};

export const getInterviewQuestions = async (teamName: string, personality: string) => {
    const prompt = `Board Interview for ${teamName} (Chairman: ${personality}). Return JSON: { "questions": [string,string,string] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseJsonSafely<{ questions: string[] }>(response.text);
    return parsed?.questions ?? ["What is your tactical vision?", "How will you handle the budget?", "What are your expectations this season?"];
};

export const evaluateInterview = async (teamName: string, qs: string[], ans: string[], personality: string) => {
    const prompt = `Evaluate answers for ${teamName}. Chairman personality: ${personality}. Return JSON: { "offer": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseJsonSafely<{ offer: boolean; reasoning: string }>(response.text);
    return parsed ?? { offer: false, reasoning: "Unable to evaluate answers." };
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, context: string) => {
    const prompt = `You are ${p.name}'s agent. Personality: ${p.personality}. Context: ${context}. Team: ${t.name} (prestige ${t.prestige}). Return JSON: { "questions": [string,string,string] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseJsonSafely<{ questions: string[] }>(response.text);
    return parsed?.questions ?? ["What role will I have?", "How competitive is the squad?", "What salary are you offering?"];
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, context: string, offer?: { wage: number, length: number }) => {
    
    // Financial logic prompt
    let offerPrompt = "";
    if (offer) {
        offerPrompt = `
        **CONTRACT OFFER DETAILS**
        Offered Wage: £${offer.wage.toLocaleString()}/week
        Offered Length: ${offer.length} years
        
        **PLAYER VALUATION**
        Current/Expected Wage: £${p.wage.toLocaleString()}/week
        Player Age: ${p.age}
        Player Rating: ${p.rating}
        Personality: ${p.personality}
        
        **RULES**
        1. "Mercenary" players demand 20%+ wage increase.
        2. "Loyal" players accept matching wages or slight cuts if term is long (4+ yrs).
        3. If Offered Wage is < 80% of Current Wage, reject immediately unless "Loyal".
        4. If Player is old (>32), they prioritize length (2+ years) over high wage.
        `;
    }

    const prompt = `
    You are ${p.name}'s agent.
    Context: ${context}. Club: ${t.name}.
    Previous Negotiation Chat Answers: ${ans.join(" | ")}
    
    ${offerPrompt}

    Evaluate the deal based on the RULES above.
    Return JSON: { "convinced": boolean, "reasoning": "string (speak as the agent)" }
    `;
    
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseJsonSafely<{ convinced: boolean; reasoning: string }>(response.text);
    return parsed ?? { convinced: false, reasoning: "We are too far apart on the numbers." };
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const isHome = u === h.name;
    const userTeam = isHome ? h : a;
    const oppTeam = isHome ? a : h;
    const userScore = isHome ? s.homeScore : s.awayScore;
    const oppScore = isHome ? s.awayScore : s.homeScore;

    // Build rich context about players on pitch
    const getPlayerContext = (team: Team) => {
        return team.players
            .filter(p => p.isStarter && isOnPitch(p.status, p.matchCard))
            .map(p => {
                const flags: string[] = [];
                if (p.condition < 70) flags.push("FATIGUED");
                if (p.condition < 50) flags.push("EXHAUSTED");
                if (p.personality === 'Leader') flags.push("CAPTAIN MATERIAL");
                if (p.personality === 'Volatile') flags.push("POWDER KEG");
                if (p.rating >= 85) flags.push("STAR QUALITY");
                const rift = p.effects.find(e => e.type === 'BadChemistry');
                if (rift) flags.push(`TENSION WITH ${rift.with}`);
                return `${p.name} (${p.position}, OVR ${p.rating}, Condition ${p.condition}%)${flags.length ? ' [' + flags.join(', ') + ']' : ''}`;
            }).join('\n');
    };

    const prompt = `
*** ASSISTANT MANAGER TACTICAL BRIEFING ***
You are the Assistant Manager for ${u}. Provide tactical advice in the style of a passionate, experienced coach. Be specific. Reference actual player names. Be direct and actionable.

*** MATCH STATE ***
Score: ${u} ${userScore} - ${oppScore} ${oppTeam.name}
Minute: ${s.currentMinute}'
Momentum: ${s.momentum > 0 ? 'We have the momentum' : s.momentum < 0 ? 'They have the momentum' : 'Evenly balanced'}
Match Status: ${userScore > oppScore ? 'WINNING' : userScore < oppScore ? 'LOSING' : 'LEVEL'}

*** YOUR SQUAD ON PITCH ***
Formation: ${userTeam.tactic.formation} | Mentality: ${userTeam.tactic.mentality}
${getPlayerContext(userTeam)}

*** OPPONENT ON PITCH ***
Formation: ${oppTeam.tactic.formation} | Mentality: ${oppTeam.tactic.mentality}
${getPlayerContext(oppTeam)}

*** TACTICAL ANALYSIS REQUIRED ***
1. Identify the key tactical battle (where are we winning/losing the midfield, flanks, etc.)
2. Name specific players who should be targeted or protected
3. Suggest ONE concrete tactical change (formation tweak, personnel change, or mentality shift)
4. If any player is FATIGUED or EXHAUSTED, recommend substitution
5. If we're losing late, suggest who should "drive the team forward"

Speak like a real coach in the dugout. Be urgent. Be specific. Use player names.
`;

    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text || "Keep doing what you're doing, Boss.";
    } catch (e) {
        return "Focus on the next phase. Stay compact. Trust the process.";
    }
};

// *** CRITICAL ERROR DETECTION - "Salah at GK" Protocol ***
export interface CriticalError {
    type: 'position_mismatch' | 'injured_starter' | 'fatigued_player' | 'chemistry_clash';
    severity: 'warning' | 'critical';
    player: string;
    message: string;
}

export const detectCriticalErrors = (team: Team, formation: string): CriticalError[] => {
    const errors: CriticalError[] = [];
    const formationSlots: Record<string, string[]> = {
        '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
        '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
        '5-3-2': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
        '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'],
        '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'LW', 'AM', 'RW', 'ST'],
        '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST'],
    };

    const positionCompatibility: Record<string, string[]> = {
        'GK': ['GK'],
        'CB': ['CB', 'DM'],
        'LB': ['LB', 'LWB', 'LM'],
        'RB': ['RB', 'RWB', 'RM'],
        'LWB': ['LWB', 'LB', 'LM'],
        'RWB': ['RWB', 'RB', 'RM'],
        'DM': ['DM', 'CM', 'CB'],
        'CM': ['CM', 'DM', 'AM'],
        'AM': ['AM', 'CM', 'LW', 'RW', 'ST'],
        'LM': ['LM', 'LW', 'LB'],
        'RM': ['RM', 'RW', 'RB'],
        'LW': ['LW', 'LM', 'ST', 'AM'],
        'RW': ['RW', 'RM', 'ST', 'AM'],
        'ST': ['ST', 'CF', 'AM', 'LW', 'RW'],
        'CF': ['CF', 'ST', 'AM'],
    };

    const starters = team.players.filter(p => p.isStarter);
    const slots = formationSlots[formation] || formationSlots['4-4-2'];

    starters.forEach((player, index) => {
        const requiredRole = slots[index] || 'CM';
        const compatible = positionCompatibility[requiredRole] || [requiredRole];

        // CRITICAL: Outfield player in GK position
        if (requiredRole === 'GK' && player.position !== 'GK') {
            errors.push({
                type: 'position_mismatch',
                severity: 'critical',
                player: player.name,
                message: `🚨 BOSS! ${player.name} is in GOAL! Are you mad?! He couldn't catch a cold! Get a proper keeper in there before we're humiliated!`
            });
        }
        // WARNING: Player significantly out of position
        else if (!compatible.includes(player.position) && requiredRole !== 'GK') {
            errors.push({
                type: 'position_mismatch',
                severity: 'warning',
                player: player.name,
                message: `⚠️ ${player.name} is playing ${requiredRole} but he's a ${player.position}! He's gonna be lost out there!`
            });
        }

        // CRITICAL: Injured player starting
        if (player.status.type === 'Injured') {
            errors.push({
                type: 'injured_starter',
                severity: 'critical',
                player: player.name,
                message: `🏥 ${player.name} is INJURED and you're starting him?! One sprint and his hamstring snaps! Bench him or lose him for months!`
            });
        }

        // WARNING: Heavily fatigued player
        if (player.condition < 50) {
            errors.push({
                type: 'fatigued_player',
                severity: 'critical',
                player: player.name,
                message: `😫 ${player.name} is running on FUMES (${player.condition}% condition)! He's a liability out there! Rest him!`
            });
        } else if (player.condition < 70) {
            errors.push({
                type: 'fatigued_player',
                severity: 'warning',
                player: player.name,
                message: `😓 ${player.name} looks tired (${player.condition}% condition). Consider a sub before he costs us.`
            });
        }

        // WARNING: Chemistry clash on pitch
        const rift = player.effects.find(e => e.type === 'BadChemistry');
        if (rift) {
            const clashingPlayer = starters.find(p => p.name === rift.with);
            if (clashingPlayer) {
                errors.push({
                    type: 'chemistry_clash',
                    severity: 'warning',
                    player: player.name,
                    message: `🔥 ${player.name} and ${rift.with} can't stand each other! They won't pass, won't communicate. It's a ticking time bomb!`
                });
            }
        }
    });

    return errors;
};

// *** CONTEXT-AWARE SHOUTS SYSTEM ***
export interface TacticalShout {
    id: string;
    label: string;
    description: string;
    effect: string;
    risk?: string;
}

export const getContextAwareShouts = async (
    userTeam: Team,
    oppTeam: Team,
    matchState: MatchState,
    isHome: boolean
): Promise<TacticalShout[]> => {
    const userScore = isHome ? matchState.homeScore : matchState.awayScore;
    const oppScore = isHome ? matchState.awayScore : matchState.homeScore;
    const minute = matchState.currentMinute;
    const momentum = matchState.momentum;

    const prompt = `
*** TACTICAL SHOUT GENERATOR ***
Based on the match state, suggest 4 context-appropriate tactical shouts.

MATCH STATE:
- Score: ${userTeam.name} ${userScore} - ${oppScore} ${oppTeam.name}
- Minute: ${minute}'
- Momentum: ${momentum > 0 ? 'Favorable' : momentum < 0 ? 'Against us' : 'Neutral'}
- Our Mentality: ${userTeam.tactic.mentality}

SITUATION ANALYSIS:
${userScore > oppScore && minute > 75 ? '- We are PROTECTING A LEAD late in the game' : ''}
${userScore < oppScore && minute > 75 ? '- We are CHASING THE GAME desperately' : ''}
${userScore === oppScore ? '- The game is LEVEL - need to break the deadlock' : ''}
${momentum < -2 ? '- We are under HEAVY PRESSURE - need to steady the ship' : ''}
${momentum > 2 ? '- We have TOTAL CONTROL - push for more?' : ''}

Return EXACTLY 4 shouts in JSON format:
{
    "shouts": [
        {
            "id": "unique_id",
            "label": "Short Label (2-3 words)",
            "description": "What you shout to the players (1 sentence, passionate)",
            "effect": "Mechanical effect description",
            "risk": "Optional: potential downside"
        }
    ]
}

Make the shouts CONTEXT-SPECIFIC. Don't just give generic options.
If protecting a lead: defensive options. If chasing: attacking options.
If under pressure: calming or rallying options.
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsed = parseJsonSafely<{ shouts: TacticalShout[] }>(response.text);
        return parsed?.shouts || getDefaultShouts();
    } catch (e) {
        return getDefaultShouts();
    }
};

const getDefaultShouts = (): TacticalShout[] => [
    { id: 'encourage', label: 'Encourage', description: "Come on lads! We've got this!", effect: 'Boost morale for players under 80 rating' },
    { id: 'demand_more', label: 'Demand More', description: "That's not good enough! Show me more!", effect: 'Increase intensity, higher event frequency' },
    { id: 'tighten_up', label: 'Tighten Up', description: "Lock it down! Nobody gets through!", effect: 'Boost concentration, reduce creative freedom' },
    { id: 'push_forward', label: 'Push Forward', description: "Get up there! Everything forward!", effect: 'High risk attacking, vulnerable to counter' },
];

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `
    Simulate an international break for Week ${week} of the 2026/27 season.
    1. Invent a major upset in the Qualifiers/Nations League.
    2. Identify a "Player of the Week".
    3. Create a short news headline about a player returning with high morale.
    
    Return JSON: { "newsTitle": "string", "newsBody": "string", "riftPlayer1": "string (Generic Name)", "riftPlayer2": "string (Generic Name)" }
    `;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseJsonSafely<{ newsTitle: string; newsBody: string; riftPlayer1: string; riftPlayer2: string }>(response.text);
    return parsed ?? { newsTitle: "International Break Concludes", newsBody: "Players return to their clubs.", riftPlayer1: "", riftPlayer2: "" };
};
