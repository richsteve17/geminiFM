
export enum AppScreen {
    START_SCREEN,
    CREATE_MANAGER,
    TEAM_SELECTION,
    NATIONAL_TEAM_SELECTION,
    JOB_CENTRE,
    JOB_INTERVIEW,
    GAMEPLAY,
    TRANSFERS,
    SCOUTING, // New
    PRESS_CONFERENCE, // New
    PLAYER_TALK,
    PLAYER_NEGOTIATION,
    NEWS_FEED,
}

export type GameMode = 'Club' | 'WorldCup' | 'ChampionsLeague';

export type PlayerPersonality = 'Ambitious' | 'Loyal' | 'Mercenary' | 'Young Prospect' | 'Leader' | 'Professional' | 'Volatile';

export type PlayerStatus = 
    | { type: 'Available' }
    | { type: 'On International Duty'; until: number }
    | { type: 'Injured'; weeks: number }
    | { type: 'Suspended'; until: number } // New Status
    | { type: 'SentOff' }; // Temporary In-Match Status

export type PlayerEffect = 
    | { type: 'PostTournamentMorale'; morale: 'Winner' | 'FiredUp' | 'Disappointed'; message: string; until: number }
    | { type: 'BadChemistry'; with: string; message: string; until: number };

export interface Player {
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  age: number;
  nationality: string; // Using string for emoji flags
  personality: PlayerPersonality;
  wage: number;
  status: PlayerStatus;
  effects: PlayerEffect[];
  contractExpires: number; // Years left
  isStarter: boolean; // New field for lineup management
  matchCard?: 'yellow' | 'red' | null; // Track cards within a single match
  scoutingReport?: string; // For scouted players
  marketValue?: number;
}

export type Formation = '4-4-2' | '4-3-3' | '5-3-2' | '3-5-2';
export type Mentality = 'All-Out Attack' | 'Attacking' | 'Balanced' | 'Defensive' | 'Park the Bus';
export type ChairmanPersonality = 'Traditionalist' | 'Ambitious Tycoon' | 'Moneyball Advocate' | 'Fan-Focused Owner';


export interface Tactic {
  formation: Formation;
  mentality: Mentality;
}

export type LeagueTier = 'Premier League' | 'Championship' | 'La Liga' | 'Serie A' | 'Bundesliga' | 'Ligue 1' | 'MLS' | 'International' | 'Champions League';

export interface Team {
  name: string;
  league: LeagueTier;
  players: Player[];
  tactic: Tactic;
  prestige: number;
  chairmanPersonality: ChairmanPersonality;
  group?: string; // For World Cup (A-L)
}

export interface NationalTeam extends Omit<Team, 'chairmanPersonality' | 'players' | 'league'> {
    countryCode: string;
    players: Player[];
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
  score?: string; // "2-1"
  stage?: TournamentStage; // For WC / UCL
  isKnockout?: boolean;
  aggregateScore?: string; // "Agg: 4-3"
  firstLegScore?: string; // For tracking
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
  group?: string; // For WC Group tables
}

// --- NEW MATCH ENGINE TYPES ---

export interface MatchEvent {
    id: number;
    minute: number;
    type: 'goal' | 'sub' | 'injury' | 'card' | 'whistle' | 'commentary';
    teamName?: string;
    player?: string;
    description: string;
    scoreAfter?: string; // "1-0"
    cardType?: 'yellow' | 'red'; // Detail for card events
}

export interface MatchState {
    currentMinute: number; // 0 to 90 (or 120)
    homeScore: number;
    awayScore: number;
    events: MatchEvent[];
    isFinished: boolean;
    penaltyWinner?: string;
    subsUsed: { home: number; away: number }; // Track subs
    momentum: number; // -10 (Away Dominating) to +10 (Home Dominating)
    tacticalAnalysis: string; // "Home team pressing high but leaving gaps."
}


export enum GameState {
    PRE_MATCH = 'PRE_MATCH',
    SIMULATING = 'SIMULATING',
    PAUSED = 'PAUSED', // Replaces HALF_TIME, used for HT, 60', 75' stops
    POST_MATCH = 'POST_MATCH'
}

export type TouchlineShout = 'Encourage' | 'Demand More' | 'Tighten Up' | 'Push Forward';

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

export interface PressConference {
    questions: string[];
    answers: string[];
    currentQuestionIndex: number;
    context: string; // "Won against Rivals", "Lost heavy"
}

export interface PlayerTalk {
    player: Player;
    questions: string[];
    answers: string[];
    currentQuestionIndex: number;
    context: 'transfer' | 'renewal';
}

export interface ContractOffer {
    player: Player;
    wage: number;
    years: number;
}

export interface NewsItem {
    id: number;
    week: number;
    title: string;
    body: string;
    type: 'call-up' | 'tournament-result' | 'player-return' | 'chemistry-rift' | 'contract-renewal' | 'player-departure' | 'injury' | 'suspension' | 'scout-report' | 'press';
}

export interface ExperienceLevel {
    id: string;
    label: string;
    description: string;
    prestigeCap: number; // Max prestige of teams likely to hire you
    prestigeMin: number;
}
