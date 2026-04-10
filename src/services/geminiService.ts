
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import type { Team, MatchState, Player, MatchEvent, TournamentStage, NegotiationResult, TacticalShout, PromiseData, ShoutEffect, RiftSeverity, RiftScope, NegotiationMessage } from '../types';

const API_KEY = process.env.API_KEY || '';

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
    if (!_ai) {
        if (!API_KEY) {
            console.warn('Gemini API key not configured. AI features will not work.');
        }
        _ai = new GoogleGenAI({ apiKey: API_KEY || 'placeholder' });
    }
    return _ai;
}

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

const cleanJson = (text?: string): string => {
    const s = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    // Extract the first complete JSON object or array from the response,
    // even if the model added preamble text around it
    const objMatch = s.match(/\{[\s\S]*\}/);
    if (objMatch) return objMatch[0];
    const arrMatch = s.match(/\[[\s\S]*\]/);
    if (arrMatch) return arrMatch[0];
    return s;
};

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
    
    const segLen = targetMinute - currentMatchState.currentMinute;
    const expectedGoals = Math.max(1, Math.round(segLen / 22));
    const prompt = `Football Match Sim: ${homeTeam.name} vs ${awayTeam.name}. 
    Current State: Minute ${currentMatchState.currentMinute}, Score ${currentMatchState.homeScore}-${currentMatchState.awayScore}, Momentum ${currentMatchState.momentum}.
    Task: Simulate ONLY from minute ${currentMatchState.currentMinute + 1} to ${targetMinute} (${segLen} minutes). Expect roughly ${expectedGoals} goal(s) total across both teams in this segment.
    
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
    5. GOAL FREQUENCY (CRITICAL — do not ignore): A real football match produces 2–4 goals total across 90 minutes. Per 15-minute segment that means roughly 0–1 goals per team. You MUST score goals. "Balanced" or "Attacking" teams MUST combine for at least 1 goal somewhere across the 4 segments. Do NOT simulate an entire match with homeScoreAdded=0 and awayScoreAdded=0 for every segment — that is broken. If no goal in previous segments, increase pressure now.
    6. Mentality and formation MUST visibly shape what events are generated (not just vibe words).
    7. If there are active rifts, occasionally generate a "commentary" event referencing the miscommunication between the named players.
    8. If there are active bonds, occasionally generate a "commentary" event highlighting their chemistry.
    9. When a goal is scored, you MUST add a "goal" type event with the scorer's name in the "player" field AND set homeScoreAdded or awayScoreAdded to 1. Both the event and the score counter must reflect the goal.
    
    Respond ONLY in JSON format: { 
        "homeScoreAdded": number, 
        "awayScoreAdded": number, 
        "momentum": number (new value -10 to 10), 
        "tacticalAnalysis": "string (one short sentence about the flow)", 
        "events": [{ "minute": number, "type": "goal"|"commentary"|"card"|"injury"|"whistle", "teamName": "string", "description": "string", "player": "string" }] 
    }`;

    try {
        const response: GenerateContentResponse = await getAI().models.generateContent({
            model: MODEL_TEXT, contents: prompt
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
        const response: GenerateContentResponse = await getAI().models.generateContent({
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
        const response: GenerateContentResponse = await getAI().models.generateContent({
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
        const response = await getAI().models.generateContent({
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
        
        let operation = await getAI().models.generateVideos({
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
            operation = await getAI().operations.getVideosOperation({operation: operation});
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt });
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
        const response = await getAI().models.generateContent({
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt });
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
        const response = await getAI().models.generateContent({
            model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { message: "Thank you, that's all for today.", isDone: true, reputationDelta: 0 };
    }
};


export const getPlayerTalkQuestions = async (p: Player, t: Team, c: string, bondContext?: { squadMate: string; competition: string }) => {
    const fallback = [
        c === 'renewal'
            ? `${p.name} has been here a while. But honestly — does the board see this club reaching the next level? Because my client has options.`
            : `${t.name} is interested, fine. But so are others. What makes your project worth ${p.name}'s prime years?`,
        c === 'renewal'
            ? `The current terms don't reflect what ${p.name} brings to this squad. What are you prepared to put on the table to show real commitment?`
            : `My client's wage at ${p.name}'s current club is ${p.wage.toLocaleString()} a week. You'll need to do better than that. What's your opening position?`,
    ];
    try {
        const contractStatus = p.contractExpires > 0
            ? `Contract expires in ${p.contractExpires} weeks (${p.contractExpires < 10 ? 'LEVERAGE: player is nearly out of contract' : p.contractExpires > 25 ? 'Club has leverage — long contract remaining' : 'entering final year'})`
            : 'Free agent — no contract leverage for either side';

        const personalityTone: Record<string, string> = {
            Ambitious:    'AMBITIOUS — Obsessed with trophies, Champions League, and career legacy. Will challenge the manager on the club\'s project and realistic ambitions. Hard-nosed when it comes to what the club can offer competition-wise.',
            Volatile:     'VOLATILE — Confrontational and easily offended. May bring up past grievances, perceived disrespect, or frustrations with how the club handled previous business. Will use emotional leverage.',
            Leader:       'LEADER — Asks pointed questions about his client\'s role in the squad hierarchy, captaincy prospects, and whether the manager truly rates him as indispensable.',
            Professional: 'PROFESSIONAL — Cold and businesslike. No emotional appeals. Will cite market rate, comparable contracts at rival clubs, and demand the numbers match the player\'s output. Won\'t be charmed.',
            Eccentric:    'ECCENTRIC — Raises unusual concerns: specific training facilities, squad culture, proximity to family, or bizarre contractual clauses. Unpredictable but genuine.',
        };

        const bondNote = bondContext
            ? `BONUS CONTEXT: ${p.name} has a strong personal bond with ${bondContext.squadMate} who is already at ${t.name} from the ${bondContext.competition}. The agent is aware of this and may use it as part of the negotiation — either as a softener or to raise the stakes ("he\'d love to reunite, but not at any price").`
            : '';

        const prestigeTier = t.prestige >= 80
            ? `ELITE CLUB (prestige ${t.prestige}/100). ${t.name} already wins trophies and competes at the highest level. DO NOT ask if the club is ambitious or "going to the next level" — they already are. Instead, ask about: guaranteed starting position in a star-studded squad, wage parity with the club's other elite earners, specific role in big European nights, whether the manager will build around this player or use him as rotation.`
            : t.prestige >= 55
            ? `MID-TIER CLUB (prestige ${t.prestige}/100). ${t.name} is respectable but not elite. The agent will probe: realistic trophy timeline, summer transfer budget, who else is being signed to support this player, whether the ambition matches the wage on offer.`
            : `LOWER-PRESTIGE CLUB (prestige ${t.prestige}/100). ${t.name} is below this player's current level. The agent is skeptical. Focus questions on: promotion/survival realism, long-term wage security, whether the manager is serious or just testing the market.`;

        const prompt = `
You are the hard-nosed agent for ${p.name}. Generate exactly 2 negotiation questions to ask the manager of ${t.name}.

PLAYER PROFILE:
- Name: ${p.name}
- Age: ${p.age} | Rating: ${p.rating}/100 | Position: ${p.position}
- Personality: ${p.personality} → ${personalityTone[p.personality] || 'Pragmatic, focused on best deal'}
- Current weekly wage: $${p.wage.toLocaleString()}
- ${contractStatus}

CLUB CONTEXT: ${prestigeTier}
- Negotiation type: ${c === 'renewal' ? 'CONTRACT RENEWAL — existing player wanting improved terms' : 'TRANSFER — player moving from another club'}
${bondNote}

STRICT RULES:
1. Speak as the agent in first person: "My client needs to know...", "What ${p.name} is asking is...", "He won't sign unless..."
2. QUESTION 1 must be about ROLE/AMBITION — specific to this club's actual prestige level (see club context above — no generic "are you ambitious?" questions for elite clubs)
3. QUESTION 2 must be about MONEY/TERMS — specific numbers, parity with teammates, contract length justification
4. Both questions must be things a manager cannot answer with one word — they require a real, specific commitment
5. Make the questions feel like traps — easy to answer badly, hard to answer convincingly

Return JSON: { "questions": ["question1", "question2"] }`;

        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        const parsed = JSON.parse(cleanJson(response.text));
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) return parsed.questions;
    } catch (e) {
        console.warn('getPlayerTalkQuestions failed, using fallback:', e);
    }
    return fallback;
};

export const evaluatePlayerTalk = async (p: Player, qs: string[], ans: string[], t: Team, c: string, offer: any, bondContext?: { squadMate: string; competition: string }): Promise<NegotiationResult> => {
    const fairWageMin = Math.round(p.wage * 1.05 / 1000) * 1000;
    const fairWageMax = Math.round(p.wage * 1.30 / 1000) * 1000;
    const isLowball = offer.wage < fairWageMin;
    const isFair = offer.wage >= fairWageMin && offer.wage <= fairWageMax;
    const isPremium = offer.wage > fairWageMax;
    const contractStatus = p.contractExpires > 0
        ? (p.contractExpires < 10 ? 'nearly out of contract (player has leverage)' : p.contractExpires > 25 ? 'long contract remaining (club has leverage)' : 'entering final year')
        : 'free agent';

    const bondNote = bondContext
        ? `BOND FACTOR: ${p.name} has a genuine personal bond with ${bondContext.squadMate} at ${t.name}. The agent acknowledges this makes the player more inclined to sign — but will NOT use it to justify accepting a lowball wage. Mention it as a positive factor that tips the scales IF the offer is fair.`
        : '';

    const prompt = `
You are the agent for ${p.name} (${p.personality}, age ${p.age}, rating ${p.rating}/100, ${p.position}).
Negotiating a ${c === 'renewal' ? 'contract renewal' : 'transfer'} with ${t.name} (Prestige: ${t.prestige}/100).

OFFER ON THE TABLE: $${offer.wage.toLocaleString()}/week for ${offer.length} years.
PLAYER'S CURRENT WAGE: $${p.wage.toLocaleString()}/week
FAIR WAGE RANGE: $${fairWageMin.toLocaleString()} – $${fairWageMax.toLocaleString()}/week
CONTRACT STATUS: ${contractStatus}
WAGE ASSESSMENT: ${isLowball ? 'LOWBALL — this offer is below fair value. The agent is unimpressed.' : isFair ? 'Fair — within acceptable range.' : 'Premium — generous offer, the agent takes note.'}
${bondNote}

MANAGER'S RESPONSES:
${ans.map((a, i) => `Q${i + 1} answer: "${a}"`).join('\n')}

STEP 1 — CLASSIFY EACH MANAGER ANSWER (do this internally before deciding):
For each answer, classify it as one of:
- STRONG: Specific, committed, addresses the actual question with real detail
- WEAK: Vague, deflecting, under 8 words, OR responds to the agent's question with another question, OR says something non-committal like "we'll see", "I think so", "yes", "trust me"
- EMPTY: No answer given, blank, or filler

STEP 2 — DECISION LOGIC (apply strictly, no exceptions):
- Any EMPTY answer → REJECTED immediately, the agent walks out
- Majority WEAK answers + LOWBALL offer → REJECTED with pointed comment about the manager's evasiveness
- Majority WEAK answers + FAIR offer → COUNTER (agent saw through the non-answers, pushes for more)
- Majority WEAK answers + PREMIUM offer → COUNTER (agent wants more specificity even if the money is good)
- Majority STRONG answers + LOWBALL → COUNTER at fair wage minimum (acknowledges the pitch but not the money)
- Majority STRONG answers + FAIR → ACCEPTED (agent acknowledges the manager made a real case)
- Majority STRONG answers + PREMIUM → ACCEPTED enthusiastically
- Volatile personality: one step harder to please across the board
- Ambitious personality: always reference trophies/competition even when accepting

IMPORTANT: If the manager responded to your question WITH ANOTHER QUESTION (e.g. "what do you mean?", "can you clarify?"), that is a WEAK answer. A manager who cannot answer directly is not ready to sign players at this level.

Respond as the agent speaking directly to the manager. Be sharp, specific, and reference both the offer and their answers.

Return JSON:
{
    "decision": "accepted" | "rejected" | "counter",
    "reasoning": "Agent's spoken words in the room (2-3 sentences, in character, reference the specific offer AND how the manager answered)",
    "counterOffer": { "wage": number, "length": number },
    "extractedPromises": ["specific verbal commitments the manager made that should be tracked"]
}`;
    try {
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        const fallbackWage = isFair || isPremium ? offer.wage : fairWageMin;
        return {
            decision: isFair || isPremium ? 'accepted' : 'counter',
            reasoning: isFair || isPremium
                ? "We've looked at the terms. My client is satisfied — let's get this signed."
                : `That's not where we need to be. My client is worth at least $${fairWageMin.toLocaleString()} a week. Come back with something serious.`,
            counterOffer: { wage: fallbackWage, length: offer.length },
            extractedPromises: []
        };
    }
};

// ── CONVERSATIONAL NEGOTIATION ───────────────────────────────────────────────

export const continueNegotiationChat = async (
    p: Player,
    t: Team,
    context: 'transfer' | 'renewal',
    history: NegotiationMessage[],
    bondContext?: { squadMate: string; competition: string }
): Promise<{ reply: string; nextPhase: 'talking' | 'offer' | 'walkout' }> => {
    const isOpening = history.length === 0;
    const transcript = history.map(m => `${m.role === 'agent' ? 'Agent' : 'Manager'}: ${m.text}`).join('\n');

    const prestigeTier = t.prestige >= 80
        ? `ELITE CLUB (${t.prestige}/100): ${t.name} already wins at the highest level. Never question their ambition — ask about guaranteed starts in a packed squad, wage parity with the club's top earners, specific role in Champions League nights.`
        : t.prestige >= 55
        ? `MID-TIER CLUB (${t.prestige}/100): Solid but unproven at the top. Probe the trophy timeline, transfer budget, and who else is being signed.`
        : `LOWER-PRESTIGE CLUB (${t.prestige}/100): A step down from this player's calibre. The agent is visibly skeptical — challenge whether the club is serious.`;

    const personalityNote: Record<string, string> = {
        Ambitious:    'Cares deeply about trophies and European competition. Challenges vague answers. Will not accept "trust the process" without specifics.',
        Volatile:     'Confrontational. Holds grudges. Will bring up perceived disrespect or past slights. Pushes back hard when deflected.',
        Leader:       'Focused on squad role, captaincy prospects, and respect in the dressing room. Wants to know where he stands in the hierarchy.',
        Professional: 'Cold and numerical. Only the terms matter. Will cite market rate. Not charmed by speeches.',
        Eccentric:    'Has surprising concerns — training facilities, squad culture, superstitions, proximity to family. Unpredictable.',
    };

    const bondNote = bondContext
        ? `PERSONAL CONTEXT: ${p.name} has a bond with ${bondContext.squadMate} already at ${t.name}. The agent can reference this — but won't use it to justify a bad offer.`
        : '';

    const managerResponses = history.filter(m => m.role === 'manager');
    const recentManagerMsgs = managerResponses.slice(-2).map(m => m.text);
    const evasionCount = recentManagerMsgs.filter(txt =>
        txt.trim().endsWith('?') || txt.trim().split(' ').length < 5
    ).length;

    const prompt = `
You are the hard-nosed agent for ${p.name} (${p.personality}, age ${p.age}, rating ${p.rating}/100, ${p.position}).
Negotiating a ${context === 'renewal' ? 'CONTRACT RENEWAL' : 'TRANSFER'} with ${t.name}.
Player's current wage: $${p.wage.toLocaleString()}/week. Contract: ${p.contractExpires > 0 ? `expires in ${p.contractExpires} weeks` : 'free agent'}.

${prestigeTier}
Agent personality: ${personalityNote[p.personality] || 'Pragmatic, deal-focused.'}
${bondNote}

${isOpening
    ? `This is the OPENING of the meeting. Greet the manager briefly and raise your FIRST specific concern — something real about this player's situation and this particular club. Do not mention money yet. Keep it to 2–3 sentences. Make it feel like a real meeting starting.`
    : `Full conversation so far:\n${transcript}\n\nThe manager just said: "${history[history.length - 1]?.text}"\n\nRespond naturally. React directly to what they said — if they gave a strong answer, acknowledge it and probe further. If they deflected or asked a question back, call it out. Keep it to 2–3 sentences. Sound like a real agent in a real meeting room, not a chatbot.`
}

PHASE RULES:
- Do NOT jump to money talk in the first 2 exchanges. Cover the project/role concerns first.
- After at least 2 manager responses have addressed your concerns, you may transition to offer stage by ending with something like "Right. So let's see what you're actually putting on the table."
- If the manager has been evasive in ${evasionCount >= 2 ? 'MULTIPLE recent responses' : 'responses'}: ${evasionCount >= 2 ? 'call it out directly and signal a walkout.' : 'push back with a sharper follow-up.'}
- WALKOUT if: manager is blatantly dismissive, rude, or has given 2+ non-answers in a row.

nextPhase values: "talking" = keep the conversation going, "offer" = signal ready for financial terms, "walkout" = agent is leaving.

Respond with ONLY valid JSON, no other text:
{ "reply": "...", "nextPhase": "talking" }`;

    try {
        // Use plain text response + cleanJson to avoid JSON-mode parse failures
        const response = await getAI().models.generateContent({
            model: MODEL_TEXT, contents: prompt
        });
        const parsed = JSON.parse(cleanJson(response.text));
        if (!parsed.reply) throw new Error('Missing reply field');
        return { reply: parsed.reply, nextPhase: parsed.nextPhase || 'talking' };
    } catch (e) {
        console.error('[continueNegotiationChat] API/parse error:', e);
        const fallback = isOpening
            ? `Good to meet you. Before we get into numbers, I need to understand exactly what ${p.name} would be walking into here — squad role, expectations, the full picture.`
            : `I hear you, but I need something more specific than that. What exactly is the plan for my client here?`;
        // Never auto-trigger offer phase from fallback — let the conversation develop
        return { reply: fallback, nextPhase: 'talking' };
    }
};

export const evaluateNegotiationOffer = async (
    p: Player,
    t: Team,
    context: 'transfer' | 'renewal',
    history: NegotiationMessage[],
    offer: { wage: number; length: number },
    bondContext?: { squadMate: string; competition: string }
): Promise<NegotiationResult> => {
    const fairWageMin = Math.round(p.wage * 1.05 / 1000) * 1000;
    const fairWageMax = Math.round(p.wage * 1.30 / 1000) * 1000;
    const isLowball = offer.wage < fairWageMin;
    const isPremium = offer.wage > fairWageMax;
    const transcript = history.map(m => `${m.role === 'agent' ? 'Agent' : 'Manager'}: ${m.text}`).join('\n');

    const bondNote = bondContext
        ? `BOND FACTOR: ${p.name} has a personal connection with ${bondContext.squadMate} at ${t.name}. Counts as a positive factor ONLY if the offer is fair AND the manager gave genuine answers.`
        : '';

    const prompt = `
You are the hard-nosed agent for ${p.name} (${p.personality}, age ${p.age}, rating ${p.rating}/100).
Evaluating a final offer from ${t.name} (Prestige: ${t.prestige}/100) for a ${context === 'renewal' ? 'contract renewal' : 'transfer'}.

FULL NEGOTIATION TRANSCRIPT — READ EVERY LINE CAREFULLY:
${transcript || '(Manager gave no conversation — jumped straight to numbers)'}

OFFER SUBMITTED: $${offer.wage.toLocaleString()}/week for ${offer.length} years.
Player's current wage: $${p.wage.toLocaleString()}/week
Fair wage range: $${fairWageMin.toLocaleString()}–$${fairWageMax.toLocaleString()}/week
Wage verdict: ${isLowball ? 'LOWBALL — below fair value' : isPremium ? 'PREMIUM — above market rate' : 'FAIR — within acceptable range'}
${bondNote}

STEP 1 — EVALUATE EACH MANAGER MESSAGE (do this before deciding):
Read every manager line above. For each one, ask: "Is this a real, specific, credible answer to what the agent was asking?"

AUTOMATIC FAIL conditions — any of these in a manager message = that answer FAILED:
- Joke answers or absurd statements (e.g. "he can be the kit man", "Allison's ball boy", "captain for life" as a throwaway)
- Vague platitudes with no specifics ("trust me", "you'll love it here", "we're a big club")
- Responding to a question with another question
- Answers clearly unrelated to what the agent asked
- Empty or single-word replies

A PASSING answer must: directly address the agent's concern with a specific, credible commitment or argument.

STEP 2 — TALLY: How many of the manager's responses PASSED vs FAILED?

STEP 3 — DECISION MATRIX (apply strictly):
- Majority FAILED + LOWBALL → REJECTED outright, agent is insulted
- Majority FAILED + FAIR → REJECTED ("nice number but you didn't convince me")
- Majority FAILED + PREMIUM → COUNTER (money is interesting, but agent needs more)
- Majority PASSED + LOWBALL → COUNTER at $${fairWageMin.toLocaleString()} ("good pitch, but the money doesn't match")
- Majority PASSED + FAIR → ACCEPTED
- Majority PASSED + PREMIUM → ACCEPTED enthusiastically
- Personality modifier: ${
    p.personality === 'Volatile' ? 'VOLATILE — one tier harder across the board. Will reject even fair deals if any answer was dismissive.' :
    p.personality === 'Professional' ? 'PROFESSIONAL — conversation quality matters less than the number. But failed answers still count.' :
    p.personality === 'Ambitious' ? 'AMBITIOUS — any vague answer about trophies or project counts as FAILED. Needs specifics.' :
    'Standard evaluation.'
}

STEP 4 — Write the agent's spoken response referencing what the manager actually said and the specific offer.

Return JSON:
{
  "decision": "accepted" | "rejected" | "counter",
  "reasoning": "2-3 sharp sentences spoken by the agent in the room, referencing the actual conversation and the number",
  "counterOffer": { "wage": number, "length": number },
  "extractedPromises": ["only real, specific verbal commitments the manager made — not vague statements"]
}`;

    try {
        const response = await getAI().models.generateContent({
            model: MODEL_TEXT, contents: prompt
        });
        const parsed = JSON.parse(cleanJson(response.text));
        if (!parsed.decision) throw new Error('Missing decision field');
        return parsed;
    } catch (e) {
        console.error('[evaluateNegotiationOffer] API/parse error:', e);
        const fallbackWage = isLowball ? fairWageMin : offer.wage;
        return {
            decision: isLowball ? 'counter' : 'accepted',
            reasoning: isLowball
                ? `$${offer.wage.toLocaleString()} a week is below what we need. My client expects at least $${fairWageMin.toLocaleString()} — come back with a real number.`
                : "The terms work for us. Let's get this done.",
            counterOffer: { wage: fallbackWage, length: offer.length },
            extractedPromises: []
        };
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
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
    const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt });
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
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
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(cleanJson(response.text));
    } catch (e) {
        return { morale: 'Disappointed', message: `${player.name} returns from international duty.`, durationWeeks: 2 };
    }
};

export const getInternationalBreakSummary = async (week: number) => {
    const prompt = `Simulate international break Week ${week}. JSON: { "newsTitle": "string", "newsBody": "string" }`;
    const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(cleanJson(response.text));
};

export const processTouchlineInteraction = async (
    userShout: string,
    team: Team,
    matchState: MatchState,
    isHome: boolean,
    starters?: Array<{ name: string; position: string; condition: number }>
): Promise<ShoutEffect> => {
    const shoutLower = userShout.toLowerCase();

    let baseEffect: Partial<ShoutEffect> = {};
    if (shoutLower.includes('demand more') || shoutLower.includes('push') || shoutLower.includes('press') || shoutLower.includes('attack')) {
        baseEffect = { momentumDelta: 2, defensiveModifier: 1, attackModifier: 2 };
    } else if (shoutLower.includes('tighten') || shoutLower.includes('defend') || shoutLower.includes('hold') || shoutLower.includes('park')) {
        baseEffect = { momentumDelta: 0, defensiveModifier: -3, attackModifier: -1 };
    } else if (shoutLower.includes('forward') || shoutLower.includes('all out') || shoutLower.includes('go for it')) {
        baseEffect = { momentumDelta: 3, defensiveModifier: 2, attackModifier: 3 };
    }

    const lineupBlock = starters && starters.length > 0
        ? `\nPlayers on the pitch:\n${starters.map(s => `- ${s.name} (${s.position}, ${s.condition}% stamina)`).join('\n')}\n`
        : '';

    const prompt = `Touchline shout analyzer. Output JSON only — no explanation, no markdown, just the raw JSON object.

Manager of ${team.name} shouts: "${userShout}"
Score: ${matchState.homeScore}-${matchState.awayScore} | Minute: ${matchState.currentMinute || 0} | Momentum: ${matchState.momentum}${lineupBlock}
Write vivid, specific commentary (2 sentences). If a player is named, describe exactly what they do and any risk.
Pick numbers:
- Pressing/attacking → momentumDelta:2, attackModifier:2, defensiveModifier:1
- Defensive/hold → momentumDelta:0, defensiveModifier:-3, attackModifier:-1
- All-out attack → momentumDelta:3, attackModifier:3, defensiveModifier:2
- Calm/reassure → momentumDelta:1, defensiveModifier:-1, attackModifier:0
If a player name is mentioned, add it to targetPlayers.

{"momentumDelta":0,"defensiveModifier":0,"attackModifier":0,"commentary":"...","effectDescription":"...","targetPlayers":[]}`;

    try {
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt });
        const parsed = JSON.parse(cleanJson(response.text));
        return {
            momentumDelta: parsed.momentumDelta ?? baseEffect.momentumDelta ?? 0,
            defensiveModifier: parsed.defensiveModifier ?? baseEffect.defensiveModifier ?? 0,
            attackModifier: parsed.attackModifier ?? baseEffect.attackModifier ?? 0,
            commentary: parsed.commentary ?? "The players respond.",
            effectDescription: parsed.effectDescription ?? "TACTICAL SHIFT",
            targetPlayers: Array.isArray(parsed.targetPlayers) ? parsed.targetPlayers : []
        };
    } catch (e) {
        console.error("Shout processing error:", e);
        return {
            momentumDelta: baseEffect.momentumDelta ?? 0,
            defensiveModifier: baseEffect.defensiveModifier ?? 0,
            attackModifier: baseEffect.attackModifier ?? 0,
            commentary: "The players acknowledge the instruction.",
            effectDescription: "TACTICAL SHIFT",
            targetPlayers: []
        };
    }
};

export const getContextAwareShouts = async (team: Team, isHome: boolean, matchState: MatchState): Promise<TacticalShout[]> => {
    const prompt = `Halftime shouts for ${team.name}. Score: ${matchState.homeScore}-${matchState.awayScore}. Respond with ONLY valid JSON: { "shouts": [{ "id": "string", "label": "string", "description": "string", "effect": "string" }] }`;
    try {
        const response = await getAI().models.generateContent({ model: MODEL_TEXT, contents: prompt });
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
        const response = await getAI().models.generateContent({
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
