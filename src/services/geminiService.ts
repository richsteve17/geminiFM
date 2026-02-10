import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage, NegotiationResult, TacticalShout, PromiseData } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Models configuration
const MODEL_TEXT = 'gemini-2.0-flash-exp'; 
const MODEL_SEARCH = 'gemini-3-flash-preview'; 
const MODEL_TTS = 'gemini-2.5-flash-preview-tts'; 
const MODEL_VIDEO = 'veo-3.1-fast-generate-preview'; 

// --- ECONOMIC CONSTANTS ---
const COST_VEO = 0.08;
const COST_TTS = 0.005;
const COST_TEXT = 0.005;
const TOTAL_GEN_COST = COST_VEO + COST_TTS + COST_TEXT; // $0.09
const RPM_SHORTS = 0.03; // $0.03 per 1k views

// --- CACHE LAYER ---
const mediaCache = new Map<string, string | AudioBuffer>();

// --- MEDIA HELPERS ---

const cleanJson = (text?: string) => (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- CORE SIMULATION ---

export const simulateMatchSegment = async (
    homeTeam: Team, 
    awayTeam: Team, 
    currentMatchState: MatchState, 
    targetMinute: number, 
    context: { 
        shout?: string, 
        userTeamName: string | null,
        tacticalContext?: string 
    }
) => {
    // Determine context for short bursts
    const userInstruction = context.shout ? `User Shout: "${context.shout}" (Factor this into momentum).` : "";
    const tacticalInfo = context.tacticalContext ? `TACTICAL REALITY CHECK:\n${context.tacticalContext}` : "";
    
    const prompt = `Football Match Sim: ${homeTeam.name} vs ${awayTeam.name}. 
    Current State: Minute ${currentMatchState.currentMinute}, Score ${currentMatchState.homeScore}-${currentMatchState.awayScore}, Momentum ${currentMatchState.momentum}.
    Task: Simulate ONLY from minute ${currentMatchState.currentMinute + 1} to ${targetMinute}.
    
    ${userInstruction}
    ${tacticalInfo}
    
    CRITICAL INSTRUCTIONS:
    1. If a team has low Tactical Efficiency (<50%), they MUST make mistakes.
    2. If a player is Out of Position (e.g. ST in Goal), specific events MUST mention them failing at their role (e.g. "Salah drops a simple catch").
    3. Events must be realistic to the clock. Don't score 5 goals in 10 minutes unless efficiency is 0%.
    
    Respond ONLY in JSON format: { 
        "homeScoreAdded": number, 
        "awayScoreAdded": number, 
        "momentum": number (new value -10 to 10), 
        "tacticalAnalysis": "string (one short sentence about the flow)", 
        "events": [{ "minute": number, "type": "goal"|"commentary"|"card"|"injury"|"whistle", "teamName": "string", "description": "string", "player": "string" }] 
    }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        console.error("Sim Error", error);
        return { homeScoreAdded: 0, awayScoreAdded: 0, momentum: 0, tacticalAnalysis: "Steady game.", events: [] };
    }
};

// --- MEDIA FEATURES ---

export const scoutPlayers = async (request: string, useRealWorld: boolean = false): Promise<Player[]> => {
    let prompt = "";
    let config: any = { responseMimeType: "application/json" };
    let selectedModel = MODEL_TEXT;

    if (useRealWorld) {
        selectedModel = MODEL_SEARCH;
        prompt = `
        You are a football scout using Google Search to find REAL players.
        User Request: "${request}"
        
        Using Google Search, identify 3 REAL WORLD football players that fit this description.
        If the request is vague (e.g. "young striker"), find current trending wonderkids.
        
        Return valid JSON in this exact format (do not wrap in markdown):
        { "players": [{ "name": "string", "position": "LB"|"CB"|"ST" etc, "rating": number (estimate 60-95 based on real ability), "age": number, "nationality": "Emoji", "scoutingReport": "string (mention real stats/facts)", "wage": number, "marketValue": number, "currentClub": "string" }] }
        `;
        config.tools = [{googleSearch: {}}];
    } else {
        prompt = `Scout report for: "${request}". Generate 3 fictional players who fit this description. 
        JSON format: { "players": [{ "name": "string", "position": "LB"|"CB"|"ST"|..., "rating": number, "age": number, "nationality": "Emoji", "scoutingReport": "string", "wage": number, "marketValue": number, "currentClub": "string" }] }
        Invent a realistic 'currentClub' for each player.`;
    }
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: selectedModel, contents: prompt, config: config
        });
        
        const jsonStr = cleanJson(response.text);
        const res = JSON.parse(jsonStr);
        
        return res.players.map((p: any) => ({ 
            ...p, 
            status: { type: 'Available' }, 
            effects: [], 
            contractExpires: 3, 
            isStarter: false, 
            condition: 100,
            currentClub: p.currentClub || "Free Agent"
        }));
    } catch (e) { 
        console.error("Scouting Error", e);
        return []; 
    }
};

export const playMatchCommentary = async (text: string, eventId: number) => {
    const cacheKey = `tts-${eventId}`;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});

    if (mediaCache.has(cacheKey)) {
        console.log("Playing from cache");
        const cachedBuffer = mediaCache.get(cacheKey) as AudioBuffer;
        const source = audioContext.createBufferSource();
        source.buffer = cachedBuffer;
        source.connect(audioContext.destination);
        source.start();
        return;
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: `Passionate Football Commentator: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(
                decodeBase64(base64Audio),
                audioContext,
                24000,
                1
            );
            mediaCache.set(cacheKey, audioBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        }
    } catch (error) {
        console.error("TTS Error", error);
        throw error;
    }
};

export const generateReplayVideo = async (description: string, eventId: number, format: 'landscape' | 'portrait' = 'landscape'): Promise<string | null> => {
    const cacheKey = `video-${eventId}-${format}`;
    if (mediaCache.has(cacheKey)) {
        return mediaCache.get(cacheKey) as string;
    }

    try {
        const aspectRatio = format === 'portrait' ? '9:16' : '16:9';
        const stylePrompt = format === 'portrait' 
            ? "Vertical viral social media video, TikTok style, fan phone camera angle from the stands" 
            : "Cinematic 4k broadcast TV camera angle";

        const prompt = `${stylePrompt}. Football match goal. ${description}. Realistic lighting, green grass, stadium crowd.`;
        
        let operation = await ai.models.generateVideos({
            model: MODEL_VIDEO,
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const fullUrl = `${videoUri}&key=${API_KEY}`;
            mediaCache.set(cacheKey, fullUrl); 
            return fullUrl;
        }
        return null;
    } catch (error) {
        console.error("Video Gen Error", error);
        throw error;
    }
};

// --- INTERACTIVE FEATURES ---

export const generatePressConference = async (context: string): Promise<string[]> => {
    const prompt = `Press conference. Context: ${context}. Ask 3 questions. JSON: { "questions": [] }`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
             model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text)).questions;
    } catch (e) { return ["How do you feel?", "What's next?"]; }
};

export const getInterviewQuestions = async (teamName: string, personality: string, league: string) => {
    const prompt = `
    You are the ${personality} Chairman of ${teamName} (${league}). 
    You are interviewing a new manager.
    Generate 3 TOUGH, SPECIFIC questions based on the club's status and your personality.
    RULES:
    1. Do NOT ask generic "What are your tactics?" questions.
    2. If personality is 'Moneyball', ask about youth stats or resale value.
    3. If 'Ambitious', ask about big signings.
    
    Return JSON: { "questions": ["string", "string", "string"] }
    `;
    
    try {
        const response = await ai.models.generateContent({ 
            model: MODEL_TEXT, 
            contents: prompt, 
            config: { responseMimeType: "application/json" } 
        });
        return JSON.parse(cleanJson(response.text)).questions;
    } catch (e) {
        return ["What is your philosophy?", "How will you handle the pressure?", "What are your wage demands?"];
    }
};

export const evaluateInterview = async (teamName: string, qs: string[], ans: string[], p: string) => {
    const prompt = `Evaluate interview for ${teamName}. JSON: { "offer": boolean, "reasoning": "string" }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string) => {
    const prompt = `Negotiation with ${p.name}. JSON: { "questions": [] }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text)).questions;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string, offer: any): Promise<NegotiationResult> => {
    const prompt = `
    Roleplay as the Agent for ${p.name}.
    User offer: $${offer.wage}, ${offer.length} years.
    History: ${JSON.stringify(ans)}.
    Context: Negotiation with ${t.name}.
    Previous Wage: $${p.wage}.
    
    Return JSON: 
    { 
        "decision": "accepted" | "rejected" | "counter", 
        "reasoning": "string (Agent's reply in third person)", 
        "counterOffer": { "wage": number, "length": number },
        "extractedPromises": ["string"]
    }
    `;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { decision: "accepted", reasoning: "Okay, we have a deal.", extractedPromises: [] };
    }
};

export const checkPromises = async (promises: PromiseData[], currentWeek: number, teamState: any): Promise<PromiseData[]> => {
    const relevantPromises = promises.filter(p => p.status === 'pending');
    if (relevantPromises.length === 0) return promises;

    const prompt = `
    Analyze football manager promises. Week: ${currentWeek}.
    Team: ${JSON.stringify(teamState)}.
    Promises: ${JSON.stringify(relevantPromises)}.
    Return JSON: { "updates": [{ "id": "string", "newStatus": "kept"|"broken"|"pending", "message": "string" }] }
    `;

    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(cleanJson(response.text));
        return promises.map(p => {
            const update = result.updates.find((u: any) => u.id === p.id);
            if (update) return { ...p, status: update.newStatus };
            return p;
        });
    } catch (e) { return promises; }
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const prompt = `Tactical advice for ${u}. Score ${s.homeScore}-${s.awayScore}.`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
    return response.text || "No advice.";
};

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `Simulate international break Week ${week}. JSON: { "newsTitle": "string", "newsBody": "string" }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const processTouchlineInteraction = async (userShout: string, team: Team, matchState: MatchState, isHome: boolean) => {
    const prompt = `Touchline shout: "${userShout}". Score: ${matchState.homeScore}-${matchState.awayScore}. Momentum: ${matchState.momentum}. Return JSON: { "momentumChange": number, "commentary": "string", "effectDescription": "string" }`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) { return { momentumChange: 0, commentary: "Ignored.", effectDescription: "Ignored" }; }
};

export const getContextAwareShouts = async (team: Team, isHome: boolean, matchState: MatchState): Promise<TacticalShout[]> => {
    const prompt = `Halftime shouts for ${team.name}. Score: ${matchState.homeScore}-${matchState.awayScore}. JSON: { "shouts": [{ "id": "string", "label": "string", "description": "string", "effect": "string" }] }`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text)).shouts;
    } catch (e) { return [{ id: 'demand', label: 'Demand More', description: 'Show passion!', effect: 'Work rate up' }]; }
};

// --- NEW STREAMER STUDIO FEATURE ---
export interface SocialComment {
    username: string;
    text: string;
    likes: number;
}

export interface SocialPostData {
    caption: string;
    hashtags: string[];
    likes: string;
    comments: SocialComment[];
    sound: string;
    shareCount: string;
    estimatedEarnings: string; // New Revenue Field
}

export const generateSocialPost = async (description: string, teamName: string, eventType: string): Promise<SocialPostData> => {
    const prompt = `
    Generate viral social media content (TikTok/Shorts style) for a football clip.
    Event: ${description}.
    Team: ${teamName}.
    
    Generate:
    1. A hype caption.
    2. Trending hashtags.
    3. Realistic view/like counts (e.g. "2.4M", "450K").
    4. 4 fake comments.
    5. A sound name.

    Return JSON:
    {
        "caption": "string",
        "hashtags": ["#tag1", "#tag2"],
        "likes": "string",
        "shareCount": "string",
        "sound": "string",
        "comments": [
            { "username": "string", "text": "string", "likes": number }
        ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(cleanJson(response.text));
        
        // --- RPM CALCULATOR AUDIT ---
        // Logic confirmed by audit: 
        // 1. Convert string likes (2.4M) to number.
        // 2. Estimate Views = Likes * 10 (Engagement rate ~10%).
        // 3. RPM for Shorts in Gaming/Sports = $0.03 (approx).
        // 4. COST OF GENERATION = ~$0.09 (Video + TTS + Text)
        // 5. Net Profit = Revenue - Cost
        
        let likesNum = 0;
        const likeStr = (parsed.likes || "0").toUpperCase().replace(/,/g, '');
        if (likeStr.includes('M')) likesNum = parseFloat(likeStr) * 1000000;
        else if (likeStr.includes('K')) likesNum = parseFloat(likeStr) * 1000;
        else likesNum = parseFloat(likeStr);
        
        const estViews = likesNum * 10;
        const revenue = (estViews / 1000) * RPM_SHORTS;
        const netProfit = revenue - TOTAL_GEN_COST;
        
        // Formatted String: "$3.00 (+$2.91 Net)"
        parsed.estimatedEarnings = `$${revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${netProfit > 0 ? '+' : ''}$${netProfit.toFixed(2)} Net)`;
        
        return parsed;
    } catch (e) {
        return {
            caption: `Scenes! ${teamName}!`,
            hashtags: ["#football"],
            likes: "10K",
            shareCount: "500",
            sound: "Viral Sound",
            estimatedEarnings: "$3.00 (+$2.91 Net)",
            comments: []
        };
    }
};