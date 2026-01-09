
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-3-flash-preview';

export const simulateMatchSegment = async (homeTeam: Team, awayTeam: Team, currentMatchState: MatchState, targetMinute: number, context: any) => {
    const prompt = `Football Match Sim: ${homeTeam.name} vs ${awayTeam.name}. 
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
    const prompt = `Interview for ${teamName}. JSON: { "questions": [] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text).questions;
};

export const evaluateInterview = async (teamName: string, qs: string[], ans: string[], p: string) => {
    const prompt = `Evaluate interview for ${teamName}. JSON: { "offer": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text);
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string) => {
    const prompt = `Negotiation with ${p.name}. JSON: { "questions": [] }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text).questions;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string) => {
    const prompt = `Evaluate negotiation. JSON: { "convinced": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(response.text);
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const prompt = `Tactical advice for ${u}. Score ${s.homeScore}-${s.awayScore}.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "No advice.";
};
