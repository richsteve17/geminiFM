
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
    const prompt = `Evaluate job interview for ${teamName} manager role. 
    Questions: ${JSON.stringify(qs)}. 
    Answers: ${JSON.stringify(ans)}. 
    Chairman Persona: ${p}.
    Did they get the job? Be strict.
    JSON: { "offer": boolean, "reasoning": "string (short comment from chairman)" }`;
    
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string) => {
    const contextType = c === 'renewal' ? 'Contract Renewal' : 'Transfer Negotiation';
    const prompt = `
    You are the Agent representing ${p.name}.
    Player Profile:
    - Age: ${p.age}
    - Rating: ${p.rating}/100
    - Personality: ${p.personality}
    - Current/Target Club: ${t.name} (Prestige: ${t.prestige})
    - Context: ${contextType}
    
    Generate 3 distinct questions/concerns for the manager.
    RULES:
    1. CRITICAL: You are the AGENT. Speak in the THIRD PERSON about the player.
       - Use: "My client", "${p.name}", "He".
       - DO NOT Use: "I", "My career", "Me".
    2. Be hyper-specific to the player's career stage.
       - If Age > 30: Ask about contract length security for "him" or "my client".
       - If Age < 21: Ask about guaranteed minutes for "the lad" or "him".
    3. Reflect the '${p.personality}' trait (e.g. 'Mercenary' asks about bonuses, 'Loyal' asks about club vision).
    
    JSON Format: { "questions": ["string", "string", "string"] }`;

    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text)).questions;
};

// UPDATED NEGOTIATION ENGINE: Extract Promises
export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string, offer: any): Promise<NegotiationResult> => {
    const prompt = `
    Roleplay as the Agent for ${p.name} (${p.age}yo, Rating: ${p.rating}, Personality: ${p.personality}).
    User (Manager) has offered: Wage £${offer.wage}, Length ${offer.length} years.
    User Argument: "${ans[ans.length - 1]}".
    Full Conversation History: ${JSON.stringify(ans)}.
    
    Context: 
    - Negotiation with ${t.name} (Prestige: ${t.prestige}).
    - Previous Wage: £${p.wage}.
    
    LOGIC:
    1. Speak in the THIRD PERSON (refer to player as "my client" or "${p.name}").
    2. If the user argument is persuasive and specific, be willing to accept a wage slightly lower than demand.
    3. Analyze the User's text for PROMISES (e.g., "I promise to sign Salah", "You will be captain", "We will win the league").
    4. Extract these promises into a list.
    
    Return JSON: 
    { 
        "decision": "accepted" | "rejected" | "counter", 
        "reasoning": "string (Agent's reply in character, using 'My client', 'He', etc.)", 
        "counterOffer": { "wage": number, "length": number } (Optional, only if counter),
        "extractedPromises": ["string", "string"] (List of promises found in user text, empty if none)
    }
    `;
    
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { decision: "accepted", reasoning: "Okay, we have a deal on behalf of my client.", extractedPromises: [] };
    }
};

// --- PROMISE CHECKING ---
export const checkPromises = async (promises: PromiseData[], currentWeek: number, teamState: any): Promise<PromiseData[]> => {
    // Only check active promises that are near deadline or can be fulfilled
    const relevantPromises = promises.filter(p => p.status === 'pending');
    if (relevantPromises.length === 0) return promises;

    const prompt = `
    Analyze these football manager promises.
    Current Week: ${currentWeek}.
    Team Context: ${JSON.stringify(teamState)}.
    Promises: ${JSON.stringify(relevantPromises)}.
    
    For each promise, determine if it is KEPT, BROKEN, or still PENDING.
    If broken or kept, provide a short status update message.
    
    Return JSON: 
    { 
        "updates": [
            { "id": "string", "newStatus": "kept" | "broken" | "pending", "message": "string" }
        ] 
    }
    `;

    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        const result = JSON.parse(cleanJson(response.text));
        
        // Merge updates
        return promises.map(p => {
            const update = result.updates.find((u: any) => u.id === p.id);
            if (update) return { ...p, status: update.newStatus };
            return p;
        });
    } catch (e) {
        return promises;
    }
};

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string): Promise<string> => {
    const prompt = `Tactical advice for ${u} vs ${h.name===u?a.name:h.name}. Score ${s.homeScore}-${s.awayScore}. Minute ${s.currentMinute}. Momentum ${s.momentum}. Concise advice.`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
    return response.text || "No advice.";
};

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `Simulate an international break for Week ${week}. Return JSON: { "newsTitle": "string", "newsBody": "string" }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = JSON.parse(cleanJson(response.text));
    return parsed ?? { newsTitle: "International Break", newsBody: "Matches played." };
};

export const processTouchlineInteraction = async (
    userShout: string, 
    team: Team, 
    matchState: MatchState,
    isHome: boolean
): Promise<{ 
    momentumChange: number, 
    commentary: string,
    effectDescription: string 
}> => {
    const prompt = `
    Football Manager Match Engine.
    User (Manager of ${team.name}) screams from the touchline: "${userShout}".
    
    Context:
    - Score: ${matchState.homeScore}-${matchState.awayScore}
    - Minute: ${matchState.currentMinute}
    - Momentum: ${matchState.momentum} (-10 to 10)
    
    Determine the effect of this shout.
    - If it's smart/motivational, give positive momentum (+1 to +5).
    - If it's toxic/stupid, give negative momentum (-1 to -5).
    - If it's tactical (e.g., "Overload the left"), assume it works slightly.
    
    Return JSON:
    {
        "momentumChange": number,
        "commentary": "string (How the players/crowd react, e.g. 'The players look fired up!')",
        "effectDescription": "string (Short UI label, e.g. 'Tactical Adjustment', 'Confusion', 'Inspiration')"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { momentumChange: 0, commentary: "The players couldn't hear you.", effectDescription: "Ignored" };
    }
};

export const getContextAwareShouts = async (team: Team, isHome: boolean, matchState: MatchState): Promise<TacticalShout[]> => {
    const prompt = `
    You are the Assistant Manager of ${team.name}.
    Halftime Situation:
    - Score: ${isHome ? matchState.homeScore : matchState.awayScore} - ${isHome ? matchState.awayScore : matchState.homeScore} (We are ${isHome ? 'Home' : 'Away'})
    - Momentum: ${matchState.momentum} (Positive = We are dominating, Negative = Under pressure)
    - Team Personality: ${team.chairmanPersonality} (affects expected style)
    
    Generate 4 distinct halftime team talks (shouts) I can use.
    Return JSON: { "shouts": [{ "id": "string", "label": "string", "description": "string", "effect": "string" }] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(cleanJson(response.text));
        return parsed.shouts || [];
    } catch (e) {
        return [
            { id: 'demand', label: 'Demand More', description: 'Show me some passion!', effect: 'Increases work rate.' },
            { id: 'calm', label: 'Calm Down', description: 'Relax and play our game.', effect: 'Improves passing accuracy.' },
            { id: 'push', label: 'Push Forward', description: 'Get the ball into the box!', effect: 'Higher goal chance.' },
            { id: 'tighten', label: 'Tighten Up', description: 'Focus on defense.', effect: 'Reduces goals conceded.' }
        ];
    }
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
}

export const generateSocialPost = async (description: string, teamName: string, eventType: string): Promise<SocialPostData> => {
    const prompt = `
    Generate viral social media content (TikTok/Shorts style) for a football clip.
    Event: ${description}.
    Team: ${teamName}.
    
    Generate:
    1. A hype caption.
    2. Trending hashtags.
    3. Realistic view/like counts (e.g. "2.4M").
    4. 4 fake comments from fans (some using emojis, slang).
    5. A trending audio/sound name.

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
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return {
            caption: `Unbelievable scenes! ${teamName} scoring!`,
            hashtags: ["#football", "#goal", `#${teamName.replace(/\s/g,'')}`],
            likes: "1.2M",
            shareCount: "45K",
            sound: "Trending Audio - Viral",
            comments: [
                { username: "footyfan123", text: "WHAT A GOAL 🔥", likes: 2400 },
                { username: "manager_pro", text: "Tactical genius!", likes: 1500 },
                { username: "away_fan", text: "Lucky...", likes: 200 }
            ]
        };
    }
};
