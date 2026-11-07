import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { TEAMS } from '../constants';
import { canEnterClub, tutorialResult } from '../engine/tutorialProgression';

describe('Career vs hardcore RTG entry', () => {
  const madrid = TEAMS['Real Madrid'];
  it('Career allows every domestic club without a tutorial result', () => {
    for (const team of Object.values(TEAMS)) {
      if (!['International', 'Champions League'].includes(team.league)) expect(canEnterClub(team, null, 'Career')).toBe(true);
    }
  });
  it('Career ignores low tutorial outcomes while RTG still requires earned elite access', () => {
    const exit = tutorialResult('England', 'Group Stage');
    expect(canEnterClub(madrid, exit, 'Career')).toBe(true);
    expect(canEnterClub(madrid, null, 'RTG')).toBe(false);
    expect(canEnterClub(madrid, exit, 'RTG')).toBe(false);
    expect(canEnterClub(madrid, tutorialResult('England', 'Winner'), 'RTG')).toBe(true);
  });
  it('actual Career selection calls the unrestricted entry path, while job gates remain', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain("onTeamSelect={name => initializeGame(name, 'Career')}");
    expect(app).toContain("canEnterClub(t, tutorialCompletion, 'Career')");
    expect(app).toContain("entry: 'Career' | 'RTG' = 'RTG'");
    expect(app).toContain('!canStartAtClub(team, tutorialCompletion)');
    const home = readFileSync('src/components/StartScreen.tsx', 'utf8');
    expect(home).toContain('Choose any club. World Cup results do not restrict Career mode.');
  });
});
