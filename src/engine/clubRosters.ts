import snapshotJson from '../data/clubRosterSnapshot.json';
import worldCupJson from '../data/worldCup2026Squads.json';
import type { Formation, Player, PlayerPosition, Team } from '../types';
import { getAuthoritativeWorldCupPlayer, resolveRosterAthlete, rosterCountryCode, WORLD_CUP_COUNTRY_CATALOG } from './rosterIdentity';
import { getNationalSquadPool, NATIONAL_ROSTER_CATALOG, normalizeNationalPlayerName, selectNationalStartingXI } from './nationalRosters';
import { FORMATION_SLOTS } from './tactics';

export interface ClubRosterSource {
    provider: string;
    url: string;
    retrievedAt: string;
    sourceTimestamp?: string | null;
    season?: unknown;
    competition?: string;
}
export interface ClubSourceAthlete {
    externalId: string;
    sourceAthleteId: string;
    name: string;
    fullName?: string | null;
    shortName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    sourcePosition?: { id?: string; name?: string; displayName?: string; abbreviation?: string } | null;
    age?: number | null;
    dateOfBirth?: string | null;
    DOB?: string | null;
    citizenship?: string | null;
    citizenshipCountry?: { name?: string; abbreviation?: string; code?: string } | string | null;
    jersey?: string | number | null;
    athleteUrl?: string | null;
    currentClub?: string | null;
    clubReference?: string | { id?: string; sourceTeamId?: string; name?: string; displayName?: string; url?: string; [key: string]: unknown } | null;
    sourceOccurrences: Array<Record<string, unknown>>;
}
export interface ClubRosterRecord {
    gameName: string;
    gameLeague: string;
    sourceTeamId: string;
    sourceName: string;
    sourceLeagueCode: string;
    sources: ClubRosterSource[];
    players: ClubSourceAthlete[];
    warnings: string[];
    coverage: unknown;
}
export interface ClubRosterSnapshot {
    snapshotDate: string;
    teams: ClubRosterRecord[];
    coverage: Record<string, unknown>;
}
export type ClubOwnershipMethod = 'single-source-owner' | 'authoritative-club' | 'source-owner-reference';
export interface ClubRosterIssue {
    kind: 'ownership-conflict' | 'unknown-position' | 'invalid-identity' | 'duplicate-entry';
    externalId: string;
    name: string;
    reason: string;
    candidateClubs?: string[];
}
export interface ClubRosterPlayer extends Player {
    externalId: string;
    sourceName: string;
    sourceShortName?: string;
    squadNumber?: number;
    dateOfBirth?: string;
    datasetPlayerId?: string;
    clubRosterFacts: ClubSourceAthlete;
    clubRosterProvenance: {
        snapshotDate: string;
        sourceClub: string;
        sourceTeamId: string;
        sourceLeagueCode: string;
        ownership: ClubOwnershipMethod;
        age: 'date-of-birth' | 'source-age' | 'game-fallback';
        dateOfBirth: 'current-club-source' | 'verified-identity-source' | 'missing';
        nationality: 'authoritative-national-team' | 'source-citizenship' | 'unknown';
        position: 'authoritative-national-role' | 'source-exact' | 'verified-game-prior' | 'national-game-role' | 'derived-broad-role';
    };
    gameDerived: {
        version: string;
        rating: true;
        personality: true;
        wage: true;
        contract: true;
        potential: true;
        position: boolean;
        ageFallback: boolean;
        preservedPriorFields: string[];
    };
}
export interface ClubRosterTeam extends Team {
    players: ClubRosterPlayer[];
    clubRosterSource: {
        snapshotDate: string;
        kind: 'current-source-club-squad';
        status: 'sourced' | 'partial' | 'missing';
        sourceTeamId?: string;
        sourceName?: string;
        sourceLeagueCode?: string;
        sources: ClubRosterSource[];
        sourceCoverage?: unknown;
        sourcePlayerCount: number;
        playablePlayerCount: number;
        completePlayableMembership: boolean;
        gameDerivationVersion: string;
    };
    rosterWarnings: string[];
    unresolvedRosterPlayers: ClubRosterIssue[];
}
export interface ClubRosterCoverage {
    snapshotDate: string;
    sourceCoverage: Record<string, unknown>;
    requestedClubs: number;
    sourcedClubs: number;
    partialClubs: number;
    missingClubs: string[];
    playablePlayers: number;
    unresolvedPlayers: ClubRosterIssue[];
}

export const CLUB_ROSTER_SNAPSHOT = snapshotJson as unknown as ClubRosterSnapshot;
export const CLUB_ROSTER_CATALOG = CLUB_ROSTER_SNAPSHOT.teams;
export const CLUB_ROSTER_SNAPSHOT_DATE = CLUB_ROSTER_SNAPSHOT.snapshotDate;
export const CLUB_ROSTER_GAME_DERIVATION_VERSION = 'club-roster-v1';
const clone = <T,>(value: T): T => value == null ? value : JSON.parse(JSON.stringify(value));
const norm = normalizeNationalPlayerName;
function hash(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
}
const exactPositions: Record<string, PlayerPosition> = Object.fromEntries(
    ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'].map(p => [p, p]),
) as Record<string, PlayerPosition>;
function exactPosition(position?: string | null): PlayerPosition | undefined {
    const value = (position || '').toUpperCase();
    return exactPositions[value] || (value === 'CDM' ? 'DM' : value === 'CAM' ? 'AM' : undefined);
}
function broadPosition(athlete: ClubSourceAthlete): string | undefined {
    const position = athlete.sourcePosition;
    const abbreviation = (position?.abbreviation || '').toUpperCase();
    if (['G', 'D', 'M', 'F'].includes(abbreviation)) return abbreviation;
    const name = position?.name || position?.displayName || '';
    if (/goalkeeper/i.test(name)) return 'G';
    if (/defender/i.test(name)) return 'D';
    if (/midfielder/i.test(name)) return 'M';
    if (/forward|striker/i.test(name)) return 'F';
    return undefined;
}
function positionFamily(position: PlayerPosition): string {
    if (position === 'GK') return 'G';
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(position)) return 'D';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'M';
    return 'F';
}
function flag(countryCode?: string): string | undefined {
    const code = countryCode?.toUpperCase();
    if (!code || !/^[A-Z]{2}$/.test(code)) return undefined;
    return [...code].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}
function sourceNationality(athlete: ClubSourceAthlete): string | undefined {
    const country = athlete.citizenshipCountry;
    const code = typeof country === 'string' ? country : country?.abbreviation || country?.code;
    return nationalFlag(rosterCountryCode(code || athlete.citizenship)) || flag(code) || flag(athlete.citizenship || undefined) || athlete.citizenship || (typeof country === 'object' ? country?.name : country) || undefined;
}
/** UTC calendar age, frozen to the actual source snapshot, never the game's edition label. */
export function getClubRosterAge(athlete: Pick<ClubSourceAthlete, 'age' | 'dateOfBirth' | 'DOB'>, snapshotDate = CLUB_ROSTER_SNAPSHOT_DATE): { age: number; source: ClubRosterPlayer['clubRosterProvenance']['age'] } {
    const birth = athlete.dateOfBirth || athlete.DOB;
    if (birth && /^\d{4}-\d{2}-\d{2}/.test(birth) && /^\d{4}-\d{2}-\d{2}/.test(snapshotDate)) {
        const dob = new Date(birth.slice(0, 10) + 'T00:00:00Z');
        const at = new Date(snapshotDate.slice(0, 10) + 'T00:00:00Z');
        if (Number.isFinite(dob.getTime()) && Number.isFinite(at.getTime()) && dob.toISOString().slice(0, 10) === birth.slice(0, 10) && at.toISOString().slice(0, 10) === snapshotDate.slice(0, 10)) {
            const birthdayPassed = at.getUTCMonth() > dob.getUTCMonth() || (at.getUTCMonth() === dob.getUTCMonth() && at.getUTCDate() >= dob.getUTCDate());
            const age = at.getUTCFullYear() - dob.getUTCFullYear() - (birthdayPassed ? 0 : 1);
            if (age >= 14 && age <= 65) return { age, source: 'date-of-birth' };
        }
    }
    if (typeof athlete.age === 'number' && Number.isInteger(athlete.age) && athlete.age >= 14 && athlete.age <= 65) return { age: athlete.age, source: 'source-age' };
    return { age: 25, source: 'game-fallback' };
}
function aliases(athlete: ClubSourceAthlete): string[] {
    return [athlete.name, athlete.fullName, athlete.shortName,
        athlete.firstName && athlete.lastName ? `${athlete.firstName[0]}. ${athlete.lastName}` : undefined,
    ].filter((name): name is string => !!name).map(norm);
}
function authoritative(athlete: ClubSourceAthlete) {
    const byId = getAuthoritativeWorldCupPlayer({ name: athlete.name, externalId: athlete.externalId });
    if (byId) return byId;
    const byName = getAuthoritativeWorldCupPlayer({ name: athlete.name, nationality: sourceNationality(athlete) });
    return byName && (!byName.resolvedSourceId || byName.resolvedSourceId === athlete.externalId) ? byName : undefined;
}
function nationalFlag(countryCode?: string): string | undefined {
    return WORLD_CUP_COUNTRY_CATALOG.find(n => n.countryCode === countryCode)?.flag || NATIONAL_ROSTER_CATALOG.find(n => n.countryCode === countryCode)?.flag || flag(countryCode);
}
/** Resolve prior attributes globally, so a sourced transfer can retain its old game rating, not its old club. */
function indexPriors(seedTeams: Record<string, Team>, snapshot: ClubRosterSnapshot): Map<string, Player> {
    const athletes = [...new Map(snapshot.teams.flatMap(t => t.players).map(p => [p.externalId, p])).values()];
    const ids = new Set(athletes.map(p => p.externalId));
    const byName = new Map<string, ClubSourceAthlete[]>();
    const countries = new Map(athletes.map(p => [p.externalId, rosterCountryCode(sourceNationality(p))]));
    for (const athlete of athletes) for (const name of new Set(aliases(athlete))) {
        byName.set(name, [...(byName.get(name) || []), athlete]);
    }
    const matches = new Map<string, Player[]>();
    for (const team of Object.values(seedTeams).filter(t => t.league !== 'International')) {
        for (const player of team.players) {
            let id = player.externalId;
            if (!id) id = resolveRosterAthlete({ name: player.name, nationality: player.nationality, club: team.name })?.externalId;
            if (!id) {
                // Full/short aliases are accepted only if exactly one candidate matches with known compatible citizenship.
                const country = rosterCountryCode(player.nationality);
                const candidates = (byName.get(norm(player.name)) || []).filter(a => country && countries.get(a.externalId) === country);
                if (candidates.length === 1) id = candidates[0].externalId;
            }
            if (!id || !ids.has(id)) continue;
            matches.set(id, [...(matches.get(id) || []), player]);
        }
    }
    return new Map([...matches].filter(([, values]) => values.length === 1).map(([id, values]) => [id, values[0]]));
}
interface Ownership {
    owner?: string;
    method?: ClubOwnershipMethod;
    reason?: string;
    clubs: string[];
}
function sourceOwnerNameMatches(name: string, team: ClubRosterRecord): boolean {
    return [team.gameName, team.sourceName].some(candidate => norm(candidate) === norm(name));
}
function resolveOwnership(snapshot: ClubRosterSnapshot): Map<string, Ownership> {
    const occurrences = new Map<string, Array<{ team: ClubRosterRecord; athlete: ClubSourceAthlete }>>();
    for (const team of snapshot.teams) for (const athlete of team.players) {
        occurrences.set(athlete.externalId, [...(occurrences.get(athlete.externalId) || []), { team, athlete }]);
    }
    return new Map<string, Ownership>([...occurrences].map(([id, records]): [string, Ownership] => {
        const clubs = [...new Set(records.map(r => r.team.gameName))];
        if (clubs.length === 1) return [id, { owner: clubs[0], method: 'single-source-owner', clubs }];
        const suppliedClubs = [...new Set(records.map(r => authoritative(r.athlete)?.club).filter((v): v is string => !!v))];
        if (suppliedClubs.length) {
            const owners = [...new Set(records.filter(r => suppliedClubs.some(c => sourceOwnerNameMatches(c, r.team))).map(r => r.team.gameName))];
            if (owners.length === 1 && suppliedClubs.length === 1) return [id, { owner: owners[0], method: 'authoritative-club', clubs }];
            // An explicit supplied association outside these records must not be overruled by a stale club roster.
            return [id, { clubs, reason: `Supplied authoritative club ${suppliedClubs.join(', ')} does not identify exactly one source owner.` }];
        }
        const references = records.flatMap(r => {
            const ref = r.athlete.clubReference;
            if (!ref) return [];
            if (typeof ref === 'string') {
                const refId = /\/teams\/(\d+)(?:[/?]|$)/.exec(ref)?.[1];
                return refId ? records.filter(candidate => candidate.team.sourceTeamId === refId).map(candidate => candidate.team.gameName) : [];
            }
            const refId = ref.id || ref.sourceTeamId;
            return records.filter(candidate => refId ? candidate.team.sourceTeamId === String(refId) : !!(ref.name || ref.displayName) && sourceOwnerNameMatches((ref.name || ref.displayName)!, candidate.team)).map(candidate => candidate.team.gameName);
        });
        const owners = [...new Set(references)];
        if (owners.length === 1) return [id, { owner: owners[0], method: 'source-owner-reference', clubs }];
        return [id, { clubs, reason: 'Cross-club source identity has no unambiguous authoritative club or explicit owner reference.' }];
    })) as Map<string, Ownership>;
}
let cachedNationalRoles: Map<string, PlayerPosition> | undefined;
function nationalRoles(): Map<string, PlayerPosition> {
    if (cachedNationalRoles) return cachedNationalRoles;
    const roles = new Map<string, Set<PlayerPosition>>();
    for (const nation of NATIONAL_ROSTER_CATALOG) for (const player of getNationalSquadPool(nation.countryCode)) {
        roles.set(player.externalId, new Set([...(roles.get(player.externalId) || []), player.position]));
    }
    cachedNationalRoles = new Map([...roles].filter(([, values]) => values.size === 1).map(([id, values]) => [id, [...values][0]]));
    return cachedNationalRoles;
}
function derivePlayer(athlete: ClubSourceAthlete, team: ClubRosterRecord, prestige: number, snapshotDate: string, ownership: ClubOwnershipMethod, prior?: Player, sharedRoles = new Map<string, PlayerPosition>()): ClubRosterPlayer | undefined {
    const supplied = authoritative(athlete);
    const suppliedPosition = exactPosition(supplied?.position);
    const sourceExact = exactPosition(athlete.sourcePosition?.abbreviation);
    const broad = broadPosition(athlete);
    const priorRole = prior && (!broad || positionFamily(prior.position) === broad) ? prior.position : undefined;
    const nationalRole = sharedRoles.get(athlete.externalId);
    const slots: Record<string, PlayerPosition[]> = { G: ['GK'], D: ['CB', 'CB', 'LB', 'RB'], M: ['DM', 'CM', 'AM', 'CM'], F: ['ST', 'LW', 'RW', 'ST'] };
    const fallback = broad ? slots[broad][hash(`${CLUB_ROSTER_GAME_DERIVATION_VERSION}:${athlete.externalId}:role`) % slots[broad].length] : undefined;
    // Reuse the national game's existing role before a separate club-only prior so copies cannot diverge.
    // Neither a shared derived role nor a prior is presented as a granular provider fact.
    const position = suppliedPosition || sourceExact || nationalRole || priorRole || fallback;
    if (!position) return undefined;
    const roleSource: ClubRosterPlayer['clubRosterProvenance']['position'] = suppliedPosition ? 'authoritative-national-role' : sourceExact ? 'source-exact' : nationalRole ? 'national-game-role' : priorRole ? 'verified-game-prior' : 'derived-broad-role';
    const clubBirth = athlete.dateOfBirth || athlete.DOB;
    const identitySource = !clubBirth ? resolveRosterAthlete({ name: athlete.name, externalId: athlete.externalId }) : undefined;
    const identityBirth = identitySource?.externalId === athlete.externalId ? identitySource.dateOfBirth : undefined;
    const birth = clubBirth || identityBirth || undefined;
    // A verified DOB is immutable identity evidence; older national age displays are deliberately not copied.
    const { age, source: ageSource } = getClubRosterAge({ ...athlete, dateOfBirth: birth }, snapshotDate);
    const derivedRating = Math.max(45, Math.min(90, prestige - 9 + hash(`${CLUB_ROSTER_GAME_DERIVATION_VERSION}:${athlete.externalId}:rating`) % 13 - 6));
    const rating = prior?.rating ?? derivedRating;
    const nationality = nationalFlag(supplied?.countryCode) || sourceNationality(athlete) || 'Unknown';
    const rawJersey = athlete.jersey == null ? '' : String(athlete.jersey);
    const squadNumber = /^\d{1,3}$/.test(rawJersey) ? Number(rawJersey) : undefined;
    const preservedPriorFields = prior ? ['rating', 'potential', 'growthRate', 'personality', 'wage', 'contractExpires', 'stamina', 'marketValue'].filter(field => prior[field as keyof Player] != null) : [];
    return {
        name: athlete.fullName || athlete.name, sourceName: athlete.name, sourceShortName: athlete.shortName || undefined,
        externalId: athlete.externalId, datasetPlayerId: supplied?.datasetPlayerId, nationalTeamCode: supplied?.countryCode,
        position, rating, age, nationality, currentClub: team.gameName,
        dateOfBirth: birth, squadNumber,
        potential: prior?.potential ?? Math.min(95, rating + Math.max(0, 26 - age)), growthRate: prior?.growthRate ?? 1,
        personality: prior?.personality ?? 'Professional', wage: prior?.wage ?? Math.round(Math.max(1000, (rating - 40) ** 2 * 40) / 1000) * 1000,
        contractExpires: prior?.contractExpires ?? 2 + hash(`${CLUB_ROSTER_GAME_DERIVATION_VERSION}:${athlete.externalId}:contract`) % 4,
        stamina: prior?.stamina ?? Math.max(55, Math.min(95, 85 - Math.max(0, age - 28))),
        marketValue: prior?.marketValue, form: 50, status: { type: 'Available' }, effects: [], condition: 100, isStarter: false,
        clubRosterFacts: clone(athlete),
        clubRosterProvenance: {
            snapshotDate, sourceClub: team.sourceName, sourceTeamId: team.sourceTeamId, sourceLeagueCode: team.sourceLeagueCode,
            ownership, age: ageSource,
            dateOfBirth: clubBirth ? 'current-club-source' : identityBirth ? 'verified-identity-source' : 'missing',
            nationality: nationalFlag(supplied?.countryCode) ? 'authoritative-national-team' : sourceNationality(athlete) ? 'source-citizenship' : 'unknown',
            position: roleSource,
        },
        gameDerived: { version: CLUB_ROSTER_GAME_DERIVATION_VERSION, rating: true, personality: true, wage: true, contract: true, potential: true,
            position: !suppliedPosition && !sourceExact && broad !== 'G', ageFallback: ageSource === 'game-fallback', preservedPriorFields },
    };
}

/** New-career factory ONLY. Never apply a real-world snapshot to saved career membership. */
export function getCurrentClubTeams(seedTeams: Record<string, Team>, snapshot: ClubRosterSnapshot = CLUB_ROSTER_SNAPSHOT): Record<string, ClubRosterTeam> {
    const owners = resolveOwnership(snapshot);
    const priors = indexPriors(seedTeams, snapshot);
    const roles = nationalRoles();
    return Object.fromEntries(Object.entries(seedTeams).map(([key, seed]) => {
        if (seed.league === 'International') return [key, clone(seed) as ClubRosterTeam];
        const records = snapshot.teams.filter(t => t.gameName === seed.name && t.gameLeague === seed.league);
        const source = records.length === 1 ? records[0] : undefined;
        const warnings = [...(source?.warnings || [])];
        const issues: ClubRosterIssue[] = [];
        const seen = new Set<string>();
        const pool: ClubRosterPlayer[] = [];
        for (const athlete of source?.players || []) {
            if (!athlete.name || !athlete.externalId || athlete.externalId !== `espn:${athlete.sourceAthleteId}`) {
                issues.push({ kind: 'invalid-identity', externalId: athlete.externalId, name: athlete.name, reason: 'Source record lacks a valid provider-scoped athlete identity or name.' });
                continue;
            }
            if (seen.has(athlete.externalId)) {
                issues.push({ kind: 'duplicate-entry', externalId: athlete.externalId, name: athlete.name, reason: 'Repeated source identity within this club; only one playable copy retained.' });
                continue;
            }
            seen.add(athlete.externalId);
            const owner = owners.get(athlete.externalId)!;
            if (owner.owner !== source!.gameName) {
                issues.push({ kind: 'ownership-conflict', externalId: athlete.externalId, name: athlete.name, candidateClubs: owner.clubs,
                    reason: owner.owner ? `Verified current owner is ${owner.owner}; excluded from this source club.` : owner.reason! });
                continue;
            }
            const player = derivePlayer(athlete, source!, seed.prestige, snapshot.snapshotDate, owner.method!, priors.get(athlete.externalId), roles);
            if (!player) issues.push({ kind: 'unknown-position', externalId: athlete.externalId, name: athlete.name, reason: 'Unknown source position and no authoritative or verified prior role; retained in raw source evidence, not invented.' });
            else pool.push(player);
        }
        if (!source || !source.players.length) warnings.push(records.length > 1 ? 'Multiple source records match this club; no owner guessed and stale seed not used.' : 'No current sourced squad available; stale seed players were not represented as refreshed.');
        for (const issue of issues) warnings.push(`${issue.name} (${issue.externalId}): ${issue.reason}`);
        if (pool.some(p => p.gameDerived.ageFallback)) warnings.push('Some source records lack usable DOB/age; explicitly game-derived age 25 is used.');
        if (pool.some(p => p.nationality === 'Unknown')) warnings.push('Some source records lack citizenship/national membership; nationality remains Unknown, not the club country.');
        const supported = seed.tactic && seed.tactic.formation in FORMATION_SLOTS;
        const formation: Formation = supported ? seed.tactic.formation : '4-3-3';
        if (!supported) warnings.push(`Unsupported seed formation ${seed.tactic?.formation || '(missing)'}; selection uses supported 4-3-3.`);
        const xi = selectNationalStartingXI(pool, formation);
        const starters = new Set(xi.map(p => p.externalId));
        const players = [...xi, ...pool.filter(p => !starters.has(p.externalId))].map(p => ({ ...p, isStarter: starters.has(p.externalId) }));
        if (xi.length < 11) warnings.push('Fewer than 11 available sourced players or no sourced goalkeeper; kickoff needs validation, no filler added.');
        const completePlayableMembership = !!source?.players.length && !issues.length;
        return [key, {
            ...clone(seed), players, tactic: { ...clone(seed.tactic), formation },
            weeklyWageBill: players.reduce((sum, p) => sum + p.wage, 0),
            clubRosterSource: {
                snapshotDate: snapshot.snapshotDate, kind: 'current-source-club-squad',
                status: !source?.players.length ? 'missing' : completePlayableMembership ? 'sourced' : 'partial',
                sourceTeamId: source?.sourceTeamId, sourceName: source?.sourceName, sourceLeagueCode: source?.sourceLeagueCode,
                sources: clone(source?.sources || []), sourceCoverage: clone(source?.coverage),
                sourcePlayerCount: source?.players.length || 0, playablePlayerCount: players.length, completePlayableMembership,
                gameDerivationVersion: CLUB_ROSTER_GAME_DERIVATION_VERSION,
            }, rosterWarnings: warnings, unresolvedRosterPlayers: issues,
        } satisfies ClubRosterTeam];
    }));
}

/** Returns source evidence, including unknown roles and excluded/conflicting ownership records. */
export function getRawClubRoster(gameName: string, snapshot: ClubRosterSnapshot = CLUB_ROSTER_SNAPSHOT): ClubRosterRecord | undefined {
    const records = snapshot.teams.filter(t => t.gameName === gameName);
    return records.length === 1 ? clone(records[0]) : undefined;
}
/** UI accessor: stored team metadata takes precedence, so an old career is never labelled as refreshed. */
export function getClubRosterSource(team: Team): ClubRosterTeam['clubRosterSource'] | undefined {
    return clone((team as Partial<ClubRosterTeam>).clubRosterSource);
}
export function getClubRosterCoverage(teams?: Record<string, Team>): ClubRosterCoverage {
    const clubs = Object.values(teams || {}).filter(t => t.league !== 'International');
    const sources = clubs.map(team => ({ team, source: getClubRosterSource(team) }));
    return {
        snapshotDate: CLUB_ROSTER_SNAPSHOT_DATE, sourceCoverage: clone(CLUB_ROSTER_SNAPSHOT.coverage), requestedClubs: clubs.length,
        sourcedClubs: sources.filter(r => r.source?.status === 'sourced').length,
        partialClubs: sources.filter(r => r.source?.status === 'partial').length,
        missingClubs: sources.filter(r => !r.source || r.source.status === 'missing').map(r => r.team.name),
        playablePlayers: sources.reduce((sum, r) => sum + (r.source?.playablePlayerCount || 0), 0),
        unresolvedPlayers: clone(clubs.flatMap(t => (t as Partial<ClubRosterTeam>).unresolvedRosterPlayers || [])),
    };
}

export interface CurrentFreeAgentPlayer extends Player {
    externalId: string;
    sourceName: string;
    datasetPlayerId: string;
    dateOfBirth?: string;
    squadNumber?: number;
    freeAgentSource: { kind: 'authoritative-explicit-unattached'; snapshotDate: string; suppliedClub: string; suppliedLeague: string };
    gameDerived: ClubRosterPlayer['gameDerived'];
}
/** Only explicitly unattached supplied players. Unknown or missing clubs never imply free agency. */
export function createCurrentFreeAgentMarket(): CurrentFreeAgentPlayer[] {
    const data = worldCupJson as unknown as { compiled_date: string; squads: Record<string, { players: Array<{ name: string; club: string; league: string; position: string; national_team: string }> }> };
    return Object.values(data.squads).flatMap(squad => squad.players).filter(row => row.club.toLowerCase() === 'unattached' && row.league === 'Free Agent').flatMap(row => {
        const supplied = getAuthoritativeWorldCupPlayer({ name: row.name, nationality: row.national_team, club: row.club });
        if (!supplied || !exactPosition(supplied.position)) return [];
        const source = resolveRosterAthlete({ name: row.name, nationality: row.national_team });
        const athlete: ClubSourceAthlete = {
            externalId: supplied.resolvedSourceId || source?.externalId || supplied.datasetPlayerId,
            sourceAthleteId: source?.sourceAthleteId || supplied.datasetPlayerId,
            name: row.name, fullName: row.name, age: source?.age, dateOfBirth: source?.dateOfBirth,
            citizenship: source?.citizenship, sourcePosition: { abbreviation: exactPosition(supplied.position) },
            jersey: source?.jersey, athleteUrl: source?.athleteUrl, sourceOccurrences: [],
        };
        const player = derivePlayer(athlete, { gameName: 'Unattached', gameLeague: '', sourceTeamId: '', sourceName: 'unattached', sourceLeagueCode: '', sources: [], players: [], warnings: [], coverage: 'authoritative' }, 60, CLUB_ROSTER_SNAPSHOT_DATE, 'authoritative-club');
        if (!player) return [];
        return [{
            name: row.name, sourceName: row.name, externalId: athlete.externalId, datasetPlayerId: supplied.datasetPlayerId,
            nationalTeamCode: supplied.countryCode, nationality: nationalFlag(supplied.countryCode) || row.national_team,
            position: exactPosition(supplied.position)!, rating: player.rating, age: player.age, dateOfBirth: player.dateOfBirth,
            personality: player.personality, wage: player.wage, contractExpires: 0, isStarter: false,
            condition: 100, stamina: player.stamina, potential: player.potential, growthRate: player.growthRate,
            status: { type: 'Available' }, effects: [],
            freeAgentSource: { kind: 'authoritative-explicit-unattached', snapshotDate: data.compiled_date, suppliedClub: row.club, suppliedLeague: row.league },
            gameDerived: { ...player.gameDerived, position: false },
        } as CurrentFreeAgentPlayer];
    });
}
