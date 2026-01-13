
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

export const TOUCHLINE_SHOUTS: Record<string, string> = {
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
        effects: [],
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

// --- REAL SQUADS (MANUALLY DEFINED FOR FIDELITY) ---

const LIVERPOOL_SQUAD: Player[] = [
    { name: 'Alisson', position: 'GK', rating: 89, age: 34, nationality: '🇧🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Robertson', position: 'LB', rating: 86, age: 30, nationality: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', personality: 'Leader', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'V. van Dijk', position: 'CB', rating: 89, age: 33, nationality: '🇳🇱', personality: 'Leader', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 0, isStarter: true, condition: 100 }, // Expiring!
    { name: 'I. Konate', position: 'CB', rating: 83, age: 25, nationality: '🇫🇷', personality: 'Ambitious', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'T. Alexander-Arnold', position: 'RB', rating: 87, age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'A. Mac Allister', position: 'CM', rating: 84, age: 25, nationality: '🇦🇷', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'F. Wirtz', position: 'CM', rating: 91, age: 24, nationality: '🇩🇪', personality: 'Ambitious', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 }, // NEW SIGNING
    { name: 'R. Gravenberch', position: 'DM', rating: 83, age: 22, nationality: '🇳🇱', personality: 'Young Prospect', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Diaz', position: 'LW', rating: 84, age: 27, nationality: '🇨🇴', personality: 'Volatile', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'M. Salah', position: 'RW', rating: 89, age: 32, nationality: '🇪🇬', personality: 'Professional', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'D. Nunez', position: 'ST', rating: 82, age: 25, nationality: '🇺🇾', personality: 'Volatile', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    // Bench
    { name: 'D. Szoboszlai', position: 'CM', rating: 82, age: 23, nationality: '🇭🇺', personality: 'Ambitious', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'C. Gakpo', position: 'LW', rating: 81, age: 25, nationality: '🇳🇱', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'F. Chiesa', position: 'ST', rating: 82, age: 27, nationality: '🇮🇹', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'H. Elliott', position: 'AM', rating: 79, age: 21, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'C. Jones', position: 'CM', rating: 79, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Loyal', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'J. Gomez', position: 'CB', rating: 80, age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 85000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'K. Tsimikas', position: 'LB', rating: 79, age: 30, nationality: '🇬🇷', personality: 'Professional', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
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
    { name: 'K. Dewsbury-Hall', position: 'CM', rating: 79, age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'T. Adarabioyo', position: 'CB', rating: 79, age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 75000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'M. Gusto', position: 'RB', rating: 80, age: 22, nationality: '🇫🇷', personality: 'Young Prospect', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: false, condition: 100 },
    { name: 'F. Jorgensen', position: 'GK', rating: 76, age: 23, nationality: '🇩🇰', personality: 'Young Prospect', wage: 40000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
];

const MAN_CITY_SQUAD: Player[] = [
    { name: 'Ederson', position: 'GK', rating: 89, age: 33, nationality: '🇧🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'K. Walker', position: 'RB', rating: 85, age: 37, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'R. Dias', position: 'CB', rating: 89, age: 30, nationality: '🇵🇹', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Akanji', position: 'CB', rating: 87, age: 31, nationality: '🇨🇭', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Gvardiol', position: 'LB', rating: 86, age: 25, nationality: '🇭🇷', personality: 'Ambitious', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Rodri', position: 'DM', rating: 92, age: 30, nationality: '🇪🇸', personality: 'Leader', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'K. De Bruyne', position: 'CM', rating: 90, age: 36, nationality: '🇧🇪', personality: 'Professional', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'B. Silva', position: 'CM', rating: 88, age: 32, nationality: '🇵🇹', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'P. Foden', position: 'AM', rating: 91, age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'J. Doku', position: 'LW', rating: 85, age: 25, nationality: '🇧🇪', personality: 'Volatile', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'E. Haaland', position: 'ST', rating: 94, age: 26, nationality: '🇳🇴', personality: 'Ambitious', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    // Bench
    { name: 'I. Gundogan', position: 'CM', rating: 86, age: 34, nationality: '🇩🇪', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 95 },
    { name: 'S. Ortega', position: 'GK', rating: 80, age: 34, nationality: '🇩🇪', personality: 'Professional', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'N. Ake', position: 'CB', rating: 84, age: 32, nationality: '🇳🇱', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'J. Stones', position: 'CB', rating: 87, age: 33, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 90 },
    { name: 'M. Kovacic', position: 'CM', rating: 84, age: 33, nationality: '🇭🇷', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'Savinho', position: 'RW', rating: 84, age: 23, nationality: '🇧🇷', personality: 'Young Prospect', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'J. Grealish', position: 'LW', rating: 85, age: 31, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Volatile', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
];

export const TEAMS: Record<string, Team> = {
    // PREMIER LEAGUE (Full 20)
    'Manchester City': { name: 'Manchester City', league: 'Premier League', players: MAN_CITY_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 95, chairmanPersonality: 'Ambitious Tycoon', balance: 550000000, objectives: ['Win the League', 'Win Champions League'], activePromises: [], colors: { primary: '#6CABDD', secondary: '#1C2C5B', text: '#FFFFFF' } },
    'Liverpool': { name: 'Liverpool', league: 'Premier League', players: LIVERPOOL_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 280000000, objectives: ['Renew V. van Dijk', 'Finish Top 2'], activePromises: [], colors: { primary: '#C8102E', secondary: '#00B2A9', text: '#FFFFFF' } },
    'Arsenal': { name: 'Arsenal', league: 'Premier League', players: generatePlayers(83, 'UK'), tactic: { formation: '4-3-3' as any, mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 220000000, objectives: ['Finish Top 4'], activePromises: [], colors: { primary: '#EF0107', secondary: '#063672', text: '#FFFFFF' } },
    'Chelsea': { name: 'Chelsea', league: 'Premier League', players: CHELSEA_SQUAD, tactic: { formation: '4-2-3-1', mentality: 'All-Out Attack' }, prestige: 87, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000, objectives: ['Qualify for Champions League'], activePromises: [], colors: { primary: '#034694', secondary: '#D1B06B', text: '#FFFFFF' } },
    'Tottenham': { name: 'Tottenham', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Fan-Focused Owner', balance: 250000000, objectives: ['Win a Trophy'], activePromises: [], colors: { primary: '#FFFFFF', secondary: '#132257', text: '#132257' } },
    'Newcastle United': { name: 'Newcastle United', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 350000000, objectives: ['Qualify for Europe'], activePromises: [] },
    'Aston Villa': { name: 'Aston Villa', league: 'Premier League', players: generatePlayers(81, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Mid-table Finish'], activePromises: [], colors: { primary: '#670E36', secondary: '#95BFE5', text: '#FFFFFF' } },
    'West Ham': { name: 'West Ham', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 90000000, objectives: ['Avoid Relegation'], activePromises: [], colors: { primary: '#7A263A', secondary: '#1BB1E7', text: '#FFFFFF' } },
    'Brighton': { name: 'Brighton', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: ['Develop Youth'], activePromises: [] },
    'Manchester United': { name: 'Manchester United', league: 'Premier League', players: generatePlayers(84, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 180000000, objectives: ['Finish Top 4'], activePromises: [], colors: { primary: '#DA291C', secondary: '#FBE122', text: '#FFFFFF' } },
    'Everton': { name: 'Everton', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 76, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Wolves': { name: 'Wolves', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Traditionalist', balance: 60000000, objectives: ['Mid-table Finish'], activePromises: [], colors: { primary: '#FDB913', secondary: '#231F20', text: '#000000' } },
    'Fulham': { name: 'Fulham', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Nottingham Forest': { name: 'Nottingham Forest', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Leicester City': { name: 'Leicester City', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Bournemouth': { name: 'Bournemouth', league: 'Premier League', players: generatePlayers(75, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Crystal Palace': { name: 'Crystal Palace', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 50000000, objectives: ['Mid-table Finish'], activePromises: [] },
    'Ipswich Town': { name: 'Ipswich Town', league: 'Premier League', players: generatePlayers(73, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Southampton': { name: 'Southampton', league: 'Premier League', players: generatePlayers(74, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: ['Avoid Relegation'], activePromises: [] },
    'Brentford': { name: 'Brentford', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Moneyball Advocate', balance: 60000000, objectives: ['Avoid Relegation'], activePromises: [] },

    // CHAMPIONSHIP (10 Teams)
    'Sunderland': { name: 'Sunderland', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [], activePromises: [] },
    'Burnley': { name: 'Burnley', league: 'Championship', players: generatePlayers(73, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 30000000, objectives: [], activePromises: [] },
    'Leeds United': { name: 'Leeds United', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: ['Promotion'], activePromises: [], colors: { primary: '#FFFFFF', secondary: '#FFCD00', text: '#1D428A' } },
    'Norwich City': { name: 'Norwich City', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 28000000, objectives: [], activePromises: [], colors: { primary: '#FFF200', secondary: '#00A650', text: '#000000' } },
    'Watford': { name: 'Watford', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 70, chairmanPersonality: 'Ambitious Tycoon', balance: 35000000, objectives: [], activePromises: [] },
    'Sheffield United': { name: 'Sheffield United', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '3-5-2', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 20000000, objectives: [], activePromises: [] },
    'Middlesbrough': { name: 'Middlesbrough', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Traditionalist', balance: 25000000, objectives: [], activePromises: [] },
    'West Brom': { name: 'West Brom', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-2-3-1', mentality: 'Defensive' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 22000000, objectives: [], activePromises: [] },
    'Stoke City': { name: 'Stoke City', league: 'Championship', players: generatePlayers(70, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 69, chairmanPersonality: 'Traditionalist', balance: 18000000, objectives: [], activePromises: [] },
    'Coventry City': { name: 'Coventry City', league: 'Championship', players: generatePlayers(70, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 69, chairmanPersonality: 'Fan-Focused Owner', balance: 20000000, objectives: [], activePromises: [] },

    // LA LIGA (10 Teams)
    'Real Madrid': { name: 'Real Madrid', league: 'La Liga', players: generatePlayers(88, 'ES'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 98, chairmanPersonality: 'Ambitious Tycoon', balance: 600000000, objectives: ['Win Everything'], activePromises: [], colors: { primary: '#FFFFFF', secondary: '#FEBE10', text: '#000000' } },
    'FC Barcelona': { name: 'FC Barcelona', league: 'La Liga', players: generatePlayers(86, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 95, chairmanPersonality: 'Fan-Focused Owner', balance: 150000000, objectives: ['Win the League'], activePromises: [], colors: { primary: '#A50044', secondary: '#004D98', text: '#FFFFFF' } },
    'Atletico Madrid': { name: 'Atletico Madrid', league: 'La Liga', players: generatePlayers(84, 'ES'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 88, chairmanPersonality: 'Traditionalist', balance: 180000000, objectives: [], activePromises: [], colors: { primary: '#CB3524', secondary: '#272E61', text: '#FFFFFF' } },
    'Sevilla': { name: 'Sevilla', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 83, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [], activePromises: [] },
    'Real Sociedad': { name: 'Real Sociedad', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 82, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: [], activePromises: [] },
    'Athletic Bilbao': { name: 'Athletic Bilbao', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [], activePromises: [] },
    'Valencia': { name: 'Valencia', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Ambitious Tycoon', balance: 60000000, objectives: [], activePromises: [] },
    'Villarreal': { name: 'Villarreal', league: 'La Liga', players: generatePlayers(80, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [], activePromises: [], colors: { primary: '#F1BF00', secondary: '#005187', text: '#000000' } },
    'Real Betis': { name: 'Real Betis', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 79, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [], activePromises: [], colors: { primary: '#00954C', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Girona': { name: 'Girona', league: 'La Liga', players: generatePlayers(78, 'ES'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [], activePromises: [] },

    // SERIE A (10 Teams)
    'Juventus': { name: 'Juventus', league: 'Serie A', players: generatePlayers(85, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 90, chairmanPersonality: 'Traditionalist', balance: 200000000, objectives: ['Win the League'], activePromises: [], colors: { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Inter Milan': { name: 'Inter Milan', league: 'Serie A', players: generatePlayers(86, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 91, chairmanPersonality: 'Traditionalist', balance: 180000000, objectives: ['Win the League'], activePromises: [], colors: { primary: '#010E80', secondary: '#000000', text: '#FFFFFF' } },
    'AC Milan': { name: 'AC Milan', league: 'Serie A', players: generatePlayers(84, 'IT'), tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, prestige: 90, chairmanPersonality: 'Ambitious Tycoon', balance: 150000000, objectives: ['Win the League'], activePromises: [], colors: { primary: '#FB090B', secondary: '#000000', text: '#FFFFFF' } },
    'Napoli': { name: 'Napoli', league: 'Serie A', players: generatePlayers(83, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 150000000, objectives: [], activePromises: [], colors: { primary: '#12A0D7', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'AS Roma': { name: 'AS Roma', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 110000000, objectives: [], activePromises: [], colors: { primary: '#8E1F2F', secondary: '#F0BC42', text: '#FFFFFF' } },
    'Lazio': { name: 'Lazio', league: 'Serie A', players: generatePlayers(80, 'IT'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [], activePromises: [], colors: { primary: '#87D8F7', secondary: '#FFFFFF', text: '#000000' } },
    'Atalanta': { name: 'Atalanta', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '3-4-3' as any, mentality: 'All-Out Attack' }, prestige: 83, chairmanPersonality: 'Moneyball Advocate', balance: 80000000, objectives: [], activePromises: [], colors: { primary: '#1F2F57', secondary: '#000000', text: '#FFFFFF' } },
    'Fiorentina': { name: 'Fiorentina', league: 'Serie A', players: generatePlayers(79, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [], activePromises: [], colors: { primary: '#4F2E90', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Bologna': { name: 'Bologna', league: 'Serie A', players: generatePlayers(78, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: [], activePromises: [] },
    'Torino': { name: 'Torino', league: 'Serie A', players: generatePlayers(76, 'IT'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [], activePromises: [] },

    // BUNDESLIGA (10 Teams)
    'Bayern Munich': { name: 'Bayern Munich', league: 'Bundesliga', players: generatePlayers(88, 'DE'), tactic: { formation: '4-2-3-1', mentality: 'All-Out Attack' }, prestige: 96, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000, objectives: ['Win the League', 'Win Champions League'], activePromises: [], colors: { primary: '#DC052D', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Dortmund': { name: 'Dortmund', league: 'Bundesliga', players: generatePlayers(84, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Challenge Munich'], activePromises: [], colors: { primary: '#FDE100', secondary: '#000000', text: '#000000' } },
    'RB Leipzig': { name: 'RB Leipzig', league: 'Bundesliga', players: generatePlayers(82, 'DE'), tactic: { formation: '4-2-2-2' as any, mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 150000000, objectives: [], activePromises: [], colors: { primary: '#DD0741', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Bayer Leverkusen': { name: 'Bayer Leverkusen', league: 'Bundesliga', players: generatePlayers(83, 'DE'), tactic: { formation: '3-4-2-1' as any, mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Moneyball Advocate', balance: 100000000, objectives: [], activePromises: [], colors: { primary: '#E32219', secondary: '#000000', text: '#FFFFFF' } },
    'Eintracht Frankfurt': { name: 'Eintracht Frankfurt', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [], activePromises: [], colors: { primary: '#E1000F', secondary: '#000000', text: '#FFFFFF' } },
    'Stuttgart': { name: 'Stuttgart', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Traditionalist', balance: 65000000, objectives: [], activePromises: [] },
    'Wolfsburg': { name: 'Wolfsburg', league: 'Bundesliga', players: generatePlayers(77, 'DE'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Ambitious Tycoon', balance: 80000000, objectives: [], activePromises: [], colors: { primary: '#65B32E', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Gladbach': { name: 'Gladbach', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [], activePromises: [] },
    'Union Berlin': { name: 'Union Berlin', league: 'Bundesliga', players: generatePlayers(75, 'DE'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: [], activePromises: [] },
    'Hoffenheim': { name: 'Hoffenheim', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [], activePromises: [], colors: { primary: '#005CA9', secondary: '#FFFFFF', text: '#FFFFFF' } },

    // LIGUE 1 (10 Teams)
    'PSG': { name: 'PSG', league: 'Ligue 1', players: generatePlayers(89, 'FR'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 93, chairmanPersonality: 'Ambitious Tycoon', balance: 500000000, objectives: ['Win the League', 'Win Champions League'], activePromises: [], colors: { primary: '#004170', secondary: '#DA291C', text: '#FFFFFF' } },
    'Marseille': { name: 'Marseille', league: 'Ligue 1', players: generatePlayers(80, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [], activePromises: [], colors: { primary: '#009DDC', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Lyon': { name: 'Lyon', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 70000000, objectives: [], activePromises: [], colors: { primary: '#DA291C', secondary: '#1C347C', text: '#FFFFFF' } },
    'Monaco': { name: 'Monaco', league: 'Ligue 1', players: generatePlayers(81, 'FR'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 120000000, objectives: [], activePromises: [], colors: { primary: '#E51B22', secondary: '#FFFFFF', text: '#FFFFFF' } },
    'Nice': { name: 'Nice', league: 'Ligue 1', players: generatePlayers(78, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 79, chairmanPersonality: 'Moneyball Advocate', balance: 60000000, objectives: [], activePromises: [], colors: { primary: '#000000', secondary: '#D61A21', text: '#FFFFFF' } },
    'Lille': { name: 'Lille', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: [], activePromises: [], colors: { primary: '#D71920', secondary: '#1D2D5B', text: '#FFFFFF' } },
    'Lens': { name: 'Lens', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '3-4-3' as any, mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [], activePromises: [], colors: { primary: '#FFC400', secondary: '#D71920', text: '#000000' } },
    'Rennes': { name: 'Rennes', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [], activePromises: [], colors: { primary: '#DA291C', secondary: '#000000', text: '#FFFFFF' } },
    'Nantes': { name: 'Nantes', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 30000000, objectives: [], activePromises: [], colors: { primary: '#FFF200', secondary: '#00964E', text: '#000000' } },
    'Reims': { name: 'Reims', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: [], activePromises: [] },

    // MLS (12 Teams)
    'Inter Miami': { name: 'Inter Miami', league: 'MLS', players: generatePlayers(76, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 90000000, objectives: ['Win MLS Cup'], activePromises: [], colors: { primary: '#F4737B', secondary: '#000000', text: '#000000' } },
    'LA Galaxy': { name: 'LA Galaxy', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: [], activePromises: [], colors: { primary: '#00245D', secondary: '#FFD100', text: '#FFFFFF' } },
    'NYCFC': { name: 'NYCFC', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [], activePromises: [], colors: { primary: '#6CABDD', secondary: '#00235F', text: '#FFFFFF' } },
    'Atlanta United': { name: 'Atlanta United', league: 'MLS', players: generatePlayers(75, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [], activePromises: [], colors: { primary: '#9D2235', secondary: '#231F20', text: '#FFFFFF' } },
    'Seattle Sounders': { name: 'Seattle Sounders', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [], activePromises: [], colors: { primary: '#5D9732', secondary: '#005595', text: '#FFFFFF' } },
    'Portland Timbers': { name: 'Portland Timbers', league: 'MLS', players: generatePlayers(72, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [], activePromises: [], colors: { primary: '#00482B', secondary: '#D69A00', text: '#FFFFFF' } },
    'LAFC': { name: 'LAFC', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Fan-Focused Owner', balance: 60000000, objectives: [], activePromises: [], colors: { primary: '#000000', secondary: '#C39E6D', text: '#C39E6D' } },
    'Columbus Crew': { name: 'Columbus Crew', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [], activePromises: [], colors: { primary: '#FEF200', secondary: '#000000', text: '#000000' } },
    'Toronto FC': { name: 'Toronto FC', league: 'MLS', players: generatePlayers(71, 'US'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 60, chairmanPersonality: 'Traditionalist', balance: 40000000, objectives: [], activePromises: [], colors: { primary: '#B81137', secondary: '#415965', text: '#FFFFFF' } },
    'Chicago Fire': { name: 'Chicago Fire', league: 'MLS', players: generatePlayers(70, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 58, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [], activePromises: [], colors: { primary: '#FF0000', secondary: '#132156', text: '#FFFFFF' } },
    'Philadelphia Union': { name: 'Philadelphia Union', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Develop Youth'], activePromises: [], colors: { primary: '#5AC4F1', secondary: '#B38E5D', text: '#002D55' } },
    'NY Red Bulls': { name: 'NY Red Bulls', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '4-2-2-2' as any, mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: [], activePromises: [], colors: { primary: '#ED1E36', secondary: '#FABB23', text: '#FFFFFF' } },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'N. Neymar', position: 'LW', rating: 89, age: 35, nationality: '🇧🇷', personality: 'Volatile', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'V. Osimhen', position: 'ST', rating: 88, age: 28, nationality: '🇳🇬', personality: 'Ambitious', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'V. Gyokeres', position: 'ST', rating: 86, age: 28, nationality: '🇸🇪', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'K. Kvaratskhelia', position: 'LW', rating: 86, age: 24, nationality: '🇬🇪', personality: 'Ambitious', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'N. Williams', position: 'LW', rating: 85, age: 22, nationality: '🇪🇸', personality: 'Loyal', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'A. Isak', position: 'ST', rating: 85, age: 25, nationality: '🇸🇪', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
];
