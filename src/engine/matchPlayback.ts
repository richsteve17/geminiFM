import type { Fixture, MatchEvent, MatchState, Team } from '../types';

export type BoundaryAction = { kind: 'simulate'; target: number } | { kind: 'half-time' } | { kind: 'finish'; shootout: boolean };
export function nextMatchBoundary(state: MatchState, fixture: Fixture, resume: boolean, chunk = 10): BoundaryAction {
    const minute = state.currentMinute;
    if (minute >= 120) return { kind: 'finish', shootout: !!fixture.isKnockout && state.homeScore === state.awayScore };
    if (minute >= 90 && (!fixture.isKnockout || state.homeScore !== state.awayScore) && minute === 90) return { kind: 'finish', shootout: false };
    if ((minute === 45 || minute === 105) && !resume) return { kind: 'half-time' };
    const boundary = minute < 45 ? 45 : minute < 90 ? 90 : minute < 105 ? 105 : 120;
    return { kind: 'simulate', target: Math.min(minute + chunk, boundary) };
}

/** Only publish a goal/pressure change when its minute is actually shown to the player. */
export function revealMatchMinute(state: MatchState, pending: MatchEvent[], minute: number, home: string, away: string): MatchState {
    const seen = new Set(state.events.map(event => event.id));
    const now = pending.filter(event => event.minute === minute && !seen.has(event.id));
    let homeScore = state.homeScore, awayScore = state.awayScore, momentum = state.momentum;
    for (const event of now) {
        if (event.type === 'goal') {
            if (event.teamName === home) homeScore++;
            if (event.teamName === away) awayScore++;
        }
        if (Number.isFinite(event.momentumAfter)) momentum = event.momentumAfter!;
    }
    return { ...state, currentMinute: minute, homeScore, awayScore, momentum, events: [...state.events, ...now] };
}

/** The old loop drained every starter in every league while watching a single fixture. */
export function applyLiveFatigue(teams: Record<string, Team>, home: string, away: string): Record<string, Team> {
    const result = { ...teams };
    for (const name of [home, away]) {
        const team = teams[name];
        if (!team) continue;
        const intent = ['Attacking', 'All-Out Attack'].includes(team.tactic.mentality) ? 1.22 : 1;
        result[name] = { ...team, players: team.players.map(player => {
            if (!player.isStarter || player.status.type !== 'Available') return player;
            const decay = ((100 - (player.stamina ?? 75)) * 0.005 + 0.12) * intent;
            return { ...player, condition: Math.max(30, Math.round((player.condition - decay) * 100) / 100) };
        }) };
    }
    return result;
}

export function summarizeMatch(events: MatchEvent[], home: string, away: string) {
    const stats = (name: string) => {
        const own = events.filter(event => event.teamName === name);
        const shots = own.filter(event => event.xG !== undefined);
        return { shots: shots.length, onTarget: shots.filter(event => event.onTarget).length, xG: shots.reduce((sum, event) => sum + (event.xG || 0), 0), cards: own.filter(event => event.type === 'card').length };
    };
    return { home: stats(home), away: stats(away) };
}
