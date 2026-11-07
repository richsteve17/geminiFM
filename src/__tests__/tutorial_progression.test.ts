import { describe, expect, it } from 'vitest';
import { TEAMS } from '../constants';
import { bestTutorialResult, canStartAtClub, normalizeTutorialResult, restoreTutorialHonors, shouldRollClubSeason, tutorialResult } from '../engine/tutorialProgression';
const clubs = Object.values(TEAMS);
const madrid = clubs.find(t => t.name === 'Real Madrid')!;
const mls = clubs.find(t => t.league === 'MLS')!;
const championship = clubs.find(t => t.league === 'Championship')!;

describe('World Cup tutorial rewards', () => {
    it('never intercepts the World Cup final with the domestic season reset', () => {
        expect(shouldRollClubSeason('WorldCup', 8, 8)).toBe(false);
        expect(shouldRollClubSeason('Club', 52, 52)).toBe(true);
    });
    it('does not allow skipping to MLS or Madrid but permits Championship', () => {
        expect(canStartAtClub(madrid, null)).toBe(false);
        expect(canStartAtClub(mls, null)).toBe(false);
        expect(canStartAtClub(championship, null)).toBe(true);
    });
    it('opens MLS on elimination and elite club opportunities on a title', () => {
        expect(canStartAtClub(mls, tutorialResult('England', 'Group Stage'))).toBe(true);
        expect(canStartAtClub(madrid, tutorialResult('England', 'Group Stage'))).toBe(false);
        expect(canStartAtClub(madrid, tutorialResult('England', 'Winner'))).toBe(true);
    });
    it('uses valid result facts, not an arbitrary self-awarded reputation', () => {
        expect(normalizeTutorialResult({ version: 1, country: 'France', finish: 'Winner', reputation: -900 })?.reputation).toBe(100);
        expect(normalizeTutorialResult({ version: 1, country: 'France', finish: 'Super Legend' })).toBeNull();
        expect(normalizeTutorialResult({ country: 'France', reputation: 100 })).toBeNull();
    });
    it('retains best completed tutorial rather than erasing it on menu/replay', () => {
        const win = tutorialResult('France', 'Winner');
        expect(bestTutorialResult(win, tutorialResult('England', 'Group Stage'))).toEqual(win);
        expect(bestTutorialResult(null, win)).toEqual(win);
    });
    it('restores legacy confirmed World Cup honors without treating club prestige as tutorial proof', () => {
        expect(restoreTutorialHonors([{ year: 1, teamName: 'Madrid', league: 'La Liga', finalPosition: 'Winner', trophies: [] }])).toBeNull();
        expect(restoreTutorialHonors([{ year: 1, teamName: 'France', league: 'World Cup', finalPosition: 'Winner', trophies: ['World Cup Champion'] }])?.finish).toBe('Winner');
    });
});
