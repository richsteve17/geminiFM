import songbook from '../data/chantSongbook.json';
import { findChantRecording, type ChantRecording } from '../data/chantAudioCatalog';
import type { AtmosphereCue, AtmosphereCueKind } from '../engine/atmosphereCues';

export type ChantTrigger = 'goal' | 'bad_call' | 'winning' | 'losing';
export type ChantAudioSource = 'recorded-terrace' | 'no-recording';

export interface Chant {
    /** A stable event/cue id, not a render-time timestamp. */
    id: string;
    lyrics: string[];
    tune: string;
    intensity: 'low' | 'medium' | 'high';
    archetypeId: string;
    tempoBpm: number;
    clubName: string;
    opponentName?: string;
    playerName?: string;
    audioSource: ChantAudioSource;
    recording?: ChantRecording;
    audioProfile: {
        clones: [number, number];
        detuneCents: [number, number];
        timeJitterMs: [number, number];
        reverbRt60Seconds: number;
    };
}

export interface SyntheticChantPreview {
    /** Never present this as a recorded stadium chant. */
    kind: 'synthetic-speech-preview';
    encoding: 'pcm_s16le';
    sampleRate: 24000;
    channels: 1;
    dataBase64: string;
}

type Archetype = {
    id: string;
    canonical_name: string;
    match_event_trigger: string;
    original_source: { tempo_bpm_range?: number[] };
    generative_template?: {
        slots?: Record<string, string>;
        template_lines?: string[];
    };
};

type ChantRequest = {
    id: string;
    cueKind: AtmosphereCueKind;
    clubName: string;
    opponentName?: string;
    playerName?: string;
    intensity?: Chant['intensity'];
};

const archetypes = songbook.archetypes as unknown as Archetype[];
const archetypeById = new Map(archetypes.map(archetype => [archetype.id, archetype]));

const defaultArchetypesByCue: Record<AtmosphereCueKind, readonly string[]> = {
    kickoff: ['the_liquidator', 'when_the_saints_go_marching_in', 'forever_blowing_bubbles'],
    goal: ['seven_nation_army', 'glad_all_over', 'just_cant_get_enough', 'askin_olayim'],
    pressure: ['just_cant_get_enough', 'pasos_al_costado', 'bella_ciao'],
    fulltime: ['glad_all_over', 'one_step_beyond', 'just_cant_get_enough', 'forever_blowing_bubbles'],
};

const legacyArchetypesByTrigger: Record<ChantTrigger, readonly string[]> = {
    goal: defaultArchetypesByCue.goal,
    bad_call: ['referee_wanker', 'dont_you_want_me'],
    winning: ['just_cant_get_enough', 'one_step_beyond', 'glad_all_over'],
    losing: ['bella_ciao', 'forever_blowing_bubbles', 'fields_of_athenry'],
};

let legacySequence = 0;
const lastFallbackArchetypeByClubAndCue = new Map<string, string>();

const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

function hasAllTemplateValues(archetype: Archetype, values: Record<string, string | undefined>) {
    const slots = new Set<string>();
    for (const line of archetype.generative_template?.template_lines || []) {
        for (const match of line.matchAll(/\{([A-Z0-9_]+)\}/g)) slots.add(match[1]);
    }
    return [...slots].every(slot => Boolean(values[slot]));
}

function fillTemplate(archetype: Archetype, values: Record<string, string | undefined>) {
    if (!hasAllTemplateValues(archetype, values)) return [];
    return (archetype.generative_template?.template_lines || []).map(line =>
        line.replace(/\{([A-Z0-9_]+)\}/g, (_match, key: string) => values[key] || ''),
    );
}

function templateValues(request: ChantRequest): Record<string, string | undefined> {
    // Every substitution is a match fact or a supplied songbook value; no ad-libbed lyric text.
    return {
        CLUB_NAME: request.clubName,
        PLAYER_OR_CLUB: request.playerName || request.clubName,
        PLAYER_NAME: request.playerName,
        PLAYER_FULL_NAME: request.playerName,
        STRIKER_NAME: request.playerName,
        CULT_HERO: request.playerName,
        RIVAL_CLUB: request.opponentName,
        RIVAL_NAME: request.opponentName,
    };
}

function chooseFallbackArchetype(request: ChantRequest, allowedIds = defaultArchetypesByCue[request.cueKind]) {
    const values = templateValues(request);
    const candidates = allowedIds
        .map(id => archetypeById.get(id))
        .filter((archetype): archetype is Archetype => Boolean(archetype && hasAllTemplateValues(archetype, values)));
    const pool = candidates.length > 0 ? candidates : archetypes.filter(archetype => hasAllTemplateValues(archetype, values));
    const key = `${request.clubName.toLowerCase()}:${request.cueKind}`;
    const previous = lastFallbackArchetypeByClubAndCue.get(key);
    const rotated = pool.filter(archetype => archetype.id !== previous);
    const selectable = rotated.length > 0 ? rotated : pool;
    const chosen = selectable[hash(request.id) % selectable.length] || archetypes[0];
    lastFallbackArchetypeByClubAndCue.set(key, chosen.id);
    return chosen;
}

function toChant(request: ChantRequest, recording?: ChantRecording, allowedIds?: readonly string[]): Chant {
    const archetype = recording ? archetypeById.get(recording.songbookId) : chooseFallbackArchetype(request, allowedIds);
    const [tempoLow = 110, tempoHigh = 122] = archetype?.original_source.tempo_bpm_range || [];
    const suppliedLyrics = recording?.suppliedLyrics;
    const lyrics = suppliedLyrics ? [...suppliedLyrics] : archetype ? fillTemplate(archetype, templateValues(request)) : [];

    return {
        id: request.id,
        archetypeId: recording?.songbookId || archetype?.id || 'recording_only',
        tune: recording?.title || archetype?.canonical_name || 'Songbook chant',
        intensity: request.intensity || (request.cueKind === 'goal' ? 'high' : request.cueKind === 'fulltime' ? 'medium' : 'medium'),
        tempoBpm: Math.round((tempoLow + tempoHigh) / 2),
        clubName: request.clubName,
        opponentName: request.opponentName,
        playerName: request.playerName,
        audioSource: recording ? 'recorded-terrace' : 'no-recording',
        recording,
        lyrics,
        audioProfile: {
            clones: [8, 24],
            detuneCents: [-35, 35],
            timeJitterMs: [15, 60],
            reverbRt60Seconds: 2.4,
        },
    };
}

/**
 * Resolve a cue to an actual supplied club recording where one exists. It is deliberately
 * synchronous and pure from the caller's perspective: no provider call is made on a match event.
 */
export function createChantForCue(cue: AtmosphereCue): Chant {
    const request: ChantRequest = {
        id: cue.id,
        cueKind: cue.kind,
        clubName: cue.clubName,
        opponentName: cue.opponentName,
        playerName: cue.playerName,
        intensity: cue.intensity,
    };
    const recording = findChantRecording({
        clubName: cue.clubName,
        cueKind: cue.kind,
        playbackKey: cue.id,
        playerName: cue.playerName,
    });
    return toChant(request, recording);
}

/**
 * Compatibility wrapper for existing consumers. New match code should pass event-derived
 * AtmosphereCue objects to createChantForCue so it can preserve club identity and event ids.
 */
export async function generatePunkChant(teamName: string, trigger: ChantTrigger, playerName?: string): Promise<Chant> {
    legacySequence += 1;
    const cueKind: AtmosphereCueKind = trigger === 'goal' ? 'goal' : trigger === 'winning' ? 'pressure' : 'fulltime';
    const request: ChantRequest = {
        id: `legacy:${teamName}:${trigger}:${playerName || ''}:${legacySequence}`,
        cueKind,
        clubName: teamName,
        playerName,
        intensity: trigger === 'goal' || trigger === 'bad_call' ? 'high' : trigger === 'losing' ? 'low' : 'medium',
    };
    return toChant(request, undefined, legacyArchetypesByTrigger[trigger]);
}

/**
 * Explicit, paid opt-in text-to-speech preview. Gemini's allowed TTS model is not an authentic
 * crowd recording, so callers must label it as a synthetic preview and never invoke it for an
 * automatic match cue. The existing server gateway allow-list includes this model.
 */
export async function generateChantAudio(chant: Chant): Promise<SyntheticChantPreview> {
    if (typeof fetch === 'undefined') throw new Error('AUDIO_PREVIEW_UNAVAILABLE');
    if (chant.lyrics.length === 0) throw new Error('AUDIO_PREVIEW_HAS_NO_SUPPLIED_LYRICS');

    const response = await fetch('/api/ai/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: `Read these supplied football-songbook lines with energetic pacing. This is a synthetic spoken preview, not a crowd recording: ${chant.lyrics.join('\n')}` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            },
        }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'AUDIO_PREVIEW_FAILED');

    const payload = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
    };
    const dataBase64 = payload.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
    if (!dataBase64) throw new Error('AUDIO_PREVIEW_EMPTY');
    return { kind: 'synthetic-speech-preview', encoding: 'pcm_s16le', sampleRate: 24000, channels: 1, dataBase64 };
}

export function resetChantSelectionForTests() {
    legacySequence = 0;
    lastFallbackArchetypeByClubAndCue.clear();
}
