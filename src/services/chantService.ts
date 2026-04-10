
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
    if (!_ai) {
        _ai = new GoogleGenAI({ apiKey: API_KEY || 'placeholder' });
    }
    return _ai;
}
const model = 'gemini-2.0-flash';

export interface SongbookEntry {
    id: string;
    title: string;
    artist: string;
    stressPattern: string;
    syllableGuide: string;
    tempo: 'slow' | 'medium' | 'fast';
    emotionalTags: string[];
    bestFor: string[];
    /** ToS-safe music style description used for ElevenLabs /v1/music prompt — no artist/song names */
    musicStyle: string;
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
        bestFor: ['goal', 'winning', 'home_game'],
        musicStyle: 'driving electric bass guitar repeating DUM-da-da-DUM-da-da-DUM riff, heavy rock stomp, crowd clapping on every beat, powerful stadium march with 50000 fans singing'
    },
    {
        id: 'sloop_john_b',
        title: 'Sloop John B',
        artist: 'The Beach Boys',
        stressPattern: 'We COME from [CITY], the [TEAM] FOOT-ball CLUB',
        syllableGuide: 'Waltz feel, 3/4 time, lilt on every 3rd beat',
        tempo: 'medium',
        emotionalTags: ['jovial', 'singalong', 'friendly'],
        bestFor: ['goal', 'winning', 'away_game'],
        musicStyle: 'cheerful seafaring shanty in 3/4 waltz time, acoustic guitar strumming, jovial group singalong with brass band accompaniment, upbeat and friendly crowd chant'
    },
    {
        id: 'go_west',
        title: 'Go West',
        artist: 'Pet Shop Boys / Village People',
        stressPattern: 'GO WEST (go west) LIFE IS PEACE-ful THERE',
        syllableGuide: '8 syllables, heavy on beats 1 and 5, crowd echo on beats 3-4',
        tempo: 'medium',
        emotionalTags: ['euphoric', 'stadium', 'crowd'],
        bestFor: ['goal', 'winning', 'hat_trick'],
        musicStyle: 'powerful anthemic synth march, four-on-the-floor kick drum, massive male choir echo call-and-response, euphoric hands-in-the-air stadium anthem with crowd of 50000'
    },
    {
        id: 'freed_from_desire',
        title: 'Freed from Desire',
        artist: 'Gala',
        stressPattern: 'NA na na NA na na NA na',
        syllableGuide: '8 syllables, stress on 1, 4, 7 — chant player name in verse',
        tempo: 'fast',
        emotionalTags: ['ecstatic', 'rave', 'high-energy'],
        bestFor: ['hat_trick', 'goal', 'comeback'],
        musicStyle: 'upbeat 130 BPM Eurodance rave, four-on-the-floor electronic kick drum, euphoric synth hook with NA-na-na-NA pattern, massive crowd of 50000 fans singing in ecstasy'
    },
    {
        id: 'bella_ciao',
        title: 'Bella Ciao',
        artist: 'Traditional Italian',
        stressPattern: 'BEL-la CIA-o BEL-la CIA-o BEL-la CIA-o CIA-o CIA-o',
        syllableGuide: '10 syllables, alternating stress on odd beats',
        tempo: 'medium',
        emotionalTags: ['passionate', 'european', 'defiant'],
        bestFor: ['comeback', 'champions_league', 'away_goal'],
        musicStyle: 'traditional Italian folk march in 3/4 time, passionate accordion and acoustic guitar, rousing defiant crowd singalong, 50000 fans united in song'
    },
    {
        id: 'youll_never_walk_alone',
        title: "You'll Never Walk Alone",
        artist: 'Gerry & The Pacemakers',
        stressPattern: 'WALK ON walk ON with HOPE in your HEART',
        syllableGuide: '8 syllables per verse, slow build to powerful chorus',
        tempo: 'slow',
        emotionalTags: ['emotional', 'anthemic', 'tearjerking'],
        bestFor: ['comeback_winner', 'relegation_battle', 'season_finale', 'injury_time_winner'],
        musicStyle: 'slow emotional orchestral anthem building from gentle piano to full choir and soaring strings, tearjerking key change, 50000 fans in emotional unison, spine-tingling stadium moment'
    },
    {
        id: 'sweet_caroline',
        title: 'Sweet Caroline',
        artist: 'Neil Diamond',
        stressPattern: 'SWEET CAR-o-LINE (BUM BUM BUM) GOOD TIMES NEV-er SEEMED so GOOD',
        syllableGuide: '9 syllables + crowd response "Bum Bum Bum", stress on 1, 3, 7',
        tempo: 'medium',
        emotionalTags: ['joyful', 'universal', 'crowd-response'],
        bestFor: ['winning', 'goal', 'home_game'],
        musicStyle: 'upbeat classic singalong with piano and brass, crowd call-and-response BUM-BUM-BUM, 120 BPM joyful celebration, 50000 fans clapping and singing in joy'
    },
    {
        id: 'wonderwall',
        title: 'Wonderwall',
        artist: 'Oasis',
        stressPattern: "MAY-be YOU'RE GOIN-na be the ONE that SAVES me",
        syllableGuide: '10 syllables, stress on 1, 4, 6, 9 — Britpop lilt',
        tempo: 'medium',
        emotionalTags: ['nostalgic', 'english', 'singalong'],
        bestFor: ['goal', 'winning', 'home_game'],
        musicStyle: 'British indie rock singalong, strumming acoustic guitar with Britpop lilt, melancholic mid-tempo, passionate crowd of 50000 English football fans belting the chorus'
    },
    {
        id: 'angels',
        title: 'Angels',
        artist: 'Robbie Williams',
        stressPattern: 'AND THROUGH IT ALL she OF-fers me pro-TEC-tion',
        syllableGuide: '10 syllables, slow build, powerful on "protection"',
        tempo: 'slow',
        emotionalTags: ['emotional', 'dramatic', 'powerful'],
        bestFor: ['comeback_winner', 'injury_time_winner', 'relegation_battle', 'season_finale'],
        musicStyle: 'slow emotional power ballad, grand piano building to swelling orchestral strings, dramatic crescendo, 50000 fans singing in powerful emotional unison, stadium lights swaying'
    },
    {
        id: 'allez_allez_allez',
        title: 'Allez Allez Allez',
        artist: 'Stadium Chant',
        stressPattern: "al-LEZ al-LEZ al-LEZ WE'VE CON-quered it ALL",
        syllableGuide: '6 syllables repeating, stress on "lez" each time, builds in volume',
        tempo: 'fast',
        emotionalTags: ['triumphant', 'european', 'conquering'],
        bestFor: ['champions_league', 'comeback', 'away_goal', 'hat_trick'],
        musicStyle: 'fast energetic football terrace march, relentless driving percussion, building crowd volume from chant to roar, 50000 fans stomping in triumphant unison, relentless repetitive rhythm'
    },
    {
        id: 'rasputin',
        title: 'Rasputin',
        artist: 'Boney M',
        stressPattern: "RA-ra-RAS-pu-TIN RUS-sia's GREAT-est LOVE ma-CHINE",
        syllableGuide: '10 syllables, syncopated — swap "Rasputin" for player name',
        tempo: 'fast',
        emotionalTags: ['villain', 'swagger', 'high-energy', 'intimidating'],
        bestFor: ['goal', 'hat_trick', 'villain_player'],
        musicStyle: 'fast 128 BPM disco-stomp, urgent syncopated rhythm, thundering bass with punchy brass stabs, dramatic flair, crowd of 50000 fans stomping and chanting with swagger'
    },
    {
        id: 'lose_yourself',
        title: 'Lose Yourself',
        artist: 'Eminem',
        stressPattern: 'LOOK if you HAD one SHOT one OP-por-TUN-i-TY',
        syllableGuide: '12 syllables, rapid-fire, stress on "had", "shot", "one", "opportunity"',
        tempo: 'fast',
        emotionalTags: ['underdog', 'comeback', 'intense', 'motivational'],
        bestFor: ['comeback', 'comeback_winner', 'relegation_battle', 'losing'],
        musicStyle: 'intense dramatic build with heavy kick drum and urgent string ostinato, rapid-fire motivational chant delivery, 50000 fans united in desperate belief, powerful underdog anthem energy'
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
    audioUrl?: string;   // ElevenLabs /v1/music backing track
    vocalUrl?: string;   // ElevenLabs TTS vocal layer
}

// ── SHARED AUDIO CONTEXT (bypasses autoplay restrictions) ──────────────────
type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext };
let _sharedCtx: AudioContext | null = null;
function getSharedCtx(): AudioContext {
    if (!_sharedCtx || _sharedCtx.state === 'closed') {
        _sharedCtx = new ((window as WebkitWindow).webkitAudioContext ?? AudioContext)();
    }
    if (_sharedCtx.state === 'suspended') { _sharedCtx.resume().catch(() => {}); }
    return _sharedCtx;
}

/** Play an audio blob URL via AudioContext — works even after async delay (no autoplay block) */
export async function playBlobUrl(url: string, volume = 1.0): Promise<void> {
    try {
        const ctx = getSharedCtx();
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const audio = await ctx.decodeAudioData(buf);
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = volume;
        src.buffer = audio;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
    } catch (err) {
        console.error('[playBlobUrl] Failed:', err);
    }
}

// ── WEB AUDIO MELODY PLAYER ────────────────────────────────────────────────
// Each entry: [frequency_hz, beat_count]. Beat duration set by tempo.
const MELODY_NOTES: Record<string, [number, number][]> = {
    seven_nation_army:  [[329.6,2],[329.6,1],[392,1],[329.6,2],[293.7,1],[261.6,1],[246.9,4]],
    freed_from_desire:  [[392,1],[392,1],[440,1],[392,1],[349.2,2],[329.6,1],[293.7,1],[329.6,2]],
    go_west:            [[261.6,1],[329.6,1],[392,1],[329.6,1],[392,1],[440,1],[392,2],[329.6,2]],
    sloop_john_b:       [[392,2],[392,1],[440,1],[523.3,2],[493.9,2],[440,1],[392,3]],
    bella_ciao:         [[392,1],[329.6,1],[349.2,1],[329.6,1],[293.7,1],[261.6,1],[293.7,1],[261.6,2]],
    youll_never_walk_alone: [[523.3,2],[587.3,1],[659.3,1],[523.3,2],[659.3,1],[698.5,1],[784,4]],
    sweet_caroline:     [[392,1],[440,1],[493.9,1],[392,1],[440,1],[493.9,1],[587.3,2],[659.3,1],[587.3,1],[493.9,2]],
    wonderwall:         [[440,1],[329.6,1],[440,1],[523.3,1],[659.3,2],[523.3,2]],
    angels:             [[440,2],[493.9,1],[587.3,1],[440,1],[493.9,1],[392,2],[329.6,4]],
    allez_allez_allez:  [[659.3,1],[659.3,1],[784,1],[659.3,1],[587.3,2],[523.3,2]],
    rasputin:           [[392,1],[349.2,1],[329.6,1],[293.7,1],[329.6,1],[293.7,1],[261.6,1],[246.9,2]],
    lose_yourself:      [[440,1],[523.3,1],[587.3,1],[659.3,2],[587.3,1],[523.3,1],[440,1],[392,2]],
};
const MELODY_BPM: Record<string, number> = {
    youll_never_walk_alone: 60, angels: 65,
    sloop_john_b: 110, wonderwall: 105, bella_ciao: 115, go_west: 118, sweet_caroline: 118,
    seven_nation_army: 124, allez_allez_allez: 130,
    freed_from_desire: 138, rasputin: 142, lose_yourself: 172,
};

export function playMelodyRiff(melodyId: string, tempo: 'slow' | 'medium' | 'fast', loops = 3): () => void {
    const notes = MELODY_NOTES[melodyId];
    if (!notes || notes.length === 0) return () => {};

    const bpm = MELODY_BPM[melodyId] ?? (tempo === 'slow' ? 72 : tempo === 'fast' ? 140 : 112);
    const beat = 60 / bpm;

    try {
        const ctx = new AudioContext();
        const master = ctx.createGain();
        master.gain.value = 0.28;
        master.connect(ctx.destination);

        // Light stadium echo
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.2;
        const echo = ctx.createGain();
        echo.gain.value = 0.22;
        delay.connect(echo);
        echo.connect(delay);
        echo.connect(master);

        const loopDur = notes.reduce((s, [, b]) => s + b * beat, 0);
        const allOscs: OscillatorNode[] = [];

        for (let loop = 0; loop < loops; loop++) {
            let t = ctx.currentTime + 0.1 + loop * loopDur;
            notes.forEach(([freq, beats]) => {
                const dur = beats * beat;
                // Main tone (triangle = choir-like)
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const env = ctx.createGain();
                env.gain.setValueAtTime(0, t);
                env.gain.linearRampToValueAtTime(0.65, t + 0.03);
                env.gain.linearRampToValueAtTime(0.55, t + dur - 0.04);
                env.gain.linearRampToValueAtTime(0, t + dur);
                osc.connect(env);
                env.connect(delay);
                env.connect(master);
                osc.start(t);
                osc.stop(t + dur + 0.02);
                allOscs.push(osc);

                // Harmony a perfect fifth above (×1.5) for crowd chorus
                const harm = ctx.createOscillator();
                harm.type = 'sine';
                harm.frequency.value = freq * 1.5;
                const hEnv = ctx.createGain();
                hEnv.gain.setValueAtTime(0, t);
                hEnv.gain.linearRampToValueAtTime(0.18, t + 0.05);
                hEnv.gain.linearRampToValueAtTime(0, t + dur);
                harm.connect(hEnv);
                hEnv.connect(master);
                harm.start(t);
                harm.stop(t + dur + 0.02);
                allOscs.push(harm);

                t += dur;
            });
        }

        return () => { allOscs.forEach(o => { try { o.stop(); } catch {} }); ctx.close(); };
    } catch {
        return () => {};
    }
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

async function generateElevenLabsMusic(lyrics: string, melody: SongbookEntry): Promise<string | null> {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
        console.warn('[ElevenLabs] No API key found — falling back to Gemini TTS');
        return null;
    }

    try {
        // Build a ToS-safe prompt: describe style, not song/artist names.
        // Include the actual lyrics so the AI sings them.
        const prompt =
            `${melody.musicStyle}. ` +
            `A crowd of 50000 passionate football fans singing this chant: "${lyrics.replace(/\n/g, ' / ')}"`;

        const response = await fetch('https://api.elevenlabs.io/v1/music', {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, duration_seconds: 15 })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`[ElevenLabs Music] HTTP ${response.status}:`, errText.slice(0, 300));
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer.byteLength) {
            console.warn('[ElevenLabs Music] Empty audio response');
            return null;
        }

        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        console.log('[ElevenLabs Music] Generated successfully, size:', arrayBuffer.byteLength);
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('[ElevenLabs Music] Fetch error:', err);
        return null;
    }
}

async function generateElevenLabsVocal(lyrics: string, melody: SongbookEntry): Promise<string | null> {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) return null;

    try {
        // Format lyrics with rhythm hints so eleven_v3 delivers it as a rhythmic chant
        const lines = lyrics.split('\n').filter(Boolean);
        const formattedLyrics = lines.join(' / ');
        const text =
            `[Singing as a passionate football stadium crowd, rhythmic chant delivery, ` +
            `matching the beat pattern ${melody.stressPattern}]: ` +
            formattedLyrics;

        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_v3',
                voice_settings: {
                    stability: 0.30,
                    similarity_boost: 0.65,
                    style: 0.85,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`[ElevenLabs Vocal] HTTP ${response.status}:`, errText.slice(0, 200));
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer.byteLength) return null;

        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        console.log('[ElevenLabs Vocal] Generated successfully, size:', arrayBuffer.byteLength);
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error('[ElevenLabs Vocal] Fetch error:', err);
        return null;
    }
}

async function fallbackTtsChant(lyrics: string, melody?: SongbookEntry): Promise<void> {
    try {
        const tuneHint = melody
            ? `This is sung to the tune of "${melody.title}" by ${melody.artist}. ` +
              `The rhythm is: ${melody.stressPattern}. Tempo: ${melody.tempo}. `
            : '';
        const instruction = `${tuneHint}You are 50,000 passionate football fans singing this chant in a stadium. ` +
            `Deliver it with powerful crowd energy — rhythmic, loud, emotional. ` +
            `Match the syllable stress and beat of the melody:\n\n${lyrics}`;

        const response = await getAI().models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: instruction }] }],
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

    // Count syllable positions in the stress pattern for the worked example
    const patternPositions = melody.stressPattern.trim().split(/\s+/).filter(t => !t.startsWith('(')).length;
    const stressPositions = melody.stressPattern.trim().split(/\s+/)
        .filter(t => !t.startsWith('('))
        .map((t, i) => t === t.toUpperCase() && t !== 'da' && t !== 'na' ? i + 1 : null)
        .filter(Boolean);

    const prompt = `
You are the Capo of the ${teamName} Ultras, leading the terrace choir.

SITUATION: ${situationDesc}
${nationalityHint}
${personalityHint}

YOUR ASSIGNED MELODY: "${melody.title}" by ${melody.artist}
STRESS PATTERN: ${melody.stressPattern}
Each position = one syllable. UPPERCASE = stressed beat, lowercase = unstressed.
Total syllables per line: approximately ${patternPositions}.
Stressed beats fall on positions: ${stressPositions.join(', ')}.
TEMPO: ${melody.tempo}
EMOTIONAL FEEL: ${melody.emotionalTags.join(', ')}

── SYLLABLE MAPPING — THIS IS THE MOST IMPORTANT RULE ──
You MUST write lyrics where each syllable maps to one position in the stress pattern.
Do NOT write "We love you Liverpool" and call it done — that is a generic placeholder.
You MUST adapt the lyrics to fit this specific melody's rhythm.

HOW TO CHECK: Write the line, then split into syllables and mark each one:
  Pattern:   DUM  da  da  DUM  da  da  DUM
  Syllables: LIV- er- pool- FIRE- side- an- FIELD  ← each syllable fills one pattern slot ✓
  Wrong:     "We love you Liverpool FC"  ← too many syllables, doesn't map ✗

WRITE YOUR LYRICS LIKE THIS INSIDE THE JSON — syllables must fit the STRESS PATTERN above.
Rhyme scheme: AABB or ABAB.
Include "${playerName || teamName}" fitting naturally into the meter.
${isDramatic ? 'This is a DRAMATIC historic moment — go huge, be unforgettable.' : ''}
No "Olé Olé". No generic filler. Be vivid and specific to the situation.

Return JSON ONLY (no extra text):
{
    "lyrics": ["Line 1", "Line 2", "Line 3", "Line 4"${isDramatic ? ', "Line 5", "Line 6"' : ''}],
    "tune": "${melody.title} (${melody.artist})",
    "intensity": "${isDramatic ? 'high' : trigger === 'losing' ? 'low' : 'medium'}"
}
`;

    // Start the melody immediately — plays even while Gemini generates lyrics
    const stopMelody = playMelodyRiff(melody.id, melody.tempo, 4);
    setTimeout(stopMelody, 18000);

    // ── STEP 1: Generate lyrics (isolated try — audio cannot kill this) ─────
    let generatedLyrics: string[] = [];
    let intensity: 'low' | 'medium' | 'high' = trigger === 'losing' ? 'low' : isDramatic ? 'high' : 'medium';

    try {
        const response = await getAI().models.generateContent({
            model: model,
            contents: prompt
        });
        const raw = response.text ?? '';
        const cleanText = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        const jsonStr = start !== -1 && end > start ? cleanText.slice(start, end + 1) : '{}';
        const parsed = JSON.parse(jsonStr) as { lyrics?: string[]; tune?: string; intensity?: string };
        if (Array.isArray(parsed.lyrics) && parsed.lyrics.length > 0) {
            generatedLyrics = parsed.lyrics;
        }
        if (parsed.intensity === 'low' || parsed.intensity === 'medium' || parsed.intensity === 'high') {
            intensity = parsed.intensity;
        }
    } catch (err) {
        console.error('[Chant] Lyrics generation failed:', err);
    }

    const lyrics = generatedLyrics.length > 0 ? generatedLyrics : [
        `${teamName} till I die,`,
        `${teamName} till I die,`,
        `I know I am, I'm sure I am,`,
        `${teamName} till I die!`
    ];

    // ── STEP 2: Generate audio (isolated try — never affects lyrics return) ──
    let audioUrl: string | undefined;
    let vocalUrl: string | undefined;

    try {
        const lyricsText = lyrics.join('\n');
        const [a, v] = await Promise.all([
            generateElevenLabsMusic(lyricsText, melody),
            generateElevenLabsVocal(lyricsText, melody)
        ]);
        audioUrl = a ?? undefined;
        vocalUrl = v ?? undefined;
        if (!vocalUrl) {
            fallbackTtsChant(lyricsText, melody).catch(() => {});
        }
    } catch (err) {
        console.error('[Chant] Audio generation failed:', err);
        fallbackTtsChant(lyrics.join('\n'), melody).catch(() => {});
    }

    return { lyrics, tune: melody.title, intensity, melodyId: melody.id, audioUrl, vocalUrl };
};
