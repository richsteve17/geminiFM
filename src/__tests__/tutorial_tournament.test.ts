import { expect, it } from 'vitest';
import { generateWorldCupStructure } from '../international';
import { completeTutorialTournament } from '../engine/tutorialTournament';
it('preserves an observed final and its actual scoring ledger rather than replaying it', () => {
    const fixture: any = { id: 'final', week: 8, league: 'International', stage: 'Final', homeTeam: 'England', awayTeam: 'France', played: true, score: '3-0', events: [{ id: 1, player: 'Jude', type: 'goal' }] };
    const result = completeTutorialTournament({}, [fixture]);
    expect(result.champion).toBe('England'); expect(result.fixtures[0].events).toEqual(fixture.events);
});
it('finishes the rest of a completed group campaign with actual attributed knockout events', () => {
    const teams = generateWorldCupStructure();
    const groups = [...new Set(Object.values(teams).map(t => t.group))];
    const fixtures: any[] = [];
    for (const group of groups) {
        const names = Object.values(teams).filter(t => t.group === group).map(t => t.name);
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) fixtures.push({ id: `${group}-${i}-${j}`, week: 3, league: 'International', stage: 'Group Stage', homeTeam: names[i], awayTeam: names[j], played: true, score: '1-0' });
    }
    const result = completeTutorialTournament(teams, fixtures);
    expect(result.champion).toBeTruthy(); expect(result.fixtures.some(f => f.stage === 'Final' && f.played)).toBe(true);
    expect(result.fixtures.filter(f => f.isKnockout).every(f => Array.isArray(f.events) && !!f.participantNames)).toBe(true);
    expect(fixtures).toHaveLength(72);
});
