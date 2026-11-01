import type { ContractTerms, Player, PlayerStats, Team } from '../types';

/** A persisted contract role promise. Selection remains manager-controlled, so a promise never creates a twelfth starter. */
export type FreeAgentSquadRole = 'key-player' | 'rotation' | 'prospect';

export interface FreeAgentContractTerms extends ContractTerms {
    role?: FreeAgentSquadRole;
}

export type FreeAgentEligibilityReason =
    | 'eligible'
    | 'not-free-agent'
    | 'player-unavailable'
    | 'player-already-signed'
    | 'squad-full';

export interface FreeAgentEligibility {
    eligible: boolean;
    reason: FreeAgentEligibilityReason;
    message: string;
    /** Free agents are eligible irrespective of the domestic transfer-window state. */
    allowedOutsideTransferWindow: true;
    /** An unattached player has no selling club. */
    sellingClubFee: 0;
}

export interface FreeAgentEligibilityInput {
    player: Player;
    squadPlayers: Player[];
    /** Kept in the API deliberately: a closed window must not make an eligible free agent unavailable. */
    transferWindowOpen: boolean;
    maxSquadSize?: number;
}

export interface FreeAgentSigningInput {
    team: Team;
    market: Player[];
    /** The player selected when the negotiation began. The canonical market entry is signed. */
    player: Player;
    /** Only the final accepted package may be committed. */
    terms: FreeAgentContractTerms;
    negotiationAccepted: boolean;
    /** An explicit board wage cap. If omitted, a one-season cash-runway budget is used. */
    weeklyWageBudget?: number;
    /** An explicit signing-budget cap. If omitted, the club transfer budget (or its legacy fallback) is used. */
    signingBonusBudget?: number;
    maxSquadSize?: number;
}

export type FreeAgentSigningFailureReason =
    | 'terms-not-accepted'
    | 'market-unavailable'
    | 'not-free-agent'
    | 'player-unavailable'
    | 'player-already-signed'
    | 'squad-full'
    | 'invalid-contract-terms'
    | 'insufficient-signing-budget'
    | 'insufficient-wage-budget';

export interface FreeAgentSigningFailure {
    ok: false;
    reason: FreeAgentSigningFailureReason;
    message: string;
    team: Team;
    market: Player[];
    costs: {
        sellingClubFee: 0;
        signingBonus: 0;
        weeklyWage: 0;
        weeklyWageBillAfter: number;
    };
}

export type SignedFreeAgent = Player & {
    /** Saved with the player so an agreed role is not lost after reload. */
    freeAgencyRole: FreeAgentSquadRole;
};

export interface FreeAgentSigningSuccess {
    ok: true;
    team: Team;
    market: Player[];
    player: SignedFreeAgent;
    acceptedTerms: Required<FreeAgentContractTerms>;
    costs: {
        sellingClubFee: 0;
        signingBonus: number;
        weeklyWage: number;
        weeklyWageBillAfter: number;
    };
}

export type FreeAgentSigningResult = FreeAgentSigningSuccess | FreeAgentSigningFailure;

export const DEFAULT_MAX_SQUAD_SIZE = 25;

const freeAgentLabels = new Set(['', 'free agent', 'free-agent', 'unattached']);

const normalizedText = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const playerKey = (player: Pick<Player, 'name'>): string => normalizedText(player.name);

const nonNegativeInteger = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
};

const nonNegativeMoney = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
};

const boundedRating = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(10, numeric)) : 0;
};

const roundRating = (value: number) => Math.round(value * 100) / 100;

const failure = (
    reason: FreeAgentSigningFailureReason,
    message: string,
    team: Team,
    market: Player[],
): FreeAgentSigningFailure => ({
    ok: false,
    reason,
    message,
    team,
    market,
    costs: {
        sellingClubFee: 0,
        signingBonus: 0,
        weeklyWage: 0,
        weeklyWageBillAfter: getCurrentWeeklyWageBill(team),
    },
});

/** Treat legacy blank club values and the scout's explicit `Free Agent` label as unattached. */
export function isFreeAgent(player: Pick<Player, 'currentClub'>): boolean {
    return freeAgentLabels.has(normalizedText(player.currentClub));
}

/**
 * A market identity intentionally follows the game’s existing name-based removal behavior.
 * It is centralized so searching, removal, and duplicate prevention cannot disagree.
 */
export function sameMarketPlayer(left: Pick<Player, 'name'>, right: Pick<Player, 'name'>): boolean {
    return playerKey(left) === playerKey(right);
}

/** Returns a complete usable seasonal stats record for old saves and generated scouting entries. */
export function normalizePlayerStats(stats?: PlayerStats): PlayerStats {
    const appearances = nonNegativeInteger(stats?.appearances);
    const suppliedAverage = boundedRating(stats?.averageRating);
    const suppliedRatingSum = Number(stats?.ratingSum);
    const ratingSum = appearances === 0
        ? 0
        : Number.isFinite(suppliedRatingSum) && suppliedRatingSum >= 0
            ? roundRating(suppliedRatingSum)
            : roundRating(suppliedAverage * appearances);

    return {
        appearances,
        goals: nonNegativeInteger(stats?.goals),
        assists: nonNegativeInteger(stats?.assists),
        cleanSheets: nonNegativeInteger(stats?.cleanSheets),
        yellowCards: nonNegativeInteger(stats?.yellowCards),
        redCards: nonNegativeInteger(stats?.redCards),
        averageRating: appearances === 0 ? 0 : roundRating(ratingSum / appearances),
        ratingSum,
    };
}

/** Derive the actual weekly obligation from the current squad rather than relying on a stale cached bill. */
export function getCurrentWeeklyWageBill(team: Pick<Team, 'players'>): number {
    return team.players.reduce((total, player) => total + (nonNegativeMoney(player.wage) ?? 0), 0);
}

/**
 * The current UI displays `70% of balance` when old saves lack a transfer budget. Keep that
 * legacy fallback here, while never allowing a signing bonus to exceed cash on hand.
 */
export function getFreeAgentSigningBudget(team: Pick<Team, 'balance' | 'transferBudget'>): number {
    const balance = nonNegativeMoney(team.balance) ?? 0;
    const configuredBudget = nonNegativeMoney(team.transferBudget);
    const legacyBudget = Math.floor(balance * 0.7);
    return Math.min(balance, configuredBudget ?? legacyBudget);
}

/**
 * A conservative default for old saves without a wage-cap field: the club may not add wages it
 * cannot carry for a full season after the bonus, plus its known recurring broadcast income.
 * Callers can pass an explicit board cap to `signFreeAgent` instead.
 */
export function getFreeAgentWeeklyWageBudget(
    team: Pick<Team, 'balance' | 'players' | 'weeklyBroadcastRevenue'>,
    signingBonus = 0,
): number {
    const balanceAfterBonus = Math.max(0, (nonNegativeMoney(team.balance) ?? 0) - (nonNegativeMoney(signingBonus) ?? 0));
    const recurringBroadcast = nonNegativeMoney(team.weeklyBroadcastRevenue) ?? 0;
    return Math.max(getCurrentWeeklyWageBill(team), Math.floor(balanceAfterBonus / 52) + recurringBroadcast);
}

export function getFreeAgentEligibility({
    player,
    squadPlayers,
    transferWindowOpen: _transferWindowOpen,
    maxSquadSize = DEFAULT_MAX_SQUAD_SIZE,
}: FreeAgentEligibilityInput): FreeAgentEligibility {
    const common = { allowedOutsideTransferWindow: true as const, sellingClubFee: 0 as const };
    if (!isFreeAgent(player)) {
        return { ...common, eligible: false, reason: 'not-free-agent', message: `${player.name} is still attached to a club.` };
    }
    if (player.status.type !== 'Available') {
        return { ...common, eligible: false, reason: 'player-unavailable', message: `${player.name} is not currently available to join the squad.` };
    }
    if (squadPlayers.some(squadPlayer => sameMarketPlayer(squadPlayer, player))) {
        return { ...common, eligible: false, reason: 'player-already-signed', message: `${player.name} is already in this squad.` };
    }
    if (squadPlayers.length >= Math.max(1, Math.floor(maxSquadSize))) {
        return { ...common, eligible: false, reason: 'squad-full', message: `The squad is full (${maxSquadSize} players).` };
    }
    return { ...common, eligible: true, reason: 'eligible', message: `${player.name} can be signed as a free agent.` };
}

/** Convert a released player into a reusable free-market record without inventing a new catalog entry. */
export function toFreeAgent(player: Player): Player {
    return {
        ...player,
        currentClub: 'Free Agent',
        contractExpires: 0,
        isStarter: false,
        stats: normalizePlayerStats(player.stats),
    };
}

/** Add released players to the durable market once, excluding players already in any active squad. */
export function mergeFreeAgentsIntoMarket(market: Player[], releasedPlayers: Player[], squadPlayers: Player[] = []): Player[] {
    const occupiedKeys = new Set(squadPlayers.map(playerKey));
    const marketKeys = new Set(market.map(playerKey));
    const additions: Player[] = [];

    for (const candidate of releasedPlayers.map(toFreeAgent)) {
        const key = playerKey(candidate);
        if (!key || occupiedKeys.has(key) || marketKeys.has(key)) continue;
        additions.push(candidate);
        marketKeys.add(key);
    }
    return [...market, ...additions];
}

const acceptedTerms = (terms: FreeAgentContractTerms): Required<FreeAgentContractTerms> | null => {
    const wage = nonNegativeMoney(terms.wage);
    const signingBonus = nonNegativeMoney(terms.signingBonus);
    const performanceBonus = nonNegativeMoney(terms.performanceBonus);
    const length = Number(terms.length);
    const role = terms.role ?? 'rotation';
    const validRole: FreeAgentSquadRole[] = ['key-player', 'rotation', 'prospect'];

    if (
        wage === null ||
        signingBonus === null ||
        performanceBonus === null ||
        !Number.isInteger(length) ||
        length < 1 ||
        length > 7 ||
        !validRole.includes(role)
    ) {
        return null;
    }
    return { wage, signingBonus, performanceBonus, length, bonusType: terms.bonusType, role };
};

/**
 * Atomically commit a negotiated free-agent contract. This function has no React or storage
 * dependency: callers can put the returned `team` and `market` in the same save snapshot.
 */
export function signFreeAgent(input: FreeAgentSigningInput): FreeAgentSigningResult {
    const { team, market, player, terms, negotiationAccepted, maxSquadSize } = input;
    if (!negotiationAccepted) {
        return failure('terms-not-accepted', 'Only an accepted negotiation can be committed.', team, market);
    }

    const canonicalMarketPlayer = market.find(candidate => sameMarketPlayer(candidate, player));
    if (!canonicalMarketPlayer) {
        const alreadySigned = team.players.some(squadPlayer => sameMarketPlayer(squadPlayer, player));
        return failure(
            alreadySigned ? 'player-already-signed' : 'market-unavailable',
            alreadySigned ? `${player.name} has already been signed.` : `${player.name} is no longer on the free-agent market.`,
            team,
            market,
        );
    }

    const eligibility = getFreeAgentEligibility({
        player: canonicalMarketPlayer,
        squadPlayers: team.players,
        transferWindowOpen: false,
        maxSquadSize,
    });
    if (!eligibility.eligible) {
        const reason: FreeAgentSigningFailureReason = eligibility.reason === 'eligible'
            ? 'market-unavailable'
            : eligibility.reason;
        return failure(reason, eligibility.message, team, market);
    }

    const contract = acceptedTerms(terms);
    if (!contract) {
        return failure('invalid-contract-terms', 'The accepted contract has invalid financial, length, or role terms.', team, market);
    }

    const signingBudget = input.signingBonusBudget === undefined
        ? getFreeAgentSigningBudget(team)
        : Math.max(0, nonNegativeMoney(input.signingBonusBudget) ?? 0);
    if (contract.signingBonus > signingBudget || contract.signingBonus > (nonNegativeMoney(team.balance) ?? 0)) {
        return failure('insufficient-signing-budget', 'The club cannot fund this signing bonus from its available budget.', team, market);
    }

    const currentWageBill = getCurrentWeeklyWageBill(team);
    const weeklyWageBudget = input.weeklyWageBudget === undefined
        ? getFreeAgentWeeklyWageBudget(team, contract.signingBonus)
        : Math.max(0, nonNegativeMoney(input.weeklyWageBudget) ?? 0);
    const weeklyWageBillAfter = currentWageBill + contract.wage;
    if (weeklyWageBillAfter > weeklyWageBudget) {
        return failure('insufficient-wage-budget', 'The club cannot fit this weekly wage into its wage budget.', team, market);
    }

    const signedPlayer: SignedFreeAgent = {
        ...canonicalMarketPlayer,
        currentClub: team.name,
        status: { type: 'Available' },
        isStarter: false,
        wage: contract.wage,
        contractExpires: contract.length,
        contractIncentives: {
            performanceBonus: contract.performanceBonus,
            bonusType: contract.bonusType,
        },
        stats: normalizePlayerStats(canonicalMarketPlayer.stats),
        freeAgencyRole: contract.role,
    };
    const nextMarket = market.filter(candidate => !sameMarketPlayer(candidate, canonicalMarketPlayer));
    const nextTeam: Team = {
        ...team,
        players: [...team.players, signedPlayer],
        balance: (nonNegativeMoney(team.balance) ?? 0) - contract.signingBonus,
        transferBudget: Math.max(0, signingBudget - contract.signingBonus),
        weeklyWageBill: weeklyWageBillAfter,
    };

    return {
        ok: true,
        team: nextTeam,
        market: nextMarket,
        player: signedPlayer,
        acceptedTerms: contract,
        costs: {
            sellingClubFee: 0,
            signingBonus: contract.signingBonus,
            weeklyWage: contract.wage,
            weeklyWageBillAfter,
        },
    };
}
