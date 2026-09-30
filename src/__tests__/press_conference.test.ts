import { describe, it, expect } from 'vitest';
import { evaluatePressConference } from '../services/geminiService';

describe('Press Conference Evaluation', () => {
    it('should reward team praise with positive reputation and squad form after a win', async () => {
        const history = [
            { q: "An outstanding victory today! What do you think was the turning point in the match?", a: "I am extremely proud of the players. They showed great character and excellent spirit." }
        ];
        const report = await evaluatePressConference(history, "Manchester City just won 3-0 against Arsenal");

        expect(report.headline).toBeDefined();
        expect(report.article).toBeDefined();
        expect(report.newspaperName).toBeDefined();
        expect(report.mediaTone).toBe('positive');
        expect(report.reputationChange).toBeGreaterThan(0);
        expect(report.squadFormChange).toBeGreaterThan(0);
    });

    it('should penalize player blame with negative reputation and form after a defeat', async () => {
        const history = [
            { q: "A tough defeat today. Where do you feel the game plan fell apart?", a: "It was a poor performance. The players made bad mistakes and it is their fault." }
        ];
        const report = await evaluatePressConference(history, "Manchester City just lost 2-0 against Liverpool");

        expect(report.headline).toBeDefined();
        expect(report.article).toBeDefined();
        expect(report.newspaperName).toBeDefined();
        expect(report.mediaTone).toBe('sensationalist');
        expect(report.reputationChange).toBeLessThan(0);
        expect(report.squadFormChange).toBeLessThan(0);
    });
});
