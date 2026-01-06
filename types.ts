
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
    | { type: 'BadChemistry'; with: string; message: string; until: number };

export type PlayerPosition = 
    | 'GK' 
    | 'LB' | 'CB' | 'RB' | 'LWB' | 'RWB' 
    | 'DM' | 'CM' | 'AM' | 'LM' | 'RM' 
    | 'LW' | 'RW' | 'ST' | 'CF';

export interface Player {
  name: string;
  position: PlayerPosition;
  rating: number;
  age: number;
  nationality: string;
  personality: PlayerPersonality;
  wage: number;
  status: PlayerStatus;
  effects: PlayerEffect[];
  contractExpires: number;
  isStarter: boolean;
  matchCard?: 'yellow' | 'red' | null;
  scoutingReport?: string;
  marketValue?: number;
  condition: number; // 0 to 100
}

export type Formation = '4-4-2' | '4-3-3' | '5-3-2' | '3-5-2' | '4-2-3-1' | '4-5-1';
export type Mentality = 'All-Out Attack' | 'Attacking' | 'Balanced' | 'Defensive' | 'Park the Bus';
export type ChairmanPersonality = 'Traditionalist' | 'Ambitious Tycoon' | 'Moneyball Advocate' | 'Fan-Focused Owner' | 'Football Federation';

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
  group?: string;
  balance: number; 
}

export interface NationalTeam extends Omit<Team, 'chairmanPersonality' | 'players' | 'league' | 'balance'> {
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
  score?: string;
  stage?: TournamentStage;
  isKnockout?: boolean;
  aggregateScore?: string;
  firstLegScore?: string;
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
    PAUSED = 'PAUSED',
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

export interface NewsItem {
    id: number;
    week: number;
    title: string;
    body: string;
    type: 'call-up' | 'tournament-result' | 'player-return' | 'chemistry-rift' | 'contract-renewal' | 'player-departure' | 'injury' | 'suspension' | 'scout-report' | 'press' | 'finance';
}

export interface ExperienceLevel {
    id: string;
    label: string;
    description: string;
    prestigeCap: number;
    prestigeMin: number;
}
