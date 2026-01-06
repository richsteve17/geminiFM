
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-3-flash-preview';

const isPlayable = (status: Player["status"]) => {
    if (status.type === 'Available') return true;
    if (status.type === 'On International Duty') return false;
    if (status.type === 'Injured') return false;
    if (status.type === 'Suspended') return false;
    if (status.type === 'SentOff') return false;
    return false;
};

const cleanJson = (text?: string) => (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();

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
        if (ev.player && !allowedPlayers.includes(ev.player)) return false;
        if (ev.type === 'goal') {
            if (ev.teamName === homeName) homeGoals += 1;
            if (ev.teamName === awayName) awayGoals += 1;
        }
    }

    // Ensure score deltas align with goal events
    if (homeGoals !== simulation.homeScoreAdded || awayGoals !== simulation.awayScoreAdded) return false;
    return true;
};

export const simulateMatchSegment = async (homeTeam: Team, awayTeam: Team, currentMatchState: MatchState, targetMinute: number, context: any) => {
    const minuteStart = currentMatchState.currentMinute;
    const minuteEnd = targetMinute;

    const homeOnPitch = homeTeam.players.filter(p => p.isStarter && isPlayable(p.status));
    const awayOnPitch = awayTeam.players.filter(p => p.isStarter && isPlayable(p.status));
    const allowedPlayers = [...homeOnPitch, ...awayOnPitch].map(p => p.name);

    const prompt = `
*** FOOTBALL MATCH CONTRACT ***
You are simulating a football match segment. Return ONLY JSON.

*** STATE SNAPSHOT (AUTHORITATIVE) ***
Minute: ${minuteStart} -> ${minuteEnd}
Score: ${homeTeam.name} ${currentMatchState.homeScore} - ${currentMatchState.awayScore} ${awayTeam.name}
Players on Pitch (Home): ${homeOnPitch.map(p => `${p.name} (${p.position}, ${p.rating})`).join(', ')}
Players on Pitch (Away): ${awayOnPitch.map(p => `${p.name} (${p.position}, ${p.rating})`).join(', ')}
Subs Remaining (home/away): ${currentMatchState.subsUsed.home}/5 , ${currentMatchState.subsUsed.away}/5
Momentum (current): ${currentMatchState.momentum}

*** HARD RULES ***
1) Do NOT use players not listed above.
2) Red-carded/injured/absent players cannot appear.
3) Goals must appear as 'goal' events; score deltas must match goal events.
4) Minutes must be within ${minuteStart}-${minuteEnd}.

*** REQUIRED JSON FORMAT ***
{
  "homeScoreAdded": number,
  "awayScoreAdded": number,
  "momentum": number,
  "tacticalAnalysis": "short string",
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
    const prompt = `Scout report for: "${request}". Generate 3 players. JSON format: { "players": [{ "name": "string", "position": "LB"|"CB"|"ST"|..., "rating": number, "age": number, "nationality": "Emoji", "scoutingReport": "string", "wage": number, "marketValue": number }] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(response.text);
        return res.players.map((p: any) => ({ ...p, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 }));
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
    const prompt = `Board Interview for ${teamName} (Chairman: ${personality}).
Return JSON: { "questions": [string,string,string] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text)).questions;
};

export const evaluateInterview = async (teamName: string, qs: string[], ans: string[], personality: string) => {
    const prompt = `Evaluate answers for ${teamName}. Chairman personality: ${personality}.
Return JSON: { "offer": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, context: string) => {
    const prompt = `
You are ${p.name}'s agent. Personality: ${p.personality}. Context: ${context}. Team: ${t.name} (prestige ${t.prestige}).
Return JSON: { "questions": [string,string,string] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text)).questions;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, context: string) => {
    const prompt = `
You are ${p.name}'s agent (Personality: ${p.personality}). Evaluate the manager's answers.
Context: ${context}. Club prestige: ${t.prestige}. Return JSON: { "convinced": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const prompt = `Tactical advice for ${u}. Score ${s.homeScore}-${s.awayScore}.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No advice.";
};
