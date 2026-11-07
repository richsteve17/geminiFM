import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Header from '../components/Header';
import { PRODUCT_TITLE, EDITION_YEAR } from '../product';

describe('approved xGaffer edition identity', () => {
    it('keeps the exact owner-approved name and edition independent from roster dates', () => {
        expect(PRODUCT_TITLE).toBe("xGaffer '28");
        expect(EDITION_YEAR).toBe(2028);
        const html = renderToStaticMarkup(React.createElement(Header, { showQuit: true, onSave: () => {}, onQuit: () => {} }));
        expect(html).toContain('xGaffer');
        expect(html).not.toContain('Manus FM');
        expect(html).toContain('aria-label="Save game"');
        expect(html).toContain('aria-label="Quit to menu"');
    });
});
