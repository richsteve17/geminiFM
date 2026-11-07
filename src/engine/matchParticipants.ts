import type { Fixture, MatchEvent, Team } from '../types';
/** Participation is from kickoff/recorded actions, not the full national squad. */
export function kickoffParticipants(home: Team, away: Team) {
    return {
        participantNames: { home: home.players.filter(p => p.isStarter && p.status.type === 'Available').map(p => p.name), away: away.players.filter(p => p.isStarter && p.status.type === 'Available').map(p => p.name) },
        goalkeeperNames: { home: home.players.find(p => p.isStarter && p.position === 'GK')?.name, away: away.players.find(p => p.isStarter && p.position === 'GK')?.name },
    };
}
export function mergeMatchParticipants(fixture: Fixture, events: MatchEvent[], home: Team, away: Team) {
    const kickoff = fixture.participantNames || kickoffParticipants(home, away).participantNames;
    const names = { home: new Set(kickoff.home), away: new Set(kickoff.away) };
    for (const event of events) {
        const side = event.teamName === home.name ? 'home' : event.teamName === away.name ? 'away' : undefined;
        const team = side === 'home' ? home : away;
        if (side && event.player && team.players.some(p => p.name === event.player)) names[side].add(event.player);
        if (side && event.playerIn && team.players.some(p => p.name === event.playerIn)) names[side].add(event.playerIn);
        if (side && event.playerOut && team.players.some(p => p.name === event.playerOut)) names[side].add(event.playerOut);
        const keeperSide = side === 'home' ? 'away' : 'home';
        const defenders = keeperSide === 'home' ? home : away;
        if (side && event.goalkeeper && defenders.players.some(p => p.name === event.goalkeeper && p.position === 'GK')) names[keeperSide].add(event.goalkeeper);
    }
    return { home: [...names.home], away: [...names.away] };
}

/** Actual overlapping participation, not merely a shared callup or separate appearances. */
export function pairPlayedTogether(fixture: Fixture, events: MatchEvent[], clubName: string, playerA: string, playerB: string): boolean {
    const side = fixture.homeTeam === clubName ? 'home' : fixture.awayTeam === clubName ? 'away' : undefined;
    if (!side || !fixture.participantNames) return false;
    const onPitch = new Set(fixture.participantNames[side]);
    // Saved final appearance lists include substitutes; remove incoming substitutes to recover kickoff actors.
    events.filter(e => e.teamName === clubName && e.type === 'sub' && e.playerIn).forEach(e => onPitch.delete(e.playerIn!));
    const together = () => onPitch.has(playerA) && onPitch.has(playerB);
    if (together()) return true;
    for (const event of [...events].sort((a, b) => a.minute - b.minute)) {
        if (event.teamName !== clubName || event.type !== 'sub') continue;
        if (event.playerOut) onPitch.delete(event.playerOut);
        if (event.playerIn) onPitch.add(event.playerIn);
        if (together()) return true;
    }
    return false;
}
