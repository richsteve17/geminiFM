
export enum AppScreen {
    START_SCREEN,
    CREATE_MANAGER,
    TEAM_SELECTION,
    NATIONAL_TEAM_SELECTION,
    JOB_CENTRE,
    JOB_INTERVIEW,
    GAMEPLAY,
    TRANSFERS,
    SCOUTING,
    PRESS_CONFERENCE,
    PLAYER_TALK,
    PLAYER_NEGOTIATION,
    NEWS_FEED,
    TRANSFER_CENTER,
    HONORS_BOARD,
}

export type GameMode = 'Club' | 'WorldCup' | 'ChampionsLeague';

export type PlayerPersonality = 'Ambitious' | 'Loyal' | 'Mercenary' | 'Young Prospect' | 'Leader' | 'Professional' | 'Volatile';

export type PlayerStatus = 
    | { type: 'Available' }
    | { type: 'On International Duty'; until: number }
    | { type: 'Injured'; weeks: number }
    | { type: 'Suspended'; until: number }
    | { type: 'SentOff' };

export type PlayerEffect = 
    | { type: 'PostTournamentMorale'; morale: 'Winner' | 'FiredUp' | 'Disappointed'; message: string; until: number }
    | { type: 'BadChemistry'; with: string; message: string; until: number }
    | { type: 'PromiseBroken'; message: string; until: number }
    | { type: 'InternationalRift'; severity: 'minor' | 'moderate' | 'serious' | 'mild'; with: string; message: string; until: number }
    | { type: 'TeammateBond'; with: string; message: string; until: number };

export type PlayerPosition = 
    | 'GK' 
    | 'LB' | 'CB' | 'RB' | 'LWB' | 'RWB' 
    | 'DM' | 'CM' | 'AM' | 'LM' | 'RM' 
    | 'LW' | 'RW' | 'ST' | 'CF';

export type ContractBonusType = 'goal' | 'cleanSheet' | 'appearance';

export interface ContractTerms {
    wage: number;
    length: number;
    signingBonus: number;
    performanceBonus: number;
    bonusType: ContractBonusType;
}

export interface PlayerStats {
    appearances: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    yellowCards: number;
    redCards: number;
    averageRating: number;
    ratingSum: number;
}

export interface HistoricalSeasonStats {
    year: number;
    teamName: string;
    appearances: number;
    goals: number;
    cleanSheets: number;
    averageRating: number;
}

export interface Player {
  name: string;
  position: PlayerPosition;
  rating: number;
  age: number;
  nationality: string;
  potential: number; // 0-100, how good they can become
  growthRate: number; // Modifier for development speed
  form: number; // Current form based on recent performance, affects rating temporarily
  personality: PlayerPersonality;
  wage: number;
  status: PlayerStatus;
  effects: PlayerEffect[];
  contractExpires: number;
  isStarter: boolean;
  matchCard?: 'yellow' | 'red' | null;
  scoutingReport?: string;
  marketValue?: number;
  currentClub?: string; // New field for scouting flavor
  contractIncentives?: {
    performanceBonus: number;
    bonusType: ContractBonusType;
  };
  condition: number; // 0 to 100
  stamina?: number; // 0-100, affects how slowly they tire during a match
  transferRequested?: boolean;
  stats?: PlayerStats;
  history?: HistoricalSeasonStats[];
}

export type Formation = '4-4-2' | '4-3-3' | '5-3-2' | '3-5-2' | '4-2-3-1' | '4-5-1';
export type Mentality = 'All-Out Attack' | 'Attacking' | 'Balanced' | 'Defensive' | 'Park the Bus';
export type ChairmanPersonality = 'Traditionalist' | 'Ambitious Tycoon' | 'Moneyball Advocate' | 'Fan-Focused Owner' | 'Football Federation';

export interface Tactic {
  formation: Formation;
  mentality: Mentality;
}

export type LeagueTier = 'Premier League' | 'Championship' | 'La Liga' | 'Serie A' | 'Bundesliga' | 'Ligue 1' | 'MLS' | 'International' | 'Champions League';

export interface PromiseData {
    id: string;
    description: string; // "Sign Mo Salah"
    deadlineWeek: number;
    status: 'pending' | 'kept' | 'broken';
    playerInvolved?: string; // "V. van Dijk"
}

export interface Team {
  name: string;
  league: LeagueTier;
  players: Player[];
  tactic: Tactic;
  prestige: number;
  chairmanPersonality: ChairmanPersonality;
  group?: string;
  balance: number; 
  weeklyWageBill: number;
  matchDayRevenue: number;
  transferBudget: number;
  objectives: string[];
  activePromises: PromiseData[]; // MEMORY SYSTEM
  weeklyBroadcastRevenue: number;
  colors?: { // Dynamic Theming
      primary: string;
      secondary: string;
      text: string;
      third?: string; // The "Unhinged" Kit Option
  };
}

export interface NationalTeam extends Omit<Team, 'chairmanPersonality' | 'players' | 'league' | 'balance' | 'objectives' | 'activePromises' | 'colors'> {
    countryCode: string;
    players: Player[];
    objectives?: string[];
}

export interface Tournament {
    name: string;
    host: string;
    year: number;
    teams: string[];
}

export type TournamentStage = 'Group Stage' | 'League Phase' | 'Play-offs' | 'Round of 32' | 'Round of 16' | 'Quarter Final' | 'Semi Final' | 'Final';

export interface Fixture {
  id: string;
  week: number;
  league: LeagueTier;
  homeTeam: string;
  awayTeam: string;
  played: boolean;
  score?: string;
  stage?: TournamentStage;
  isKnockout?: boolean;
  aggregateScore?: string;
  firstLegScore?: string;
  penaltyWinner?: 'home' | 'away';
}

export interface LeagueTableEntry {
  teamName: string;
  league: LeagueTier;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  group?: string;
}

export interface MatchEvent {
    id: number;
    minute: number;
    type: 'goal' | 'sub' | 'injury' | 'card' | 'whistle' | 'commentary';
    teamName?: string;
    player?: string;
    description: string;
    scoreAfter?: string;
    cardType?: 'yellow' | 'red';
}

export interface MatchState {
    currentMinute: number;
    homeScore: number;
    awayScore: number;
    events: MatchEvent[];
    isFinished: boolean;
    penaltyWinner?: string;
    subsUsed: { home: number; away: number };
    momentum: number;
    tacticalAnalysis: string;
}

export enum GameState {
    PRE_MATCH = 'PRE_MATCH',
    SIMULATING = 'SIMULATING',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    POST_MATCH = 'POST_MATCH'
}

export type TouchlineShout = string;

export interface TacticalShout {
    id: string;
    label: string;
    description: string;
    effect: string;
}

export interface Job {
    teamName: string;
    prestige: number;
    chairmanPersonality: ChairmanPersonality;
}

export interface Interview {
    teamName: string;
    questions: string[];
    answers: string[];
    currentQuestionIndex: number;
    chairmanPersonality: ChairmanPersonality;
}

export interface PlayerTalk {
    player: Player;
    questions: string[];
    answers: string[];
    currentQuestionIndex: number;
    context: 'transfer' | 'renewal';
    teammates?: string[];
    negotiationHistory: { offer: ContractTerms, response: string }[];
    contractOffer?: { wage: number; duration: number; };
}

export interface NegotiationResult {
    decision: 'accepted' | 'rejected' | 'counter';
    reasoning: string;
    counterOffer?: ContractTerms;
    extractedPromises?: string[]; // New field for extracted text promises
}

export interface NewsItem {
    id: number;
    week: number;
    title: string;
    body: string;
    type: 'call-up' | 'tournament-result' | 'player-return' | 'chemistry-rift' | 'contract-renewal' | 'player-departure' | 'injury' | 'suspension' | 'scout-report' | 'press' | 'finance' | 'promise-broken' | 'serious-rift' | 'teammate-bond' | 'job-offer';
    riftDecision?: {
        riftPlayerA: string;
        riftPlayerB: string;
        choice?: 'bench-a' | 'bench-b' | 'risk-it';
        resultEffect?: string;
    };
    jobOfferDecision?: {
        teamName: string;
        choice?: 'accept' | 'decline';
    };
}

export interface ExperienceLevel {
    id: string;
    label: string;
    description: string;
    prestigeCap: number;
    prestigeMin: number;
}

export interface TransferBid {
    id: string;
    player: Player;
    buyingClub: string;
    offeredFee: number;
    marketValue: number;
    weeksPending: number;
    history: { sender: 'manager' | 'director'; message: string }[];
    status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
}

export interface CareerHistoryEntry {
    year: number;
    teamName: string;
    league: string;
    finalPosition: string;
    trophies: string[];
}
