
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY not set");

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.0-flash-exp';

export interface SongbookEntry {
    id: string;
    title: string;
    artist: string;
    stressPattern: string;
    syllableGuide: string;
    tempo: 'slow' | 'medium' | 'fast';
    emotionalTags: string[];
    bestFor: string[];
}

export const CHANT_SONGBOOK: SongbookEntry[] = [
    {
        id: 'seven_nation_army',
        title: 'Seven Nation Army',
        artist: 'The White Stripes',
        stressPattern: 'DUM da da DUM da da DUM',
        syllableGuide: '7 syllables per line, strong on beats 1, 4, 7',
        tempo: 'medium',
        emotionalTags: ['aggressive', 'anthemic', 'stomping'],
        bestFor: ['goal', 'winning', 'home_game']
    },
    {
        id: 'sloop_john_b',
        title: 'Sloop John B',
        artist: 'The Beach Boys',
        stressPattern: 'We COME from [CITY], the [TEAM] FOOT-ball CLUB',
        syllableGuide: 'Waltz feel, 3/4 time, lilt on every 3rd beat',
        tempo: 'medium',
        emotionalTags: ['jovial', 'singalong', 'friendly'],
        bestFor: ['goal', 'winning', 'away_game']
    },
    {
        id: 'go_west',
        title: 'Go West',
        artist: 'Pet Shop Boys / Village People',
        stressPattern: 'GO WEST (go west) LIFE IS PEACE-ful THERE',
        syllableGuide: '8 syllables, heavy on beats 1 and 5, crowd echo on beats 3-4',
        tempo: 'medium',
        emotionalTags: ['euphoric', 'stadium', 'crowd'],
        bestFor: ['goal', 'winning', 'hat_trick']
    },
    {
        id: 'freed_from_desire',
        title: 'Freed from Desire',
        artist: 'Gala',
        stressPattern: 'NA na na NA na na NA na',
        syllableGuide: '8 syllables, stress on 1, 4, 7 — chant player name in verse',
        tempo: 'fast',
        emotionalTags: ['ecstatic', 'rave', 'high-energy'],
        bestFor: ['hat_trick', 'goal', 'comeback']
    },
    {
        id: 'bella_ciao',
        title: 'Bella Ciao',
        artist: 'Traditional Italian',
        stressPattern: 'BEL-la CIA-o BEL-la CIA-o BEL-la CIA-o CIA-o CIA-o',
        syllableGuide: '10 syllables, alternating stress on odd beats',
        tempo: 'medium',
        emotionalTags: ['passionate', 'european', 'defiant'],
        bestFor: ['comeback', 'champions_league', 'away_goal']
    },
    {
        id: 'youll_never_walk_alone',
        title: "You'll Never Walk Alone",
        artist: 'Gerry & The Pacemakers',
        stressPattern: 'WALK ON walk ON with HOPE in your HEART',
        syllableGuide: '8 syllables per verse, slow build to powerful chorus',
        tempo: 'slow',
        emotionalTags: ['emotional', 'anthemic', 'tearjerking'],
        bestFor: ['comeback_winner', 'relegation_battle', 'season_finale', 'injury_time_winner']
    },
    {
        id: 'sweet_caroline',
        title: 'Sweet Caroline',
        artist: 'Neil Diamond',
        stressPattern: 'SWEET CAR-o-LINE (BUM BUM BUM) GOOD TIMES NEV-er SEEMED so GOOD',
        syllableGuide: '9 syllables + crowd response "Bum Bum Bum", stress on 1, 3, 7',
        tempo: 'medium',
        emotionalTags: ['joyful', 'universal', 'crowd-response'],
        bestFor: ['winning', 'goal', 'home_game']
    },
    {
        id: 'wonderwall',
        title: 'Wonderwall',
        artist: 'Oasis',
        stressPattern: "MAY-be YOU'RE GOIN-na be the ONE that SAVES me",
        syllableGuide: '10 syllables, stress on 1, 4, 6, 9 — Britpop lilt',
        tempo: 'medium',
        emotionalTags: ['nostalgic', 'english', 'singalong'],
        bestFor: ['goal', 'winning', 'home_game']
    },
    {
        id: 'angels',
        title: 'Angels',
        artist: 'Robbie Williams',
        stressPattern: 'AND THROUGH IT ALL she OF-fers me pro-TEC-tion',
        syllableGuide: '10 syllables, slow build, powerful on "protection"',
        tempo: 'slow',
        emotionalTags: ['emotional', 'dramatic', 'powerful'],
        bestFor: ['comeback_winner', 'injury_time_winner', 'relegation_battle', 'season_finale']
    },
    {
        id: 'allez_allez_allez',
        title: 'Allez Allez Allez',
        artist: 'Stadium Chant',
        stressPattern: "al-LEZ al-LEZ al-LEZ WE'VE CON-quered it ALL",
        syllableGuide: '6 syllables repeating, stress on "lez" each time, builds in volume',
        tempo: 'fast',
        emotionalTags: ['triumphant', 'european', 'conquering'],
        bestFor: ['champions_league', 'comeback', 'away_goal', 'hat_trick']
    },
    {
        id: 'rasputin',
        title: 'Rasputin',
        artist: 'Boney M',
        stressPattern: "RA-ra-RAS-pu-TIN RUS-sia's GREAT-est LOVE ma-CHINE",
        syllableGuide: '10 syllables, syncopated — swap "Rasputin" for player name',
        tempo: 'fast',
        emotionalTags: ['villain', 'swagger', 'high-energy', 'intimidating'],
        bestFor: ['goal', 'hat_trick', 'villain_player']
    },
    {
        id: 'lose_yourself',
        title: 'Lose Yourself',
        artist: 'Eminem',
        stressPattern: 'LOOK if you HAD one SHOT one OP-por-TUN-i-TY',
        syllableGuide: '12 syllables, rapid-fire, stress on "had", "shot", "one", "opportunity"',
        tempo: 'fast',
        emotionalTags: ['underdog', 'comeback', 'intense', 'motivational'],
        bestFor: ['comeback', 'comeback_winner', 'relegation_battle', 'losing']
    }
];

export type ChantTrigger =
    | 'goal'
    | 'hat_trick'
    | 'comeback'
    | 'comeback_winner'
    | 'injury_time_winner'
    | 'bad_call'
    | 'winning'
    | 'losing'
    | 'relegation_battle'
    | 'season_finale'
    | 'champions_league'
    | 'away_goal';

export type ChantEventContext = {
    trigger: ChantTrigger;
    playerName?: string;
    playerNationality?: string;
    playerPersonality?: string;
    teamName: string;
    minute?: number;
    scoreDiff?: number;
    isHome?: boolean;
    isUserGoal?: boolean;
};

export interface Chant {
    lyrics: string[];
    tune: string;
    intensity: 'low' | 'medium' | 'high';
    melodyId: string;
    audioUrl?: string;
}

function selectMelody(context: ChantEventContext, usedMelodies: string[]): SongbookEntry {
    const { trigger, teamName, playerPersonality, minute, isHome } = context;

    const recentlyUsed = usedMelodies.slice(-3);

    const isDramatic =
        trigger === 'comeback_winner' ||
        trigger === 'injury_time_winner' ||
        trigger === 'season_finale' ||
        trigger === 'relegation_battle' ||
        (trigger === 'goal' && minute !== undefined && minute >= 88);

    let candidates = CHANT_SONGBOOK.filter(entry => {
        const eventMatch = entry.bestFor.some(tag => {
            if (tag === trigger) return true;
            if (tag === 'home_game' && isHome) return true;
            if (tag === 'away_game' && !isHome) return true;
            if (tag === 'away_goal' && trigger === 'goal' && !isHome) return true;
            if (tag === 'comeback_winner' && isDramatic) return true;
            return false;
        });
        return eventMatch;
    });

    if (candidates.length === 0) {
        candidates = CHANT_SONGBOOK.filter(entry => entry.bestFor.includes('goal'));
    }

    const notRecent = candidates.filter(entry => !recentlyUsed.includes(entry.id));
    const pool = notRecent.length > 0 ? notRecent : candidates;

    // Dramatic moment: prefer emotional/anthemic melodies
    if (isDramatic) {
        const dramatic = pool.filter(e =>
            e.emotionalTags.includes('emotional') || e.emotionalTags.includes('anthemic')
        );
        if (dramatic.length > 0) return dramatic[Math.floor(Math.random() * dramatic.length)];
    }

    // Underdog/volatile personality: prefer rebellious/defiant
    if (trigger === 'comeback' || trigger === 'losing' || playerPersonality === 'Volatile') {
        const underdog = pool.filter(e =>
            e.emotionalTags.includes('underdog') ||
            e.emotionalTags.includes('defiant') ||
            e.emotionalTags.includes('motivational')
        );
        if (underdog.length > 0) return underdog[Math.floor(Math.random() * underdog.length)];
    }

    // Ambitious/Leader personality: prefer anthemic/crowd
    if (playerPersonality === 'Ambitious' || playerPersonality === 'Leader') {
        const anthemic = pool.filter(e =>
            e.emotionalTags.includes('anthemic') ||
            e.emotionalTags.includes('crowd') ||
            e.emotionalTags.includes('triumphant')
        );
        if (anthemic.length > 0) return anthemic[Math.floor(Math.random() * anthemic.length)];
    }

    // High-energy moments
    if (trigger === 'hat_trick' || trigger === 'champions_league') {
        const hype = pool.filter(e =>
            e.emotionalTags.includes('high-energy') ||
            e.emotionalTags.includes('triumphant') ||
            e.emotionalTags.includes('ecstatic')
        );
        if (hype.length > 0) return hype[Math.floor(Math.random() * hype.length)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

async function generateElevenLabsAudio(lyrics: string, melody: SongbookEntry): Promise<string | null> {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) return null;

    try {
        const tempoHint =
            melody.tempo === 'fast' ? 'upbeat and energetic' :
            melody.tempo === 'slow' ? 'slow and powerful' :
            'moderate tempo';
        const textToSpeak = `Sung to the tune of ${melody.title} by ${melody.artist}, ${tempoHint}:\n\n${lyrics}`;

        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: textToSpeak,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                    stability: 0.4,
                    similarity_boost: 0.75,
                    style: 0.6,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
}

async function fallbackTtsChant(lyrics: string): Promise<void> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Passionate crowd singing a football chant: ${lyrics}` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
                }
            } as Record<string, unknown>
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return;

        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
        const dataInt16 = new Int16Array(bytes.buffer);
        const frameCount = dataInt16.length;
        const buffer = audioContext.createBuffer(1, frameCount, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
    } catch {
        // Silent fail — audio is enhancement only
    }
}

export const generatePunkChant = async (
    teamName: string,
    trigger: ChantTrigger,
    playerName?: string,
    usedMelodies: string[] = [],
    eventContext?: Partial<Omit<ChantEventContext, 'trigger' | 'teamName' | 'playerName'>>
): Promise<Chant> => {

    const context: ChantEventContext = {
        trigger,
        playerName,
        teamName,
        minute: eventContext?.minute,
        scoreDiff: eventContext?.scoreDiff,
        isHome: eventContext?.isHome,
        isUserGoal: eventContext?.isUserGoal,
        playerNationality: eventContext?.playerNationality,
        playerPersonality: eventContext?.playerPersonality
    };

    const melody = selectMelody(context, usedMelodies);

    const isDramatic =
        trigger === 'comeback_winner' ||
        trigger === 'injury_time_winner' ||
        trigger === 'season_finale' ||
        (trigger === 'goal' && context.minute !== undefined && context.minute >= 88);

    const chantLength = isDramatic ? '6 to 8 lines' : trigger === 'hat_trick' ? '6 lines' : '4 lines';

    let situationDesc = '';
    if (trigger === 'goal') situationDesc = `${playerName || 'a player'} just scored${context.minute ? ` in the ${context.minute}th minute` : ''}. Euphoric. Bouncing.`;
    if (trigger === 'hat_trick') situationDesc = `${playerName || 'a player'} just scored a HAT-TRICK. Absolute scenes. Mayhem.`;
    if (trigger === 'comeback') situationDesc = `We were losing but we've pulled level. Disbelief turning to belief.`;
    if (trigger === 'comeback_winner') situationDesc = `We were losing and have just scored a WINNER. 90th minute drama. Absolute pandemonium.`;
    if (trigger === 'injury_time_winner') situationDesc = `INJURY TIME WINNER. The stadium is shaking. History is being made.`;
    if (trigger === 'bad_call') situationDesc = `The referee just robbed us. Fury. Absolute outrage.`;
    if (trigger === 'winning') situationDesc = `We are winning comfortably. Swagger. Party mode.`;
    if (trigger === 'losing') situationDesc = `We are losing badly. Dark humor. "Sack the board" energy.`;
    if (trigger === 'relegation_battle') situationDesc = `Relegation battle. This is survival. Every fan on their feet.`;
    if (trigger === 'season_finale') situationDesc = `Season finale. This match decides everything. Emotional.`;
    if (trigger === 'champions_league') situationDesc = `Champions League. European nights. The biggest stage.`;
    if (trigger === 'away_goal') situationDesc = `We've scored away from home! Small travelling end going wild.`;

    const nationalityHint = context.playerNationality
        ? `The player is ${context.playerNationality} — incorporate cultural flair or a reference if it scans.`
        : '';
    const personalityHint = context.playerPersonality === 'Volatile'
        ? 'The player has a volatile, unpredictable character — hint at the drama.'
        : context.playerPersonality === 'Loyal'
        ? 'The player is a club legend — emphasize the devotion.'
        : '';

    const prompt = `
You are the Capo of the ${teamName} Ultras, leading the terrace choir.

SITUATION: ${situationDesc}
${nationalityHint}
${personalityHint}

YOUR ASSIGNED MELODY: "${melody.title}" by ${melody.artist}
STRESS PATTERN: ${melody.stressPattern}
SYLLABLE GUIDE: ${melody.syllableGuide}
TEMPO: ${melody.tempo}
EMOTIONAL FEEL: ${melody.emotionalTags.join(', ')}

TASK: Write a ${chantLength} terrace chant that SCANS PERFECTLY to this melody's stress pattern.

STRICT RULES:
1. BEFORE writing the final lyrics, map each syllable to the stress pattern. Every line must fit.
2. Each line must match the syllable count and stress of the melody.
3. Must rhyme (AABB or ABAB).
4. Include the player name "${playerName || teamName}" naturally — it must fit the meter.
5. Reference the team name at least once.
6. No generic "Olé Olé". No clichés. Be specific and vivid.
${isDramatic ? '7. This is a DRAMATIC, historic moment — go big, make it unforgettable.' : ''}

VALIDATION: For each line, verify syllable count matches the pattern before including it.

Return JSON ONLY:
{
    "lyrics": ["Line 1", "Line 2", "Line 3", "Line 4"${isDramatic ? ', "Line 5", "Line 6"' : ''}],
    "tune": "${melody.title} (${melody.artist})",
    "intensity": "${isDramatic ? 'high' : trigger === 'losing' ? 'low' : 'medium'}"
}
`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || "{}";
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText) as { lyrics: string[]; tune: string; intensity: 'low' | 'medium' | 'high' };

        const lyricsText = parsed.lyrics?.join('\n') || '';

        // Try ElevenLabs first; fall back to Gemini TTS if unavailable
        const audioUrl = await generateElevenLabsAudio(lyricsText, melody);
        if (!audioUrl) {
            fallbackTtsChant(lyricsText).catch(() => {});
        }

        return {
            lyrics: parsed.lyrics,
            tune: parsed.tune,
            intensity: parsed.intensity,
            melodyId: melody.id,
            audioUrl: audioUrl ?? undefined
        };
    } catch {
        const fallbackLyrics = [
            `We love you ${teamName}, we do!`,
            `We love you ${teamName}, we do!`,
            `We love you ${teamName}, we do!`,
            `Oh ${teamName} we love you!`
        ];
        fallbackTtsChant(fallbackLyrics.join('\n')).catch(() => {});
        return {
            lyrics: fallbackLyrics,
            tune: 'Standard Terrace Chant',
            intensity: 'medium',
            melodyId: melody.id
        };
    }
};
