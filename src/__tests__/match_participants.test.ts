import { describe, expect, it } from 'vitest';
import { kickoffParticipants, mergeMatchParticipants, pairPlayedTogether } from '../engine/matchParticipants';
it('retains a substituted starting scorer while excluding an unused bench player', () => {
    const home: any = { name: 'England', players: [{ name: 'Jude', position: 'AM', isStarter: true, status: { type: 'Available' } }, { name: 'Unused', position: 'ST', isStarter: false, status: { type: 'Available' } }] };
    const away: any = { name: 'France', players: [{ name: 'Keeper', position: 'GK', isStarter: true, status: { type: 'Available' } }] };
    const evidence = kickoffParticipants(home, away);
    home.players[0].isStarter = false;
    const fixture: any = { homeTeam: 'England', awayTeam: 'France', ...evidence };
    const names = mergeMatchParticipants(fixture, [{ id: 1, minute: 12, type: 'goal', teamName: 'England', player: 'Jude', goalkeeper: 'Keeper', description: 'goal' }], home, away);
    expect(names.home).toContain('Jude'); expect(names.home).not.toContain('Unused'); expect(names.away).toContain('Keeper');
});

it('records a substitute without another named action and distinguishes actual overlapping appearances', () => {
    const home: any = { name: 'Madrid', players: ['Jude', 'Kylian', 'Substitute'].map(name => ({ name, position: 'AM', isStarter: name !== 'Substitute', status: { type: 'Available' } })) };
    const away: any = { name: 'Visitors', players: [] };
    const fixture: any = { homeTeam: 'Madrid', awayTeam: 'Visitors', ...kickoffParticipants(home, away) };
    const events: any[] = [{ id: 5, minute: 50, type: 'sub', teamName: 'Madrid', playerIn: 'Substitute', playerOut: 'Jude', description: 'substitution' }];
    expect(mergeMatchParticipants(fixture, events, home, away).home).toContain('Substitute');
    expect(pairPlayedTogether(fixture, events, 'Madrid', 'Jude', 'Kylian')).toBe(true);
    expect(pairPlayedTogether(fixture, events, 'Madrid', 'Substitute', 'Kylian')).toBe(true);
    expect(pairPlayedTogether(fixture, events, 'Madrid', 'Substitute', 'Jude')).toBe(false);
});
