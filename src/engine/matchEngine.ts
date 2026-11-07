import type { MatchEvent, MatchPenalty, MatchState, Player, Team } from '../types';
import { analyzeTactics } from './tactics';
import { getRivalry } from './footballCulture';

export type SegmentContext = { shout?: string; userTeamName: string | null; tacticalContext?: string };
export type MatchSegment = {
    homeScoreAdded: number;
    awayScoreAdded: number;
    momentum: number;
    tacticalAnalysis: string;
    events: MatchEvent[];
    presentation?: { mode: 'ai' | 'local'; reason?: string; provider?: string };
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function hashSeed(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function sample(seed: number, minute: number, channel: number) {
    let value = (seed ^ Math.imul(minute + 1, 0x9e3779b1) ^ Math.imul(channel + 11, 0x85ebca6b)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d) >>> 0;
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b) >>> 0;
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
}
function starters(team: Team) {
    const selected = team.players.filter(player => player.isStarter && player.status.type === 'Available');
    return (selected.length ? selected : team.players.filter(player => player.status.type === 'Available')).slice(0, 11);
}
function teamStrength(team: Team) {
    const selected = starters(team);
    if (!selected.length) return 30;
    const efficiency = analyzeTactics(selected, team.tactic.formation).score;
    const average = selected.reduce((sum, player) => {
        const condition = clamp(player.condition ?? 100, 25, 100) / 100;
        // Existing saves and UI use 0..100 form, with neutral form 50.
        const form = (clamp(player.form ?? 50, 0, 100) - 50) * 0.09;
        const relationshipForm = Math.max(0, ...(player.effects || []).map(e => Number((e as Player['effects'][number] & { formPenalty?: number }).formPenalty) || 0));
        return sum + player.rating * (0.65 + condition * 0.35) + form - Math.min(6, relationshipForm);
    }, 0) / selected.length;
    return average * (0.72 + efficiency * 0.0028) - Math.max(0, 11 - selected.length) * 2;
}
function choosePlayer(team: Team, seed: number, minute: number, channel: number, attack: boolean): Player | undefined {
    const selected = starters(team);
    const preferred = selected.filter(player => attack
        ? ['ST', 'CF', 'LW', 'RW', 'AM', 'CM'].includes(player.position)
        : ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DM'].includes(player.position));
    const pool = preferred.length ? preferred : selected;
    return pool[Math.floor(sample(seed, minute, channel) * pool.length)];
}
function eventId(seed: number, minute: number, channel: number) {
    return Math.floor(sample(seed, minute, channel) * 2_000_000_000);
}

/** Design approximation of shot xG, not a fitted proprietary model. Pitch units are percentages. */
export function shotExpectedGoals(x: number, y: number, homeAttacking: boolean, finishing: number, goalkeeper: number, pressure: number) {
    const distance = Math.hypot((homeAttacking ? 100 - x : x) * 1.05, (y - 50) * 0.68);
    const lateral = Math.abs(y - 50) / 25;
    const z = 1.7 - distance * 0.2 - lateral * 0.5 + (finishing - goalkeeper) * 0.018 - pressure * 0.38;
    return clamp(1 / (1 + Math.exp(-z)), 0.02, 0.65);
}

/** Deterministic resolved football facts. Prose is enriched separately by the AI match director. */
export function simulateDeterministicSegment(homeTeam: Team, awayTeam: Team, state: MatchState, targetMinute: number, context: SegmentContext): MatchSegment {
    const seed = state.simulationSeed ?? hashSeed(`${homeTeam.name}|${awayTeam.name}`);
    const start = Math.max(1, state.currentMinute + 1);
    const end = Math.min(120, Math.floor(targetMinute));
    let momentum = clamp(state.momentum, -10, 10), homeScoreAdded = 0, awayScoreAdded = 0;
    const events: MatchEvent[] = [];
    const homeStrength = teamStrength(homeTeam), awayStrength = teamStrength(awayTeam);
    const rivalry = getRivalry(homeTeam.name, awayTeam.name);
    const mentality = (team: Team) => ({ 'All-Out Attack': 1, Attacking: 0.5, Balanced: 0, Defensive: -0.5, 'Park the Bus': -1 }[team.tactic.mentality] || 0);
    const homeIntent = mentality(homeTeam), awayIntent = mentality(awayTeam);
    const demand = /demand|more|press/i.test(context.shout || '') ? 1.2 : 0;
    const userBoost = context.userTeamName === homeTeam.name ? demand : context.userTeamName === awayTeam.name ? -demand : 0;
    for (let minute = start; minute <= end; minute += 1) {
        const homeShare = clamp(0.52 + (homeStrength - awayStrength + momentum * 1.1 + userBoost + (homeIntent - awayIntent) * 2) / 110, 0.2, 0.8);
        const homeAttacking = sample(seed, minute, 0) < homeShare;
        const active = homeAttacking ? homeTeam : awayTeam, defending = homeAttacking ? awayTeam : homeTeam;
        const sign = homeAttacking ? 1 : -1;
        const eventChance = 0.31 + Math.abs(momentum) * 0.003 + Math.max(0, homeIntent + awayIntent) * 0.014;
        if (sample(seed, minute, 1) > eventChance) {
            momentum = clamp(momentum * 0.9 + sign * 0.05, -10, 10);
        } else {
            const attacker = choosePlayer(active, seed, minute, 2, true);
            const defender = choosePlayer(defending, seed, minute, 3, false);
            const keeper = starters(defending)[0];
            const goalkeeperRating = keeper?.position === 'GK' ? keeper.rating : 30;
            const name = attacker?.name || 'The forward';
            const shot = sample(seed, minute, 10) < 0.72;
            const crossing = sample(seed, minute, 11) < 0.3;
            const isPenalty = shot && sample(seed, minute, 16) < 0.012;
            const counter = mentality(active) < 0 && mentality(defending) > 0;
            const x = isPenalty ? (homeAttacking ? 89.5 : 10.5) : homeAttacking ? 76 + sample(seed, minute, 7) * 17 : 24 - sample(seed, minute, 7) * 17;
            const y = isPenalty ? 50 : 27 + sample(seed, minute, 8) * 46;
            const direction = homeAttacking ? 1 : -1;
            const base = { x: homeAttacking ? 42 : 58, y: 30 + sample(seed, minute, 12) * 40 };
            const approach = { x: x - direction * 18, y: crossing ? (y < 50 ? 12 : 88) : clamp(y + 12, 15, 85) };
            const origin = { x, y };
            const kind: NonNullable<MatchEvent['play']>['kind'] = isPenalty ? 'set-piece' : counter ? 'counter' : crossing ? 'cross' : shot ? 'shot' : 'build-up';
            const pressure = clamp((defender?.rating ?? 55) / 100 + Math.max(0, -mentality(defending)) * 0.25 - (counter ? 0.35 : 0), 0, 1.5);
            const xG = isPenalty ? clamp(0.76 + ((attacker?.rating ?? 55) - goalkeeperRating) * 0.002, 0.65, 0.85) : shot ? shotExpectedGoals(x, y, homeAttacking, attacker?.rating ?? 55, goalkeeperRating, pressure) : 0;
            const goal = shot && sample(seed, minute, 4) < xG;
            const card = !goal && !shot && sample(seed, minute, 5) < 0.45 * (rivalry?.cardMultiplier ?? 1);
            const onTarget = goal || (shot && sample(seed, minute, 13) < 0.36);
            const outcome: NonNullable<MatchEvent['play']>['outcome'] = goal ? 'goal' : card ? 'foul' : !shot ? 'retained' : onTarget ? 'saved' : sample(seed, minute, 14) < 0.45 ? 'blocked' : 'wide';
            let endpoint = origin;
            if (shot) endpoint = { x: homeAttacking ? (goal ? 100 : 97) : (goal ? 0 : 3), y: outcome === 'wide' ? (y < 50 ? 35 : 65) : 47 + sample(seed, minute, 15) * 6 };
            if (goal) {
                if (homeAttacking) homeScoreAdded++; else awayScoreAdded++;
                momentum = clamp(momentum * 0.9 + sign * 3.4, -10, 10);
            } else momentum = clamp(momentum * 0.9 + sign * (shot ? 0.65 : 0.3), -10, 10);
            const description = goal ? isPenalty ? `${name} scores a penalty for ${active.name} against ${keeper?.name || 'the opposing keeper'}.` : `${name} scores for ${active.name} after ${counter ? 'a direct counterattack' : crossing ? 'a cross into the area' : 'a passing move through the middle'}.`
                : card ? `${defender?.name || 'The defender'} is booked for halting ${active.name}'s break.`
                : shot ? `${name} shoots from ${Math.round(Math.hypot((homeAttacking ? 100 - x : x) * 1.05, (y - 50) * 0.68))} metres: ${outcome === 'saved' ? `${keeper?.name || 'the keeper'} makes the save` : outcome === 'blocked' ? 'blocked by the defence' : 'wide of the post'}.`
                : `${name} ${counter ? 'carries the counterattack forward' : crossing ? 'works a crossing position on the flank' : 'links the midfield and attack'} for ${active.name}.`;
            events.push({
                id: eventId(seed, minute, goal ? 4 : card ? 5 : 6), minute,
                type: goal ? 'goal' : card ? 'card' : 'commentary',
                teamName: card ? defending.name : active.name, player: card ? defender?.name : attacker?.name,
                description, cardType: card ? 'yellow' : undefined,
                isPenalty: isPenalty || undefined, goalkeeper: shot && keeper?.position === 'GK' ? keeper.name : undefined,
                scoreAfter: goal ? `${state.homeScore + homeScoreAdded}-${state.awayScore + awayScoreAdded}` : undefined,
                pitchX: x, pitchY: y, xG: shot ? xG : undefined, onTarget: shot ? onTarget : undefined,
                momentumAfter: momentum,
                play: { kind, outcome, ballPath: [base, approach, origin, endpoint], receiver: attacker?.name },
            });
        }
        // Boundary whistles are emitted independently of chunk size (and never replace a goal cue).
        if ([45, 90, 105, 120].includes(minute)) events.push({ id: eventId(seed, minute, 9), minute, type: 'whistle', teamName: homeTeam.name,
            description: minute === 45 ? 'Half-time. The players head down the tunnel.' : minute === 105 ? 'Half-time in extra time.' : minute === 90 ? 'The referee brings regulation time to an end.' : 'The final whistle ends extra time.', momentumAfter: momentum });
    }
    const homeEfficiency = analyzeTactics(starters(homeTeam), homeTeam.tactic.formation).score;
    const awayEfficiency = analyzeTactics(starters(awayTeam), awayTeam.tactic.formation).score;
    const tacticalAnalysis = homeEfficiency < 60 ? `${homeTeam.name}'s out-of-position lineup is opening space for ${awayTeam.name}.`
        : awayEfficiency < 60 ? `${awayTeam.name}'s shape is leaving gaps for ${homeTeam.name}.`
        : momentum > 1.5 ? `${homeTeam.name} are pushing the play into ${awayTeam.name}'s half.`
        : momentum < -1.5 ? `${awayTeam.name} are taking control of the attacking passages.` : `Neither ${homeTeam.name} nor ${awayTeam.name} has sustained control of midfield.`;
    return { homeScoreAdded, awayScoreAdded, momentum, tacticalAnalysis, events };
}

export function simulateDeterministicQuickMatch(homeTeam: Team, awayTeam: Team, fixtureKey = '') {
    const state: MatchState = { currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: '', simulationSeed: hashSeed(`${fixtureKey}|${homeTeam.name}|${awayTeam.name}`) };
    const result = simulateDeterministicSegment(homeTeam, awayTeam, state, 90, { userTeamName: null });
    return {
        homeGoals: result.homeScoreAdded, awayGoals: result.awayScoreAdded, events: result.events,
        participantNames: { home: starters(homeTeam).map(p => p.name), away: starters(awayTeam).map(p => p.name) },
        goalkeeperNames: { home: starters(homeTeam).find(p => p.position === 'GK')?.name, away: starters(awayTeam).find(p => p.position === 'GK')?.name },
    };
}
export function simulateDeterministicShootout(homeTeam: Team, awayTeam: Team, fixtureKey = '') {
    const seed = hashSeed(`${fixtureKey}|${homeTeam.name}|${awayTeam.name}|shootout`);
    const takers = (team: Team) => [...starters(team)].sort((a, b) => (a.position === 'GK' ? 1 : 0) - (b.position === 'GK' ? 1 : 0) || b.rating - a.rating || a.name.localeCompare(b.name));
    const home = takers(homeTeam), away = takers(awayTeam);
    const homeKeeper = starters(homeTeam).find(p => p.position === 'GK'), awayKeeper = starters(awayTeam).find(p => p.position === 'GK');
    const penalties: MatchPenalty[] = [];
    let homePenalties = 0, awayPenalties = 0;
    const kick = (side: 'home' | 'away', round: number, force?: boolean) => {
        const pool = side === 'home' ? home : away;
        const player = pool[round % Math.max(1, pool.length)];
        const keeper = side === 'home' ? awayKeeper : homeKeeper;
        const conversion = clamp(0.75 + ((player?.rating ?? 45) - (keeper?.rating ?? 55)) * 0.002, 0.55, 0.9);
        const scored = force ?? (sample(seed, round, side === 'home' ? 24 : 25) < conversion);
        if (scored) { if (side === 'home') homePenalties++; else awayPenalties++; }
        if (player) penalties.push({ id: `${fixtureKey}|shootout|${side}|${round}`, teamName: side === 'home' ? homeTeam.name : awayTeam.name, taker: player.name, goalkeeper: keeper?.name, outcome: scored ? 'scored' : sample(seed, round, 26) < 0.65 ? 'saved' : 'missed', shootout: true });
    };
    for (let round = 0; round < 5; round++) {
        kick('home', round);
        if (homePenalties > awayPenalties + (5 - round) || awayPenalties > homePenalties + (4 - round)) break;
        kick('away', round);
        if (Math.abs(homePenalties - awayPenalties) > (4 - round)) break;
    }
    for (let round = 5; homePenalties === awayPenalties && round < 16; round++) {
        const forcedHome = round === 15 ? ((seed >>> 8) & 1) === 0 : undefined;
        kick('home', round, forcedHome); kick('away', round, round === 15 ? !forcedHome : undefined);
    }
    if (penalties.length) penalties[penalties.length - 1].decisive = true;
    return { homePenalties, awayPenalties, penaltyWinner: homePenalties > awayPenalties ? 'home' as const : 'away' as const, penalties };
}
