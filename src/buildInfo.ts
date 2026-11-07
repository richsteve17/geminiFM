import { PRODUCT_TITLE } from './product';

declare const __MANUS_FM_VERSION__: string;
declare const __MANUS_FM_CHECKPOINT__: string;
declare const __MANUS_FM_BUILT_AT__: string;

export const ACTIVE_SEASON = '2026/27';
export const CURRENT_BUILD_CHANGES = [
    'Career mode allows any playable club; only hardcore RTG uses World Cup-earned initial club access and reputation.',

    'Complete current membership for 150 clubs across seven supported leagues; 4,601 unique playable source athletes.',
    'European home/away seasons and MLS 34-game conference schedule plus MLS Cup playoff progression. Opponent calendars are simulated.',
    'Separate continental and domestic standings, replay guards, corrected league-size evaluation and safe unemployed rollover.',

    "xGaffer '28 is the approved product name and edition. The edition is distinct from the 2026/27 roster season and the 2026 World Cup tutorial; historic save/profile keys remain compatible.",
    'New careers use refreshed current-source squads for all 82 playable clubs: 2,538 unique players, snapshot 2026-11-07. Actual membership, names, supplied/source identities, source ages/DOB and shirt numbers are separate from versioned game-derived ratings and contract economics.',
    'The tutorial uses the supplied authoritative 48 national squads / 1,244 players, with their exact membership and corrected Jordan/Panama entries. World Cup selection is no longer a generic 26-player cut from an observed pool.',
    'Continue retains the existing simulated career. New roster data does not reset transfers, stats, balances, history or relationships. Compact gzip saves reduce browser-storage pressure; legacy plain-JSON saves remain readable and a failed backup cannot block loading.',
    'Fresh free-agent markets use the supplied explicitly unattached players, then actual career releases—not the stale transfer-target list. Full owned source squads no longer inherit an incorrect 25-player registration cap; game ownership limit is separate.',
    'Whole-interface football-editorial redesign: paper/ink/forest/brass tokens, local Barlow Condensed and IBM Plex Sans typography, ruled surfaces and compact masthead replace the inherited navy-glass layout.',
    'Asymmetric career entry with a credited Wembley photograph; permanent club dossier/navigation, readable market and recruitment registers, staff transcripts, press editorial sheets and international reports. All existing entry gates, factual data, consequences and callbacks retained.',
    'Dark broadcast scorebug and consolidated match controls, a larger pitch at desktop widths, ruled live notes, flat squad/tactical worksheets and integrated stadium audio controls. Phone navigation/disclosures preserved; no simulation, roster, save-schema or paid-AI setting changes.',
    'World Cup is the RTG tutorial. Skip: unemployed/Championship; elimination unlocks lower clubs; a title unlocks elite clubs including Real Madrid. Best completed tutorial rewards persist; existing club careers retain earned mobility.',
    '64 observed national pools remain available for the separate expanded background format. The 48-nation tutorial instead uses the authoritative supplied tournament squads; observed pools and final-squad authority stay distinct.',
    'International return relationships use actual scorers, keeper/penalty duels, tournament stakes and participation. Shared national success/failure, persistent chemistry/training effects, grounded AI mediation, separation and repeated-co-selection transfer escalation replace random national-pair feuds.',
    'International results and recorded highlights remain viewable. Actual penalty sheets and substitute participation persist; compact saves omit duplicate source pools without resetting career football facts. The World Cup final now reaches its RTG award branch.',
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
    product: PRODUCT_TITLE, version: __MANUS_FM_VERSION__, checkpoint: __MANUS_FM_CHECKPOINT__,
    builtAt: __MANUS_FM_BUILT_AT__, season: ACTIVE_SEASON, changes: CURRENT_BUILD_CHANGES,
} as const;
