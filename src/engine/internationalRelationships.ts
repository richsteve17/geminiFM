import type { Fixture, MatchEvent, Player, PlayerEffect, PlayerPersonality, PlayerPosition, Team, TournamentStage } from '../types';

/** Pure engine: callers own persistence, selection, calendar advancement and AI interpretation. */
export interface RelationshipPlayer extends Player {
    externalId?: string;
    nationalTeamCode?: string;
    /** Explicit catalog aliases only. Surnames are never generated as aliases. */
    aliases?: string[];
}
export interface RelationshipClubTeam extends Team { players: RelationshipPlayer[] }
export interface RelationshipNationalTeam {
    name: string;
    countryCode?: string;
    players: RelationshipPlayer[];
    prestige: number;
    aliases?: string[];
    /** 0..1; omitted expectations use prestige / 100. */
    expectation?: number;
}
export type InternationalTournamentType = 'WorldCup' | 'Euros' | 'InternationalBreak' | 'NationsLeague' | 'CopaAmerica' | 'Qualifier' | 'Friendly';
export interface RelationshipMatchEvent extends MatchEvent {
    playerExternalId?: string;
    isPenalty?: boolean;
    ownGoal?: boolean;
    /** Optional verified keeper at the time of THIS goal (useful after substitutions). */
    goalkeeper?: string;
    goalkeeperExternalId?: string;
}
export interface RelationshipPenalty {
    id: string | number;
    teamName: string;
    taker: string;
    takerExternalId?: string;
    goalkeeper?: string;
    goalkeeperExternalId?: string;
    outcome: 'scored' | 'saved' | 'missed';
    shootout?: boolean;
    decisive?: boolean;
}
export interface InternationalRelationshipFixture extends Fixture {
    events?: RelationshipMatchEvent[];
    /** When supplied, authoritative participation list, not the national squad/call-up list. */
    participantNames?: { home: string[]; away: string[] };
    /** Verified match keeper; omit after keeper substitutions unless event-specific keepers exist. */
    goalkeeperNames?: { home?: string; away?: string };
    penalties?: RelationshipPenalty[];
    tournamentId?: string;
    tournamentType?: InternationalTournamentType;
    year?: number;
    nationOutcomes?: { home?: 'champion' | 'eliminated' | 'disappointing'; away?: 'champion' | 'eliminated' | 'disappointing' };
}
export interface RelationshipClock { year: number; week: number; weeksPerYear?: number }
export interface RelationshipIdentity {
    key: string;
    name: string;
    nationality: string;
    position: PlayerPosition;
    personality: PlayerPersonality;
    externalId?: string;
}
export interface RelationshipNationIdentity { name: string; countryCode?: string }
export type RelationshipKind = 'rift' | 'bond' | 'shared-disappointment';
export type RelationshipSeverity = 'minor' | 'moderate' | 'serious';
export type RelationshipState = 'active' | 'separated' | 'resolved' | 'expired' | 'transfer-requested';
export interface RelationshipTriggerFacts {
    fixtureId: string;
    tournamentId?: string;
    tournamentType: InternationalTournamentType;
    stage: TournamentStage;
    homeNation: string;
    awayNation: string;
    score: string;
    winnerNation?: string;
    playerAGoals: number;
    playerBGoals: number;
    /** Actual goals scored by the other player against this verified keeper. */
    directKeeperExposureA: number;
    directKeeperExposureB: number;
    decisiveScorerKey?: string;
    goalEventIds: number[];
    penaltyIds: Array<string | number>;
    expectationA: number;
    expectationB: number;
    labels: string[];
}
export type RelationshipIntervention = 'bench-a' | 'bench-b' | 'risk-it' | 'mediation';
/** Bounded interpretation of manager text, supplied by caller; never generated here. */
export interface MediationInterpretation {
    tone?: 'supportive' | 'balanced' | 'hostile';
    support?: number;
    accountability?: number;
    specificity?: number;
    respect?: number;
}
export interface RelationshipAttempt {
    id: string;
    action: RelationshipIntervention;
    year: number;
    week: number;
    outcome: 'separated' | 'risk-accepted' | 'improved' | 'resolved' | 'resisted' | 'no-op';
    strengthBefore: number;
    strengthAfter: number;
    interpretation?: Required<MediationInterpretation>;
}
export interface RelationshipIncident {
    id: string;
    clubName: string;
    pairKey: string;
    playerA: RelationshipIdentity;
    playerB: RelationshipIdentity;
    nationA: RelationshipNationIdentity;
    nationB: RelationshipNationIdentity;
    kind: RelationshipKind;
    trigger: RelationshipTriggerFacts;
    /** Current 0..100 impact, independently retained from observed evidence. */
    strength: number;
    /** Prevents reprocessing the same fixture from undoing interventions or double-escalating. */
    evidenceStrength: number;
    severity: RelationshipSeverity;
    createdWeek: number;
    createdYear: number;
    durationWeeks: number;
    weeksPerYear: number;
    state: RelationshipState;
    attempts: RelationshipAttempt[];
    separatedPlayerKey?: string;
    severeSince?: { year: number; week: number };
    /** Absolute calendar weeks; only verified co-selection counts, at most once per week. */
    coSelectionWeeks: number[];
    lastAdvancedWeek?: number;
    transferRequestedPlayerKeys: string[];
}
export interface BuildRelationshipIncidentsInput extends RelationshipClock {
    clubTeams: Readonly<Record<string, RelationshipClubTeam>> | readonly RelationshipClubTeam[];
    nationalTeams: Readonly<Record<string, RelationshipNationalTeam>> | readonly RelationshipNationalTeam[];
    fixtures: readonly InternationalRelationshipFixture[];
    tournamentType: InternationalTournamentType;
    existingIncidents?: readonly RelationshipIncident[];
    expectations?: Readonly<Record<string, number>>;
}
export type IncidentPlayerEffect = PlayerEffect & {
    relationshipId: string;
    playerKey: string;
    otherPlayerKey: string;
    createdYear: number;
    createdWeek: number;
    expiresYear: number;
    expiresWeek: number;
    strength: number;
    relationshipState: RelationshipState;
    separationRequired: boolean;
    trainingPenalty: number;
    formPenalty: number;
    moraleDelta: number;
};
export interface RelationshipPlayerUpdate {
    clubName: string;
    playerKey: string;
    relationshipId: string;
    effects: IncidentPlayerEffect[];
    bench?: boolean;
    transferRequested?: boolean;
}
export interface RelationshipResult { incident: RelationshipIncident; effects: RelationshipPlayerUpdate[] }
export interface RelationshipInterventionContext extends RelationshipClock {
    /** Stable caller action ID; replay is a no-op. Default is action + calendar week. */
    attemptId?: string;
    interpretation?: MediationInterpretation;
}
export interface RelationshipAdvanceContext extends RelationshipClock {
    /** Actual club lineup, not national call-ups. Omit to advance time without co-selection. */
    selectedPlayerKeys?: readonly string[];
}

const clamp = (n: number, min = 0, max = 100): number => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
const unit = (n: number | undefined): number => clamp(n ?? 0, 0, 1);
const normalizeName = (s: string): string => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Preserve flags and subdivision tags: England and Scotland must not collapse to the same black flag.
const nationalityToken = (s: string): string => s.trim().toLowerCase().normalize('NFKC');
const nationToken = (s: string): string => normalizeName(s) || nationalityToken(s);
const encode = (parts: readonly string[]): string => parts.map(encodeURIComponent).join(':');
const values = <T>(v: Readonly<Record<string, T>> | readonly T[]): T[] => Array.isArray(v) ? [...v] : Object.values(v);
const calendarSize = (clock: RelationshipClock): number => Math.max(1, Math.floor(clock.weeksPerYear ?? 52));
const absoluteWeek = (clock: RelationshipClock, size = calendarSize(clock)): number => (clock.year - 1) * size + clock.week - 1;
const createdClock = (i: RelationshipIncident): RelationshipClock => ({ year: i.createdYear, week: i.createdWeek, weeksPerYear: i.weeksPerYear });
const expiresAt = (i: RelationshipIncident): number => absoluteWeek(createdClock(i)) + i.durationWeeks;
const isLive = (i: RelationshipIncident, clock: RelationshipClock): boolean => i.state !== 'resolved' && i.state !== 'expired' && absoluteWeek(clock, i.weeksPerYear) < expiresAt(i);
const severityFor = (strength: number): RelationshipSeverity => strength >= 60 ? 'serious' : strength >= 25 ? 'moderate' : 'minor';
const durationFor = (kind: RelationshipKind, severity: RelationshipSeverity): number => kind === 'bond' ? 12 : severity === 'serious' ? 20 : severity === 'moderate' ? 10 : 4;
const PERSONALITY: Record<PlayerPersonality, number> = { Professional: 0.65, Leader: 0.85, Loyal: 0.85, Mercenary: 1, Ambitious: 1.2, 'Young Prospect': 1.05, Volatile: 1.4 };
const STAGE: Record<TournamentStage, number> = { 'Group Stage': 0.65, 'League Phase': 0.65, 'Play-offs': 1.15, 'Round of 32': 1.2, 'Round of 16': 1.35, 'Quarter Final': 1.65, 'Semi Final': 2.1, Final: 3.3 };
const COMPETITION: Record<InternationalTournamentType, number> = { WorldCup: 1.25, Euros: 1.1, CopaAmerica: 1.1, NationsLeague: 0.85, Qualifier: 0.8, InternationalBreak: 0.9, Friendly: 0.4 };
// Mirrors compatible football roles, without importing UI analysis or changing tactics.ts.
const COMPATIBLE: Record<PlayerPosition, readonly PlayerPosition[]> = {
    GK: ['GK'], CB: ['CB', 'DM', 'LB', 'RB'], LB: ['LB', 'LWB', 'CB'], RB: ['RB', 'RWB', 'CB'],
    LWB: ['LWB', 'LB', 'LM', 'LW'], RWB: ['RWB', 'RB', 'RM', 'RW'], DM: ['DM', 'CM', 'CB'],
    CM: ['CM', 'DM', 'AM', 'LM', 'RM'], AM: ['AM', 'CM', 'ST', 'LW', 'RW', 'CF'],
    LM: ['LM', 'LW', 'LWB', 'CM'], RM: ['RM', 'RW', 'RWB', 'CM'], LW: ['LW', 'LM', 'ST', 'AM'],
    RW: ['RW', 'RM', 'ST', 'AM'], ST: ['ST', 'CF', 'LW', 'RW', 'AM'], CF: ['CF', 'ST', 'AM'],
};

/** Fallback identity deliberately includes exact normalized name, nationality and club position. */
export function relationshipPlayerKey(player: RelationshipPlayer): string {
    return player.externalId ? `external:${encode([player.externalId])}` : `player:${encode([normalizeName(player.name), nationalityToken(player.nationality), player.position])}`;
}
function namesMatch(a: string, b: string): boolean {
    const x = normalizeName(a), y = normalizeName(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const xs = x.split(' '), ys = y.split(' ');
    // Only initial + COMPLETE remaining name, never bare surname or two distinct full first names.
    return xs.length >= 2 && xs.length === ys.length && xs.slice(1).join(' ') === ys.slice(1).join(' ') &&
        xs[0][0] === ys[0][0] && (xs[0].length === 1 || ys[0].length === 1);
}
function namedCandidates(nation: RelationshipNationalTeam, name: string, externalId?: string): RelationshipPlayer[] {
    if (externalId) return nation.players.filter(p => p.externalId === externalId);
    return nation.players.filter(p => [p.name, ...(p.aliases ?? [])].some(alias => namesMatch(alias, name)));
}
function resolveNamed(nation: RelationshipNationalTeam, name?: string, externalId?: string): RelationshipPlayer | undefined {
    if (!name && !externalId) return undefined;
    const matches = namedCandidates(nation, name ?? '', externalId);
    return matches.length === 1 ? matches[0] : undefined;
}
function nationMatches(n: RelationshipNationalTeam, token: string): boolean {
    return [n.name, n.countryCode ?? '', ...(n.aliases ?? []), ...n.players.map(p => p.nationality)]
        .some(value => value && nationToken(value) === nationToken(token));
}
function resolveNation(nations: readonly RelationshipNationalTeam[], token: string): RelationshipNationalTeam | undefined {
    const matches = nations.filter(n => nationMatches(n, token));
    return matches.length === 1 ? matches[0] : undefined;
}
interface InvolvedPlayer { club: RelationshipPlayer; national: RelationshipPlayer; nation: RelationshipNationalTeam; side: 'home' | 'away' }
function resolveClubPlayer(p: RelationshipPlayer, nations: readonly RelationshipNationalTeam[]): { national: RelationshipPlayer; nation: RelationshipNationalTeam } | undefined {
    const matches: Array<{ national: RelationshipPlayer; nation: RelationshipNationalTeam }> = [];
    if (p.externalId) {
        const identified = nations.flatMap(nation => nation.players.filter(np => np.externalId === p.externalId).map(national => ({ national, nation })));
        // A verified provider identity outranks stale nationality/display encodings; duplicate roster IDs remain ambiguous.
        if (identified.length) return identified.length === 1 ? identified[0] : undefined;
    }
    for (const nation of nations) {
        if (!nationMatches(nation, p.nationalTeamCode || p.nationality)) continue;
        let candidates: RelationshipPlayer[];
        if (p.externalId && nation.players.some(np => np.externalId === p.externalId)) {
            candidates = nation.players.filter(np => np.externalId === p.externalId);
        } else {
            candidates = nation.players.filter(np => [p.name, ...(p.aliases ?? [])].some(name =>
                [np.name, ...(np.aliases ?? [])].some(alias => namesMatch(alias, name))));
            // Ambiguity must not be hidden by differing positions or conflicting supplied IDs.
            if (candidates.length !== 1) continue;
            candidates = candidates.filter(np => (!p.externalId || !np.externalId || p.externalId === np.externalId) &&
                (nationalityToken(p.nationality) === nationalityToken(np.nationality) ||
                    (nationMatches(nation, p.nationality) && nationMatches(nation, np.nationality))) &&
                COMPATIBLE[p.position].includes(np.position));
        }
        if (candidates.length === 1) matches.push({ national: candidates[0], nation });
    }
    return matches.length === 1 ? matches[0] : undefined;
}
function parseScore(score?: string): [number, number] | undefined {
    const match = score?.match(/^\s*(\d+)\s*[-–:]\s*(\d+)\s*$/);
    if (!match) return undefined;
    const result: [number, number] = [Number(match[1]), Number(match[2])];
    return result.every(Number.isSafeInteger) ? result : undefined;
}
function isParticipant(p: RelationshipPlayer, nation: RelationshipNationalTeam, side: 'home' | 'away', f: InternationalRelationshipFixture): boolean {
    if (f.participantNames) return f.participantNames[side].some(name => resolveNamed(nation, name) === p);
    if (resolveNamed(nation, f.goalkeeperNames?.[side]) === p) return true;
    if ((f.events ?? []).some(e => ['goal', 'card', 'injury', 'sub'].includes(e.type) && e.teamName && nationMatches(nation, e.teamName) && resolveNamed(nation, e.player, e.playerExternalId) === p)) return true;
    if (p.position === 'GK' && (f.events ?? []).some(e => e.type === 'goal' && e.teamName && !nationMatches(nation, e.teamName) && resolveNamed(nation, e.goalkeeper, e.goalkeeperExternalId) === p)) return true;
    return (f.penalties ?? []).some(penalty => {
        if (nationMatches(nation, penalty.teamName)) return resolveNamed(nation, penalty.taker, penalty.takerExternalId) === p;
        return resolveNamed(nation, penalty.goalkeeper, penalty.goalkeeperExternalId) === p;
    });
}
interface VerifiedGoal { event: RelationshipMatchEvent; scorer?: RelationshipPlayer; side: 'home' | 'away'; keeper?: RelationshipPlayer; decisive: boolean }
function verifiedGoals(f: InternationalRelationshipFixture, home: RelationshipNationalTeam, away: RelationshipNationalTeam, score: [number, number]): VerifiedGoal[] {
    const seen = new Set<number>();
    const counts = { home: 0, away: 0 };
    const goals: VerifiedGoal[] = [];
    const uniqueGoalEvents = [...new Map((f.events ?? []).filter(e => e.type === 'goal').map(e => [e.id, e])).values()];
    const completeTimeline = uniqueGoalEvents.filter(e => e.teamName && nationMatches(home, e.teamName)).length === score[0] &&
        uniqueGoalEvents.filter(e => e.teamName && nationMatches(away, e.teamName)).length === score[1];
    for (const event of [...(f.events ?? [])].sort((a, b) => a.minute - b.minute || a.id - b.id)) {
        if (event.type !== 'goal' || seen.has(event.id) || !event.teamName) continue;
        seen.add(event.id);
        const side = nationMatches(home, event.teamName) ? 'home' : nationMatches(away, event.teamName) ? 'away' : undefined;
        if (!side) continue;
        const scoreLimit = side === 'home' ? score[0] : score[1];
        if (counts[side] >= scoreLimit) continue; // Corrupt extra goal events cannot exaggerate humiliation.
        counts[side]++;
        const attack = side === 'home' ? home : away, defense = side === 'home' ? away : home;
        const defenseSide = side === 'home' ? 'away' : 'home';
        const actor = event.ownGoal ? undefined : resolveNamed(attack, event.player, event.playerExternalId);
        const scorer = actor && isParticipant(actor, attack, side, f) ? actor : undefined;
        const explicitKeeper = event.goalkeeper || event.goalkeeperExternalId || f.goalkeeperNames?.[defenseSide];
        let keeper = explicitKeeper ? resolveNamed(defense, event.goalkeeper ?? f.goalkeeperNames?.[defenseSide], event.goalkeeperExternalId) : undefined;
        if (!explicitKeeper) {
            const keepers = defense.players.filter(p => p.position === 'GK' && isParticipant(p, defense, defenseSide, f));
            if (keepers.length === 1) keeper = keepers[0];
        }
        if (keeper && (keeper.position !== 'GK' || !isParticipant(keeper, defense, defenseSide, f))) keeper = undefined;
        const after = parseScore(event.scoreAfter);
        const scorerGoalNumber = after ? after[side === 'home' ? 0 : 1] : completeTimeline ? counts[side] : undefined;
        goals.push({ event, scorer, keeper, side, decisive: (side === 'home' ? score[0] > score[1] : score[1] > score[0]) && scorerGoalNumber === (side === 'home' ? score[1] : score[0]) + 1 });
    }
    return goals;
}
function identity(p: RelationshipPlayer): RelationshipIdentity {
    return { key: relationshipPlayerKey(p), name: p.name, nationality: p.nationality, position: p.position, personality: p.personality, ...(p.externalId ? { externalId: p.externalId } : {}) };
}
const nationIdentity = (n: RelationshipNationalTeam): RelationshipNationIdentity => ({ name: n.name, ...(n.countryCode ? { countryCode: n.countryCode } : {}) });
function roleExposure(position: PlayerPosition): number {
    if (position === 'GK') return 0; // Keeper exposure must be proven at the specific goal.
    if (position === 'DM') return 0.04;
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 0.18;
    if (['CM', 'LM', 'RM'].includes(position)) return 0.12;
    return 0.55; // Rival attacking stars carry competitive, not goalkeeper, blame.
}
function goalImpact(scorer: InvolvedPlayer, victim: InvolvedPlayer, goals: VerifiedGoal[]): number {
    const involved = goals.filter(g => g.scorer === scorer.national);
    const direct = involved.filter(g => g.keeper === victim.national).length;
    const exposure = victim.national.position === 'GK' ? (involved.length ? direct / involved.length : 0) : roleExposure(victim.national.position);
    return (involved.length * 10 + (involved.some(g => g.decisive) ? 9 : 0) + (involved.length >= 3 ? 12 : 0) + involved.filter(g => g.event.isPenalty).length * 3) * exposure;
}
function verifiedPenalties(f: InternationalRelationshipFixture): RelationshipPenalty[] {
    const seen = new Set<string>();
    return (f.penalties ?? []).filter(p => { const key = `${p.teamName}:${p.id}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function penaltyImpact(a: InvolvedPlayer, b: InvolvedPlayer, penalties: RelationshipPenalty[], f: InternationalRelationshipFixture): { impact: number; ids: Array<string | number> } {
    let impact = 0;
    const ids: Array<string | number> = [];
    for (const penalty of penalties) {
        const attacking = nationMatches(a.nation, penalty.teamName) ? a : nationMatches(b.nation, penalty.teamName) ? b : undefined;
        if (!attacking) continue;
        const defending = attacking === a ? b : a;
        const taker = resolveNamed(attacking.nation, penalty.taker, penalty.takerExternalId);
        const keeper = resolveNamed(defending.nation, penalty.goalkeeper ?? f.goalkeeperNames?.[defending.side], penalty.goalkeeperExternalId);
        if (taker !== attacking.national || keeper !== defending.national || keeper.position !== 'GK') continue;
        // Regular scored penalties are already counted through verified goal events.
        if ((penalty.shootout && penalty.outcome === 'scored') || penalty.outcome === 'saved') {
            impact += (penalty.decisive ? 22 : 13) * (penalty.outcome === 'saved' ? 0.9 : 1);
            ids.push(penalty.id);
        }
    }
    return { impact, ids };
}

/** Evaluate EVERY supplied completed fixture. Missing/ambiguous participation yields no invented incident. */
export function buildRelationshipIncidents(input: BuildRelationshipIncidentsInput): RelationshipIncident[] {
    const nations = values(input.nationalTeams);
    const generated: RelationshipIncident[] = [];
    const fixtures = [...input.fixtures].sort((a, b) => (a.year ?? input.year) - (b.year ?? input.year) || a.week - b.week || a.id.localeCompare(b.id));
    for (const fixture of fixtures) {
        if (!fixture.played || (fixture.league !== 'International' && !fixture.tournamentType)) continue;
        const score = parseScore(fixture.score);
        const home = resolveNation(nations, fixture.homeTeam), away = resolveNation(nations, fixture.awayTeam);
        if (!score || !home || !away || home === away) continue;
        const clock = { year: fixture.year ?? input.year, week: fixture.week, weeksPerYear: calendarSize(input) };
        if (absoluteWeek(clock) > absoluteWeek(input)) continue;
        const tournamentType = fixture.tournamentType ?? input.tournamentType;
        const stage = fixture.stage ?? 'Group Stage';
        const winner = score[0] > score[1] ? home : score[1] > score[0] ? away : fixture.penaltyWinner === 'home' ? home : fixture.penaltyWinner === 'away' ? away : undefined;
        const goals = verifiedGoals(fixture, home, away, score);
        const penalties = verifiedPenalties(fixture);
        const expectation = (n: RelationshipNationalTeam): number => unit(input.expectations?.[n.name] ?? n.expectation ?? n.prestige / 100);
        for (const club of values(input.clubTeams)) {
            const involved: InvolvedPlayer[] = [];
            const clubKeyCounts = new Map<string, number>();
            club.players.forEach(p => { const key = relationshipPlayerKey(p); clubKeyCounts.set(key, (clubKeyCounts.get(key) ?? 0) + 1); });
            for (const p of club.players) {
                if (clubKeyCounts.get(relationshipPlayerKey(p)) !== 1) continue;
                const match = resolveClubPlayer(p, nations);
                if (!match || (match.nation !== home && match.nation !== away)) continue;
                const side = match.nation === home ? 'home' : 'away';
                if (isParticipant(match.national, match.nation, side, fixture)) involved.push({ club: p, ...match, side });
            }
            involved.sort((a, b) => relationshipPlayerKey(a.club).localeCompare(relationshipPlayerKey(b.club)));
            for (let ai = 0; ai < involved.length; ai++) for (let bi = ai + 1; bi < involved.length; bi++) {
                const a = involved[ai], b = involved[bi];
                if (a.national === b.national) continue; // Distinct club entries cannot impersonate one roster player.
                const playerA = identity(a.club), playerB = identity(b.club);
                const aGoals = goals.filter(g => g.scorer === a.national), bGoals = goals.filter(g => g.scorer === b.national);
                const labels: string[] = [];
                const penalty = a.nation !== b.nation ? penaltyImpact(a, b, penalties, fixture) : { impact: 0, ids: [] };
                let kind: RelationshipKind = 'rift', raw = 0;
                const temperament = (PERSONALITY[a.club.personality] + PERSONALITY[b.club.personality]) / 2;
                if (a.nation !== b.nation) {
                    const ab = goalImpact(a, b, goals), ba = goalImpact(b, a, goals);
                    raw = (Math.max(ab, ba) + Math.min(ab, ba) * 0.25 + penalty.impact) * STAGE[stage] * COMPETITION[tournamentType] * temperament * (winner ? 1 : 0.7);
                    if (aGoals.length || bGoals.length) labels.push('verified-goal-involvement');
                    if (aGoals.length >= 3 || bGoals.length >= 3) labels.push('three-plus-goals');
                    if (goals.some(g => (g.scorer === a.national && g.keeper === b.national) || (g.scorer === b.national && g.keeper === a.national))) labels.push('direct-keeper-victim');
                    if (penalty.ids.length) labels.push('verified-penalty-duel');
                    if (stage === 'Final' && winner && (aGoals.length >= 3 || bGoals.length >= 3)) labels.push('final-humiliation');
                } else {
                    const outcome = fixture.nationOutcomes?.[a.side];
                    if ((stage === 'Final' && winner === a.nation) || outcome === 'champion') {
                        kind = 'bond';
                        raw = (50 + (aGoals.length + bGoals.length) * 4 + (a.club.personality === 'Leader' || b.club.personality === 'Leader' ? 6 : 0)) * COMPETITION[tournamentType];
                        labels.push('shared-championship-success');
                    } else if ((winner && winner !== a.nation) || outcome === 'eliminated' || outcome === 'disappointing') {
                        kind = 'shared-disappointment';
                        const expected = expectation(a.nation);
                        const failure = outcome === 'disappointing' ? 1 : stage === 'Final' ? 0.9 : fixture.isKnockout || !['Group Stage', 'League Phase'].includes(stage) ? 0.65 : 0.25;
                        const pressure = (a.national.position === 'GK' || b.national.position === 'GK' ? 8 : 0) + penalties.filter(p => nationMatches(a.nation, p.teamName) && p.outcome !== 'scored' && [a.national, b.national].includes(resolveNamed(a.nation, p.taker, p.takerExternalId)!)).length * 8;
                        raw = ((expected - 0.4) * 45 + pressure) * failure * temperament;
                        labels.push('shared-disappointing-result');
                    }
                }
                const strength = Math.round(clamp(raw));
                if (strength < 3) continue;
                const severity = severityFor(strength);
                const pairKey = encode([normalizeName(club.name), playerA.key, playerB.key]);
                const id = `international-relationship:${encode([pairKey, tournamentType, fixture.tournamentId ?? '', String(clock.year), fixture.id])}`;
                const decisive = goals.find(g => g.decisive && (g.scorer === a.national || g.scorer === b.national));
                generated.push({
                    id, pairKey, clubName: club.name, playerA, playerB, nationA: nationIdentity(a.nation), nationB: nationIdentity(b.nation), kind,
                    trigger: { fixtureId: fixture.id, tournamentId: fixture.tournamentId, tournamentType, stage, homeNation: home.name, awayNation: away.name,
                        score: fixture.score!, winnerNation: winner?.name, playerAGoals: aGoals.length, playerBGoals: bGoals.length,
                        directKeeperExposureA: bGoals.filter(g => g.keeper === a.national).length, directKeeperExposureB: aGoals.filter(g => g.keeper === b.national).length,
                        decisiveScorerKey: decisive?.scorer === a.national ? playerA.key : decisive?.scorer === b.national ? playerB.key : undefined,
                        goalEventIds: [...aGoals, ...bGoals].map(g => g.event.id).sort((x, y) => x - y), penaltyIds: penalty.ids,
                        expectationA: expectation(a.nation), expectationB: expectation(b.nation), labels },
                    strength, evidenceStrength: strength, severity, createdYear: clock.year, createdWeek: clock.week, weeksPerYear: clock.weeksPerYear,
                    durationWeeks: durationFor(kind, severity), state: 'active', attempts: [], coSelectionWeeks: [], transferRequestedPlayerKeys: [],
                    severeSince: kind !== 'bond' && severity === 'serious' ? { year: clock.year, week: clock.week } : undefined,
                });
            }
        }
    }
    return upsertRelationshipIncidents(input.existingIncidents ?? [], generated);
}

/** Idempotent same-fixture enrichment; distinct unresolved negative fixtures can escalate the pair. */
export function upsertRelationshipIncidents(existing: readonly RelationshipIncident[], incoming: readonly RelationshipIncident[]): RelationshipIncident[] {
    const result = new Map(existing.map(i => [i.id, i]));
    const ordered = [...incoming].sort((a, b) => absoluteWeek(createdClock(a)) - absoluteWeek(createdClock(b)) || a.id.localeCompare(b.id));
    for (const candidate of ordered) {
        const old = result.get(candidate.id);
        if (old) {
            const increase = Math.max(0, candidate.evidenceStrength - old.evidenceStrength);
            if (!increase || old.state === 'resolved' || old.state === 'expired') continue;
            const strength = Math.round(clamp(old.strength + increase));
            const severity = severityFor(strength);
            result.set(old.id, { ...old, trigger: candidate.trigger, evidenceStrength: candidate.evidenceStrength, strength, severity,
                durationWeeks: Math.max(old.durationWeeks, durationFor(old.kind, severity)),
                severeSince: old.severeSince ?? (old.kind !== 'bond' && severity === 'serious' ? { year: candidate.createdYear, week: candidate.createdWeek } : undefined) });
            continue;
        }
        const prior = [...result.values()].filter(i => i.pairKey === candidate.pairKey && i.kind !== 'bond' && candidate.kind !== 'bond' &&
            absoluteWeek(createdClock(i)) <= absoluteWeek(createdClock(candidate)) && isLive(i, createdClock(candidate)))
            .sort((a, b) => b.strength - a.strength)[0];
        const strength = prior ? Math.round(clamp(Math.max(candidate.strength, prior.strength) + Math.min(12, candidate.strength * 0.2))) : candidate.strength;
        const severity = severityFor(strength);
        result.set(candidate.id, { ...candidate, strength, severity, durationWeeks: Math.max(candidate.durationWeeks, durationFor(candidate.kind, severity)),
            severeSince: candidate.kind !== 'bond' && severity === 'serious' ? candidate.severeSince ?? { year: candidate.createdYear, week: candidate.createdWeek } : undefined });
    }
    return [...result.values()].sort((a, b) => absoluteWeek(createdClock(a)) - absoluteWeek(createdClock(b)) || a.id.localeCompare(b.id));
}

/** Effects replace only this incident's tagged effects. Persistent penalties are modifiers, not additive stat mutations. */
export function getIncidentEffects(incident: RelationshipIncident, clock: RelationshipClock = createdClock(incident)): RelationshipPlayerUpdate[] {
    const now = absoluteWeek(clock, incident.weeksPerYear), expiry = expiresAt(incident);
    const live = isLive(incident, clock);
    return [incident.playerA, incident.playerB].map((player, index) => {
        const other = index === 0 ? incident.playerB : incident.playerA;
        const positive = incident.kind === 'bond';
        const base = { with: other.name, message: incident.trigger.labels.join('; '), until: clock.week + Math.max(0, expiry - now) };
        const effect: PlayerEffect = positive ? { ...base, type: 'TeammateBond' } : incident.kind === 'shared-disappointment' ? { ...base, type: 'BadChemistry' } : { ...base, type: 'InternationalRift', severity: incident.severity };
        const metadata: IncidentPlayerEffect = { ...effect, relationshipId: incident.id, playerKey: player.key, otherPlayerKey: other.key,
            createdYear: incident.createdYear, createdWeek: incident.createdWeek, expiresYear: Math.floor(expiry / incident.weeksPerYear) + 1, expiresWeek: expiry % incident.weeksPerYear + 1,
            strength: incident.strength, relationshipState: incident.state, separationRequired: incident.separatedPlayerKey === player.key,
            trainingPenalty: positive ? 0 : Math.round(incident.strength * 0.08), formPenalty: positive ? 0 : Math.round(incident.strength * 0.06),
            moraleDelta: Math.round(incident.strength * (positive ? 0.1 : -0.12)) };
        return { clubName: incident.clubName, playerKey: player.key, relationshipId: incident.id, effects: live ? [metadata] : [],
            ...(live && incident.separatedPlayerKey === player.key ? { bench: true } : {}),
            ...(incident.transferRequestedPlayerKeys.includes(player.key) ? { transferRequested: true } : {}) };
    });
}

/** Immutable and replay-safe: never subtract form repeatedly, erase unrelated effects, or map by surname. */
export function applyIncidentEffects<T extends Team>(teams: Readonly<Record<string, T>>, updates: readonly RelationshipPlayerUpdate[]): Record<string, T> {
    const next = { ...teams };
    const grouped = new Map<string, RelationshipPlayerUpdate[]>();
    for (const update of updates) grouped.set(update.clubName, [...(grouped.get(update.clubName) ?? []), update]);
    for (const [clubName, clubUpdates] of grouped) {
        const entry = Object.entries(teams).find(([, team]) => team.name === clubName);
        if (!entry || Object.values(teams).filter(t => t.name === clubName).length !== 1) continue;
        const [recordKey, team] = entry;
        const counts = new Map<string, number>();
        team.players.forEach(p => { const key = relationshipPlayerKey(p); counts.set(key, (counts.get(key) ?? 0) + 1); });
        const players = team.players.map(p => {
            const key = relationshipPlayerKey(p);
            if (counts.get(key) !== 1) return p;
            const applicable = clubUpdates.filter(u => u.playerKey === key);
            if (!applicable.length) return p;
            let effects = [...(p.effects ?? [])];
            for (const update of applicable) effects = [...effects.filter(e => (e as Partial<IncidentPlayerEffect>).relationshipId !== update.relationshipId), ...update.effects];
            return { ...p, effects, ...(applicable.some(u => u.bench) ? { isStarter: false } : {}), ...(applicable.some(u => u.transferRequested) ? { transferRequested: true } : {}) };
        });
        next[recordKey] = { ...team, players };
    }
    return next;
}
function boundedInterpretation(value?: MediationInterpretation): Required<MediationInterpretation> {
    return { tone: value?.tone === 'supportive' || value?.tone === 'hostile' ? value.tone : 'balanced', support: unit(value?.support),
        accountability: unit(value?.accountability), specificity: unit(value?.specificity), respect: unit(value?.respect) };
}

/** No AI calls. Separation preserves the relationship; a single mediation cannot heal a serious rift. */
export function interveneRelationship(incident: RelationshipIncident, action: RelationshipIntervention, context: RelationshipInterventionContext): RelationshipResult {
    const id = context.attemptId ?? `${action}:${context.year}:${context.week}`;
    const now = absoluteWeek(context, incident.weeksPerYear);
    if (incident.attempts.some(a => a.id === id) || now < absoluteWeek(createdClock(incident)) ||
        (incident.lastAdvancedWeek !== undefined && now < incident.lastAdvancedWeek) ||
        incident.attempts.some(a => absoluteWeek(a, incident.weeksPerYear) > now) || !isLive(incident, context)) return { incident, effects: getIncidentEffects(incident, context) };
    let next = { ...incident, attempts: [...incident.attempts], coSelectionWeeks: [...incident.coSelectionWeeks], transferRequestedPlayerKeys: [...incident.transferRequestedPlayerKeys] };
    let outcome: RelationshipAttempt['outcome'] = 'no-op';
    let interpretation: Required<MediationInterpretation> | undefined;
    if (incident.kind !== 'bond' && (action === 'bench-a' || action === 'bench-b')) {
        next.separatedPlayerKey = action === 'bench-a' ? incident.playerA.key : incident.playerB.key;
        if (next.state !== 'transfer-requested') next.state = 'separated';
        outcome = 'separated';
    } else if (incident.kind !== 'bond' && action === 'risk-it') {
        next.separatedPlayerKey = undefined;
        if (next.state !== 'transfer-requested') next.state = 'active';
        outcome = 'risk-accepted'; // Choice is not evidence that a lineup actually played together.
    } else if (incident.kind !== 'bond' && action === 'mediation') {
        interpretation = boundedInterpretation(context.interpretation);
        const alreadyThisWeek = incident.attempts.some(a => a.action === 'mediation' && a.year === context.year && a.week === context.week);
        if (alreadyThisWeek) outcome = 'resisted';
        else {
            const quality = interpretation.support * 0.2 + interpretation.accountability * 0.3 + interpretation.specificity * 0.25 + interpretation.respect * 0.25;
            const resistance = (PERSONALITY[incident.playerA.personality] + PERSONALITY[incident.playerB.personality]) / 2;
            const change = interpretation.tone === 'hostile' ? -Math.min(8, 3 + (1 - interpretation.respect) * 5) : Math.max(0, (quality - 0.3) * 25);
            const reduction = Math.min(incident.severity === 'serious' ? 12 : 18, change) * (change > 0 ? Math.min(1, 1 / resistance) : 1);
            next.strength = Math.round(clamp(incident.strength - reduction));
            // Final humiliation needs multiple credible sessions in genuinely different weeks.
            const priorCredible = new Set(incident.attempts.filter(a => {
                const v = a.interpretation;
                const credible = v && v.tone !== 'hostile' && v.support * 0.2 + v.accountability * 0.3 + v.specificity * 0.25 + v.respect * 0.25 >= 0.65;
                return a.action === 'mediation' && credible && a.year * incident.weeksPerYear + a.week < context.year * incident.weeksPerYear + context.week;
            }).map(a => `${a.year}:${a.week}`)).size;
            if (incident.trigger.labels.includes('final-humiliation') && priorCredible < 2) next.strength = Math.max(60, next.strength);
            next.severity = severityFor(next.strength);
            outcome = next.strength < incident.strength ? 'improved' : 'resisted';
            if (next.strength < 3 && quality >= 0.65 && next.transferRequestedPlayerKeys.length === 0) {
                next.state = 'resolved'; next.separatedPlayerKey = undefined; outcome = 'resolved';
            }
        }
    }
    next.attempts.push({ id, action, year: context.year, week: context.week, outcome, strengthBefore: incident.strength, strengthAfter: next.strength, ...(interpretation ? { interpretation } : {}) });
    if (next.kind !== 'bond' && next.severity === 'serious' && !next.severeSince) next.severeSince = { year: context.year, week: context.week };
    return { incident: next, effects: getIncidentEffects(next, context) };
}

/** Record genuine calendar time and actual co-selection. Three selections spanning >=3 weeks trigger a request. */
export function advanceRelationship(incident: RelationshipIncident, context: RelationshipAdvanceContext): RelationshipResult {
    const now = absoluteWeek(context, incident.weeksPerYear);
    if (now < absoluteWeek(createdClock(incident)) || (incident.lastAdvancedWeek !== undefined && now < incident.lastAdvancedWeek)) return { incident, effects: getIncidentEffects(incident, context) };
    let next = { ...incident, coSelectionWeeks: [...incident.coSelectionWeeks], transferRequestedPlayerKeys: [...incident.transferRequestedPlayerKeys], lastAdvancedWeek: now };
    if (incident.state !== 'resolved' && now >= expiresAt(incident)) next.state = 'expired';
    if (isLive(next, context) && next.kind !== 'bond' && next.severity === 'serious') {
        const selected = new Set(context.selectedPlayerKeys ?? []);
        if (selected.has(next.playerA.key) && selected.has(next.playerB.key) && !next.coSelectionWeeks.includes(now)) next.coSelectionWeeks.push(now);
        next.coSelectionWeeks.sort((a, b) => a - b);
        const severeStart = absoluteWeek({ ...(next.severeSince ?? { year: next.createdYear, week: next.createdWeek }), weeksPerYear: next.weeksPerYear });
        const weeks = next.coSelectionWeeks.filter(w => w >= severeStart);
        if (weeks.length >= 3 && now - severeStart >= 3 && weeks[weeks.length - 1] - weeks[0] >= 3 && !next.transferRequestedPlayerKeys.length) {
            const loser = next.trigger.winnerNation === next.nationA.name ? next.playerB : next.trigger.winnerNation === next.nationB.name ? next.playerA :
                PERSONALITY[next.playerA.personality] >= PERSONALITY[next.playerB.personality] ? next.playerA : next.playerB;
            next.transferRequestedPlayerKeys = [loser.key];
            next.state = 'transfer-requested';
        }
    }
    return { incident: next, effects: getIncidentEffects(next, context) };
}

export interface RelationshipTacticalImpact {
    penalty: number;
    bonus: number;
    blockedPairs: Array<{ playerAKey: string; playerBKey: string; relationshipId: string }>;
    trainingPenalties: Record<string, number>;
    formPenalties: Record<string, number>;
}
/** Pair-deduped replacement for legacy name-only chemistry checks, not an additional duplicate penalty. */
export function getRelationshipTacticalPenalty(incidents: readonly RelationshipIncident[], selectedPlayerKeys: readonly string[], clock: RelationshipClock): RelationshipTacticalImpact {
    const impact: RelationshipTacticalImpact = { penalty: 0, bonus: 0, blockedPairs: [], trainingPenalties: {}, formPenalties: {} };
    const selected = new Set(selectedPlayerKeys);
    const pairs = new Map<string, RelationshipIncident>();
    for (const incident of incidents) {
        if (!isLive(incident, clock)) continue;
        const prior = pairs.get(incident.pairKey);
        // Unresolved negative chemistry overrides a positive incident; never cancel serious harm with a bond.
        if (!prior || (prior.kind === 'bond' && incident.kind !== 'bond') || ((prior.kind === 'bond') === (incident.kind === 'bond') && incident.strength > prior.strength)) pairs.set(incident.pairKey, incident);
    }
    for (const incident of pairs.values()) {
        if (incident.kind !== 'bond') for (const player of [incident.playerA, incident.playerB]) {
            impact.trainingPenalties[player.key] = Math.max(impact.trainingPenalties[player.key] ?? 0, Math.round(incident.strength * 0.08));
            impact.formPenalties[player.key] = Math.max(impact.formPenalties[player.key] ?? 0, Math.round(incident.strength * 0.06));
        }
        if (!selected.has(incident.playerA.key) || !selected.has(incident.playerB.key)) continue;
        if (incident.kind === 'bond') impact.bonus += Math.max(1, Math.round(incident.strength * 0.1));
        else {
            impact.penalty += incident.kind === 'shared-disappointment' ? Math.max(1, Math.round(incident.strength * 0.2)) : incident.severity === 'serious' ? 30 : incident.severity === 'moderate' ? 12 : 3;
            if (incident.severity === 'serious' || incident.separatedPlayerKey) impact.blockedPairs.push({ playerAKey: incident.playerA.key, playerBKey: incident.playerB.key, relationshipId: incident.id });
        }
    }
    impact.penalty = Math.min(100, impact.penalty);
    impact.bonus = Math.min(20, impact.bonus);
    return impact;
}
