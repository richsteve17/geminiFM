import snapshotJson from '../data/nationalRosterSnapshot.json';
import type { Formation, Mentality, NationalTeam, Player, PlayerPosition, Team } from '../types';

export interface NationalRosterSource {
    provider: string;
    url: string;
    retrievedAt: string;
    sourceTimestamp?: string | null;
    competition: string;
    season?: { year?: number; displayName?: string; name?: string; type?: number } | null;
}
export interface SourceAthlete {
    externalId: string;
    sourceAthleteId: string;
    name: string;
    fullName?: string | null;
    shortName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    citizenship?: string | null;
    sourcePosition?: { id?: string; name?: string; displayName?: string; abbreviation?: string } | null;
    currentClub?: string | null;
    clubSource?: { id: string; name: string; url: string; retrievedAt: string } | null;
    athleteUrl?: string | null;
    jersey?: string | null;
    sourceOccurrences: Array<{ url: string; competition: string; season?: NationalRosterSource['season']; statistics: Record<string, number | null> }>;
}
export interface NationRosterRecord {
    name: string;
    countryCode: string;
    flag: string;
    confederation: string;
    prestige: number;
    catalogTier: 'base' | 'european' | 'global';
    formation: Formation;
    mentality: Mentality;
    sourceTeamId: string;
    sourceName: string;
    sourceCountryCode: string;
    crestUrl?: string | null;
    colors?: { primary: string; secondary: string };
    sources: NationalRosterSource[];
    players: SourceAthlete[];
    warnings: string[];
    coverage: string;
}
export interface NationalRosterPlayer extends Player {
    externalId: string;
    sourceName: string;
    sourceShortName?: string;
    nationalCountryCode: string;
    nationalRosterFacts: Pick<SourceAthlete, 'externalId' | 'sourceAthleteId' | 'name' | 'sourcePosition' | 'sourceOccurrences' | 'dateOfBirth' | 'jersey' | 'athleteUrl'>;
    gameDerived: { rating: true; personality: true; wage: true; position: boolean; ageFallback: boolean };
}
export interface NationalRosterTeam extends Team {
    countryCode: string;
    flag: string;
    confederation: string;
    sourceTeamId: string;
    crestUrl?: string;
    nationalRosterSource: { snapshotDate: string; kind: 'source-squad-pool'; officialFinalSelection: false; sources: NationalRosterSource[] };
    nationalSquadPool: NationalRosterPlayer[];
    rosterWarnings: string[];
}
interface Snapshot {
    snapshotDate: string;
    nations: NationRosterRecord[];
    coverage: { catalogNations: number; nationsWithRoster: number; nationsWithAtLeast26: number; athleteEntries: number; uniqueAthleteIds: number; athletesWithClub: number; below26: Array<{ countryCode: string; name: string; count: number }> };
}

export const NATIONAL_ROSTER_SNAPSHOT = snapshotJson as unknown as Snapshot;
export const NATIONAL_ROSTER_CATALOG = NATIONAL_ROSTER_SNAPSHOT.nations;
export const NATIONAL_ROSTER_SNAPSHOT_DATE = NATIONAL_ROSTER_SNAPSHOT.snapshotDate;

const clone = <T,>(value: T): T => value == null ? value : JSON.parse(JSON.stringify(value));
export function normalizeNationalPlayerName(name: string): string {
    return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function stableHash(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
}
const DEFENCE: PlayerPosition[] = ['LB', 'CB', 'RB', 'LWB', 'RWB'];
const MIDFIELD: PlayerPosition[] = ['DM', 'CM', 'AM', 'LM', 'RM'];
const ATTACK: PlayerPosition[] = ['LW', 'RW', 'ST', 'CF'];
function family(position: PlayerPosition): string {
    return position === 'GK' ? 'G' : DEFENCE.includes(position) ? 'D' : MIDFIELD.includes(position) ? 'M' : 'F';
}
// Existing game-role priors, NOT ESPN granular position assertions. ESPN publishes G/D/M/F.
// Distinguishes Jude/Jobe instead of attaching one ambiguous J. Bellingham identity to both.
const ROLE_PRIORS: Record<string, PlayerPosition> = {
    'espn:291281': 'AM', 'espn:324820': 'CM', 'espn:265919': 'DM', 'espn:231388': 'LW',
    'espn:238262': 'DM', 'espn:223532': 'RB', 'espn:265907': 'CB', 'espn:142200': 'ST',
    'espn:268782': 'LW', 'espn:285150': 'CM', 'espn:217331': 'ST', 'espn:328238': 'LW',
};
const RATING_PRIORS: Record<string, number> = {
    'espn:134283': 91, 'espn:291281': 94, 'espn:231388': 95, 'espn:265919': 88,
    'espn:238262': 90, 'espn:142200': 92, 'espn:189026': 88, 'espn:159443': 86,
};
function derivePosition(athlete: SourceAthlete, indexWithinFamily: number): PlayerPosition | undefined {
    if (ROLE_PRIORS[athlete.externalId]) return ROLE_PRIORS[athlete.externalId];
    const abbreviation = athlete.sourcePosition?.abbreviation || '';
    const exact: Record<string, PlayerPosition> = { GK: 'GK', LB: 'LB', CB: 'CB', RB: 'RB', LWB: 'LWB', RWB: 'RWB', DM: 'DM', CM: 'CM', AM: 'AM', LM: 'LM', RM: 'RM', LW: 'LW', RW: 'RW', ST: 'ST', CF: 'CF' };
    if (exact[abbreviation]) return exact[abbreviation];
    // Broad provider positions require explicit game slot assignment for playable formations.
    if (abbreviation === 'G' || /goalkeeper/i.test(athlete.sourcePosition?.name || '')) return 'GK';
    if (abbreviation === 'D') return (['CB', 'CB', 'LB', 'RB'] as PlayerPosition[])[indexWithinFamily % 4];
    if (abbreviation === 'M') return (['DM', 'CM', 'AM', 'CM'] as PlayerPosition[])[indexWithinFamily % 4];
    if (abbreviation === 'F') return (['ST', 'LW', 'RW', 'ST'] as PlayerPosition[])[indexWithinFamily % 4];
    return undefined;
}

/** All provider athlete records, including any with unusable/unknown source positions. */
export function getRawNationalSquadPool(countryCode: string): SourceAthlete[] {
    const nation = NATIONAL_ROSTER_CATALOG.find(n => n.countryCode === countryCode || n.name === countryCode);
    if (!nation) throw new Error(`Unknown national game catalog entry: ${countryCode}`);
    return clone(nation.players);
}

/** Full playable sourced pool, independent of manager selection. Unknown positions stay in raw evidence, not fabricated game roles. */
export function getNationalSquadPool(countryCode: string): NationalRosterPlayer[] {
    const nation = NATIONAL_ROSTER_CATALOG.find(n => n.countryCode === countryCode || n.name === countryCode);
    if (!nation) throw new Error(`Unknown national game catalog entry: ${countryCode}`);
    const counters: Record<string, number> = {};
    return nation.players.flatMap(athlete => {
        const broad = athlete.sourcePosition?.abbreviation || '';
        const index = counters[broad] || 0;
        counters[broad] = index + 1;
        const position = derivePosition(athlete, index);
        if (!position) return [];
        const rating = RATING_PRIORS[athlete.externalId] ?? Math.max(45, Math.min(90, nation.prestige - 6 + stableHash(athlete.externalId) % 9 - 4));
        return [{
            name: athlete.name, sourceName: athlete.name, sourceShortName: athlete.shortName || undefined,
            externalId: athlete.externalId, nationality: nation.flag, nationalCountryCode: nation.countryCode,
            position, rating, age: athlete.age ?? 25, personality: 'Professional',
            wage: Math.round(Math.max(1000, (rating - 40) ** 2 * 40) / 1000) * 1000,
            status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100,
            currentClub: athlete.currentClub || undefined,
            // Runtime carries only identity/appearance facts. Full provider records stay in the snapshot.
            nationalRosterFacts: {
                externalId: athlete.externalId, sourceAthleteId: athlete.sourceAthleteId, name: athlete.name,
                sourcePosition: clone(athlete.sourcePosition), dateOfBirth: athlete.dateOfBirth,
                jersey: athlete.jersey, athleteUrl: athlete.athleteUrl,
                sourceOccurrences: athlete.sourceOccurrences.map(occurrence => ({
                    url: occurrence.url, competition: occurrence.competition, season: clone(occurrence.season),
                    statistics: Object.fromEntries(Object.entries(occurrence.statistics).filter(([name]) =>
                        ['appearances', 'subIns', 'totalGoals', 'goalAssists', 'yellowCards', 'redCards', 'saves', 'goalsConceded'].includes(name))),
                })),
            },
            gameDerived: { rating: true, personality: true, wage: true, position: broad !== 'G' && broad !== position, ageFallback: athlete.age == null },
        } as NationalRosterPlayer];
    });
}

const FORMATION_SLOTS: Record<Formation, PlayerPosition[]> = {
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    '5-3-2': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'DM', 'CM', 'CM', 'ST', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'DM', 'CM', 'AM', 'RM', 'ST', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'LW', 'AM', 'RW', 'ST'],
    '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'DM', 'CM', 'AM', 'RM', 'ST'],
};
function fit(actual: PlayerPosition, slot: PlayerPosition): number {
    if (actual === slot) return 100;
    if ((actual === 'GK') !== (slot === 'GK')) return -1000;
    const pairs = [['LB', 'LWB'], ['RB', 'RWB'], ['LW', 'LM'], ['RW', 'RM'], ['ST', 'CF'], ['DM', 'CM'], ['AM', 'CM']];
    if (pairs.some(pair => pair.includes(actual) && pair.includes(slot))) return 80;
    return family(actual) === family(slot) ? 55 : 5;
}
function quality(player: Player): number {
    return player.rating + ((player.form ?? 50) - 50) * 0.05 + ((player.condition ?? 100) - 100) * 0.04;
}
function identity(player: Player): string {
    return (player as Partial<NationalRosterPlayer>).externalId || `${normalizeNationalPlayerName(player.name)}|${player.nationality}|${player.position}`;
}

/** Select an available balanced XI; never changes a player's actual stored position or stats. */
export function selectNationalStartingXI<T extends Player>(pool: T[], formation: Formation = '4-3-3'): T[] {
    const available = pool.filter(p => p.status.type === 'Available');
    const chosen = new Set<string>();
    return FORMATION_SLOTS[formation].flatMap(slot => {
        const ranked = available.filter(p => !chosen.has(identity(p)) && (slot === 'GK' ? p.position === 'GK' : p.position !== 'GK'))
            .sort((a, b) => fit(b.position, slot) - fit(a.position, slot) || quality(b) - quality(a) || identity(a).localeCompare(identity(b)));
        if (!ranked[0]) return [];
        chosen.add(identity(ranked[0]));
        return [ranked[0]];
    });
}

/** Manager selection, distinct from the source pool: 3 GK and broad defensive/midfield/attack cover where available. */
export function selectNationalSquad<T extends Player>(pool: T[], size = 26, formation: Formation = '4-3-3'): T[] {
    const target = Math.max(0, Math.floor(size));
    const unique = [...new Map(pool.map(player => [identity(player), player])).values()];
    const ranked = [...unique].sort((a, b) => quality(b) - quality(a) || identity(a).localeCompare(identity(b)));
    const xi = selectNationalStartingXI(unique, formation);
    const selected = new Map<string, T>(xi.slice(0, target).map(p => [identity(p), p]));
    const quotas: Record<string, number> = { G: 3, D: 8, M: 8, F: 7 };
    for (const broad of ['G', 'D', 'M', 'F']) {
        for (const player of ranked.filter(p => family(p.position) === broad)) {
            if (selected.size >= target || [...selected.values()].filter(p => family(p.position) === broad).length >= quotas[broad]) break;
            selected.set(identity(player), player);
        }
    }
    const fillOrder = [...ranked.filter(p => p.position !== 'GK'), ...ranked.filter(p => p.position === 'GK')];
    for (const player of fillOrder) {
        if (selected.size >= target) break;
        selected.set(identity(player), player);
    }
    const starterIds = new Set(xi.map(identity));
    return [...selected.values()].map(p => ({ ...clone(p), isStarter: starterIds.has(identity(p)) }));
}

/** Fresh playable national team, with untouched provenance and a separate full source pool. */
export function createNationalRosterTeam(countryCode: string, group?: string): NationalRosterTeam {
    const nation = NATIONAL_ROSTER_CATALOG.find(n => n.countryCode === countryCode || n.name === countryCode);
    if (!nation) throw new Error(`Unknown national game catalog entry: ${countryCode}`);
    const pool = getNationalSquadPool(nation.countryCode);
    const players = selectNationalSquad(pool, 26, nation.formation);
    const warnings = [...nation.warnings];
    for (const athlete of nation.players.filter(a => !derivePosition(a, 0))) warnings.push(`${athlete.name} (${athlete.externalId}) has no usable source position; preserved in raw source evidence, excluded from playable pool.`);
    if (pool.filter(p => p.position === 'GK').length < 3) warnings.push('Source pool has fewer than 3 goalkeepers; no fabricated goalkeeper added.');
    if (selectNationalStartingXI(players, nation.formation).length < 11) warnings.push('Fewer than 11 available source players; kickoff needs validation.');
    return {
        name: nation.name, countryCode: nation.countryCode, flag: nation.flag, confederation: nation.confederation,
        sourceTeamId: nation.sourceTeamId, crestUrl: nation.crestUrl || undefined,
        league: 'International', balance: 0, group, prestige: nation.prestige,
        chairmanPersonality: 'Football Federation', players,
        tactic: { formation: nation.formation, mentality: nation.mentality },
        objectives: [], activePromises: [], weeklyWageBill: 0, matchDayRevenue: 0, transferBudget: 0, weeklyBroadcastRevenue: 0,
        colors: nation.colors ? { ...nation.colors, text: '#FFFFFF' } : undefined,
        nationalSquadPool: pool, rosterWarnings: warnings,
        nationalRosterSource: { snapshotDate: NATIONAL_ROSTER_SNAPSHOT_DATE, kind: 'source-squad-pool', officialFinalSelection: false, sources: clone(nation.sources) },
    };
}

export function createNationalTeamTemplate(countryCode: string): NationalTeam {
    // Keep legacy template API while carrying additional metadata at runtime.
    return createNationalRosterTeam(countryCode);
}
function nationalityMatches(player: Player, nation: NationRosterRecord): boolean {
    return [nation.flag, nation.countryCode, nation.sourceCountryCode, nation.name, nation.sourceName].includes(player.nationality);
}
function nameMatches(player: Player, candidate: SourceAthlete): boolean {
    const name = normalizeNationalPlayerName(player.name);
    const sourceInitialName = candidate.firstName && candidate.lastName ? `${candidate.firstName[0]}. ${candidate.lastName}` : undefined;
    return [candidate.name, candidate.fullName, candidate.shortName, sourceInitialName].some(alias => alias && normalizeNationalPlayerName(alias) === name);
}

/** Unambiguous normalized name + national membership + compatible position; ambiguous initials are not guessed. */
export function resolveNationalPlayerIdentity(player: Player): SourceAthlete | undefined {
    const externalId = (player as Partial<NationalRosterPlayer>).externalId;
    if (externalId) {
        return NATIONAL_ROSTER_CATALOG.flatMap(n => n.players).find(p => p.externalId === externalId);
    }
    let candidates = NATIONAL_ROSTER_CATALOG.filter(n => nationalityMatches(player, n)).flatMap(n => n.players)
        .filter(p => nameMatches(player, p) && (ROLE_PRIORS[p.externalId] ? family(ROLE_PRIORS[p.externalId]) === family(player.position) : p.sourcePosition?.abbreviation === family(player.position) || p.sourcePosition?.abbreviation === player.position));
    if (candidates.length > 1) {
        // Only explicit role priors may disambiguate same-initial/surname records.
        candidates = candidates.filter(p => ROLE_PRIORS[p.externalId] === player.position);
    }
    return candidates.length === 1 ? candidates[0] : undefined;
}

/** Annotate verified club seeds without changing abbreviated display names, ages, stats, history or contracts. */
export function linkNationalRosterIdentitiesToClubTeams<T extends Team>(clubTeams: Record<string, T>): Record<string, T> {
    return Object.fromEntries(Object.entries(clubTeams).map(([key, team]) => [key, {
        ...team,
        players: team.players.map(player => {
            const source = resolveNationalPlayerIdentity(player);
            if (!source) return clone(player);
            return { ...clone(player), externalId: source.externalId, sourceName: source.name, sourceShortName: source.shortName || undefined };
        }),
    }])) as Record<string, T>;
}

/**
 * Callups from the current career, not stale club seeds. Only verified identities link.
 * Career name is retained for match-scorer/stat matching; full source name stays in sourceName.
 * Stats/history/appearance facts are copied verbatim, never reset or fabricated.
 * Input order: national teams, then current club teams. Neither input is mutated.
 */
export function hydrateNationalTeamsFromCareer(nationalTeams: Record<string, Team>, clubTeams: Record<string, Team>): Record<string, NationalRosterTeam> {
    const career = new Map<string, Array<{ player: Player; club: string }>>();
    for (const team of Object.values(clubTeams).filter(t => t.league !== 'International')) {
        for (const player of team.players) {
            const source = resolveNationalPlayerIdentity(player);
            if (!source) continue;
            const matches = career.get(source.externalId) || [];
            matches.push({ player, club: team.name });
            career.set(source.externalId, matches);
        }
    }
    return Object.fromEntries(Object.entries(nationalTeams).map(([key, team]) => {
        const existing = team as Partial<NationalRosterTeam>;
        const nation = NATIONAL_ROSTER_CATALOG.find(n => n.countryCode === existing.countryCode || n.name === team.name);
        if (!nation) return [key, clone(team) as NationalRosterTeam];
        const baseline = createNationalRosterTeam(nation.countryCode, team.group);
        const fullPool = existing.nationalSquadPool?.length ? existing.nationalSquadPool : baseline.nationalSquadPool;
        const pool = fullPool.map(sourcePlayer => {
            const matches = career.get(sourcePlayer.externalId);
            if (matches?.length !== 1) return clone(sourcePlayer);
            const current = matches[0];
            return {
                ...clone(sourcePlayer), ...clone(current.player),
                externalId: sourcePlayer.externalId, sourceName: sourcePlayer.sourceName, sourceShortName: sourcePlayer.sourceShortName,
                nationality: nation.flag, nationalCountryCode: nation.countryCode,
                nationalRosterFacts: clone(sourcePlayer.nationalRosterFacts), gameDerived: clone(sourcePlayer.gameDerived),
                currentClub: current.club,
                status: current.player.status.type === 'On International Duty' ? { type: 'Available' } : clone(current.player.status),
            } as NationalRosterPlayer;
        });
        const formation = team.tactic?.formation || baseline.tactic.formation;
        return [key, {
            ...baseline, ...clone(team), countryCode: nation.countryCode, nationalSquadPool: pool,
            players: selectNationalSquad(pool, 26, formation),
            nationalRosterSource: baseline.nationalRosterSource,
            rosterWarnings: [...baseline.rosterWarnings, ...pool.filter(p => (career.get(p.externalId)?.length || 0) > 1).map(p => `Ambiguous career club identity: ${p.sourceName}; source pool record retained.`)],
        }];
    }));
}
