import type { CareerHistoryEntry, Team, TournamentStage } from '../types';

export type TutorialFinish = 'Group Stage' | 'Round of 32' | 'Round of 16' | 'Quarter Final' | 'Semi Final' | 'Finalist' | 'Winner';
export interface TutorialResult {
    version: 1;
    country: string;
    finish: TutorialFinish;
    reputation: number;
}
export const TUTORIAL_PROFILE_KEY = 'manusfm_tutorial_result_v1';
const order: TutorialFinish[] = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Finalist', 'Winner'];
/** Intermediate thresholds are explicit balance defaults; the owner specified baseline, MLS exit and elite win. */
export const TUTORIAL_REWARDS: Record<TutorialFinish, { reputation: number; prestigeCap: number; label: string }> = {
    'Group Stage': { reputation: 65, prestigeCap: 0, label: 'Championship and MLS starts' },
    'Round of 32': { reputation: 70, prestigeCap: 75, label: 'Championship, MLS and developing top-flight clubs' },
    'Round of 16': { reputation: 75, prestigeCap: 80, label: 'Established top-flight clubs' },
    'Quarter Final': { reputation: 80, prestigeCap: 85, label: 'European contenders' },
    'Semi Final': { reputation: 85, prestigeCap: 90, label: 'High-prestige contenders' },
    'Finalist': { reputation: 90, prestigeCap: 94, label: 'Major clubs; elite tier still requires a title' },
    'Winner': { reputation: 100, prestigeCap: 100, label: 'All clubs, including Real Madrid' },
};
export function tutorialResult(country: string, finish: TutorialFinish): TutorialResult {
    return { version: 1, country, finish, reputation: TUTORIAL_REWARDS[finish].reputation };
}
export function normalizeTutorialResult(value: unknown): TutorialResult | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<TutorialResult>;
    if (data.version !== 1 || typeof data.country !== 'string' || !data.country.trim() || !order.includes(data.finish!)) return null;
    return tutorialResult(data.country, data.finish!);
}
export function bestTutorialResult(a: TutorialResult | null, b: TutorialResult | null) {
    if (!a) return b;
    if (!b) return a;
    return order.indexOf(a.finish) >= order.indexOf(b.finish) ? a : b;
}
export function restoreTutorialHonors(history: CareerHistoryEntry[]): TutorialResult | null {
    return history.reduce<TutorialResult | null>((best, item) => {
        if (item.league !== 'World Cup') return best;
        const finish = item.finalPosition === 'Winner' && item.trophies.some(t => /world cup.*(champion|winner)/i.test(t))
            ? 'Winner' : item.finalPosition === 'Runners-up' ? 'Finalist' : order.includes(item.finalPosition as TutorialFinish) ? item.finalPosition as TutorialFinish : null;
        return finish ? bestTutorialResult(best, tutorialResult(item.teamName, finish)) : best;
    }, null);
}
export function canStartAtClub(team: Team, result: TutorialResult | null): boolean {
    if (team.league === 'International' || team.league === 'Champions League') return false;
    if (team.league === 'Championship') return true;
    if (!result) return false;
    if (team.league === 'MLS') return true;
    return team.prestige <= TUTORIAL_REWARDS[result.finish].prestigeCap;
}
export function careerGateLabel(result: TutorialResult | null) {
    return result ? `${result.country}: ${result.finish}. ${TUTORIAL_REWARDS[result.finish].label}.` : 'World Cup tutorial not completed: unemployed or Championship starts only.';
}
export function finishFromStage(stage: TournamentStage, wonFinal = false): TutorialFinish {
    if (stage === 'Final') return wonFinal ? 'Winner' : 'Finalist';
    return order.includes(stage as TutorialFinish) ? stage as TutorialFinish : 'Group Stage';
}

/** The eight-week tutorial completes through its final award branch, never the domestic season reset. */
export function shouldRollClubSeason(mode: string, week: number, seasonLength: number): boolean {
    return mode === 'Club' && week >= seasonLength;
}
