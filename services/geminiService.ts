
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
    const activePlayers = starters.filter(p => p.status.type !== 'SentOff');
    const avgRating = activePlayers.length > 0 ? activePlayers.reduce((sum, p) => sum + p.rating, 0) / activePlayers.length : 0;
    
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
    
    const injuredPlayers = activePlayers.filter(p => p.status.type === 'Injured').map(p => p.name);
    const bookedPlayers = activePlayers.filter(p => p.matchCard === 'yellow').map(p => p.name);

    let prompt = `Stats: Avg Rating ${avgRating.toFixed(1)}, Men: ${activePlayers.length}. Tactic: ${team.tactic.formation} (${team.tactic.mentality}).`;
    if (activePlayers.length < 11) prompt += `\nCRITICAL DISADVANTAGE: Playing with ${activePlayers.length} men.`;
    if (chemistryRifts.length > 0) prompt += `\nNEGATIVE FACTOR: Bad Chemistry active: ${chemistryRifts.join(', ')}.`;
    if (injuredPlayers.length > 0) prompt += `\nNEGATIVE FACTOR: ${injuredPlayers.join(', ')} is injured on pitch.`;
    if (bookedPlayers.length > 0) prompt += `\nDISCIPLINE RISK: On Yellow: ${bookedPlayers.join(', ')}.`;

    return prompt;
};

const validateSimulationResult = (result: any, homeTeam: Team, awayTeam: Team, currentMatchState: MatchState): boolean => {
    if (!result || typeof result !== 'object') return false;
    if (typeof result.homeScoreAdded !== 'number' || typeof result.awayScoreAdded !== 'number') return false;
    if (!Array.isArray(result.events)) return false;
    const homeGoals = result.events.filter((e: any) => e.type === 'goal' && e.teamName === homeTeam.name).length;
    const awayGoals = result.events.filter((e: any) => e.type === 'goal' && e.teamName === awayTeam.name).length;
    if (homeGoals !== result.homeScoreAdded || awayGoals !== result.awayScoreAdded) return false;
    return true;
};

const generateFallbackSegment = (homeTeam: Team, awayTeam: Team, startMinute: number, duration: number, currentScore: { home: number, away: number }) => {
    const homeRating = homeTeam.players.reduce((sum, p) => sum + p.rating, 0) / 11;
    const awayRating = awayTeam.players.reduce((sum, p) => sum + p.rating, 0) / 11;
    const ratingDiff = homeRating - awayRating;
    const events: any[] = [];
    let hAdded = 0, aAdded = 0;
    if (Math.random() < 0.15 + (ratingDiff * 0.02)) {
        hAdded++;
        events.push({ minute: startMinute + 5, type: 'goal', teamName: homeTeam.name, description: "Fallback goal scored!", scoreAfter: `${currentScore.home + hAdded}-${currentScore.away}` });
    }
    return { homeScoreAdded: hAdded, awayScoreAdded: aAdded, momentum: 0, tacticalAnalysis: "Standard play.", events };
};

export const simulateMatchSegment = async (homeTeam: Team, awayTeam: Team, currentMatchState: MatchState, targetMinute: number, context: { stage?: TournamentStage, isKnockout?: boolean, teamTalk?: { teamName: string, shout: TouchlineShout } }) => {
    const startMinute = currentMatchState.currentMinute;
    const duration = targetMinute - startMinute;
    const homePrompt = formatTeamForPrompt(homeTeam, homeTeam.players.filter(p => p.isStarter), currentMatchState.subsUsed.home);
    const awayPrompt = formatTeamForPrompt(awayTeam, awayTeam.players.filter(p => p.isStarter), currentMatchState.subsUsed.away);

    let prompt = `Strict Football Sim. Minute ${startMinute}-${targetMinute}. Score ${currentMatchState.homeScore}-${currentMatchState.awayScore}.
Home (${homeTeam.name}): ${homePrompt}
Away (${awayTeam.name}): ${awayPrompt}
Generate JSON: {homeScoreAdded, awayScoreAdded, momentum, tacticalAnalysis, events:[{minute, type, teamName, player, description}]}`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        if (validateSimulationResult(result, homeTeam, awayTeam, currentMatchState)) return result;
        throw new Error("Invalid State");
    } catch (error) {
        return generateFallbackSegment(homeTeam, awayTeam, startMinute, duration, { home: currentMatchState.homeScore, away: currentMatchState.awayScore });
    }
};

export const scoutPlayers = async (request: string): Promise<Player[]> => {
    const prompt = `You are a world-class football scout. The manager has requested: "${request}"

Generate 3 realistic "Newgen" players. 
IMPORTANT: 
- If the manager mentions a specific foot (e.g. "Left footed"), incorporate that into the scouting report.
- If they mention a specific "vibe" (e.g. "No-nonsense", "Ball-playing", "Chaos"), ensure the personality and report match.
- If a wage or budget is mentioned, the 'wage' property MUST respect it.
- Ensure 'marketValue' is logical for their rating (e.g. 80+ rating = £30m+, 90+ = £100m+).

Respond ONLY with JSON:
{
  "players": [
    {
      "name": "string",
      "nationality": "Emoji Flag",
      "position": "GK" | "DEF" | "MID" | "FWD",
      "age": number,
      "rating": number,
      "personality": "Ambitious" | "Loyal" | "Mercenary" | "Young Prospect" | "Leader" | "Professional" | "Volatile",
      "scoutingReport": "Style analysis including footedness and tactical role.",
      "wage": number,
      "marketValue": number
    }
  ]
}`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return result.players.map((p: any) => ({ ...p, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false }));
    } catch (e) {
        return [];
    }
};

export const generatePressConference = async (context: string): Promise<string[]> => {
    const prompt = `Hostile journalist. Context: ${context}. Ask 3 probing questions. JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).questions;
    } catch (e) {
        return ["Expectations?", "Morale?", "Transfers?"];
    }
};

export const getInterviewQuestions = async (teamName: string, personality: ChairmanPersonality) => {
    const prompt = `Chairman (${personality}) interviewing for ${teamName}. Ask 3 questions based on your values. JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).questions;
    } catch (e) {
        return ["Philosophy?", "Why us?", "Goals?"];
    }
};

export const evaluateInterview = async (teamName: string, questions: string[], answers: string[], personality: ChairmanPersonality) => {
    const qa = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n');
    const prompt = `Chairman (${personality}) of ${teamName}. Decide based on: ${qa}. JSON: { "offer": boolean, "reasoning": "string" }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (e) {
        return { offer: false, reasoning: "Not convinced." };
    }
};

export const getPlayerTalkQuestions = async (player: Player, team: Team, context: 'transfer' | 'renewal') => {
    const prompt = `Agent of ${player.name} (${player.personality}). ${team.name} wants ${context}. Ask 3 tough questions. JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).questions;
    } catch (e) {
        return ["Project?", "Money?", "Playing time?"];
    }
};

export const evaluatePlayerTalk = async (player: Player, questions: string[], answers: string[], team: Team, context: 'transfer' | 'renewal') => {
    const qa = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n');
    const prompt = `Agent of ${player.name} (${player.personality}). Decide based on: ${qa}. JSON: { "convinced": boolean, "reasoning": "string" }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (e) {
        return { convinced: false, reasoning: "Talks broke down." };
    }
};

export const getAssistantAnalysis = async (homeTeam: Team, awayTeam: Team, matchState: MatchState, userTeamName: string): Promise<string> => {
    const isHome = userTeamName === homeTeam.name;
    const prompt = `Assistant of ${userTeamName} vs ${isHome ? awayTeam.name : homeTeam.name}. Score ${matchState.homeScore}-${matchState.awayScore}. Minute ${matchState.currentMinute}. Give 3 bullet points of tactical advice.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({ model: model, contents: prompt });
        return response.text || "Keep it up.";
    } catch(e) { return "The stadium is too loud!"; }
};
