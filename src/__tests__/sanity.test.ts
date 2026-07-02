import { describe, it, expect } from 'vitest';
import { generateName } from '../utils';

describe('sanity tests', () => {
    it('generateName should return a formatted name', () => {
        const name = generateName('EN');
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        // Name should be in format "X. Y" (e.g. "J. Smith")
        expect(name).toMatch(/^[A-Z]\. [a-zA-ZÀ-ÿ\s]+$/);
    });

    it('generateName should handle ES code and return a formatted name', () => {
        const name = generateName('ES');
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        expect(name).toMatch(/^[A-Z]\. [a-zA-ZÀ-ÿ\s]+$/);
    });
});
