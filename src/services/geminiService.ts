
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
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
        const isValid = validateSimulationResult(parsed, homeTeam.name, awayTeam.name, allowedPlayers, minuteStart, minuteEnd);
        if (!isValid) throw new Error("Simulation failed validation");
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

export const scoutPlayers = async (request: string): Promise<Player[]> => {
    // Enhanced prompt to include 'currentClub'
    const prompt = `Scout report for: "${request}". Generate 3 players who fit this description. 
    JSON format: { "players": [{ "name": "string", "position": "LB"|"CB"|"ST"|..., "rating": number, "age": number, "nationality": "Emoji", "scoutingReport": "string", "wage": number, "marketValue": number, "currentClub": "string" }] }
    Invent a realistic 'currentClub' for each player (e.g. 'Napoli', 'Boca Juniors', 'Ajax').`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(response.text);
        // Ensure valid defaults
        return res.players.map((p: any) => ({ 
            ...p, 
            status: { type: 'Available' }, 
            effects: [], 
            contractExpires: 3, 
            isStarter: false, 
            condition: 100,
            // Fallback if AI misses the field
            currentClub: p.currentClub || "Free Agent"
        }));
    } catch (e) { return []; }
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
    const prompt = `Tactical advice for ${u}. Score ${s.homeScore}-${s.awayScore}.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No advice.";
};

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
