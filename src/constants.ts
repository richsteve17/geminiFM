
import type { Team, Tactic, ChairmanPersonality, Player, PlayerPersonality, TouchlineShout, ExperienceLevel, PlayerPosition, Formation } from './types';
import { generateName } from './utils';

export const FORMATIONS: Tactic['formation'][] = ['4-4-2', '4-3-3', '5-3-2', '3-5-2', '4-2-3-1', '4-5-1'];
export const MENTALITIES: Tactic['mentality'][] = ['All-Out Attack', 'Attacking', 'Balanced', 'Defensive', 'Park the Bus'];

export const CHAIRMAN_PERSONALITIES: Record<ChairmanPersonality, string> = {
    'Traditionalist': 'Values defensive solidity and fiscal responsibility.',
    'Ambitious Tycoon': 'Demands attacking football and immediate success.',
    'Moneyball Advocate': 'Focuses on data, analytics, and smart spending.',
    'Fan-Focused Owner': 'Wants exciting play and a strong bond with supporters.',
    'Football Federation': 'Governing body focused on national glory.'
};

export const PLAYER_PERSONALITIES: Record<PlayerPersonality, string> = {
    'Ambitious': 'Wants to win major trophies.',
    'Loyal': 'Strong connection to the club.',
    'Mercenary': 'Motivated by high wages.',
    'Young Prospect': 'Needs playing time to grow.',
    'Leader': 'Keeps morale high.',
    'Professional': 'Trains hard, no drama.',
    'Volatile': 'Talented but unpredictable.'
};

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
    { id: 'sunday', label: 'Sunday League', description: 'Low prestige, hard to get top jobs.', prestigeCap: 65, prestigeMin: 0 },
    { id: 'semi-pro', label: 'Semi-Pro', description: 'Respectable start for Championship/MLS.', prestigeCap: 75, prestigeMin: 60 },
    { id: 'pro', label: 'Professional', description: 'Standard top-tier entry level.', prestigeCap: 82, prestigeMin: 70 },
    { id: 'international', label: 'Int. Star', description: 'Household name.', prestigeCap: 90, prestigeMin: 80 },
    { id: 'legend', label: 'Legend', description: 'Can walk into any job.', prestigeCap: 100, prestigeMin: 90 }
];

export const TOUCHLINE_SHOUTS: Record<TouchlineShout, string> = {
    'Encourage': 'Boost morale.',
    'Demand More': 'Increase intensity.',
    'Tighten Up': 'Defensive shape.',
    'Push Forward': 'Take risks.',
};

const NATIONALITIES = {
    UK: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇮🇪'],
    ES: ['🇪🇸', '🇦🇷', '🇨🇴', '🇺🇾'],
    IT: ['🇮🇹', '🇧🇷', '🇦🇷', '🇭🇷'],
    DE: ['🇩🇪', '🇦🇹', '🇨🇭', '🇵🇱'],
    FR: ['🇫🇷', '🇨🇮', '🇸🇳', '🇩🇿'],
    US: ['🇺🇸', '🇨🇦', '🇲🇽', '🇯🇲']
};

const generatePlayers = (baseRating: number, region: keyof typeof NATIONALITIES): Player[] => {
    const nats = NATIONALITIES[region];
    const positions: PlayerPosition[] = ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LW', 'ST', 'RW'];
    const benchPositions: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'ST', 'LW', 'CB', 'CM', 'RW'];
    
    // Helper to add random flair
    const getRandomEffect = (): any[] => {
        if (Math.random() > 0.9) return [{ type: 'PostTournamentMorale', morale: 'FiredUp', message: 'Eager to impress', until: 3 }];
        return [];
    };

    // Ensure integer ratings
    const squad: Player[] = positions.map((pos) => ({
        name: generateName(nats[0]),
        position: pos,
        rating: Math.round(baseRating + (Math.random() * 4 - 2)),
        age: 20 + Math.floor(Math.random() * 12),
        nationality: nats[Math.floor(Math.random() * nats.length)],
        personality: 'Professional',
        wage: baseRating * 1000,
        status: { type: 'Available' },
        effects: getRandomEffect(),
        contractExpires: 3,
        isStarter: true,
        condition: 100
    }));

    benchPositions.forEach(pos => {
        squad.push({
            name: generateName(nats[0]),
            position: pos,
            rating: Math.round(baseRating - 5 + (Math.random() * 4)),
            age: 18 + Math.floor(Math.random() * 15),
            nationality: nats[Math.floor(Math.random() * nats.length)],
            personality: 'Young Prospect',
            wage: baseRating * 500,
            status: { type: 'Available' },
            effects: [],
            contractExpires: 2,
            isStarter: false,
            condition: 100
        });
    });

    return squad;
};

// Real Rosters for key teams (Updated for 2027 Timeline)
const LIVERPOOL_SQUAD: Player[] = [
    { name: 'Alisson', position: 'GK', rating: 89, age: 34, nationality: '🇧🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Robertson', position: 'LB', rating: 85, age: 33, nationality: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', personality: 'Leader', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'V. van Dijk', position: 'CB', rating: 88, age: 36, nationality: '🇳🇱', personality: 'Leader', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 0, isStarter: true, condition: 95 }, // Expiring!
    { name: 'I. Konate', position: 'CB', rating: 85, age: 28, nationality: '🇫🇷', personality: 'Ambitious', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'T. Alexander-Arnold', position: 'RB', rating: 89, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 200000, status: { type: 'Available' }, effects: [{ type: 'PostTournamentMorale', morale: 'Winner', message: 'Euro Champion', until: 5 }], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'A. Mac Allister', position: 'CM', rating: 86, age: 28, nationality: '🇦🇷', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Szoboszlai', position: 'CM', rating: 85, age: 26, nationality: '🇭🇺', personality: 'Ambitious', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'R. Gravenberch', position: 'DM', rating: 83, age: 25, nationality: '🇳🇱', personality: 'Young Prospect', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Diaz', position: 'LW', rating: 86, age: 30, nationality: '🇨🇴', personality: 'Volatile', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'M. Salah', position: 'RW', rating: 88, age: 35, nationality: '🇪🇬', personality: 'Professional', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'D. Nunez', position: 'ST', rating: 84, age: 28, nationality: '🇺🇾', personality: 'Volatile', wage: 150000, status: { type: 'Available' }, effects: [{ type: 'PostTournamentMorale', morale: 'FiredUp', message: 'Critics Silenced', until: 3 }], contractExpires: 4, isStarter: true, condition: 100 },
    // Bench
    { name: 'C. Gakpo', position: 'LW', rating: 83, age: 28, nationality: '🇳🇱', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'F. Chiesa', position: 'RW', rating: 82, age: 29, nationality: '🇮🇹', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 90 },
    { name: 'H. Elliott', position: 'AM', rating: 81, age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Loyal', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'C. Jones', position: 'CM', rating: 81, age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Loyal', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

const CHELSEA_SQUAD: Player[] = [
    { name: 'R. Sanchez', position: 'GK', rating: 80, age: 29, nationality: '🇪🇸', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Cucurella', position: 'LB', rating: 81, age: 29, nationality: '🇪🇸', personality: 'Volatile', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Colwill', position: 'CB', rating: 83, age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'W. Fofana', position: 'CB', rating: 82, age: 26, nationality: '🇫🇷', personality: 'Ambitious', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'R. James', position: 'RB', rating: 86, age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 90 },
    { name: 'M. Caicedo', position: 'DM', rating: 85, age: 25, nationality: '🇪🇨', personality: 'Professional', wage: 170000, status: { type: 'Available' }, effects: [], contractExpires: 7, isStarter: true, condition: 100 },
    { name: 'E. Fernandez', position: 'CM', rating: 85, age: 26, nationality: '🇦🇷', personality: 'Ambitious', wage: 200000, status: { type: 'Available' }, effects: [{ type: 'BadChemistry', with: 'M. Caicedo', message: 'Midfield Clash', until: 4 }], contractExpires: 7, isStarter: true, condition: 100 },
    { name: 'C. Palmer', position: 'AM', rating: 88, age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 9, isStarter: true, condition: 100 },
    { name: 'J. Sancho', position: 'LW', rating: 82, age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Volatile', wage: 190000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'N. Madueke', position: 'RW', rating: 81, age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'N. Jackson', position: 'ST', rating: 83, age: 26, nationality: '🇸🇳', personality: 'Volatile', wage: 100000, status: { type: 'Available' }, effects: [{ type: 'PostTournamentMorale', morale: 'Disappointed', message: 'Goal Drought', until: 2 }], contractExpires: 6, isStarter: true, condition: 100 },
    // Bench
    { name: 'C. Nkunku', position: 'ST', rating: 84, age: 29, nationality: '🇫🇷', personality: 'Ambitious', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'P. Neto', position: 'LW', rating: 81, age: 27, nationality: '🇵🇹', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'Joao Felix', position: 'AM', rating: 82, age: 27, nationality: '🇵🇹', personality: 'Volatile', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
];

export const TEAMS: Record<string, Team> = {
    // PREMIER LEAGUE (Full 20)
    'Manchester Rovers': { name: 'Manchester Rovers', league: 'Premier League', players: generatePlayers(84, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 180000000, objectives: ['Finish Top 4'] },
    'London City': { name: 'London City', league: 'Premier League', players: generatePlayers(86, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 93, chairmanPersonality: 'Ambitious Tycoon', balance: 550000000, objectives: ['Win the League', 'Win Champions League'] },
    'Liverpool Wanderers': { name: 'Liverpool Wanderers', league: 'Premier League', players: LIVERPOOL_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 280000000, objectives: ['Renew V. van Dijk', 'Finish Top 2'] },
    'Arsenal United': { name: 'Arsenal United', league: 'Premier League', players: generatePlayers(83, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 220000000, objectives: ['Finish Top 4'] },
    'Southern Giants': { name: 'Southern Giants', league: 'Premier League', players: generatePlayers(80, 'UK'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 150000000, objectives: ['Avoid Relegation'] },
    'Newcastle Knights': { name: 'Newcastle Knights', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 350000000, objectives: ['Qualify for Europe'] },
    'Aston Lions': { name: 'Aston Lions', league: 'Premier League', players: generatePlayers(81, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Mid-table Finish'] },
    'West Ham Hammers': { name: 'West Ham Hammers', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 90000000, objectives: ['Avoid Relegation'] },
    'Brighton Seagulls': { name: 'Brighton Seagulls', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: ['Develop Youth'] },
    'Chelsea Blues': { name: 'Chelsea Blues', league: 'Premier League', players: CHELSEA_SQUAD, tactic: { formation: '4-2-3-1', mentality: 'All-Out Attack' }, prestige: 87, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000, objectives: ['Qualify for Champions League'] },
    'Spurs North': { name: 'Spurs North', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Fan-Focused Owner', balance: 250000000, objectives: ['Win a Trophy'] },
    'Everton Toffees': { name: 'Everton Toffees', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 76, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: ['Avoid Relegation'] },
    'Wolves Gold': { name: 'Wolves Gold', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Traditionalist', balance: 60000000, objectives: ['Mid-table Finish'] },
    'Fulham Cottagers': { name: 'Fulham Cottagers', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: ['Avoid Relegation'] },
    'Nottingham Foresters': { name: 'Nottingham Foresters', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: ['Avoid Relegation'] },
    'Leicester Foxes': { name: 'Leicester Foxes', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: ['Avoid Relegation'] },
    'Bournemouth Cherries': { name: 'Bournemouth Cherries', league: 'Premier League', players: generatePlayers(75, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: ['Avoid Relegation'] },
    'Crystal Eagles': { name: 'Crystal Eagles', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 50000000, objectives: ['Mid-table Finish'] },
    'Ipswich Towners': { name: 'Ipswich Towners', league: 'Premier League', players: generatePlayers(73, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Avoid Relegation'] },
    'Southampton Saints': { name: 'Southampton Saints', league: 'Premier League', players: generatePlayers(74, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: ['Avoid Relegation'] },

    // CHAMPIONSHIP (10 Teams) - Updated all with empty objectives to satisfy type
    'Northern Power': { name: 'Northern Power', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'Yorkshire Terriers': { name: 'Yorkshire Terriers', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 25000000, objectives: [] },
    'Burnley Claret': { name: 'Burnley Claret', league: 'Championship', players: generatePlayers(73, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 30000000, objectives: [] },
    'Leeds Whites': { name: 'Leeds Whites', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: ['Promotion'] },
    'Norwich Canaries': { name: 'Norwich Canaries', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 28000000, objectives: [] },
    'Watford Hornets': { name: 'Watford Hornets', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 70, chairmanPersonality: 'Ambitious Tycoon', balance: 35000000, objectives: [] },
    'Sheffield Blades': { name: 'Sheffield Blades', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '3-5-2', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 20000000, objectives: [] },
    'Sunderland Black Cats': { name: 'Sunderland Black Cats', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Fan-Focused Owner', balance: 25000000, objectives: [] },
    'West Brom Baggies': { name: 'West Brom Baggies', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-2-3-1', mentality: 'Defensive' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 22000000, objectives: [] },
    'Stoke Potters': { name: 'Stoke Potters', league: 'Championship', players: generatePlayers(70, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 69, chairmanPersonality: 'Traditionalist', balance: 18000000, objectives: [] },

    // LA LIGA (10 Teams)
    'Madrid Kings': { name: 'Madrid Kings', league: 'La Liga', players: generatePlayers(88, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 96, chairmanPersonality: 'Ambitious Tycoon', balance: 600000000, objectives: ['Win Everything'] },
    'Barcelona Giants': { name: 'Barcelona Giants', league: 'La Liga', players: generatePlayers(86, 'ES'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 94, chairmanPersonality: 'Fan-Focused Owner', balance: 350000000, objectives: ['Win the League'] },
    'Atletico Stripes': { name: 'Atletico Stripes', league: 'La Liga', players: generatePlayers(84, 'ES'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 88, chairmanPersonality: 'Traditionalist', balance: 180000000, objectives: [] },
    'Seville Eagles': { name: 'Seville Eagles', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 83, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [] },
    'Sociedad Blue': { name: 'Sociedad Blue', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 82, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: [] },
    'Bilbao Lions': { name: 'Bilbao Lions', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [] },
    'Valencia Bats': { name: 'Valencia Bats', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Ambitious Tycoon', balance: 60000000, objectives: [] },
    'Villarreal Subs': { name: 'Villarreal Subs', league: 'La Liga', players: generatePlayers(80, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [] },
    'Betis Green': { name: 'Betis Green', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 79, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [] },
    'Girona Catalans': { name: 'Girona Catalans', league: 'La Liga', players: generatePlayers(78, 'ES'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [] },

    // SERIE A (10 Teams)
    'Turin Zebras': { name: 'Turin Zebras', league: 'Serie A', players: generatePlayers(85, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 92, chairmanPersonality: 'Traditionalist', balance: 220000000, objectives: ['Win the League'] },
    'Milan Devils': { name: 'Milan Devils', league: 'Serie A', players: generatePlayers(84, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 190000000, objectives: ['Win the League'] },
    'Inter Snakes': { name: 'Inter Snakes', league: 'Serie A', players: generatePlayers(86, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 93, chairmanPersonality: 'Traditionalist', balance: 240000000, objectives: ['Win the League'] },
    'Naples Blues': { name: 'Naples Blues', league: 'Serie A', players: generatePlayers(83, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 150000000, objectives: [] },
    'Rome Gladiators': { name: 'Rome Gladiators', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 110000000, objectives: [] },
    'Lazio Eagles': { name: 'Lazio Eagles', league: 'Serie A', players: generatePlayers(80, 'IT'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [] },
    'Bergamo Atalanta': { name: 'Bergamo Atalanta', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '3-4-3' as any, mentality: 'All-Out Attack' }, prestige: 83, chairmanPersonality: 'Moneyball Advocate', balance: 80000000, objectives: [] },
    'Florence Violets': { name: 'Florence Violets', league: 'Serie A', players: generatePlayers(79, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [] },
    'Bologna Rosso': { name: 'Bologna Rosso', league: 'Serie A', players: generatePlayers(78, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: [] },
    'Torino Bulls': { name: 'Torino Bulls', league: 'Serie A', players: generatePlayers(76, 'IT'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [] },

    // BUNDESLIGA (10 Teams)
    'Munich Wall': { name: 'Munich Wall', league: 'Bundesliga', players: generatePlayers(88, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'All-Out Attack' }, prestige: 95, chairmanPersonality: 'Ambitious Tycoon', balance: 450000000, objectives: ['Win the League'] },
    'Dortmund Yellows': { name: 'Dortmund Yellows', league: 'Bundesliga', players: generatePlayers(84, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Challenge Munich'] },
    'Leipzig Bulls': { name: 'Leipzig Bulls', league: 'Bundesliga', players: generatePlayers(82, 'DE'), tactic: { formation: '4-2-2-2' as any, mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 150000000, objectives: [] },
    'Leverkusen Pills': { name: 'Leverkusen Pills', league: 'Bundesliga', players: generatePlayers(83, 'DE'), tactic: { formation: '3-4-2-1' as any, mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Moneyball Advocate', balance: 100000000, objectives: [] },
    'Frankfurt Eagles': { name: 'Frankfurt Eagles', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [] },
    'Stuttgart Reds': { name: 'Stuttgart Reds', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Traditionalist', balance: 65000000, objectives: [] },
    'Wolfsburg Green': { name: 'Wolfsburg Green', league: 'Bundesliga', players: generatePlayers(77, 'DE'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Ambitious Tycoon', balance: 80000000, objectives: [] },
    'Gladbach Foals': { name: 'Gladbach Foals', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [] },
    'Berlin Union': { name: 'Berlin Union', league: 'Bundesliga', players: generatePlayers(75, 'DE'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: [] },
    'Hoffenheim Blue': { name: 'Hoffenheim Blue', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [] },

    // LIGUE 1 (10 Teams)
    'Paris Blues': { name: 'Paris Blues', league: 'Ligue 1', players: generatePlayers(89, 'FR'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 94, chairmanPersonality: 'Ambitious Tycoon', balance: 750000000, objectives: ['Win the League', 'Win Champions League'] },
    'Marseille O': { name: 'Marseille O', league: 'Ligue 1', players: generatePlayers(80, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [] },
    'Lyon Lions': { name: 'Lyon Lions', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 70000000, objectives: [] },
    'Monaco Prince': { name: 'Monaco Prince', league: 'Ligue 1', players: generatePlayers(81, 'FR'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 120000000, objectives: [] },
    'Nice Coast': { name: 'Nice Coast', league: 'Ligue 1', players: generatePlayers(78, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 79, chairmanPersonality: 'Moneyball Advocate', balance: 60000000, objectives: [] },
    'Lille Dogs': { name: 'Lille Dogs', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: [] },
    'Lens Miners': { name: 'Lens Miners', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '3-4-3' as any, mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'Rennes Red': { name: 'Rennes Red', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [] },
    'Nantes Canaries': { name: 'Nantes Canaries', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 30000000, objectives: [] },
    'Reims Champagne': { name: 'Reims Champagne', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: [] },

    // MLS (11 Teams)
    'Miami Pink': { name: 'Miami Pink', league: 'MLS', players: generatePlayers(76, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Ambitious Tycoon', balance: 90000000, objectives: ['Win MLS Cup'] },
    'LA Galaxy Stars': { name: 'LA Galaxy Stars', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: [] },
    'NY Apples': { name: 'NY Apples', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [] },
    'Atlanta Peach': { name: 'Atlanta Peach', league: 'MLS', players: generatePlayers(75, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [] },
    'Seattle Sounders': { name: 'Seattle Sounders', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [] },
    'Portland Timbers': { name: 'Portland Timbers', league: 'MLS', players: generatePlayers(72, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'LA Black & Gold': { name: 'LA Black & Gold', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Fan-Focused Owner', balance: 60000000, objectives: [] },
    'Columbus Crew': { name: 'Columbus Crew', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [] },
    'Toronto Reds': { name: 'Toronto Reds', league: 'MLS', players: generatePlayers(71, 'US'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 40000000, objectives: [] },
    'Chicago Fire': { name: 'Chicago Fire', league: 'MLS', players: generatePlayers(70, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 69, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [] },
    'Philadelphia Liberty': { name: 'Philadelphia Liberty', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Develop Youth'] },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'Leo Messi', position: 'CF', rating: 94, age: 39, nationality: '🇦🇷', personality: 'Ambitious', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Eric Haaland', position: 'ST', rating: 93, age: 26, nationality: '🇳🇴', personality: 'Ambitious', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Kylian Mbappa', position: 'ST', rating: 93, age: 27, nationality: '🇫🇷', personality: 'Ambitious', wage: 450000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Jude Bellinger', position: 'CM', rating: 91, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Trent A-A', position: 'RB', rating: 88, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Vini Jr', position: 'LW', rating: 91, age: 24, nationality: '🇧🇷', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Rodri', position: 'DM', rating: 91, age: 28, nationality: '🇪🇸', personality: 'Leader', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
];
