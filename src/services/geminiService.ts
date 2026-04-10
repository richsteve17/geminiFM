
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage, NegotiationResult, TacticalShout, PromiseData, ShoutEffect, RiftSeverity, RiftScope } from '../types';

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

export interface SegmentContext {
    shout?: string;
    userTeamName: string | null;
    tacticalContext?: string;
    userFormation?: string;
    userMentality?: string;
    opponentFormation?: string;
    opponentMentality?: string;
    shoutEffect?: {
        momentumDelta: number;
        defensiveModifier: number;
        attackModifier: number;
    };
    riftPairs?: { playerA: string; playerB: string; severity: string }[];
    bondPairs?: { playerA: string; playerB: string }[];
}

export const simulateMatchSegment = async (
    homeTeam: Team, 
    awayTeam: Team, 
    currentMatchState: MatchState, 
    targetMinute: number, 
    context: SegmentContext
) => {
    const userInstruction = context.shout ? `Manager's touchline instruction: "${context.shout}". Apply this to momentum and events.` : "";
    const tacticalInfo = context.tacticalContext ? `TACTICAL REALITY CHECK:\n${context.tacticalContext}` : "";

    const userTeamLabel = context.userTeamName || homeTeam.name;
    const isUserHome = userTeamLabel === homeTeam.name;
    const userSide = isUserHome ? 'HOME' : 'AWAY';

    let formationMentalityBlock = "";
    if (context.userFormation || context.userMentality) {
        const oppFormation = context.opponentFormation || "4-4-2";
        const oppMentality = context.opponentMentality || "Balanced";
        formationMentalityBlock = `
FORMATION & MENTALITY (must directly influence events):
- ${userTeamLabel} [${userSide}]: Formation ${context.userFormation || "4-4-2"}, Mentality "${context.userMentality || "Balanced"}"
- Opponent: Formation ${oppFormation}, Mentality "${oppMentality}"

MENTALITY RULES — apply strictly:
- "All-Out Attack": Generate 3-5 attacking events/chances, high shot frequency, but BACKLINE IS EXPOSED — opponent gets at least 1 clear counter-attack chance.
- "Attacking": Generate 2-3 chances, some defensive gaps.
- "Balanced": Realistic mix of attack and defense.
- "Defensive": Max 1-2 shots for ${userTeamLabel}, tight backline, opponent struggles to create clear chances.
- "Park the Bus": ${userTeamLabel} generates almost no shots but conceding chances are very rare. Low-event, disciplined segment.
`;
    }

    let shoutEffectBlock = "";
    if (context.shoutEffect) {
        const { momentumDelta, defensiveModifier, attackModifier } = context.shoutEffect;
        shoutEffectBlock = `
ACTIVE SHOUT EFFECT (apply to this segment):
- Momentum shift: ${momentumDelta > 0 ? `+${momentumDelta}` : momentumDelta} (add to current momentum).
- Defensive modifier: ${defensiveModifier < 0 ? `${defensiveModifier} (harder to concede — reduce opponent chances)` : defensiveModifier > 0 ? `+${defensiveModifier} (defensive line pushed up — opponent may exploit space)` : "no change"}.
- Attack modifier: ${attackModifier > 0 ? `+${attackModifier} (more shots/pressure from ${userTeamLabel})` : attackModifier < 0 ? `${attackModifier} (reduce attacking output)` : "no change"}.
`;
    }
    
    let chemistryInfo = "";
    if (context.riftPairs && context.riftPairs.length > 0) {
        chemistryInfo += `\nACTIVE RIFTS (increases Miscommunication probability):\n`;
        context.riftPairs.forEach(r => {
            chemistryInfo += `- ${r.playerA} vs ${r.playerB} (${r.severity} rift) — their interactions may cause errors, miscommunications or poor passing.\n`;
        });
    }
    if (context.bondPairs && context.bondPairs.length > 0) {
        chemistryInfo += `\nACTIVE BONDS (positive chemistry modifier):\n`;
        context.bondPairs.forEach(b => {
            chemistryInfo += `- ${b.playerA} and ${b.playerB} have international bond — their combination play is sharper than usual.\n`;
        });
    }
    
    const prompt = `Football Match Sim: ${homeTeam.name} vs ${awayTeam.name}. 
    Current State: Minute ${currentMatchState.currentMinute}, Score ${currentMatchState.homeScore}-${currentMatchState.awayScore}, Momentum ${currentMatchState.momentum}.
    Task: Simulate ONLY from minute ${currentMatchState.currentMinute + 1} to ${targetMinute}.
    
    ${userInstruction}
    ${formationMentalityBlock}
    ${shoutEffectBlock}
    ${tacticalInfo}
    ${chemistryInfo}
    
    CRITICAL INSTRUCTIONS:
    1. If a team has low Tactical Efficiency (<50%), they MUST make mistakes.
    2. If a player has [FATIGUED] flag, they MUST make an error or be substituted — mention them specifically.
    3. If a player has [MISPLACED] flag, they are 50% less effective — generate events showing their struggles.
    4. If a player is Out of Position (e.g. ST in Goal), specific events MUST mention them failing at their role.
    5. Events must be realistic to the clock. Don't score 5 goals in 10 minutes unless efficiency is 0%.
    6. Mentality and formation MUST visibly shape what events are generated (not just vibe words).
    7. If there are active rifts, occasionally generate a "commentary" event referencing the miscommunication between the named players.
    8. If there are active bonds, occasionally generate a "commentary" event highlighting their chemistry.
    
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

export type ScoutArchetype = 'Pessimist' | 'Romantic' | 'Mercenary' | 'Pragmatist';

export interface ScoutedPlayer {
    player: Player;
    reportParagraph: string;
    personalityFlag: string;
    agentNote: string;
    confidenceLevel: 'High Confidence' | 'Heard Good Things' | 'Unconfirmed Tip';
}

export interface ScoutReport {
    scoutNarrative: string;
    players: ScoutedPlayer[];
}

const SCOUT_ARCHETYPE_PROMPTS: Record<ScoutArchetype, string> = {
    Pessimist: `You are a deeply cynical scout who has seen too many promising careers end in mediocrity. You undersell everyone. You always find a flaw, a doubt, a warning sign. Even genuine talent gets a caveat — the injury record, the bad attitude, the agent demanding absurd wages. Your prose is dry, skeptical, and laced with quiet despair.`,
    Romantic: `You are an idealist scout who falls in love with flair. You oversell technique and creativity, get carried away about potential, compare players to legends at the slightest excuse. You are enthusiastic, almost poetic, and occasionally lose sight of defensive liability. Your prose is warm, effusive, and slightly breathless.`,
    Mercenary: `You are a transactional scout who only cares about value. Everything is about contracts, sell-on clauses, agent fees, and market windows. You know every agent's reputation. You assess players primarily as financial assets. Your prose is cold, efficient, and commercially sharp.`,
    Pragmatist: `You are a grounded, experienced scout who gives balanced, honest assessments. You note strengths and weaknesses equally, flag uncertainty without drama, and always tie your report back to what the manager actually needs. Your prose is measured, direct, and trustworthy.`,
};

const buildScoutPrompt = (request: string, archetype: ScoutArchetype, useRealWorld: boolean, isFictional: boolean): string => {
    const archetypeInstructions = SCOUT_ARCHETYPE_PROMPTS[archetype];
    const mode = useRealWorld
        ? `Using Google Search, identify 3 REAL CURRENT football players that match this description. Ground your report in actual facts — real club, real age, real nationality, real recent form. Do not invent players.`
        : isFictional
        ? `Generate 3 entirely fictional players with invented names, clubs, and backgrounds. These are players from a long-term football simulation — they should feel real but must not be real people.`
        : `Generate 3 fictional players who fit this description. Invent realistic names, clubs (from real football leagues), and backgrounds.`;

    return `${archetypeInstructions}

Scout Assignment: "${request}"

${mode}

For each player, write a genuine scouting assessment in your voice as this scout archetype. The report must include:
- A prose paragraph (3-5 sentences) assessing this player — written in your archetype's voice
- A personality/attitude flag (one sentence about their character, mentality, or dressing room reputation)
- An agent/availability note (one sentence about their contract situation, agent reputation, or how hard they'd be to sign)
- A confidence level: "High Confidence" (you've watched them multiple times), "Heard Good Things" (reliable second-hand info), or "Unconfirmed Tip" (whispers only)

Also write a brief opening narrative paragraph (1-2 sentences) from you as the scout, addressing the manager directly — your gut reaction to this assignment.

Respond ONLY with valid JSON in this exact structure (no markdown):
{
  "scoutNarrative": "string",
  "players": [
    {
      "name": "string",
      "position": "GK"|"LB"|"CB"|"RB"|"LWB"|"RWB"|"DM"|"CM"|"AM"|"LM"|"RM"|"LW"|"RW"|"ST"|"CF",
      "rating": number (60-95),
      "age": number,
      "nationality": "emoji flag",
      "currentClub": "string",
      "wage": number (weekly in USD, realistic for their level),
      "marketValue": number (in USD),
      "reportParagraph": "string",
      "personalityFlag": "string",
      "agentNote": "string",
      "confidenceLevel": "High Confidence"|"Heard Good Things"|"Unconfirmed Tip"
    }
  ]
}`;
};

export const scoutPlayers = async (
    request: string, 
    useRealWorld: boolean = false, 
    archetype?: ScoutArchetype,
    isFictional?: boolean
): Promise<ScoutReport> => {
    const selectedArchetype = archetype || (['Pessimist', 'Romantic', 'Mercenary', 'Pragmatist'] as ScoutArchetype[])[Math.floor(Math.random() * 4)];
    const selectedModel = useRealWorld ? MODEL_SEARCH : MODEL_TEXT;
    const prompt = buildScoutPrompt(request, selectedArchetype, useRealWorld, isFictional || false);
    
    const config: any = { responseMimeType: "application/json" };
    if (useRealWorld) {
        config.tools = [{ googleSearch: {} }];
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: selectedModel, contents: prompt, config
        });
        
        const jsonStr = cleanJson(response.text);
        const res = JSON.parse(jsonStr);
        
        const VALID_CONFIDENCE = ['High Confidence', 'Heard Good Things', 'Unconfirmed Tip'];
        const players: ScoutedPlayer[] = (res.players || []).map((p: any) => ({
            player: {
                name: p.name || 'Unknown Player',
                position: p.position || 'CM',
                rating: typeof p.rating === 'number' ? Math.min(99, Math.max(40, p.rating)) : 70,
                age: typeof p.age === 'number' ? p.age : 24,
                nationality: p.nationality || '🌍',
                personality: 'Professional' as const,
                wage: typeof p.wage === 'number' ? p.wage : 5000,
                marketValue: typeof p.marketValue === 'number' ? p.marketValue : 500000,
                currentClub: p.currentClub || 'Free Agent',
                scoutingReport: p.reportParagraph || '',
                status: { type: 'Available' as const },
                effects: [],
                contractExpires: 3,
                isStarter: false,
                condition: 100,
            },
            reportParagraph: p.reportParagraph || 'No report available.',
            personalityFlag: p.personalityFlag || 'Character unknown.',
            agentNote: p.agentNote || 'Availability unconfirmed.',
            confidenceLevel: VALID_CONFIDENCE.includes(p.confidenceLevel) ? p.confidenceLevel : 'Heard Good Things',
        }));

        return {
            scoutNarrative: res.scoutNarrative || '',
            players,
        };
    } catch (e) { 
        console.error("Scouting Error", e);
        return { scoutNarrative: '', players: [] };
    }
};

export const scoutFollowUp = async (
    originalRequest: string,
    previousResponse: string,
    followUpQuestion: string,
    archetype: ScoutArchetype,
    useRealWorld: boolean
): Promise<string> => {
    const archetypeInstructions = SCOUT_ARCHETYPE_PROMPTS[archetype];
    const searchNote = useRealWorld
        ? "You have access to real-world football information via Google Search. Ground any additional details in real facts."
        : "You are working from your own scouting notes on fictional players.";

    const prompt = `${archetypeInstructions}

${searchNote}

You previously received this scouting assignment from the manager: "${originalRequest}"

Your previous scouting report was:
${previousResponse}

The manager is now asking a follow-up question: "${followUpQuestion}"

Respond in character as this scout. Either provide more specific detail about the players you mentioned, or honestly admit the limits of your knowledge. Stay in your archetype's voice. Keep the response to 2-4 sentences — conversational, not another full report. Do not use JSON. Just reply as the scout.`;

    const selectedModel = useRealWorld ? MODEL_SEARCH : MODEL_TEXT;
    const config: any = {};
    if (useRealWorld) {
        config.tools = [{ googleSearch: {} }];
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: selectedModel, contents: prompt, config
        });
        return response.text || "I don't have more information on that right now.";
    } catch (e) {
        console.error("Scout follow-up error", e);
        return "I don't have more information on that right now.";
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


export interface ChatMessage {
    role: 'chairman' | 'journalist' | 'manager';
    text: string;
}

export interface InterviewContext {
    teamName: string;
    league: string;
    chairmanPersonality: string;
    boardObjectives: string[];
    managerReputation: number;
}

export const getInterviewOpeningMessage = async (ctx: InterviewContext): Promise<string> => {
    const prompt = `
You are the ${ctx.chairmanPersonality} Chairman of ${ctx.teamName} (${ctx.league}).
Manager reputation score: ${ctx.managerReputation}/100.
Board objectives: ${ctx.boardObjectives.join(', ') || 'none stated'}.

Open the job interview with a brief, in-character greeting and your FIRST tough question. 
- Traditionalist: formal, values history and culture.
- Ambitious Tycoon: impatient, wants big names and trophies fast.
- Moneyball Advocate: data-driven, asks about stats and resale value.
- Fan-Focused Owner: community and fan engagement matters most.
Keep it under 3 sentences. Do not mention your own name.
Respond with only the spoken dialogue.`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
        return response.text?.trim() || "Thank you for coming in. Let's get straight to it — why should I hire you over the other candidates?";
    } catch (e) {
        return "Thank you for coming in. Let's get straight to it — why should I hire you over the other candidates?";
    }
};

export const continueInterviewChat = async (
    ctx: InterviewContext,
    history: ChatMessage[]
): Promise<{ message: string; isDecision: boolean; offer?: boolean }> => {
    const transcript = history.map(m => `${m.role === 'manager' ? 'Manager' : 'Chairman'}: ${m.text}`).join('\n');
    const prompt = `
You are the ${ctx.chairmanPersonality} Chairman of ${ctx.teamName} (${ctx.league}).
Board objectives: ${ctx.boardObjectives.join(', ') || 'none stated'}.
Manager reputation: ${ctx.managerReputation}/100.

Interview transcript so far:
${transcript}

Based on the conversation, do ONE of these:
A) Ask a natural follow-up or new tough question (continue interview, 1–2 sentences).
B) If you have enough info (at least 3 manager responses), make a decision.

RULES:
- A ridiculous, offensive, or totally irrelevant answer (e.g. answering a tactics question by listing song lyrics) MUST end in rejection.
- An evasive, vague answer should get a sharp follow-up.
- A strong, personality-matched answer can lead to an offer.
- Be realistic: rejection is a common outcome.

Return JSON: {
  "message": "string (chairman's spoken words)",
  "isDecision": boolean,
  "offer": boolean (only if isDecision is true; true = job offer, false = rejection)
}`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { message: "Let me think about that. Do you have any questions for me?", isDecision: false };
    }
};

export const evaluateInterview = async (
    teamName: string,
    transcript: ChatMessage[],
    personality: string,
    boardObjectives: string[]
) => {
    const transcriptText = transcript.map(m => `${m.role === 'manager' ? 'Manager' : 'Chairman'}: ${m.text}`).join('\n');
    const prompt = `
You are evaluating a job interview for the manager role at ${teamName}.
Chairman personality: ${personality}.
Board objectives: ${boardObjectives.join(', ') || 'none'}.

Full transcript:
${transcriptText}

Make a final hiring decision based on the ACTUAL content of the conversation.
Be critical. Reject if answers were vague, irrelevant, or showed poor understanding.
JSON: { "offer": boolean, "reasoning": "string (1–2 sentences in the chairman's voice)" }`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { offer: false, reasoning: "We've decided to go in a different direction." };
    }
};

export interface PressConferenceContext {
    teamName: string;
    opponentName: string;
    homeScore: number;
    awayScore: number;
    isHome: boolean;
    keyEvents: string[];
    leaguePosition: number;
    opponentPrestige: number;
    activePromises: string[];
    activeRifts: string[];
    currentWeek: number;
}

export const generatePressConferenceOpener = async (ctx: PressConferenceContext): Promise<string> => {
    const userGoals = ctx.isHome ? ctx.homeScore : ctx.awayScore;
    const oppGoals = ctx.isHome ? ctx.awayScore : ctx.homeScore;
    const result = userGoals > oppGoals ? 'win' : userGoals === oppGoals ? 'draw' : 'defeat';
    const keyEventsStr = ctx.keyEvents.slice(0, 3).join('; ') || 'none notable';

    const prompt = `
You are a football journalist at a post-match press conference.
Match: ${ctx.teamName} ${result} vs ${ctx.opponentName} (${ctx.homeScore}-${ctx.awayScore}).
League position: ${ctx.leaguePosition}. Week: ${ctx.currentWeek}.
Key events: ${keyEventsStr}.
Active promises: ${ctx.activePromises.join(', ') || 'none'}.
Active rifts/controversies: ${ctx.activeRifts.join(', ') || 'none'}.

Ask ONE sharp, context-aware opening question. Reference the actual result or a specific event if relevant. Keep it under 2 sentences.
Respond with only the journalist's spoken question.`;
    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
        return response.text?.trim() || "How do you assess today's performance?";
    } catch (e) {
        return "How do you assess today's performance?";
    }
};

export const continuePressConferenceChat = async (
    ctx: PressConferenceContext,
    history: ChatMessage[]
): Promise<{ message: string; isDone: boolean; reputationDelta: number }> => {
    const userGoals = ctx.isHome ? ctx.homeScore : ctx.awayScore;
    const oppGoals = ctx.isHome ? ctx.awayScore : ctx.homeScore;
    const result = userGoals > oppGoals ? 'win' : userGoals === oppGoals ? 'draw' : 'defeat';
    const transcript = history.map(m => `${m.role === 'manager' ? 'Manager' : 'Journalist'}: ${m.text}`).join('\n');

    const prompt = `
You are a football journalist at a post-match press conference.
Match: ${ctx.teamName} ${result} vs ${ctx.opponentName} (${ctx.homeScore}-${ctx.awayScore}).
League position: ${ctx.leaguePosition}. Key events: ${ctx.keyEvents.slice(0, 3).join('; ') || 'none'}.
Active promises: ${ctx.activePromises.join(', ') || 'none'}.

Transcript:
${transcript}

Now, do ONE of:
A) Follow up or ask a new probing question (if manager was evasive or after fewer than 3 manager responses).
B) Wrap up the press conference (after 3+ manager responses).

Assess the manager's tone: professional, honest, and direct responses improve reputation. Evasive or dismissive responses hurt it.

Return JSON: {
  "message": "string (journalist's next spoken question, or a brief closing remark if isDone)",
  "isDone": boolean,
  "reputationDelta": number (-3 to +3, based on how the manager handled this session overall)
}`;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { message: "Thank you, that's all for today.", isDone: true, reputationDelta: 0 };
    }
};


export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string, bondContext?: { squadMate: string; competition: string }) => {
    let bondNote = '';
    if (bondContext) {
        bondNote = `IMPORTANT: ${p.name} has a strong international bond with ${bondContext.squadMate} already at ${t.name} from the ${bondContext.competition}. Reference this connection in a question to make the negotiation feel personal.`;
    }
    const prompt = `Negotiation with ${p.name} (${p.personality}) for ${t.name}. ${bondNote} Generate 3 relevant negotiation questions. JSON: { "questions": [] }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text)).questions;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string, offer: any, bondContext?: { squadMate: string; competition: string }): Promise<NegotiationResult> => {
    let bondNote = '';
    if (bondContext) {
        bondNote = `REUNION FACTOR: ${p.name} has a Teammate Bond with ${bondContext.squadMate} at ${t.name} from the ${bondContext.competition}. This makes the player MORE willing to sign — the agent should mention it and the wage/fee demand should be slightly lower than normal to reflect this desire to reunite.`;
    }
    const prompt = `
    Roleplay as the Agent for ${p.name}.
    User offer: $${offer.wage}, ${offer.length} years.
    History: ${JSON.stringify(ans)}.
    Context: Negotiation with ${t.name}.
    Previous Wage: $${p.wage}.
    ${bondNote}
    
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

export interface AssistantContext {
    userTeamName: string;
    opponentTeamName: string;
    opponentPrestige: number;
    formation: string;
    opponentFormation: string;
    momentum: number;
    starters: Array<{ name: string; position: string; condition: number; isOutOfPosition: boolean; slotRole: string }>;
}

export const getAssistantAnalysis = async (h: Team, a: Team, s: MatchState, u: string, ctx?: AssistantContext): Promise<string> => {
    let prompt: string;
    if (ctx) {
        const starterLines = ctx.starters.map(p => `- ${p.name} (${p.position}, condition ${p.condition}%${p.isOutOfPosition ? `, OUT OF POSITION as ${p.slotRole}` : ''})`).join('\n');
        prompt = `
You are an assistant manager giving tactical advice mid-match.
Our team: ${ctx.userTeamName} | Formation: ${ctx.formation} | Momentum: ${ctx.momentum > 0 ? '+' : ''}${ctx.momentum}
Opponent: ${ctx.opponentTeamName} (prestige ${ctx.opponentPrestige}) | Formation: ${ctx.opponentFormation}
Score: ${s.homeScore}-${s.awayScore}

Starting XI:
${starterLines}

Give concise, specific advice (2–3 sentences). Reference specific players by name. Address out-of-position issues or momentum problems if relevant.`;
    } else {
        prompt = `Tactical advice for ${u}. Score ${s.homeScore}-${s.awayScore}.`;
    }
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt });
    return response.text || "No advice.";
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
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { morale: 'Disappointed', message: `${player.name} returns from international duty.`, durationWeeks: 2 };
    }
};

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `Simulate international break Week ${week}. JSON: { "newsTitle": "string", "newsBody": "string" }`;
    const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const processTouchlineInteraction = async (userShout: string, team: Team, matchState: MatchState, isHome: boolean): Promise<ShoutEffect> => {
    const shoutLower = userShout.toLowerCase();

    let baseEffect: Partial<ShoutEffect> = {};
    if (shoutLower.includes('demand more') || shoutLower.includes('push') || shoutLower.includes('press') || shoutLower.includes('attack')) {
        baseEffect = { momentumDelta: 2, defensiveModifier: 1, attackModifier: 2 };
    } else if (shoutLower.includes('tighten') || shoutLower.includes('defend') || shoutLower.includes('hold') || shoutLower.includes('park')) {
        baseEffect = { momentumDelta: 0, defensiveModifier: -3, attackModifier: -1 };
    } else if (shoutLower.includes('forward') || shoutLower.includes('all out') || shoutLower.includes('go for it')) {
        baseEffect = { momentumDelta: 3, defensiveModifier: 2, attackModifier: 3 };
    }

    const prompt = `You are a football match analyst. The manager shouted: "${userShout}". 
Score: ${matchState.homeScore}-${matchState.awayScore}, Momentum: ${matchState.momentum}.
Determine the tactical effect of this shout on the next 15-minute segment.
Return ONLY JSON: { 
  "momentumDelta": number (-3 to +3, how much this shifts momentum), 
  "defensiveModifier": number (-3 to +3, negative = harder to concede, positive = backline exposed), 
  "attackModifier": number (-3 to +3, positive = more shots, negative = less attacking), 
  "commentary": "string (brief manager's response, 1 sentence)", 
  "effectDescription": "string (tactical effect label, e.g. 'HIGH PRESS ACTIVATED', max 4 words)" 
}

Rules:
- "Demand More" / pressing shouts: momentumDelta +2, attackModifier +2, defensiveModifier +1
- "Tighten Up" / defensive shouts: momentumDelta 0, defensiveModifier -3, attackModifier -1
- "Push Forward" / all-out attack: momentumDelta +3, attackModifier +3, defensiveModifier +2 (backline exposed)
- Calm/reassuring shouts: momentumDelta +1, defensiveModifier -1, attackModifier 0`;

    try {
        const response = await ai.models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        const parsed = JSON.parse(cleanJson(response.text));
        return {
            momentumDelta: parsed.momentumDelta ?? baseEffect.momentumDelta ?? 0,
            defensiveModifier: parsed.defensiveModifier ?? baseEffect.defensiveModifier ?? 0,
            attackModifier: parsed.attackModifier ?? baseEffect.attackModifier ?? 0,
            commentary: parsed.commentary ?? "The players respond.",
            effectDescription: parsed.effectDescription ?? "TACTICAL SHIFT"
        };
    } catch (e) {
        return {
            momentumDelta: baseEffect.momentumDelta ?? 0,
            defensiveModifier: baseEffect.defensiveModifier ?? 0,
            attackModifier: baseEffect.attackModifier ?? 0,
            commentary: "The players respond to the instruction.",
            effectDescription: "TACTICAL SHIFT"
        };
    }
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
