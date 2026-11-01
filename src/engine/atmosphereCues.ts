import type { MatchEvent } from '../types';

export type AtmosphereCueKind = 'kickoff' | 'goal' | 'pressure' | 'fulltime';
export type AtmosphereCueSide = 'home' | 'away';

export interface AtmosphereCue {
    /** Stable across React renders and simulation batches; safe to use as a playback dedupe key. */
    id: string;
    kind: AtmosphereCueKind;
    clubName: string;
    opponentName: string;
    side: AtmosphereCueSide;
    minute: number;
    intensity: 'low' | 'medium' | 'high';
    playerName?: string;
    sourceEventId?: number;
}

export interface AtmosphereCueSnapshot {
    /** A fixture/session identifier. A new value starts a new cue ledger. */
    matchId: string;
    homeTeamName: string;
    awayTeamName: string;
    currentMinute: number;
    momentum: number;
    events: readonly MatchEvent[];
    isLive: boolean;
    isFinished: boolean;
}

export interface AtmosphereCueMemory {
    /** Cues already handed to the presentation layer. */
    emittedCueIds: readonly string[];
    /** Match-minute cooldowns are scoped to the club and cue kind. */
    lastMinuteByCooldownKey: Readonly<Record<string, number>>;
}

export interface AtmosphereCueSelection {
    cues: AtmosphereCue[];
    memory: AtmosphereCueMemory;
}

const PRESSURE_THRESHOLD = 6;
const PRESSURE_COOLDOWN_MINUTES = 10;
const MAX_REMEMBERED_CUES = 400;

export function createAtmosphereCueMemory(): AtmosphereCueMemory {
    return { emittedCueIds: [], lastMinuteByCooldownKey: {} };
}

const clean = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-');

function sideForClub(clubName: string, snapshot: AtmosphereCueSnapshot): AtmosphereCueSide {
    return clubName === snapshot.awayTeamName ? 'away' : 'home';
}

function opponentForClub(clubName: string, snapshot: AtmosphereCueSnapshot) {
    return clubName === snapshot.homeTeamName ? snapshot.awayTeamName : snapshot.homeTeamName;
}

function cueId(snapshot: AtmosphereCueSnapshot, kind: AtmosphereCueKind, identity: string) {
    return `${snapshot.matchId}:${kind}:${identity}`;
}

function canEmit(
    cue: AtmosphereCue,
    memory: AtmosphereCueMemory,
    cooldownMinutes = 0,
): boolean {
    if (memory.emittedCueIds.includes(cue.id)) return false;
    if (cooldownMinutes <= 0) return true;
    const cooldownKey = `${clean(cue.clubName)}:${cue.kind}`;
    const lastMinute = memory.lastMinuteByCooldownKey[cooldownKey];
    return lastMinute === undefined || cue.minute - lastMinute >= cooldownMinutes;
}

function remember(cue: AtmosphereCue, memory: AtmosphereCueMemory, cooldownMinutes = 0): AtmosphereCueMemory {
    const emittedCueIds = [...memory.emittedCueIds, cue.id].slice(-MAX_REMEMBERED_CUES);
    if (cooldownMinutes <= 0) return { ...memory, emittedCueIds };

    return {
        emittedCueIds,
        lastMinuteByCooldownKey: {
            ...memory.lastMinuteByCooldownKey,
            [`${clean(cue.clubName)}:${cue.kind}`]: cue.minute,
        },
    };
}

function buildCue(
    snapshot: AtmosphereCueSnapshot,
    kind: AtmosphereCueKind,
    clubName: string,
    minute: number,
    identity: string,
    intensity: AtmosphereCue['intensity'],
    playerName?: string,
    sourceEventId?: number,
): AtmosphereCue {
    return {
        id: cueId(snapshot, kind, identity),
        kind,
        clubName,
        opponentName: opponentForClub(clubName, snapshot),
        side: sideForClub(clubName, snapshot),
        minute,
        intensity,
        playerName,
        sourceEventId,
    };
}

/**
 * Purely derives new stadium cues from a cumulative match event ledger.
 *
 * The caller owns and threads `memory` (typically in a ref). This avoids React render timing
 * deciding what has played, while preserving every unseen goal in a simulation batch. Goals
 * deliberately have no time cooldown: unique event ids dedupe re-renders without suppressing
 * a real brace or two quick goals. Pressure is the only recurring state cue and has a cooldown.
 */
export function selectAtmosphereCues(
    snapshot: AtmosphereCueSnapshot,
    previousMemory: AtmosphereCueMemory = createAtmosphereCueMemory(),
): AtmosphereCueSelection {
    let memory = previousMemory;
    const cues: AtmosphereCue[] = [];

    const consider = (cue: AtmosphereCue, cooldownMinutes = 0) => {
        if (!canEmit(cue, memory, cooldownMinutes)) return;
        cues.push(cue);
        memory = remember(cue, memory, cooldownMinutes);
    };

    if (snapshot.isLive) {
        consider(buildCue(
            snapshot,
            'kickoff',
            snapshot.homeTeamName,
            0,
            'opening-whistle',
            'medium',
        ));

        if (Math.abs(snapshot.momentum) >= PRESSURE_THRESHOLD) {
            const clubName = snapshot.momentum >= 0 ? snapshot.homeTeamName : snapshot.awayTeamName;
            const pressureBucket = Math.floor(Math.max(0, snapshot.currentMinute) / PRESSURE_COOLDOWN_MINUTES);
            consider(buildCue(
                snapshot,
                'pressure',
                clubName,
                snapshot.currentMinute,
                `${clean(clubName)}:pressure-${pressureBucket}`,
                Math.abs(snapshot.momentum) >= 8 ? 'high' : 'medium',
            ), PRESSURE_COOLDOWN_MINUTES);
        }
    }

    // A final simulation batch can contain goals and set isFinished in the same render. Goals
    // therefore remain eligible after play has stopped, while kickoff/pressure stay live-only.
    const unseenGoals = snapshot.events
        .filter((event): event is MatchEvent & { teamName: string } => event.type === 'goal' && Boolean(event.teamName))
        .slice()
        .sort((left, right) => left.minute - right.minute || left.id - right.id);

    for (const goal of unseenGoals) {
        consider(buildCue(
            snapshot,
            'goal',
            goal.teamName,
            goal.minute,
            `event-${goal.id}`,
            'high',
            goal.player,
            goal.id,
        ));
    }

    if (snapshot.isFinished) {
        const homeGoals = snapshot.events.filter(event => event.type === 'goal' && event.teamName === snapshot.homeTeamName).length;
        const awayGoals = snapshot.events.filter(event => event.type === 'goal' && event.teamName === snapshot.awayTeamName).length;
        const clubName = awayGoals > homeGoals ? snapshot.awayTeamName : snapshot.homeTeamName;
        consider(buildCue(
            snapshot,
            'fulltime',
            clubName,
            snapshot.currentMinute,
            'final-whistle',
            homeGoals === awayGoals ? 'low' : 'high',
        ));
    }

    return { cues, memory };
}
