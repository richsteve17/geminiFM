import type { Formation, MatchEvent } from '../types';
import { FORMATION_SLOTS } from './tactics';
export type PitchPoint = { x: number; y: number };
const roles: Record<string, PitchPoint> = {
    GK: { x: 5, y: 50 }, LB: { x: 23, y: 14 }, CB: { x: 22, y: 50 }, RB: { x: 23, y: 86 },
    LWB: { x: 35, y: 9 }, RWB: { x: 35, y: 91 }, DM: { x: 37, y: 50 }, CM: { x: 48, y: 50 },
    LM: { x: 48, y: 16 }, RM: { x: 48, y: 84 }, AM: { x: 60, y: 50 }, LW: { x: 70, y: 18 }, RW: { x: 70, y: 82 }, ST: { x: 74, y: 50 }, CF: { x: 66, y: 50 },
};
export function formationPoints(formation: Formation, away = false): PitchPoint[] {
    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    return slots.map((role, index) => {
        const same = slots.map((r, i) => r === role ? i : -1).filter(i => i >= 0);
        const spread = (same.indexOf(index) - (same.length - 1) / 2) * 21;
        const base = roles[role];
        return { x: away ? 100 - base.x : base.x, y: Math.max(8, Math.min(92, base.y + spread)) };
    });
}
export function highlightPath(event: MatchEvent | null, homeName: string): PitchPoint[] {
    if (event?.play?.ballPath.length) return event.play.ballPath;
    if (event?.pitchX !== undefined && event.pitchY !== undefined) {
        const origin = { x: event.pitchX, y: event.pitchY };
        return [{ x: 50, y: 50 }, origin, event.type === 'goal' ? { x: event.teamName === homeName ? 100 : 0, y: 50 } : origin];
    }
    return [{ x: 50, y: 50 }, { x: 50, y: 50 }];
}
export function pointOnPath(path: PitchPoint[], progress: number): PitchPoint {
    const p = Math.max(0, Math.min(1, progress)) * (path.length - 1);
    const index = Math.min(Math.floor(p), path.length - 2);
    const t = p - index;
    return { x: path[index].x + (path[index + 1].x - path[index].x) * t, y: path[index].y + (path[index + 1].y - path[index].y) * t };
}
