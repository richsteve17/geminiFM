declare const __MANUS_FM_VERSION__: string;
declare const __MANUS_FM_CHECKPOINT__: string;
declare const __MANUS_FM_BUILT_AT__: string;

export const ACTIVE_SEASON = '2026/27';

export const CURRENT_BUILD_CHANGES = [
    'Server-only Gemini gateway with rate limits, model policy, and normalized response payloads.',
    'Deterministic fixture results, live event ledgers, shootouts, match ratings, and post-match state.',
    'Songbook-driven terrace audio and event-positioned 3D broadcast pitch presentation.',
    'Source-backed 2026/27 kit cards now use verified Football Kit Archive records, reference imagery, and kit-specific UI palettes.',
    'Unverified clubs no longer receive a generic legacy palette mislabeled as a current kit.',
] as const;

export const BUILD_INFO = {
    product: "Manus FM '27",
    version: __MANUS_FM_VERSION__,
    checkpoint: __MANUS_FM_CHECKPOINT__,
    builtAt: __MANUS_FM_BUILT_AT__,
    season: ACTIVE_SEASON,
    changes: CURRENT_BUILD_CHANGES,
} as const;
