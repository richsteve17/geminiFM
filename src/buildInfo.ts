declare const __MANUS_FM_VERSION__: string;
declare const __MANUS_FM_CHECKPOINT__: string;
declare const __MANUS_FM_BUILT_AT__: string;

export const ACTIVE_SEASON = '2026/27';
export const CURRENT_BUILD_CHANGES = [
    '17 supplied recordings connected to kickoff, goals, pressure and full-time. Clubs or cues without a matching recording are marked unavailable.',
    'Live goals appear at their actual minute. Match highlights animate the resolved passing, crossing and shot paths; lineups, keeper placement, fatigue and tactics affect play.',
    'AI match commentary and contextual press use actual fixture facts. Direct Gemini quota exhaustion routes text through managed Gemini; managed calls use project credits and are capped.',
    'Press answers are evaluated with quoted evidence. Applied effects, transcript and outcome IDs survive the next-week transition and save/load.',
    'Free-agent search, accepted contract terms, wages, signing bonuses, roster eligibility and market removal now share one guarded signing transition.',
    'Versioned older-save migration, halftime and extra-time interval repairs. Source-backed kit catalog preserved. Full world/regen/atmosphere systems remain unfinished.',
] as const;
export const BUILD_INFO = {
    product: "Manus FM '27", version: __MANUS_FM_VERSION__, checkpoint: __MANUS_FM_CHECKPOINT__,
    builtAt: __MANUS_FM_BUILT_AT__, season: ACTIVE_SEASON, changes: CURRENT_BUILD_CHANGES,
} as const;
