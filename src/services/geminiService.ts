
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type {
    Team,
    MatchState,
    Player,
    MatchEvent,
    TournamentStage,
    NegotiationResult,
    TacticalShout,
    PromiseData,
    ContractTerms,
    ContractBonusType,
    PlayerPosition,
    RiftSeverity,
    RiftScope,
} from '../types';

let _ai: GoogleGenAI | null = null;
const api_key_raw = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

const getAIInstance = (): GoogleGenAI => {
    if (!_ai) {
        if (!api_key_raw || api_key_raw === "undefined" || api_key_raw === "null") {
            console.warn("GEMINI_API_KEY / API_KEY is not set. Using local simulation fallback.");
            throw new Error("API_KEY_NOT_SET");
        }
        _ai = new GoogleGenAI({ apiKey: api_key_raw });
    }
    return _ai;
};

// Define a proxy object for ai to lazily load and avoid crashing on startup
export const ai = {
    get models() {
        return getAIInstance().models;
    },
    get operations() {
        return getAIInstance().operations;
    }
};

const MODEL_TEXT = 'gemini-2.5-flash'; 
const MODEL_SEARCH = 'gemini-2.5-flash'; 
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
const getInitialFlag = (key: string, defaultVal: boolean): boolean => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            return saved === 'true';
        }
    }
    return defaultVal;
};

let paidAudioState = getInitialFlag('GFM_PAID_AUDIO', false);
let paidVideoState = getInitialFlag('GFM_PAID_VIDEO', false);

export const isPaidAudioEnabled = () => paidAudioState;
export const setPaidAudioEnabled = (val: boolean) => {
    paidAudioState = val;
    if (typeof window !== 'undefined') {
        localStorage.setItem('GFM_PAID_AUDIO', String(val));
    }
};

export const isPaidVideoEnabled = () => paidVideoState;
export const setPaidVideoEnabled = (val: boolean) => {
    paidVideoState = val;
    if (typeof window !== 'undefined') {
        localStorage.setItem('GFM_PAID_VIDEO', String(val));
    }
};

const getInitialString = (key: string, defaultVal: string): string => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            return saved;
        }
    }
    return defaultVal;
};

let paidVoiceState = getInitialString('GFM_PAID_VOICE', 'Puck');

export const getPaidVoiceName = () => paidVoiceState;
export const setPaidVoiceName = (val: string) => {
    paidVoiceState = val;
    if (typeof window !== 'undefined') {
        localStorage.setItem('GFM_PAID_VOICE', val);
    }
};

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

// --- LOCAL SIMULATION ENGINE FALLBACK ---
function generateLocalSimulation(
    homeTeam: Team,
    awayTeam: Team,
    currentMatchState: MatchState,
    targetMinute: number,
    context: { shout?: string, userTeamName: string | null }
) {
    const startMin = currentMatchState.currentMinute + 1;
    const endMin = targetMinute;
    const events: any[] = [];
    let homeScoreAdded = 0;
    let awayScoreAdded = 0;
    let momentum = currentMatchState.momentum;

    // Strengths calculation
    const getTeamStrength = (team: Team) => {
        const starters = team.players.filter(p => p.isStarter);
        const playersToScore = starters.length > 0 ? starters : team.players;
        return playersToScore.reduce((sum, p) => sum + (p.rating || 75), 0) / playersToScore.length;
    };
    const homeStrength = getTeamStrength(homeTeam);
    const awayStrength = getTeamStrength(awayTeam);

    const getPlayerList = (team: Team) => {
        const starters = team.players.filter(p => p.isStarter);
        return starters.length > 0 ? starters : team.players;
    };
    const homePlayers = getPlayerList(homeTeam);
    const awayPlayers = getPlayerList(awayTeam);

    // Apply active shout if any
    let shoutsMod = 0;
    if (context.shout) {
        if (context.shout.toLowerCase().includes('demand') || context.shout.toLowerCase().includes('more')) shoutsMod = 5;
        if (context.shout.toLowerCase().includes('focus')) shoutsMod = 2;
    }

    const commentaryTemplates = [
        "{player} controls the ball elegantly in midfield and looks for an option.",
        "{player} unleashes a wild volley from distance, but it sails high into the stands.",
        "Brilliant tackle by {player} to stopper a dangerous attack.",
        "{player} swings a high cross into the box but the goalkeeper collects it easily.",
        "Defensive scramble! {player} clears the ball off the line!",
        "{player} attempts a tricky direct free kick, but it rebounds off the defensive wall.",
        "A clever through ball from {player} splits the defense, but the striker is ruled offside.",
        "{player} shows incredibly quick feet to bypass two defenders before being dispossessed."
    ];

    const cardTemplates = [
        "{player} receives a warning from the referee following a persistent foil challenge.",
        "{player} is shown a yellow card for a mistimed sliding tackle.",
        "Yellow card for {player} after pulling back the attacker's shirt."
    ];

    const goalTemplates = [
        "GOAL! {player} makes no mistake with a precise shot into the bottom corner!",
        "GOAL! What a spectacular header from {player} connecting with an exquisite cross!",
        "GOAL! {player} pounces on a loose ball in the penalty area and slots it past the keeper!"
    ];

    for (let m = startMin; m <= endMin; m++) {
        // Chance of event per minute (e.g., 20% chance)
        if (Math.random() < 0.22) {
            const isHomeEvent = Math.random() * (homeStrength + momentum + shoutsMod) > Math.random() * (awayStrength - momentum);
            const activeTeam = isHomeEvent ? homeTeam : awayTeam;
            const activePlayers = isHomeEvent ? homePlayers : awayPlayers;
            const randPlayerObj = activePlayers[Math.floor(Math.random() * activePlayers.length)] || { name: 'The attacker' };
            const randPlayer = randPlayerObj.name;

            const rand = Math.random();
            let type: any = 'commentary';
            let description = '';

            if (rand < 0.70) {
                type = 'commentary';
                const temp = commentaryTemplates[Math.floor(Math.random() * commentaryTemplates.length)];
                description = temp.replace('{player}', randPlayer);
            } else if (rand < 0.88) {
                type = 'card';
                const temp = cardTemplates[Math.floor(Math.random() * cardTemplates.length)];
                description = temp.replace('{player}', randPlayer);
                momentum += isHomeEvent ? -1 : 1;
            } else {
                type = 'goal';
                const temp = goalTemplates[Math.floor(Math.random() * goalTemplates.length)];
                description = temp.replace('{player}', randPlayer) + ` (${activeTeam.name})`;
                if (isHomeEvent) {
                    homeScoreAdded++;
                    momentum = Math.min(10, momentum + 3);
                } else {
                    awayScoreAdded++;
                    momentum = Math.max(-10, momentum - 3);
                }
            }

            events.push({
                id: m * 1000 + Math.floor(Math.random() * 1000),
                minute: m,
                type,
                teamName: activeTeam.name,
                description,
                player: randPlayer
            });
        }
    }

    if (endMin === 45) {
        events.push({
            id: 45000,
            minute: 45,
            type: 'whistle',
            teamName: homeTeam.name,
            description: "The referee blows the whistle for HALF TIME."
        });
    } else if (endMin === 90) {
        events.push({
            id: 90000,
            minute: 90,
            type: 'whistle',
            teamName: homeTeam.name,
            description: "Full time whistle blows! The match has concluded."
        });
    }

    momentum = Math.max(-10, Math.min(10, momentum));

    return {
        homeScoreAdded,
        awayScoreAdded,
        momentum,
        tacticalAnalysis: homeScoreAdded > awayScoreAdded ? `${homeTeam.name} are dominating the game layout.` : awayScoreAdded > homeScoreAdded ? `${awayTeam.name} are putting on a tactical defensive masterclass.` : "A closely contested game with balanced midfield battles.",
        events
    };
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
    2. If a player is Out of Position (e.g. ST in Goal), specific events MUST mention them failing at their role.
    3. Goals are rare in football. DO NOT add more than 1 or 2 goals max per team in this segment. Often 0 goals are scored.
    4. NO references to real world injuries (e.g. Alisson Becker) or players not in the game.
    
    Respond ONLY in JSON format: { 
        "homeScoreAdded": number (max 2), 
        "awayScoreAdded": number (max 2), 
        "momentum": number (new value -10 to 10), 
        "tacticalAnalysis": "string (one short sentence about the flow)", 
        "events": [{ "minute": number, "type": "goal"|"commentary"|"card"|"injury"|"whistle", "teamName": "string", "description": "string", "player": "string" }] 
    }`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(cleanJson(response.text));
        
        // Safety cap
        parsed.homeScoreAdded = Math.min(2, Math.max(0, Number(parsed.homeScoreAdded) || 0));
        parsed.awayScoreAdded = Math.min(2, Math.max(0, Number(parsed.awayScoreAdded) || 0));
        
        return parsed;
    } catch (error) {
        console.warn("Gemini Sim failed, using local simulation engine:", error);
        return generateLocalSimulation(homeTeam, awayTeam, currentMatchState, targetMinute, context);
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
        
        return (res.players || []).map((p: any) => ({ 
            ...p, 
            status: { type: 'Available' }, 
            effects: [], 
            contractExpires: 3, 
            isStarter: false, 
            condition: 100,
            stamina: p.stamina ?? Math.floor(Math.random() * 31) + 65, // Random stamina between 65 and 95
            currentClub: p.currentClub || "Free Agent",
            potential: p.potential ?? Math.min(100, p.rating + Math.floor(Math.random() * 15)),
            growthRate: p.growthRate ?? (p.age < 23 ? 1.2 : p.age > 30 ? 0.5 : 1.0),
            form: p.form ?? 0
        }));
    } catch (e) { 
        console.error("Scouting Error", e);
        return []; 
    }
};
export const playMatchCommentary = async (text: string, eventId: number) => {
    if (!isPaidAudioEnabled()) {
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.15; // standard excitement rate
                utterance.pitch = 1.0;
                const voices = window.speechSynthesis.getVoices();
                
                // Prioritize high-quality natural sounding English voices (Siri, Google, Samantha, Premium, Daniel)
                const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Siri') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium') || v.name.includes('Natural')))
                    || voices.find(v => v.lang.startsWith('en') && v.name.includes('Daniel'))
                    || voices.find(v => v.lang.startsWith('en'))
                    || voices[0];
                    
                if (engVoice) {
                    utterance.voice = engVoice;
                }
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.error("Browser speech synthesis failed in free mode:", e);
            }
        }
        return;
    }
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
                        prebuiltVoiceConfig: { voiceName: getPaidVoiceName() },
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
        console.warn("TTS Gemini Error, trying browser speech synthesis fallback:", error);
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.15; // standard excitement rate
                utterance.pitch = 1.0;
                const voices = window.speechSynthesis.getVoices();
                const engVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                if (engVoice) utterance.voice = engVoice;
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.error("Browser speech synthesis failed:", e);
            }
        } else {
            throw error;
        }
    }
};

export const generateReplayVideo = async (description: string, eventId: number, format: 'landscape' | 'portrait' = 'landscape'): Promise<string | null> => {
    if (!isPaidVideoEnabled()) {
        return null;
    }
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
            const fullUrl = `${videoUri}&key=${api_key_raw}`;
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
    } catch (e) { 
        console.warn("Press Conference generation failed, using rich local engine:", e);
        const lower = context.toLowerCase();
        let q1 = "How do you evaluate your team's tactical discipline in today's performance?";
        let q2 = "There seemed to be some critical defensive lapses. What adjustments will you make in training?";
        let q3 = "With key fixtures coming up, how will you manage player fatigue and rotations?";

        if (lower.includes("win") || lower.includes("victory") || lower.includes("won")) {
            q1 = "An outstanding victory today! What do you think was the turning point in the match?";
            q2 = "Your team showed incredible chemistry. How do you keep this momentum going into next week?";
            q3 = "The fans are ecstatic. Do you believe this performance proves you can challenge for the title?";
        } else if (lower.includes("loss") || lower.includes("defeat") || lower.includes("lost")) {
            q1 = "A tough defeat today. Where do you feel the game plan fell apart?";
            q2 = "The board and fans are growing concerned about recent form. How do you respond to the pressure?";
            q3 = "We saw some players looking fatigued. Do you regret not making substitutions earlier?";
        } else if (lower.includes("draw") || lower.includes("tied")) {
            q1 = "You share the points today. Do you view this as a point gained or two points dropped?";
            q2 = "It was a close tactical battle in midfield. How did you react to their tactical adjustments?";
            q3 = "Both sides had chances to win it late. What was missing to secure all three points?";
        }

        return [q1, q2, q3];
    }
};

export const getInterviewQuestions = async (teamName: string, personality: string, league: string, team?: Team) => {
    let richContext = '';
    if (team) {
        richContext = `
        Club Details:
        - Prestige: ${team.prestige}/100
        - Financial Balance: $${team.balance.toLocaleString()}
        - Objectives: ${JSON.stringify(team.objectives)}
        - Current Squad Size: ${team.players.length} players
        - Current Tactics: Formation: ${team.tactic?.formation || '4-4-2'}, Mentality: ${team.tactic?.mentality || 'Balanced'}
        `;
    }
    const prompt = `
    You are the ${personality} Chairman of ${teamName} (${league}). 
    You are interviewing a new manager candidate.
    ${richContext}
    Generate 3 TOUGH, SPECIFIC questions based on the club's status, objectives, tactical profile, and your personality.
    
    RULES:
    1. Do NOT ask generic "What are your tactics?" questions.
    2. If personality is 'Moneyball', ask about youth development, stats, or selling players for profit.
    3. If 'Ambitious', ask about challenging for trophies, big signings, or pressure.
    4. Focus on the club's specific objectives and financial situation.
    
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
        console.warn("Chairman Interview generation failed, using rich local engine:", e);
        const lowerPersonality = personality.toLowerCase();
        if (lowerPersonality.includes("moneyball")) {
            return [
                `As the chairman of ${teamName}, I believe in stats. How will you use player metrics to build a competitive roster on a budget?`,
                "We need to maximize our resources. What is your stance on selling key stars if a massive bid comes in?",
                "Our youth academy is vital. How will you integrate and develop young players into the starting XI?"
            ];
        } else if (lowerPersonality.includes("ambitious")) {
            return [
                `We want trophies at ${teamName}. How will you handle the massive expectations and pressure to win immediately?`,
                "If we back you financially, what high-profile signings or profile upgrades will you prioritize?",
                "The fans expect beautiful, attacking football. Can you guarantee results while playing an attractive style?"
            ];
        } else {
            return [
                `What is your core tactical philosophy, and how will you adapt it to the current squad at ${teamName}?`,
                `Our board objective is clear. What steps will you take in your first 100 days to ensure we hit it?`,
                "How do you plan to handle player contract renewals and manage wage inflation in the dressing room?"
            ];
        }
    }
};

export const evaluateInterview = async (
    teamName: string,
    qs: string[],
    ans: string[],
    p: string,
    team?: Team,
    standingsText?: string,
    managerTactics?: string,
    pastPromises?: string
) => {
    let richContext = '';
    if (team) {
        richContext = `
        Club Details:
        - Prestige: ${team.prestige}/100
        - Financial Balance: $${team.balance.toLocaleString()}
        - Objectives: ${JSON.stringify(team.objectives)}
        - Current Tactics: Formation: ${team.tactic?.formation || '4-4-2'}, Mentality: ${team.tactic?.mentality || 'Balanced'}
        `;
    }
    const qAndAPairs = qs.map((q, i) => `Question: ${q}\nAnswer: ${ans[i] || "No answer"}`).join("\n\n");
    const prompt = `You are the chairman of ${teamName} with a personality described as "${p}".
${richContext}
${standingsText ? `Current Standings:\n${standingsText}\n` : ''}
${managerTactics ? `Candidate's Current Tactics:\n${managerTactics}\n` : ''}
${pastPromises ? `Candidate's Active Promises:\n${pastPromises}\n` : ''}

Evaluate the manager's job interview based on the following questions and answers:

${qAndAPairs}

Decide whether to offer them the job. Return a JSON object with:
- "offer": boolean (true if they should get the job, false otherwise)
- "reasoning": a string explaining your decision, written in the voice/tone of a ${p} chairman.

Response must be valid JSON matching:
{
  "offer": boolean,
  "reasoning": string
}`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { offer: true, reasoning: "We liked your tactical vision and believe you can take us forward." };
    }
};

const ATTACKING_POSITIONS = new Set<PlayerPosition>(['ST', 'CF', 'LW', 'RW', 'AM']);
const DEFENSIVE_POSITIONS = new Set<PlayerPosition>(['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB']);

const roundTo = (value: number, step: number) => Math.max(0, Math.round(value / step) * step);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const sanitizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const getBonusTypeForPosition = (position: PlayerPosition): ContractBonusType => {
    if (ATTACKING_POSITIONS.has(position)) return 'goal';
    if (DEFENSIVE_POSITIONS.has(position)) return 'cleanSheet';
    return 'appearance';
};

const bonusTypeLabel = (bonusType: ContractBonusType) => {
    if (bonusType === 'goal') return 'goal bonus';
    if (bonusType === 'cleanSheet') return 'clean-sheet bonus';
    return 'appearance bonus';
};

const getPreferredLengthRange = (personality: Player['personality']) => {
    switch (personality) {
        case 'Young Prospect':
            return { min: 4, max: 6 };
        case 'Ambitious':
            return { min: 3, max: 5 };
        case 'Leader':
            return { min: 2, max: 4 };
        case 'Loyal':
            return { min: 3, max: 6 };
        default:
            return { min: 2, max: 5 };
    }
};

const normalizeOffer = (
    player: Player,
    context: 'transfer' | 'renewal',
    offer?: Partial<ContractTerms> | null
): ContractTerms => {
    const bonusType = (offer?.bonusType && ['goal', 'cleanSheet', 'appearance'].includes(offer.bonusType))
        ? offer.bonusType
        : getBonusTypeForPosition(player.position);
    const defaultSigning = roundTo(player.wage * (context === 'transfer' ? 8 : 4), 1000);
    const defaultPerformance = roundTo(player.wage * (bonusType === 'goal' ? 0.2 : bonusType === 'cleanSheet' ? 0.12 : 0.08), 500);
    return {
        wage: roundTo(clamp(Number(offer?.wage) || player.wage, 1000, 2_500_000), 1000),
        length: clamp(Number(offer?.length) || Math.max(2, player.contractExpires || 3), 1, 7),
        signingBonus: roundTo(clamp(Number(offer?.signingBonus) || defaultSigning, 0, 20_000_000), 1000),
        performanceBonus: roundTo(clamp(Number(offer?.performanceBonus) || defaultPerformance, 0, 1_500_000), 500),
        bonusType,
    };
};

const extractPromisesFromAnswers = (answers: string[]) => {
    const joined = answers.join(' ').toLowerCase();
    const promises: string[] = [];
    if (/start|starter|starting xi|first team|undroppable/.test(joined)) {
        promises.push('Regular starting role.');
    }
    if (/captain|leadership|vice-captain/.test(joined)) {
        promises.push('Leadership responsibility in the squad.');
    }
    if (/title|trophy|champions league|europe|win/.test(joined)) {
        promises.push('Compete for major honors this season.');
    }
    if (/develop|improve|progress|growth|minutes/.test(joined)) {
        promises.push('Structured player development and consistent minutes.');
    }
    return [...new Set(promises)].slice(0, 3);
};

export const getPlayerTalkQuestions = async (
    player: Player,
    team: Team,
    context: 'transfer' | 'renewal'
): Promise<string[]> => {
    const objective = team.objectives?.[0] || 'push the club forward this season';
    const bonusType = getBonusTypeForPosition(player.position);
    const fallback = [
        context === 'transfer'
            ? `You are pitching ${team.name} to ${player.name}. Why should they leave ${player.currentClub || 'their current club'} for your project right now?`
            : `${player.name} is open to renewal talks. What role will you guarantee over the next season?`,
        `How exactly will you use ${player.name} as a ${player.position} in your ${team.tactic.formation} setup?`,
        `What can you promise about starts, competition, and long-term growth at ${team.name}?`,
        `The board objective is "${objective}". How does signing this deal help you deliver that target?`,
        `We are ready for numbers. What are your weekly wage, signing bonus, and ${bonusTypeLabel(bonusType)} terms?`,
    ];

    const prompt = `
    You are the player's AGENT in football contract talks.
    Context: ${context}. Club: ${team.name}. Player: ${player.name} (${player.position}, ${player.personality}).
    Generate exactly 5 negotiation questions addressed to the MANAGER.

    Hard rules:
    1. Questions must be manager-facing (use "you/your club"), never first-person player roleplay.
    2. Keep first 4 questions focused on role, ambitions, starts, project fit.
    3. 5th question must ask for weekly wage + signing bonus + ${bonusTypeLabel(bonusType)}.
    4. One sentence per question, no fluff.

    Return JSON: { "questions": ["q1", "q2", "q3", "q4", "q5"] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        const parsed = JSON.parse(cleanJson(response.text));
        const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
        const cleaned = rawQuestions
            .map((q: unknown) => sanitizeText(q))
            .filter(Boolean)
            .map((q: string) => (q.endsWith('?') ? q : `${q}?`));

        if (cleaned.length === 5 && cleaned.every((q: string) => /you|your/i.test(q))) {
            return cleaned;
        }
        return fallback;
    } catch {
        return fallback;
    }
};

export const evaluatePlayerTalk = async (
    player: Player,
    questions: string[],
    answers: string[],
    team: Team,
    context: 'transfer' | 'renewal',
    offer?: Partial<ContractTerms>
): Promise<NegotiationResult> => {
    const safeOffer = normalizeOffer(player, context, offer);
    const preferredLength = getPreferredLengthRange(player.personality);
    const bonusType = safeOffer.bonusType;
    const label = bonusTypeLabel(bonusType);

    // Compute expected/baseline values for mock calculation & fallback
    const personalityMultiplier: Record<Player['personality'], number> = {
        Ambitious: 1.2,
        Loyal: 0.95,
        Mercenary: 1.25,
        'Young Prospect': 1.05,
        Leader: 1.1,
        Professional: 1.0,
        Volatile: 1.15,
    };

    const expectedWage = roundTo(player.wage * personalityMultiplier[player.personality] * (context === 'transfer' ? 1.12 : 1.03), 1000);
    const expectedSigningBonus = roundTo(player.wage * (context === 'transfer' ? 8 : 4) * personalityMultiplier[player.personality], 1000);
    const expectedPerformanceBonus = roundTo(
        player.wage * (bonusType === 'goal' ? 0.2 : bonusType === 'cleanSheet' ? 0.12 : 0.08),
        500
    );

    const wageScore = safeOffer.wage / Math.max(expectedWage, 1);
    const signingScore = safeOffer.signingBonus / Math.max(expectedSigningBonus, 1);
    const performanceScore = safeOffer.performanceBonus / Math.max(expectedPerformanceBonus, 1);
    const lengthDistance =
        safeOffer.length < preferredLength.min
            ? preferredLength.min - safeOffer.length
            : safeOffer.length > preferredLength.max
                ? safeOffer.length - preferredLength.max
                : 0;
    const lengthScore = clamp(1 - (lengthDistance * 0.18), 0.3, 1.2);

    const joinedAnswers = answers.join(' ').toLowerCase();
    const ambitionSignal = /champions|title|trophy|europe|project|elite/.test(joinedAnswers) ? 0.08 : 0;
    const roleSignal = /start|starter|starting|key player|build around|regular minutes/.test(joinedAnswers) ? 0.08 : 0;
    const developmentSignal = /develop|improve|growth|plan/.test(joinedAnswers) ? 0.05 : 0;
    const financePenalty = team.balance < safeOffer.signingBonus ? -0.2 : 0;

    const totalScore =
        (wageScore * 0.5) +
        (signingScore * 0.2) +
        (performanceScore * 0.15) +
        (lengthScore * 0.15) +
        ambitionSignal +
        roleSignal +
        developmentSignal +
        financePenalty;

    const promises = extractPromisesFromAnswers(answers);

    const prompt = `You are evaluating a player contract negotiation in a football management simulator.
Player Info:
- Name: ${player.name}
- Position: ${player.position}
- Current Rating: ${player.rating} (Potential: ${player.potential})
- Age: ${player.age}
- Personality: ${player.personality}
- Current Wage: $${player.wage.toLocaleString()}/week

Club Details:
- Name: ${team.name}
- Current League: ${team.league}
- Financial Balance: $${team.balance.toLocaleString()}
- Objectives: ${JSON.stringify(team.objectives)}
- Manager's Current Tactics: Formation: ${team.tactic.formation}, Mentality: ${team.tactic.mentality}
- Active Promises: ${JSON.stringify(team.activePromises)}

Negotiation Context:
- Type: ${context} (new transfer or contract renewal)

Offered Terms:
- Wage Offered: $${safeOffer.wage.toLocaleString()}/week
- Contract Length: ${safeOffer.length} years (Expected range for this player: ${preferredLength.min} to ${preferredLength.max} years)
- Signing Bonus: $${safeOffer.signingBonus.toLocaleString()}
- Performance Bonus: $${safeOffer.performanceBonus.toLocaleString()} (${label})

Conversation History (Questions asked by the manager, and player's answers):
${questions.map((q, i) => `Question: ${q}\nAnswer: ${answers[i] || 'No answer'}`).join('\n\n')}

Evaluating using mathematical baseline score (for your reference):
- Mathematical Score is: ${totalScore.toFixed(3)}. Typically >= 1.02 is accepted, >= 0.76 is a counter-offer, below that is rejected.
- Expected baseline wage: $${expectedWage.toLocaleString()}/week
- Expected signing bonus: $${expectedSigningBonus.toLocaleString()}
- Expected performance bonus: $${expectedPerformanceBonus.toLocaleString()}

Evaluate the offer. If the decision is 'counter', you MUST provide a reasonable 'counterOffer' object in JSON reflecting the player's demands. If 'accepted' or 'rejected', the counterOffer field should be null or omitted.
Also, analyze the answers and extract any specific promises/guarantees the manager made to the player. Return these in the 'extractedPromises' list.

Return JSON response with the following format:
{
  "decision": "accepted" | "counter" | "rejected",
  "reasoning": "A statement from the player explaining their decision, written in their voice reflecting personality.",
  "counterOffer": {
    "wage": number,
    "length": number,
    "signingBonus": number,
    "performanceBonus": number,
    "bonusType": "goal" | "cleanSheet" | "appearance"
  } | null,
  "extractedPromises": ["string"]
}`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsedResult = JSON.parse(cleanJson(response.text));
        
        if (parsedResult && (parsedResult.decision === 'accepted' || parsedResult.decision === 'counter' || parsedResult.decision === 'rejected')) {
            const decision = parsedResult.decision;
            const reasoning = parsedResult.reasoning || '';
            const extractedPromises = Array.isArray(parsedResult.extractedPromises) ? parsedResult.extractedPromises : promises;
            
            let counterOffer: ContractTerms | undefined = undefined;
            if (decision === 'counter' && parsedResult.counterOffer) {
                counterOffer = normalizeOffer(player, context, parsedResult.counterOffer);
            }
            
            return {
                decision,
                reasoning,
                counterOffer,
                extractedPromises
            };
        }
    } catch (e) {
        console.warn("Gemini evaluation failed, falling back to local simulation:", e);
    }

    if (totalScore >= 1.02 && wageScore >= 0.88) {
        return {
            decision: 'accepted',
            reasoning: `The package is acceptable. ${player.name} agrees to ${safeOffer.length} years on $${safeOffer.wage.toLocaleString()}/week, a $${safeOffer.signingBonus.toLocaleString()} signing bonus, and a $${safeOffer.performanceBonus.toLocaleString()} ${label}.`,
            extractedPromises: promises,
        };
    }

    if (totalScore >= 0.76) {
        const counter: ContractTerms = {
            wage: roundTo(Math.max(safeOffer.wage, expectedWage), 1000),
            length: clamp(
                safeOffer.length < preferredLength.min ? preferredLength.min :
                safeOffer.length > preferredLength.max ? preferredLength.max :
                safeOffer.length,
                1,
                7
            ),
            signingBonus: roundTo(Math.max(safeOffer.signingBonus, expectedSigningBonus * 0.9), 1000),
            performanceBonus: roundTo(Math.max(safeOffer.performanceBonus, expectedPerformanceBonus), 500),
            bonusType,
        };
        return {
            decision: 'counter',
            reasoning: `We are close, but the terms need improvement. We need around $${counter.wage.toLocaleString()}/week, $${counter.signingBonus.toLocaleString()} signing bonus, and $${counter.performanceBonus.toLocaleString()} ${label} over ${counter.length} years.`,
            counterOffer: counter,
            extractedPromises: promises,
        };
    }

    return {
        decision: 'rejected',
        reasoning: `The proposal is too far below expectations. Wage, incentives, and/or contract structure do not match ${player.name}'s market level.`,
        extractedPromises: promises,
    };
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
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
        return response.text || "Keep the shape compact and focus on quick counter-attacks down the wings.";
    } catch (e) {
        return "Tactics look solid. Encourage the players to maintain their concentration and control spatial transitions.";
    }
};

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `Simulate international break Week ${week}. JSON: { "newsTitle": "string", "newsBody": "string" }`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return {
            newsTitle: `International Break Complete`,
            newsBody: `With the international break over, all players have returned safely to their club training facilities. The coaching staff is preparing for the upcoming match fixtures.`
        };
    }
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

export interface TournamentRivalryResult {
    riftSeverity: RiftSeverity;
    duration: number;
    reason: string;
    affectedScope: RiftScope;
}

export const getTeammateTournamentRivalry = async (
    playerA: { name: string; personality: string; nationality: string },
    playerB: { name: string; personality: string; nationality: string },
    competition: 'World Cup' | 'Euros' | 'Copa America' | 'Qualifier' | 'Friendly',
    round: 'Final' | 'Semi Final' | 'Quarter Final' | 'Round of 16' | 'Group Stage',
    result: 'won' | 'lost' | 'draw',
    involvement: 'scorer' | 'assist-or-save' | 'full-match' | 'minimal'
): Promise<TournamentRivalryResult> => {
    const prompt = `
You are a football psychology AI. Assess the rift between two club teammates who faced each other in an international tournament.

Player A: ${playerA.name} (${playerA.personality}, ${playerA.nationality}) — they LOST this match.
Player B: ${playerB.name} (${playerB.personality}, ${playerB.nationality}) — they WON this match.
Competition: ${competition}
Round: ${round}
Player A's involvement: ${involvement}

PERSONALITY RULES (apply strictly):
- Leader / Professional: Separates club from country. Even a World Cup Final defeat = mild, short rift.
- Volatile: Loss amplifies the rift significantly. Even low-stakes losses can cause flare-ups.
- Mercenary: Image-driven. A big-stage loss = brand damage. May extend rift to ALL players from the rival nation (affectedScope: "nation-wide"), not just Player B.
- Ambitious: A club teammate winning what they lost creates jealousy — they may demand to be clear first choice.
- Young Prospect: May idolise opponent and take it lightly, or be devastated — use context to decide.
- Loyal: Most forgiving. Rift is suppressed easily.

SEVERITY MATRIX:
- Competition weight: World Cup highest, Euros/Copa America high, Qualifier/Friendly very low
- Round weight: Final > Semi > Quarter > R16 > Group Stage
- Involvement weight: Scorer of decider = maximum; assist/save = high; full match = low; minimal = minimal (0-2 weeks)

Return JSON:
{
    "riftSeverity": "none" | "minor" | "moderate" | "serious",
    "duration": number (weeks, 0–16),
    "reason": "string (one vivid sentence explaining the rift)",
    "affectedScope": "direct" | "nation-wide"
}
If result is 'draw' or involvement is 'minimal' and competition is low-stakes, riftSeverity should be "none" or "minor".
`;
    try {
        const ai = getAIInstance();
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { riftSeverity: 'none', duration: 0, reason: 'No significant rift.', affectedScope: 'direct' };
    }
};

export interface PostTournamentMoraleResult {
    morale: 'Winner' | 'FiredUp' | 'Disappointed';
    message: string;
    durationWeeks: number;
}

export const getPlayerPostTournamentMorale = async (
    player: { name: string; personality: string },
    result: 'won' | 'lost' | 'group-exit',
    competition: string,
    round: string
): Promise<PostTournamentMoraleResult> => {
    const prompt = `
You are a football psychology AI. Determine the post-tournament morale effect for a player returning to their club.

Player: ${player.name} (Personality: ${player.personality})
Tournament: ${competition}, exited at: ${round}
Result: ${result}

RULES:
- Mercenary who WON a major tournament: massive ego boost, returns demanding more playing time. morale: "Winner", high duration (8-12 weeks).
- Leader who LOST: recovers quickly, professional. morale: "Disappointed", low duration (1-3 weeks).
- Volatile who LOST: deeply affected, morale "Disappointed", moderate duration (4-8 weeks).
- Ambitious who LOST a final to a club teammate: jealousy, morale "FiredUp" but edgy, moderate duration.
- Young Prospect who WON: thrilled, morale "FiredUp", moderate duration.
- Loyal who WON: quietly pleased, morale "Winner", low-moderate duration.

Return JSON:
{
    "morale": "Winner" | "FiredUp" | "Disappointed",
    "message": "string (one sentence flavour text for the squad feed)",
    "durationWeeks": number (1–12)
}
`;
    try {
        const ai = getAIInstance();
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { morale: 'Disappointed', message: `${player.name} returns from international duty.`, durationWeeks: 2 };
    }
};

export interface ClubNegotiationResult {
    decision: 'accepted' | 'rejected' | 'counter';
    counterFee?: number;
    response: string;
}

export const negotiateTransferBid = async (
    player: Player,
    buyingClub: string,
    offeredFee: number,
    userMessage: string,
    history: { sender: 'manager' | 'director'; message: string }[]
): Promise<ClubNegotiationResult> => {
    const formattedHistory = history.map(h => `${h.sender === 'manager' ? 'You (Manager)' : `${buyingClub} Director`}: "${h.message}"`).join('\n');
    const prompt = `
You are the Director of Football for ${buyingClub} negotiating to buy ${player.name} (${player.position}, age ${player.age}, rating ${player.rating}) from the manager's club.
We originally offered $${offeredFee.toLocaleString()}.
The manager has just sent you this message: "${userMessage}"

Conversation History:
${formattedHistory}

Decide whether to accept the manager's counter-offer/reasoning, reject it entirely, or counter-offer with a new fee.
RULES:
1. Be realistic and stay in character. If the manager asks for way too much (e.g. >1.5x market value of $${(player.marketValue || 0).toLocaleString()}), reject it.
2. If the manager makes a reasonable case or minor increase (e.g., +10%), you can accept or counter slightly below.
3. If you make a counter-offer, specify "decision": "counter" and set "counterFee" as a number.
4. Keep the character voice strong and unhinged/realistic depending on the club (e.g. Real Madrid/Levy/etc.).

Return JSON:
{
    "decision": "accepted" | "counter" | "rejected",
    "counterFee": number (if countering, otherwise null),
    "response": "A message explaining your response in your character voice."
}
`;
    try {
        const ai = getAIInstance();
        const response = await ai.models.generateContent({ 
            model: MODEL_TEXT, 
            contents: prompt, 
            config: { responseMimeType: "application/json" } 
        });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return {
            decision: 'counter',
            counterFee: Math.round(offeredFee * 1.1),
            response: "We can go slightly higher, but let's meet in the middle."
        };
    }
};
