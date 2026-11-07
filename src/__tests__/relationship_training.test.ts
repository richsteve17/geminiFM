import { expect, it } from 'vitest';
import { calculatePlayerDevelopment } from '../utils';
const player: any = { name: 'Young player', age: 20, rating: 65, potential: 95, growthRate: 0.8, form: 50, personality: 'Professional', effects: [] };
it('reduces actual positive training growth even without a match performance input', () => {
    const ordinary = calculatePlayerDevelopment(player, 0);
    const impaired = calculatePlayerDevelopment({ ...player, effects: [{ type: 'InternationalRift', trainingPenalty: 8 }] }, 0);
    expect(impaired.rating).toBeLessThan(ordinary.rating); expect(impaired.growthRate).toBe(ordinary.growthRate);
});
it('does not improve a poor performance by moving it toward zero', () => {
    const ordinary = calculatePlayerDevelopment(player, -0.8);
    const impaired = calculatePlayerDevelopment({ ...player, effects: [{ trainingPenalty: 8 }] }, -0.8);
    expect(impaired.form).toBe(ordinary.form); expect(impaired.rating).toBeLessThanOrEqual(ordinary.rating);
});
