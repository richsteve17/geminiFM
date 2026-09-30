import type { MatchEvent, MatchState, Team } from '../types';

export type SegmentContext = { shout?: string; userTeamName: string | null; tacticalContext?: string };
export type MatchSegment = {
    homeScoreAdded: number;
    awayScoreAdded: number;
    momentum: number;
    tacticalAnalysis: string;
    events: MatchEvent[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Stable non-cryptographic hash for repeatable simulation seeds. */
export function hashSeed(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/** A pure random sample from one match seed, minute, and channel. */
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
    return selected.length > 0 ? selected : team.players.filter(player => player.status.type === 'Available');
}

function teamStrength(team: Team) {
    const selected = starters(team);
    if (selected.length === 0) return 50;
    const average = selected.reduce((sum, player) => {
        const condition = clamp(player.condition ?? 100, 25, 100) / 100;
        const form = clamp(player.form ?? 0, -10, 10) * 0.35;
        return sum + player.rating * condition + form;
    }, 0) / selected.length;
    const mentality = { 'All-Out Attack': 2.5, Attacking: 1.25, Balanced: 0, Defensive: -0.75, 'Park the Bus': -1.5 }[team.tactic.mentality] ?? 0;
    return average + mentality;
}

function eventId(seed: number, minute: number, channel: number) {
    return Math.floor(sample(seed, minute, channel) * 2_000_000_000);
}

function choosePlayer(team: Team, seed: number, minute: number, channel: number, attack: boolean) {
    const selected = starters(team);
    const preferred = attack
        ? selected.filter(player => ['ST', 'CF', 'LW', 'RW', 'AM', 'CM'].includes(player.position))
        : selected.filter(player => ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'DM'].includes(player.position));
    const pool = preferred.length > 0 ? preferred : selected;
    return pool[Math.floor(sample(seed, minute, channel) * Math.max(pool.length, 1))] || team.players[0];
}

function commentaryFor(playerName: string, minute: number) {
    const templates = [
        `${playerName} recycles possession after a tense midfield duel.`,
        `${playerName} spots a passing lane, but the defence closes it before the final ball.`,
        `${playerName} drives forward and forces the back line to retreat.`,
        `${playerName} wins the second ball as the stadium volume rises.`,
        `${playerName} puts in a recovery tackle to stop the transition.`,
    ];
    return templates[minute % templates.length];
}

function tacticalAnalysis(home: Team, away: Team, momentum: number, homeAdded: number, awayAdded: number) {
    if (homeAdded > awayAdded) return `${home.name} converted their pressure into decisive chances.`;
    if (awayAdded > homeAdded) return `${away.name} found space against the flow and punished it.`;
    if (momentum >= 3) return `${home.name} hold the territorial edge, but the final pass is missing.`;
    if (momentum <= -3) return `${away.name} are dictating the rhythm without a breakthrough.`;
    return 'The tactical battle is balanced; neither side has established lasting control.';
}

/**
 * Pure deterministic match segment. It never calls an AI provider and derives every sample
 * from a persisted seed plus the minute, so a reloaded match produces the same ledger.
 */
export function simulateDeterministicSegment(
    homeTeam: Team,
    awayTeam: Team,
    currentMatchState: MatchState,
    targetMinute: number,
    context: SegmentContext,
): MatchSegment {
    const startMinute = Math.max(1, currentMatchState.currentMinute + 1);
    const endMinute = clamp(Math.floor(targetMinute), startMinute, 120);
    const seed = currentMatchState.simulationSeed ?? hashSeed(`${homeTeam.name}|${awayTeam.name}|${currentMatchState.currentMinute}`);
    const homeStrength = teamStrength(homeTeam);
    const awayStrength = teamStrength(awayTeam);
    const shoutBoost = context.shout?.toLowerCase().includes('demand') || context.shout?.toLowerCase().includes('more') ? 1.2 : 0;

    let homeScoreAdded = 0;
    let awayScoreAdded = 0;
    let momentum = clamp(currentMatchState.momentum, -10, 10);
    const events: MatchEvent[] = [];

    for (let minute = startMinute; minute <= endMinute; minute += 1) {
        const homeShare = clamp(0.5 + (homeStrength - awayStrength + momentum * 1.4 + shoutBoost) / 80, 0.25, 0.75);
        const homeAttacking = sample(seed, minute, 0) < homeShare;
        const activeTeam = homeAttacking ? homeTeam : awayTeam;
        const defendingTeam = homeAttacking ? awayTeam : homeTeam;
        const eventChance = 0.13 + Math.abs(momentum) * 0.004;
        if (sample(seed, minute, 1) > eventChance) {
            momentum = clamp(momentum * 0.9 + (homeAttacking ? 0.05 : -0.05), -10, 10);
            continue;
        }

        const attacker = choosePlayer(activeTeam, seed, minute, 2, true);
        const defender = choosePlayer(defendingTeam, seed, minute, 3, false);
        const attackerRating = attacker?.rating ?? 70;
        const defenderRating = defender?.rating ?? 70;
        const pitchX = homeAttacking ? 60 + sample(seed, minute, 7) * 28 : 40 - sample(seed, minute, 7) * 28;
        const pitchY = 14 + sample(seed, minute, 8) * 72;
        const shotQuality = clamp(0.045 + (attackerRating - defenderRating) / 500 + Math.abs(momentum) * 0.004, 0.025, 0.24);
        const isGoal = sample(seed, minute, 4) < shotQuality;
        const isCard = !isGoal && sample(seed, minute, 5) < 0.11;

        if (isGoal) {
            if (homeAttacking) {
                homeScoreAdded += 1;
                momentum = clamp(momentum * 0.9 + 3.4, -10, 10);
            } else {
                awayScoreAdded += 1;
                momentum = clamp(momentum * 0.9 - 3.4, -10, 10);
            }
            events.push({
                id: eventId(seed, minute, 4),
                minute,
                type: 'goal',
                teamName: activeTeam.name,
                player: attacker?.name || 'The striker',
                description: `GOAL! ${attacker?.name || 'The striker'} finishes a high-value chance for ${activeTeam.name}.`,
                scoreAfter: `${currentMatchState.homeScore + homeScoreAdded}-${currentMatchState.awayScore + awayScoreAdded}`,
                pitchX,
                pitchY,
            });
        } else if (isCard) {
            const carded = defender?.name || 'The defender';
            momentum = clamp(momentum * 0.9 + (homeAttacking ? 0.7 : -0.7), -10, 10);
            events.push({
                id: eventId(seed, minute, 5),
                minute,
                type: 'card',
                teamName: defendingTeam.name,
                player: carded,
                cardType: 'yellow',
                description: `${carded} is booked for stopping the break.`,
                pitchX,
                pitchY,
            });
        } else {
            momentum = clamp(momentum * 0.9 + (homeAttacking ? 0.45 : -0.45), -10, 10);
            events.push({
                id: eventId(seed, minute, 6),
                minute,
                type: 'commentary',
                teamName: activeTeam.name,
                player: attacker?.name,
                description: commentaryFor(attacker?.name || 'The midfielder', minute),
                pitchX,
                pitchY,
            });
        }
    }

    if (endMinute === 45) {
        events.push({ id: eventId(seed, 45, 9), minute: 45, type: 'whistle', teamName: homeTeam.name, description: 'Half-time. The staff room has thirty seconds to reset the match plan.' });
    }
    if (endMinute === 90) {
        events.push({ id: eventId(seed, 90, 9), minute: 90, type: 'whistle', teamName: homeTeam.name, description: 'Full-time. The deterministic ledger is locked for post-match processing.' });
    }

    return {
        homeScoreAdded,
        awayScoreAdded,
        momentum: clamp(momentum, -10, 10),
        tacticalAnalysis: tacticalAnalysis(homeTeam, awayTeam, momentum, homeScoreAdded, awayScoreAdded),
        events,
    };
}

/** Deterministic background result for fixtures that are not played in the live match centre. */
export function simulateDeterministicQuickMatch(homeTeam: Team, awayTeam: Team, fixtureKey = '') {
    const seed = hashSeed(`${fixtureKey}|${homeTeam.name}|${awayTeam.name}`);
    const ratingDiff = teamStrength(homeTeam) + 3 - teamStrength(awayTeam);
    const homeChance = clamp(0.24 + ratingDiff / 125, 0.06, 0.58);
    const awayChance = clamp(0.24 - ratingDiff / 125, 0.06, 0.58);
    let homeGoals = 0;
    let awayGoals = 0;
    for (let chance = 1; chance <= 6; chance += 1) {
        if (sample(seed, chance, 20) < homeChance) homeGoals += 1;
        if (sample(seed, chance, 21) < awayChance) awayGoals += 1;
    }
    return { homeGoals, awayGoals };
}

/** Deterministic sudden-death safe shootout; ties are impossible by construction. */
export function simulateDeterministicShootout(homeTeam: Team, awayTeam: Team, fixtureKey = '') {
    const seed = hashSeed(`${fixtureKey}|${homeTeam.name}|${awayTeam.name}|shootout`);
    const homeWins = ((seed >>> 8) & 1) === 0;
    const winnerScore = 3 + (seed % 3);
    const loserScore = Math.max(0, winnerScore - 1);
    const homePenalties = homeWins ? winnerScore : loserScore;
    const awayPenalties = homeWins ? loserScore : winnerScore;
    return {
        homePenalties,
        awayPenalties,
        penaltyWinner: homeWins ? 'home' as const : 'away' as const,
    };
}
