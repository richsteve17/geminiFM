import songbook from '../data/chantSongbook.json';

export type ChantTrigger = 'goal' | 'bad_call' | 'winning' | 'losing';

export interface Chant {
    lyrics: string[];
    tune: string;
    intensity: 'low' | 'medium' | 'high';
    archetypeId: string;
    tempoBpm: number;
    audioProfile: {
        clones: [number, number];
        detuneCents: [number, number];
        timeJitterMs: [number, number];
        reverbRt60Seconds: number;
    };
}

type Archetype = {
    id: string;
    canonical_name: string;
    match_event_trigger: string;
    original_source: { tempo_bpm_range: number[] };
    generative_template: {
        slots: Record<string, string>;
        template_lines: string[];
    };
};

const triggerMatches: Record<ChantTrigger, readonly string[]> = {
    goal: ['GOAL_CELEBRATION_FANFARE', 'HOME_TEAM_GOAL_OR_VICTORY', 'STRIKER_HOME_GOAL_BALLAD', 'SUPER_SUB_GOAL'],
    bad_call: ['CONTROVERSIAL_PENALTY_OR_RED', 'HARD_TACKLE_OR_MIDFIELD_RECOVERY'],
    winning: ['DOMINANT_POSSESSION_PHASE', 'FULL_TIME_CRUCIAL_WIN', 'ATTACKING_DOMINANCE_OR_BOUNCE'],
    losing: ['BOARDROOM_PROTEST_OR_DEFIANCE', 'PRE_MATCH_WALKOUT_UNDERDOG', 'LATE_MATCH_NOSTALGIA_OR_HERITAGE'],
};

const archetypes = (songbook.archetypes as unknown as Archetype[]).slice().sort((a, b) => a.id.localeCompare(b.id));
const lastArchetypeByTrigger = new Map<ChantTrigger, string>();
let chantSequence = 0;

const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

const fillTemplate = (line: string, values: Record<string, string>) =>
    line.replace(/\{([A-Z0-9_]+)\}/g, (_match, key: string) => values[key] || key.toLowerCase().replace(/_/g, ' '));

function selectArchetype(teamName: string, trigger: ChantTrigger, playerName?: string) {
    const candidates = archetypes.filter(archetype => triggerMatches[trigger].includes(archetype.match_event_trigger));
    const pool = candidates.length > 0 ? candidates : archetypes;
    const prior = lastArchetypeByTrigger.get(trigger);
    const withoutPrior = pool.filter(archetype => archetype.id !== prior);
    const selectable = withoutPrior.length > 0 ? withoutPrior : pool;
    const index = hash(`${teamName}|${trigger}|${playerName || ''}|${chantSequence}`) % selectable.length;
    const chosen = selectable[index];
    chantSequence += 1;
    lastArchetypeByTrigger.set(trigger, chosen.id);
    return chosen;
}

/**
 * Builds a chant from the supplied 36-archetype songbook. No LLM invents lyrics or picks a
 * tune: a real template, its prosody, tempo range, and synthesis profile are always visible.
 */
export async function generatePunkChant(teamName: string, trigger: ChantTrigger, playerName?: string): Promise<Chant> {
    const archetype = selectArchetype(teamName, trigger, playerName);
    const [tempoLow = 110, tempoHigh = 122] = archetype.original_source.tempo_bpm_range;
    const intensity: Chant['intensity'] = trigger === 'goal' || trigger === 'bad_call' ? 'high' : trigger === 'losing' ? 'low' : 'medium';
    const values = {
        TEAM: teamName,
        PLAYER_NAME: playerName || 'the number nine',
        RIVAL_CLUB: 'the opposition',
        POSITION_FLANK_1: 'left',
        POSITION_FLANK_2: 'right',
        ACTION_VERB: trigger === 'goal' ? 'score' : trigger === 'winning' ? 'win' : 'fight',
    };

    return {
        archetypeId: archetype.id,
        tune: archetype.canonical_name,
        intensity,
        tempoBpm: Math.round((tempoLow + tempoHigh) / 2),
        lyrics: archetype.generative_template.template_lines.map(line => fillTemplate(line, values)),
        audioProfile: {
            clones: [8, 24],
            detuneCents: [-35, 35],
            timeJitterMs: [15, 60],
            reverbRt60Seconds: 2.4,
        },
    };
}
