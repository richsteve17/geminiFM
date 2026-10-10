declare const __MANUS_FM_VERSION__: string;
declare const __MANUS_FM_CHECKPOINT__: string;
declare const __MANUS_FM_BUILT_AT__: string;

export const ACTIVE_SEASON = '2026/27';

export const CURRENT_BUILD_CHANGES = [
    'Server-only Gemini gateway with rate limits, model policy, and normalized response payloads.',
    'Deterministic fixture results, live event ledgers, shootouts, match ratings, and post-match state.',
    'Songbook-driven terrace audio and event-positioned 3D broadcast pitch presentation.',
    'Release record and season-aware club UI theme selector replace the obsolete homepage dev log.',
] as const;

export const BUILD_INFO = {
    product: "Manus FM '27",
    version: __MANUS_FM_VERSION__,
    checkpoint: __MANUS_FM_CHECKPOINT__,
    builtAt: __MANUS_FM_BUILT_AT__,
    season: ACTIVE_SEASON,
    changes: CURRENT_BUILD_CHANGES,
} as const;
