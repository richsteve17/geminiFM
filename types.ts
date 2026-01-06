
export enum AppScreen {
    START_SCREEN,
    CREATE_MANAGER,
    TEAM_SELECTION,
    NATIONAL_TEAM_SELECTION,
    JOB_CENTRE,
    JOB_INTERVIEW,
    GAMEPLAY,
    TRANSFERS,
    PLAYER_TALK,
    PLAYER_NEGOTIATION,
    NEWS_FEED,
}

export type PlayerPersonality = 'Ambitious' | 'Loyal' | 'Mercenary' | 'Young Prospect';

export type PlayerStatus = 
    | { type: 'Available' }
    | { type: 'On International Duty'; until: number };

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
}

export type Formation = '4-4-2' | '4-3-3' | '5-3-2' | '3-5-2';
export type Mentality = 'All-Out Attack' | 'Attacking' | 'Balanced' | 'Defensive' | 'Park the Bus';
export type ChairmanPersonality = 'Traditionalist' | 'Ambitious Tycoon' | 'Moneyball Advocate' | 'Fan-Focused Owner';


export interface Tactic {
  formation: Formation;
  mentality: Mentality;
}

export type LeagueTier = 'Premier League' | 'Championship' | 'La Liga' | 'Serie A' | 'Bundesliga' | 'Ligue 1' | 'MLS' | 'International';

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

export type TournamentStage = 'Group Stage' | 'Round of 32' | 'Round of 16' | 'Quarter Final' | 'Semi Final' | 'Final';

export interface Fixture {
  id: string;
  week: number;
  league: LeagueTier;
  homeTeam: string;
  awayTeam: string;
  played: boolean;
  score?: string; // "2-1"
  stage?: TournamentStage; // For WC
  isKnockout?: boolean;
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

export interface MatchHalfResult {
    score: string;
    homeGoals: number;
    awayGoals: number;
    commentary: string;
}

export interface MatchState {
    firstHalfResult: MatchHalfResult | null;
    secondHalfResult: MatchHalfResult | null;
    finalScore: string | null;
    fullTimeCommentary: string | null;
    penaltyWinner?: string; // Name of winning team if penalties occurred
}


export enum GameState {
    PRE_MATCH = 'PRE_MATCH',
    SIMULATING = 'SIMULATING',
    HALF_TIME = 'HALF_TIME',
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
    type: 'call-up' | 'tournament-result' | 'player-return' | 'chemistry-rift' | 'contract-renewal' | 'player-departure';
}

export interface ExperienceLevel {
    id: string;
    label: string;
    description: string;
    prestigeCap: number; // Max prestige of teams likely to hire you
    prestigeMin: number;
}
