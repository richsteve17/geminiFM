
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, ChairmanPersonality, Player, MatchEvent, TouchlineShout, PlayerEffect, Tournament, NationalTeam, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-3-flash-preview';

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

    let prompt = `${team.name} (Avg Rating: ${avgRating.toFixed(1)}, Men: ${activePlayers.length}), Tactic: ${team.tactic.formation}, Mentality: ${team.tactic.mentality}.`;
    
    if (activePlayers.length < 11) {
        prompt += `\n**CRITICAL DISADVANTAGE:** ${team.name} is playing with ${activePlayers.length} men due to a Red Card. They will be exhausted and outnumbered on defense.`
    }

    if (chemistryRifts.length > 0) {
        prompt += `\n**NEGATIVE FACTOR:** Active bad chemistry on pitch: ${chemistryRifts.join(', ')}. Disjointed play expected.`
    }

    if (injuredPlayers.length > 0) {
        if (subsUsed >= 5) {
             prompt += `\n**EXTREME VULNERABILITY:** ${injuredPlayers.join(', ')} is INJURED. The team has NO SUBS left. He is forced to play but is a liability/passenger. Opponent should target him.`
        } else {
             prompt += `\n**NEGATIVE FACTOR:** ${injuredPlayers.join(', ')} is carrying an injury. Should probably be subbed.`
        }
    }
    
    if (bookedPlayers.length > 0) {
        prompt += `\n**DISCIPLINE RISK:** On Yellow Card: ${bookedPlayers.join(', ')}. They must tackle cautiously.`
    }

    return prompt;
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

    const homePlayersList = homeStarters.filter(p => p.status.type !== 'SentOff').map(p => p.name).join(', ');
    const awayPlayersList = awayStarters.filter(p => p.status.type !== 'SentOff').map(p => p.name).join(', ');

    let prompt = `You are a football match simulation engine.
Simulate the match from **minute ${startMinute} to minute ${targetMinute}** (${duration} minutes).

**Home Team:** ${homePrompt}
**Away Team:** ${awayPrompt}

**Current Score:** ${homeTeam.name} ${currentMatchState.homeScore} - ${currentMatchState.awayScore} ${awayTeam.name}
**Current Momentum:** ${currentMatchState.momentum} (-10 Away Domination, +10 Home Domination). Use this to influence who attacks.

**Players available on Pitch (excluding sent off):**
Home: ${homePlayersList}
Away: ${awayPlayersList}
`;
    
    if (context.stage) prompt += `\n**Context:** World Cup ${context.stage}. High stakes.`;
    if (context.teamTalk && startMinute === 45) {
        prompt += `\n**Half-Time Talk:** ${context.teamTalk.teamName} manager shouted: "${context.teamTalk.shout}".`;
    }

    prompt += `
**Instructions:**
1. Generate key events (Goals, Cards, Injuries) for this time period.
2. **Cards:** Referees can be strict. Players on Yellow Cards might get a second yellow (Red) if they foul.
3. **Red Cards:** If a player gets a Red (or 2nd Yellow), output type 'card' with cardType 'red'.
4. **Injuries:** 5% chance. Description: "Player X has pulled up..."
5. **Tactical Analysis:** Provide a 1-sentence insight on the game flow (e.g. "Home team capitalizing on the extra man advantage").
6. **Momentum:** Update the momentum score based on events.

**Output JSON Format:**
{
  "homeScoreAdded": number,
  "awayScoreAdded": number,
  "momentum": number,
  "tacticalAnalysis": "string",
  "events": [
    { "minute": number, "type": "goal" | "card" | "injury" | "commentary", "cardType": "yellow" | "red" (optional), "teamName": "string", "player": "string (must be from lists above)", "description": "Short description" }
  ]
}
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return result;
    } catch (error) {
        console.error("Error calling Gemini API for segment sim:", error);
        return { 
            homeScoreAdded: 0, 
            awayScoreAdded: 0, 
            momentum: currentMatchState.momentum,
            tacticalAnalysis: "The game is stuck in a midfield battle.",
            events: [{ minute: startMinute + 5, type: 'commentary', description: "The match continues...", teamName: '' }] 
        };
    }
};

// ... (Rest of the file remains unchanged: getInterviewQuestions, etc.)
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
