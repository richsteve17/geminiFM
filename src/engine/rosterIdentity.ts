import nationalSnapshotJson from '../data/nationalRosterSnapshot.json';
import worldCupJson from '../data/worldCup2026Squads.json';
import clubSnapshotJson from '../data/clubRosterSnapshot.json';
import type { PlayerPosition } from '../types';

/** Source identity/appearance evidence, not a game selection or rating assertion. */
export interface SourceAthlete {
    externalId: string;
    sourceAthleteId?: string;
    name: string;
    fullName?: string | null;
    shortName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    citizenship?: string | null;
    citizenshipCountry?: { abbreviation?: string; alternateId?: string } | null;
    sourcePosition?: { id?: string; name?: string; displayName?: string; abbreviation?: string } | null;
    currentClub?: string | null;
    clubSource?: { id: string; name: string; url: string; retrievedAt: string } | null;
    athleteUrl?: string | null;
    jersey?: string | null;
    sourceOccurrences: Array<{
        url: string; competition: string;
        season?: { year?: number; displayName?: string; name?: string; type?: number } | null;
        statistics: Record<string, number | null>;
    }>;
}
export interface RosterAthleteQuery { name: string; nationality?: string; club?: string; externalId?: string }
export interface AuthoritativeWorldCupRow {
    name: string;
    club: string;
    league: string;
    position: string;
    position_category: string;
    national_team: string;
}
export interface AuthoritativeWorldCupPlayer extends AuthoritativeWorldCupRow {
    countryCode: string;
    datasetPlayerId: string;
    resolvedSourceId?: string;
}
export interface AuthoritativeWorldCupSquad {
    country: string;
    squad_size: number;
    players: AuthoritativeWorldCupRow[];
    confederation: string;
    ranking_tier: number;
}
export const AUTHORITATIVE_WORLD_CUP_DATA = worldCupJson as {
    tournament: string; compiled_date: string; total_teams: number; total_players: number;
    squads: Record<string, AuthoritativeWorldCupSquad>;
};
const sourceNations = nationalSnapshotJson.nations;

export function normalizeRosterName(name: string): string {
    return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Presentation codes/flags only. These do not claim additional provider identities or eligibility facts.
const addedCountries: Record<string, { countryCode: string; flag: string }> = {
    Bosnia: { countryCode: 'BIH', flag: '🇧🇦' },
    'Cape Verde': { countryCode: 'CPV', flag: '🇨🇻' },
    Curacao: { countryCode: 'CUW', flag: '🇨🇼' },
    'DR Congo': { countryCode: 'COD', flag: '🇨🇩' },
    Haiti: { countryCode: 'HAI', flag: '🇭🇹' },
    Iraq: { countryCode: 'IRQ', flag: '🇮🇶' },
    Jordan: { countryCode: 'JOR', flag: '🇯🇴' },
    Qatar: { countryCode: 'QAT', flag: '🇶🇦' },
    Uzbekistan: { countryCode: 'UZB', flag: '🇺🇿' },
};
export const WORLD_CUP_COUNTRY_CATALOG = Object.values(AUTHORITATIVE_WORLD_CUP_DATA.squads).map(squad => {
    const source = sourceNations.find(nation => nation.name === squad.country);
    const presentation = source || addedCountries[squad.country];
    if (!presentation) throw new Error(`Missing game country presentation for supplied squad: ${squad.country}`);
    return { country: squad.country, countryCode: presentation.countryCode, flag: presentation.flag };
});
export const WORLD_CUP_COUNTRY_CODES = WORLD_CUP_COUNTRY_CATALOG.map(nation => nation.countryCode);
const countryAliases = new Map<string, string>();
for (const nation of sourceNations) {
    for (const alias of [nation.name, nation.countryCode, nation.sourceName, nation.sourceCountryCode, nation.flag]) countryAliases.set(alias, nation.countryCode);
}
for (const nation of WORLD_CUP_COUNTRY_CATALOG) {
    for (const alias of [nation.country, nation.countryCode, nation.flag]) countryAliases.set(alias, nation.countryCode);
}
for (const [alias, code] of Object.entries({ 'Bosnia and Herzegovina': 'BIH', 'Cabo Verde': 'CPV', 'Curaçao': 'CUW', 'Congo DR': 'COD', 'Democratic Republic of the Congo': 'COD', 'United States': 'USA', 'United States of America': 'USA' })) countryAliases.set(alias, code);
const normalizedCountryAliases = new Map([...countryAliases].filter(([alias]) => normalizeRosterName(alias)).map(([alias, code]) => [normalizeRosterName(alias), code]));
export function rosterCountryCode(value?: string | null): string | undefined {
    return value ? countryAliases.get(value) || normalizedCountryAliases.get(normalizeRosterName(value)) : undefined;
}
export function authoritativeWorldCupPosition(position: string): PlayerPosition {
    return (position === 'CDM' ? 'DM' : position === 'CAM' ? 'AM' : position) as PlayerPosition;
}

interface IdentityEvidence { athlete: SourceAthlete; countries: Set<string>; clubs: Set<string>; aliases: Set<string> }
const evidenceById = new Map<string, IdentityEvidence>();
const evidenceByName = new Map<string, Set<string>>();
function addEvidence(athlete: SourceAthlete, nationality?: string, clubs: string[] = []): void {
    let evidence = evidenceById.get(athlete.externalId);
    if (!evidence) {
        evidence = { athlete, countries: new Set(), clubs: new Set(), aliases: new Set() };
        evidenceById.set(athlete.externalId, evidence);
    } else {
        // Merge by provider ID, never by name. Prefer available source age/DOB and retain source appearances.
        evidence.athlete = {
            ...evidence.athlete,
            age: evidence.athlete.age ?? athlete.age,
            dateOfBirth: evidence.athlete.dateOfBirth || athlete.dateOfBirth,
            sourceOccurrences: [...evidence.athlete.sourceOccurrences, ...athlete.sourceOccurrences]
                .filter((occurrence, index, all) => all.findIndex(item => item.url === occurrence.url) === index),
        };
    }
    for (const value of [nationality, athlete.citizenship, athlete.citizenshipCountry?.abbreviation]) {
        const country = rosterCountryCode(value);
        if (country) evidence.countries.add(country);
    }
    for (const club of [...clubs, athlete.currentClub, athlete.clubSource?.name]) if (club) evidence.clubs.add(normalizeRosterName(club));
    for (const alias of [athlete.name, athlete.fullName, athlete.shortName]) {
        if (!alias) continue;
        const name = normalizeRosterName(alias);
        evidence.aliases.add(name);
        const ids = evidenceByName.get(name) || new Set<string>();
        ids.add(athlete.externalId);
        evidenceByName.set(name, ids);
    }
}
for (const nation of sourceNations) for (const athlete of nation.players) addEvidence(athlete as SourceAthlete, nation.countryCode);
for (const team of clubSnapshotJson.teams) for (const athlete of team.players) addEvidence(athlete as SourceAthlete, undefined, [team.gameName, team.sourceName]);
const copyAthlete = (athlete?: SourceAthlete): SourceAthlete | undefined => athlete ? JSON.parse(JSON.stringify(athlete)) : undefined;

/** Exact normalized full/published short names only; ambiguous identities are not guessed. */
export function resolveRosterAthlete(query: RosterAthleteQuery): SourceAthlete | undefined {
    if (query.externalId) return copyAthlete(evidenceById.get(query.externalId)?.athlete);
    let candidates = [...(evidenceByName.get(normalizeRosterName(query.name)) || [])].map(id => evidenceById.get(id)!);
    const code = rosterCountryCode(query.nationality);
    if (query.nationality) {
        if (!code) return undefined;
        const nationalMatches = candidates.filter(candidate => candidate.countries.has(code));
        // A supplied eligibility fact can differ from an observed citizenship field. An exact
        // full/short name AND explicit source club can still establish identity, not eligibility.
        candidates = nationalMatches.length ? nationalMatches : query.club ? candidates.filter(candidate => candidate.clubs.has(normalizeRosterName(query.club!))) : [];
    }
    if (candidates.length > 1 && query.club) candidates = candidates.filter(candidate => candidate.clubs.has(normalizeRosterName(query.club!)));
    return candidates.length === 1 ? copyAthlete(candidates[0].athlete) : undefined;
}

const suppliedPlayers = WORLD_CUP_COUNTRY_CATALOG.flatMap(nation => {
    const players = AUTHORITATIVE_WORLD_CUP_DATA.squads[nation.country].players;
    return players.map(row => {
        const name = normalizeRosterName(row.name);
        const duplicateName = players.filter(player => normalizeRosterName(player.name) === name).length > 1;
        return { ...row, countryCode: nation.countryCode, datasetPlayerId: `wc2026:${nation.countryCode}:${name}${duplicateName ? `:${normalizeRosterName(row.club)}` : ''}` };
    });
});
const authoritativeByName = new Map<string, AuthoritativeWorldCupPlayer[]>();
const authoritativeById = new Map<string, AuthoritativeWorldCupPlayer[]>();
for (const player of suppliedPlayers) {
    const source = resolveRosterAthlete({ name: player.name, nationality: player.countryCode, club: player.club });
    const annotated: AuthoritativeWorldCupPlayer = { ...player, ...(source ? { resolvedSourceId: source.externalId } : {}) };
    for (const alias of new Set([player.name, ...(source ? [...evidenceById.get(source.externalId)!.aliases] : [])].map(normalizeRosterName))) {
        authoritativeByName.set(alias, [...(authoritativeByName.get(alias) || []), annotated]);
    }
    for (const id of [player.datasetPlayerId, source?.externalId].filter(Boolean) as string[]) authoritativeById.set(id, [...(authoritativeById.get(id) || []), annotated]);
}
/** The supplied football row is returned verbatim, plus stable identity/provenance fields. */
export function getAuthoritativeWorldCupPlayer(query: RosterAthleteQuery): AuthoritativeWorldCupPlayer | undefined {
    let candidates = query.externalId ? authoritativeById.get(query.externalId) || [] : authoritativeByName.get(normalizeRosterName(query.name)) || [];
    if (query.nationality) {
        const code = rosterCountryCode(query.nationality);
        candidates = candidates.filter(player => player.countryCode === code);
    }
    if (candidates.length > 1 && query.club) candidates = candidates.filter(player => normalizeRosterName(player.club) === normalizeRosterName(query.club!));
    return candidates.length === 1 ? { ...candidates[0] } : undefined;
}
export function getAuthoritativeWorldCupSquad(country: string): AuthoritativeWorldCupPlayer[] | undefined {
    const code = rosterCountryCode(country);
    if (!WORLD_CUP_COUNTRY_CODES.includes(code || '')) return undefined;
    return suppliedPlayers.filter(player => player.countryCode === code).map(player => getAuthoritativeWorldCupPlayer({ name: player.name, nationality: code, club: player.club })!);
}
