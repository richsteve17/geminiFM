
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, ChairmanPersonality, Player, MatchEvent, TouchlineShout, PlayerEffect, Tournament, NationalTeam, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-3-flash-preview';

// --- HELPER: Format Team for Prompt ---
const formatTeamForPrompt = (team: Team, starters: Player[], subsUsed: number): string => {
    // Filter out SentOff players immediately
    const activePlayers = starters.filter(p => p.status.type !== 'SentOff');
    
    // Stats for active players only
    const avgRating = activePlayers.length > 0 ? activePlayers.reduce((sum, p) => sum + p.rating, 0) / activePlayers.length : 0;
    
    // Check for ACTIVE rifts within the Starting XI
    const chemistryRifts = activePlayers
        .flatMap(p => p.effects.filter(e => e.type === 'BadChemistry').map(e => ({ player: p.name, rift: e })))
        .map(item => {
            const rift = item.rift as { type: 'BadChemistry', with: string };
            const otherPlayerIsPlaying = activePlayers.some(p => p.name === rift.with);
            if (otherPlayerIsPlaying && item.player < rift.with) {
                return `${item.player} and ${rift.with}`;
            }
            return null;
        })
        .filter((value, index, self) => value && self.indexOf(value) === index);
    
    // Check for Injuries ON PITCH
    const injuredPlayers = activePlayers.filter(p => p.status.type === 'Injured').map(p => p.name);
    
    // Check for Yellow Cards
    const bookedPlayers = activePlayers.filter(p => p.matchCard === 'yellow').map(p => p.name);

    let prompt = `Stats: Avg Rating ${avgRating.toFixed(1)}, Men: ${activePlayers.length}. Tactic: ${team.tactic.formation} (${team.tactic.mentality}).`;
    
    if (activePlayers.length < 11) {
        prompt += `\nCRITICAL DISADVANTAGE: Playing with ${activePlayers.length} men (Red Card). Exhausted and outnumbered.`
    }

    if (chemistryRifts.length > 0) {
        prompt += `\nNEGATIVE FACTOR: Bad Chemistry active: ${chemistryRifts.join(', ')}. Disjointed play.`
    }

    if (injuredPlayers.length > 0) {
        if (subsUsed >= 5) {
             prompt += `\nEXTREME VULNERABILITY: ${injuredPlayers.join(', ')} is INJURED and team has NO SUBS. He is a passenger. Opponent should target him.`
        } else {
             prompt += `\nNEGATIVE FACTOR: ${injuredPlayers.join(', ')} is carrying an injury. Performance dropped.`
        }
    }
    
    if (bookedPlayers.length > 0) {
        prompt += `\nDISCIPLINE RISK: On Yellow: ${bookedPlayers.join(', ')}. Must tackle cautiously.`
    }

    return prompt;
};

// --- HAWK-EYE VALIDATOR ---
// This ensures the AI isn't hallucinating illegal states.
const validateSimulationResult = (result: any, homeTeam: Team, awayTeam: Team, currentMatchState: MatchState): boolean => {
    if (!result || typeof result !== 'object') return false;
    if (typeof result.homeScoreAdded !== 'number' || typeof result.awayScoreAdded !== 'number') return false;
    if (!Array.isArray(result.events)) return false;

    // 1. Validate Score Consistency
    const homeGoals = result.events.filter((e: any) => e.type === 'goal' && e.teamName === homeTeam.name).length;
    const awayGoals = result.events.filter((e: any) => e.type === 'goal' && e.teamName === awayTeam.name).length;

    if (homeGoals !== result.homeScoreAdded || awayGoals !== result.awayScoreAdded) {
        console.warn(`Hawk-Eye Fail: Score Mismatch. Events say ${homeGoals}-${awayGoals}, Result says ${result.homeScoreAdded}-${result.awayScoreAdded}`);
        return false;
    }

    // 2. Validate Roster Integrity (No Ghost Players)
    const validHomePlayers = new Set(homeTeam.players.map(p => p.name));
    const validAwayPlayers = new Set(awayTeam.players.map(p => p.name));

    // 3. Validate Eligibility (No interacting if already Sent Off)
    const sentOffHome = new Set(homeTeam.players.filter(p => p.status.type === 'SentOff').map(p => p.name));
    const sentOffAway = new Set(awayTeam.players.filter(p => p.status.type === 'SentOff').map(p => p.name));

    for (const event of result.events) {
        if (event.player) {
            // Check existence
            const isHome = validHomePlayers.has(event.player);
            const isAway = validAwayPlayers.has(event.player);
            
            if (!isHome && !isAway) {
                console.warn(`Hawk-Eye Fail: Hallucinated Player '${event.player}'`);
                return false;
            }

            // Check if already sent off (cannot perform actions)
            if (sentOffHome.has(event.player) || sentOffAway.has(event.player)) {
                console.warn(`Hawk-Eye Fail: Sent Off player '${event.player}' attempting action`);
                return false;
            }

            // Check Team Name correctness
            if (isHome && event.teamName !== homeTeam.name) return false;
            if (isAway && event.teamName !== awayTeam.name) return false;
        }
    }

    return true;
};

// --- FALLBACK ENGINE ---
// If AI fails validation, we use this deterministic engine to prevent crashes.
const generateFallbackSegment = (
    homeTeam: Team, 
    awayTeam: Team, 
    startMinute: number, 
    duration: number,
    currentScore: { home: number, away: number }
) => {
    // Simple rating based calculation
    const homeRating = homeTeam.players.reduce((sum, p) => sum + p.rating, 0) / 11; // Approx
    const awayRating = awayTeam.players.reduce((sum, p) => sum + p.rating, 0) / 11;
    const ratingDiff = homeRating - awayRating; // Positive = Home stronger

    const events: any[] = [];
    let homeScoreAdded = 0;
    let awayScoreAdded = 0;

    // Chance of goal per 15 min segment (approx 15-20%)
    const baseChance = 0.15;
    const homeChance = baseChance + (ratingDiff * 0.02);
    const awayChance = baseChance - (ratingDiff * 0.02);

    if (Math.random() < homeChance) {
        homeScoreAdded++;
        const scorer = homeTeam.players.filter(p => p.position === 'FWD' || p.position === 'MID')[0]?.name || homeTeam.players[0].name;
        events.push({
            minute: startMinute + Math.floor(Math.random() * duration),
            type: 'goal',
            teamName: homeTeam.name,
            player: scorer,
            description: `${scorer} finds the net with a tidy finish!`,
            scoreAfter: `${currentScore.home + homeScoreAdded}-${currentScore.away}`
        });
    }

    if (Math.random() < awayChance) {
        awayScoreAdded++;
        const scorer = awayTeam.players.filter(p => p.position === 'FWD' || p.position === 'MID')[0]?.name || awayTeam.players[0].name;
        events.push({
            minute: startMinute + Math.floor(Math.random() * duration),
            type: 'goal',
            teamName: awayTeam.name,
            player: scorer,
            description: `${scorer} silences the crowd with a goal!`,
            scoreAfter: `${currentScore.home + homeScoreAdded}-${currentScore.away + awayScoreAdded}`
        });
    }

    // Add some commentary filler
    if (events.length === 0) {
        events.push({
            minute: startMinute + 5,
            type: 'commentary',
            description: "A period of sustained pressure, but no clear cut chances.",
            teamName: ''
        });
    }

    return {
        homeScoreAdded,
        awayScoreAdded,
        momentum: ratingDiff > 5 ? 5 : ratingDiff < -5 ? -5 : 0,
        tacticalAnalysis: "The teams are evenly matched in this phase.",
        events: events.sort((a, b) => a.minute - b.minute)
    };
};


export const simulateMatchSegment = async (
    homeTeam: Team, 
    awayTeam: Team, 
    currentMatchState: MatchState,
    targetMinute: number,
    context: { 
        stage?: TournamentStage,
        isKnockout?: boolean,
        teamTalk?: { teamName: string, shout: TouchlineShout }
    }
): Promise<{ 
    events: Omit<MatchEvent, 'id'>[]; 
    homeScoreAdded: number; 
    awayScoreAdded: number; 
    momentum: number;
    tacticalAnalysis: string;
}> => {

    const startMinute = currentMatchState.currentMinute;
    const duration = targetMinute - startMinute;

    const homeStarters = homeTeam.players.filter(p => p.isStarter);
    const awayStarters = awayTeam.players.filter(p => p.isStarter); 
    
    // Pass subsUsed to format prompt correctly for injuries
    const homePrompt = formatTeamForPrompt(homeTeam, homeStarters, currentMatchState.subsUsed.home);
    const awayPrompt = formatTeamForPrompt(awayTeam, awayStarters, currentMatchState.subsUsed.away);

    // Explicitly list ONLY valid players for events
    const homePlayersList = homeStarters.filter(p => p.status.type !== 'SentOff').map(p => p.name).join(', ');
    const awayPlayersList = awayStarters.filter(p => p.status.type !== 'SentOff').map(p => p.name).join(', ');

    let prompt = `You are a rigorous football simulation engine.

*** CONTRACT & HARD RULES (DO NOT BREAK) ***
1. STATE CONSISTENCY: You MUST respect the "Current Score" and "PLAYERS ON PITCH".
2. ROSTER INTEGRITY: Only players listed in "PLAYERS ON PITCH" can be involved in events. Do NOT hallucinate player names.
3. LOGIC: 
   - A player with a Red Card (sent off) CANNOT appear in events.
   - If a team has 5 subs used and gets an injury, they play with 10 men.
4. OUTPUT: Return valid JSON. "homeScoreAdded" MUST equal the number of 'goal' events for home.

*** MATCH CONTEXT ***
Time: Minute ${startMinute} to ${targetMinute} (${duration} mins).
Score: ${homeTeam.name} ${currentMatchState.homeScore} - ${currentMatchState.awayScore} ${awayTeam.name}
Momentum: ${currentMatchState.momentum} (-10 Away, +10 Home)
Stage: ${context.stage || 'League Match'} ${context.isKnockout ? '(Knockout - Winner required)' : ''}

*** ${homeTeam.name} (HOME) ***
${homePrompt}
PLAYERS ON PITCH: ${homePlayersList}

*** ${awayTeam.name} (AWAY) ***
${awayPrompt}
PLAYERS ON PITCH: ${awayPlayersList}
`;

    if (context.teamTalk && startMinute === 45) {
        prompt += `\n*** TEAM TALK EFFECT ***\n${context.teamTalk.teamName} manager shouted: "${context.teamTalk.shout}". Influence momentum accordingly.`;
    }

    prompt += `
\n*** INSTRUCTIONS ***
1. Generate key events (Goals, Cards, Injuries) for this ${duration}-minute period.
2. **Cards:** Referees can be strict. Players on Yellow Cards might get a second yellow (Red).
3. **Red Cards:** If a player gets a Red (or 2nd Yellow), output type 'card' with cardType 'red'.
4. **Injuries:** Low chance (approx 5%).
5. **Tactical Analysis:** Provide a 1-sentence insight on the game flow.
6. **Momentum:** Update the momentum score (-10 to 10) based on events.

Respond ONLY with valid JSON matching this schema:
{
  "homeScoreAdded": number,
  "awayScoreAdded": number,
  "momentum": number,
  "tacticalAnalysis": "string",
  "events": [
    { "minute": number, "type": "goal" | "card" | "injury" | "commentary", "cardType": "yellow" | "red" (optional), "teamName": "string", "player": "string (must be from lists above)", "description": "Short description", "scoreAfter": "string (optional)" }
  ]
}
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        
        const result = JSON.parse(response.text);

        // --- HAWK-EYE VALIDATION STEP ---
        if (validateSimulationResult(result, homeTeam, awayTeam, currentMatchState)) {
            return result;
        } else {
            throw new Error("Gemini response violated state contract.");
        }

    } catch (error) {
        console.warn("Gemini Validation Failed or Error. Falling back to Quick Sim.", error);
        
        // --- FALLBACK: Deterministic Simulation ---
        return generateFallbackSegment(
            homeTeam, 
            awayTeam, 
            startMinute, 
            duration, 
            { home: currentMatchState.homeScore, away: currentMatchState.awayScore }
        );
    }
};

export const getAssistantAnalysis = async (homeTeam: Team, awayTeam: Team, matchState: MatchState, userTeamName: string): Promise<string> => {
    // A quick, cheap tactical check
    const isHome = userTeamName === homeTeam.name;
    const userTeam = isHome ? homeTeam : awayTeam;
    const oppTeam = isHome ? awayTeam : homeTeam;

    const recentEvents = matchState.events.slice(-5).map(e => `${e.minute}': ${e.description}`).join('\n');
    
    const prompt = `
    You are the Assistant Manager of ${userTeam.name}.
    We are playing ${oppTeam.name}.
    Score: ${matchState.homeScore}-${matchState.awayScore}.
    Minute: ${matchState.currentMinute}.
    My Tactic: ${userTeam.tactic.formation}, ${userTeam.tactic.mentality}.
    Momentum: ${matchState.momentum} (-10 Away, +10 Home).
    
    Recent Events:
    ${recentEvents}

    Give me 3 bullet points of quick tactical advice. Keep it punchy and urgent.
    Example:
    - Our midfield is getting overrun, switch to 5-3-2?
    - Their striker is tired, push our line up.
    - We are lucky to be drawing, demand more passion!
    
    Respond in plain text.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt
        });
        return response.text || "Boss, I have no idea what's happening out there.";
    } catch(e) {
        return "The noise in the stadium is too loud! I can't analyze properly!";
    }
}

// --- NEW FEATURE: AI SCOUT ---
export const scoutPlayers = async (request: string): Promise<Player[]> => {
    const prompt = `
    You are a world-class football scout.
    The manager has asked: "${request}"
    
    Generate 3 distinct, realistic football players that fit this request.
    They should NOT be real famous players, but believable "newgens" or hidden gems.
    
    Respond ONLY with a valid JSON object:
    {
      "players": [
        {
          "name": "Name",
          "nationality": "Emoji Flag",
          "position": "GK" | "DEF" | "MID" | "FWD",
          "age": number (16-35),
          "rating": number (65-95, be realistic based on description),
          "personality": "Ambitious" | "Loyal" | "Mercenary" | "Young Prospect" | "Leader" | "Professional" | "Volatile",
          "scoutingReport": "A 1-sentence analysis of their style.",
          "wage": number (weekly wage in £),
          "marketValue": number (in £)
        }
      ]
    }
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        
        // Map to Player type structure
        return result.players.map((p: any) => ({
            ...p,
            status: { type: 'Available' },
            effects: [],
            contractExpires: 3,
            isStarter: true
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

// --- NEW FEATURE: PRESS CONFERENCE ---
export const generatePressConference = async (context: string): Promise<string[]> => {
    const prompt = `
    You are a hostile sports journalist.
    Context of the match/situation: ${context}
    
    Ask 3 difficult, probing questions to the manager.
    If they lost, grill them on tactics. If they won, ask if they can keep it up.
    
    Respond ONLY with JSON: { "questions": ["Q1", "Q2", "Q3"] }
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return result.questions;
    } catch (e) {
        return ["Good game today?", "How is the squad morale?", "Any transfer plans?"];
    }
}

const getChairmanPersonalityPrompt = (personality: ChairmanPersonality): string => {
    switch (personality) {
        case 'Traditionalist': return "You are a 'Traditionalist' chairman. You value defensive football, fiscal responsibility, and managers who respect the club's history. You dislike flashy, risky tactics and extravagant spending.";
        case 'Ambitious Tycoon': return "You are an 'Ambitious Tycoon' chairman. You demand success NOW. You want attacking, exciting football, major signings, and trophies. You have little patience for long-term projects.";
        case 'Moneyball Advocate': return "You are a 'Moneyball Advocate' chairman. You believe in data, analytics, and finding undervalued players. You want a manager who is tactically astute, makes smart signings, and can develop young talent to increase their value.";
        case 'Fan-Focused Owner': return "You are a 'Fan-Focused Owner'. You want a manager who plays entertaining football, builds a strong connection with the supporters, and promotes players from the youth academy. You value club culture over immediate, ruthless success.";
    }
};

export const getInterviewQuestions = async (teamName: string, personality: ChairmanPersonality): Promise<string[]> => {
    const prompt = `You are a chairman of a football club, interviewing a new manager for the job at ${teamName}.
${getChairmanPersonalityPrompt(personality)}

Your task is to generate exactly THREE distinct and insightful interview questions for the managerial candidate. The questions should directly reflect your personality and concerns as chairman.

Respond ONLY with a valid JSON object containing a "questions" array of three strings.
Example: { "questions": ["Your first question?", "Your second question?", "Your third question?"] }`;

     try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return result.questions || ["What are your goals?", "Why this club?", "What is your philosophy?"];
    } catch (e) {
        console.error(e);
        return ["What is your philosophy?", "Why this club?", "What are your salary expectations?"];
    }
};

export const evaluateInterview = async (teamName: string, questions: string[], answers: string[], personality: ChairmanPersonality): Promise<{ offer: boolean; reasoning: string }> => {
    const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n');
    const prompt = `You are the chairman of ${teamName}.
${getChairmanPersonalityPrompt(personality)}

You have just interviewed a candidate. Here is the transcript:
${qaPairs}

Based on your personality and their answers, decide whether to hire them.
Respond ONLY with a valid JSON object: { "offer": boolean, "reasoning": "A short explanation (1 sentence) of why you made this decision." }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (e) {
        return { offer: false, reasoning: "I was not convinced by your answers." };
    }
};

export const getPlayerTalkQuestions = async (player: Player, team: Team, context: 'transfer' | 'renewal'): Promise<string[]> => {
    const contextPrompt = context === 'transfer' 
        ? `You are the agent of ${player.name} (Rating: ${player.rating}, Personality: ${player.personality}). ${team.name} wants to sign your client.` 
        : `You are the agent of ${player.name} (Rating: ${player.rating}, Personality: ${player.personality}). ${team.name} wants to renew your client's contract.`;

    const prompt = `${contextPrompt}
Generate exactly THREE tough questions for the club manager to see if this is the right move for your client. Focus on the player's personality traits (e.g., an Ambitious player wants to win, a Mercenary wants money).

Respond ONLY with a valid JSON object: { "questions": ["Question 1", "Question 2", "Question 3"] }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return result.questions || ["What is the project?", "Can you afford him?", "Will he play?"];
    } catch (e) {
        return ["What are your ambitions?", "What is the financial offer?", "How will he be used?"];
    }
};

export const evaluatePlayerTalk = async (player: Player, questions: string[], answers: string[], team: Team, context: 'transfer' | 'renewal'): Promise<{ convinced: boolean; reasoning: string }> => {
    const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n');
    const prompt = `You are the agent of ${player.name} (Personality: ${player.personality}).
Here is the discussion with the manager of ${team.name}:
${qaPairs}

Based on the player's personality and the manager's answers, are you convinced to proceed?
Respond ONLY with a valid JSON object: { "convinced": boolean, "reasoning": "A short explanation from the agent's perspective." }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (e) {
        return { convinced: false, reasoning: "The talks broke down due to a lack of clarity." };
    }
};

export const getTournamentResult = async (tournament: Tournament, nationalTeams: NationalTeam[]): Promise<{ winner: NationalTeam; summary: string }> => {
    const teamsList = nationalTeams.slice(0, 8).map(t => `${t.name} (Avg Rating: ${(t.players.reduce((a,b) => a + b.rating, 0) / t.players.length).toFixed(1)})`).join(', ');
    const prompt = `Simulate the ${tournament.name} ${tournament.year}.
Participating major teams: ${teamsList} and others.

Who wins? Write a brief summary (2 sentences) of the final.
Respond ONLY with a valid JSON object: { "winnerName": "Name of winning country", "summary": "Summary text" }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        const winner = nationalTeams.find(t => t.name === result.winnerName) || nationalTeams[0];
        return { winner, summary: result.summary };
    } catch (e) {
        return { winner: nationalTeams[0], summary: "The tournament concluded with a surprise victory." };
    }
};

export const getTeammateTournamentRivalry = async (tournament: Tournament, clubPlayers: Player[]): Promise<{ winner: Player; loser: Player; summary: string; duration: number } | null> => {
    if (clubPlayers.length < 2) return null;

    // Group by nationality
    const byNation: Record<string, Player[]> = {};
    clubPlayers.forEach(p => {
        if (!byNation[p.nationality]) byNation[p.nationality] = [];
        byNation[p.nationality].push(p);
    });

    const nations = Object.keys(byNation);
    if (nations.length < 2) return null;

    // Pick two players from different nations
    const nationA = nations[0];
    const nationB = nations[1];
    const playerA = byNation[nationA][0];
    const playerB = byNation[nationB][0];

    const prompt = `Simulate a specific match scenario between two club teammates playing for rival countries in the ${tournament.name}:
Player A: ${playerA.name} (${nationA}) - Position: ${playerA.position}
Player B: ${playerB.name} (${nationB}) - Position: ${playerB.position}

Did a "grudge" forming incident occur?
Consider their positions. E.g., A striker scoring past a goalkeeper, a defender tackling a winger, or a penalty shootout miss.
If the match was high stakes (e.g. Final, Semi-final) the grudge should last longer.
If it was a dull group stage draw, there might be no grudge.

Respond ONLY with a valid JSON object:
{
  "hasRivalry": boolean,
  "winnerName": "Name of the player who won the bragging rights",
  "loserName": "Name of the player who lost",
  "summary": "A 1 sentence description of the incident (e.g. 'Player A chipped Player B in the penalty shootout').",
  "duration": number // Duration in weeks (0 for no rivalry, 2-4 for minor group stage incident, 5-8 for knockout drama, 9-12 for World Cup Final drama)
}`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        
        if (result.hasRivalry && result.duration > 0) {
            // Map names back to player objects
            const winner = clubPlayers.find(p => p.name === result.winnerName) || playerA;
            const loser = clubPlayers.find(p => p.name === result.loserName) || playerB;
            return { winner, loser, summary: result.summary, duration: result.duration };
        }
        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getPlayerPostTournamentMorale = async (player: Player, countryName: string, wonTournament: boolean): Promise<PlayerEffect | null> => {
    if (wonTournament) {
        return { type: 'PostTournamentMorale', morale: 'Winner', message: "I'm a champion! I feel invincible!", until: 0 };
    }

    // Random chance for other effects if they didn't win
    const roll = Math.random();
    if (roll > 0.7) {
         return { type: 'PostTournamentMorale', morale: 'FiredUp', message: "I'm gutted, but I'll prove myself here.", until: 0 };
    } else if (roll < 0.2) {
         return { type: 'PostTournamentMorale', morale: 'Disappointed', message: "I just need some time to get over the loss.", until: 0 };
    }
    
    return null;
};
