
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage } from '../types';
import { PLAYER_PERSONALITIES } from '../constants';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-3-flash-preview';

export const simulateMatchSegment = async (homeTeam: Team, awayTeam: Team, currentMatchState: MatchState, targetMinute: number, context: any) => {
    const prompt = `Football Match Sim: ${homeTeam.name} (${homeTeam.tactic.mentality}) vs ${awayTeam.name} (${awayTeam.tactic.mentality}). 
    Current Minute: ${currentMatchState.currentMinute} to ${targetMinute}. 
    Score: ${currentMatchState.homeScore}-${currentMatchState.awayScore}.
    Respond ONLY in JSON format: { "homeScoreAdded": number, "awayScoreAdded": number, "momentum": number, "tacticalAnalysis": "string", "events": [{ "minute": number, "type": "goal"|"commentary", "teamName": "string", "description": "string" }] }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (error) {
        return { homeScoreAdded: 0, awayScoreAdded: 0, momentum: 0, tacticalAnalysis: "Steady game.", events: [] };
    }
};

export const scoutPlayers = async (request: string): Promise<Player[]> => {
    const prompt = `You are a world-class football scout. The user asks: "${request}". 
    Generate 3 unique, realistic football players fitting this exact description.
    JSON format: { "players": [{ "name": "string", "position": "LB"|"CB"|"ST"|..., "rating": number, "age": number, "nationality": "Emoji", "scoutingReport": "string", "wage": number, "marketValue": number, "personality": "Ambitious"|"Loyal"|"Mercenary"|"Young Prospect"|"Leader"|"Professional"|"Volatile" }] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(response.text);
        return res.players.map((p: any) => ({ ...p, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 }));
    } catch (e) { return []; }
};

export const generatePressConference = async (context: string): Promise<string[]> => {
    const prompt = `You are a hostile sports journalist at a press conference. Context: ${context}. 
    Ask 3 provocative, specific questions about the match result or incidents. Do not be generic. 
    JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: model, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text).questions;
    } catch (e) { return ["How do you feel?", "What's next?"]; }
};

export const getInterviewQuestions = async (teamName: string, personality: string) => {
    const prompt = `You are the chairman of ${teamName}. Your personality is: ${personality}. 
    You are interviewing a new manager. 
    Ask 3 distinct, difficult, roleplay-heavy questions about their philosophy, past experience, and financial management. 
    Do NOT ask generic questions like "What are your tactics?". Be specific to the club's situation.
    JSON: { "questions": ["string", "string", "string"] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text).questions;
};

export const evaluateInterview = async (teamName: string, qs: string[], ans: string[], p: string) => {
    const prompt = `Evaluate job interview for ${teamName} (Chairman: ${p}). 
    Questions: ${JSON.stringify(qs)}. Answers: ${JSON.stringify(ans)}.
    Did they get the job? Be strict.
    JSON: { "offer": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text);
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string, teammates: string[] = []) => {
    const personalityDesc = PLAYER_PERSONALITIES[p.personality] || "A professional football player.";
    
    // Provide context about specific teammates, but let the AI decide if it matters
    const squadContext = teammates.length > 0 
        ? `Squad Context: There is uncertainty around other key players like ${teammates.join(', ')}.` 
        : '';

    const prompt = `Roleplay as the agent of ${p.name} (${p.nationality}, ${p.age}yo).
    Client Personality: "${p.personality}" - ${personalityDesc}.
    Club: ${t.name} (Prestige: ${t.prestige}).
    Situation: Manager wants to ${c} contract.
    ${squadContext}

    Task: Ask 3 questions to the manager.
    CRITICAL INSTRUCTION: The questions MUST reflect the client's specific personality.
    - If "Mercenary": Focus purely on money, bonuses, and release clauses. IGNORE the Squad Context.
    - If "Ambitious": Ask about trophies and specifically use the Squad Context to ask who else is staying/signing.
    - If "Leader": Ask about the squad harmony and direction (use Squad Context).
    - If "Loyal": Ask about long-term role and club stability.
    - If "Volatile": Ask about playing time guarantees and media protection.

    Do not act generic. Be the agent of THIS specific archetype.
    JSON: { "questions": ["string", "string", "string"] }`;

    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text).questions;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string) => {
    const prompt = `Evaluate negotiation between Agent of ${p.name} (${p.personality}) and Manager of ${t.name}.
    Questions: ${JSON.stringify(qs)}. Answers: ${JSON.stringify(ans)}.
    
    Did the manager's answers satisfy the specific needs of a ${p.personality} player?
    - Mercenaries need money promises.
    - Ambitious players need ambition/signing promises.
    - Loyal players need respect.
    
    Is the agent convinced?
    JSON: { "convinced": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text);
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const prompt = `You are the Assistant Manager of ${u}. The score is ${s.homeScore}-${s.awayScore}. 
    Opponent: ${h.name === u ? a.name : h.name}.
    Give specific tactical advice based on the scoreline. Should we push up? Sit back?`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No advice.";
};
