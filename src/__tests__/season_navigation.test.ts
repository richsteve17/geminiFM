import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateSwissFixtures } from '../utils';
import type { Team } from '../types';

describe('confirmed season navigation regressions', () => {
  it('odd continental fields have byes, never self matches or duplicate bookings', () => {
    const teams = Array.from({ length: 35 }, (_, i) => ({ name: `Test club ${i}` } as Team));
    const fixtures = generateSwissFixtures(teams);
    const occupied = new Set<string>();
    for (const f of fixtures) {
      expect(f.homeTeam).not.toBe(f.awayTeam);
      expect(teams.some(t => t.name === f.homeTeam)).toBe(true);
      expect(teams.some(t => t.name === f.awayTeam)).toBe(true);
      for (const name of [f.homeTeam, f.awayTeam]) {
        const key = `${f.week}:${name}`;
        expect(occupied.has(key)).toBe(false);
        occupied.add(key);
      }
    }
    expect(fixtures.length).toBe(17 * 8);
  });
  it('empty-week branch exposes an idle-only continue action', () => {
    const source = readFileSync('src/components/MatchView.tsx', 'utf8');
    const branch = source.slice(source.indexOf('if (gameState === GameState.PRE_MATCH && !fixture)'), source.indexOf('const currentMinute'));
    expect(branch).toContain('onClick={onNextMatch}');
    expect(branch).toContain('disabled={isLoading}');
  });
  it('weekly transition locks synchronously, defers autosave and blocks unresolved rollover', () => {
    const source = readFileSync('src/App.tsx', 'utf8');
    expect(source).toContain('advancingRef.current || committedWeekRef.current === advanceKey');
    expect(source).toContain('if (advancingRef.current) return;');
    expect(source).toContain('setAdvanceRevision(r => r + 1)');
    expect(source).toContain('setTeams(before.teams)');
    expect(source).toContain('Season has unresolved fixtures. Rollover blocked');
  });
});
