declare const __MANUS_FM_VERSION__: string;
declare const __MANUS_FM_CHECKPOINT__: string;
declare const __MANUS_FM_BUILT_AT__: string;

export const ACTIVE_SEASON = '2026/27';
export const CURRENT_BUILD_CHANGES = [
    '235 locally packaged current-season kit photos across all 82 playable clubs. European 2026/27 and MLS 2026 labels remain distinct; unknown release/sponsor facts stay blank.',
    'Authentic local club crests replace generic squad-header shirts across all 82 clubs. Emoji navigation and match decoration use a consistent icon system.',
    'Pitch players now use a sourced anatomical 16-bone footballer rig, articulated gait and resolved shooting/save/celebration poses. Club shirt photographs project onto the model; keeper colours, back panels, shorts and socks remain approximations, not official full-kit textures or player likenesses.',
    'Clash-aware match kit selection, boot/sock detail and lineup-slot shirt markers. Closer broadcast camera and full-pitch tactical view; pause freezes the visual action and goal cue. One shared model geometry, independent player skeletons and bounded texture resolution.',
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
