
import type { Team, Tactic, ChairmanPersonality, Player, PlayerPersonality, TouchlineShout, ExperienceLevel, PlayerPosition } from './types';
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
    { id: 'sunday', label: 'Sunday League', description: 'Low prestige, hard to get top jobs.', prestigeCap: 72, prestigeMin: 0 },
    { id: 'semi-pro', label: 'Semi-Pro', description: 'Respectable start for Championship/MLS.', prestigeCap: 78, prestigeMin: 65 },
    { id: 'pro', label: 'Professional', description: 'Standard top-tier entry level.', prestigeCap: 85, prestigeMin: 75 },
    { id: 'international', label: 'Int. Star', description: 'Household name.', prestigeCap: 92, prestigeMin: 82 },
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
    const benchPositions: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'ST', 'LW'];
    
    const squad: Player[] = positions.map((pos, i) => ({
        name: generateName(nats[0]),
        position: pos,
        rating: baseRating + (Math.random() * 4 - 2),
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
            rating: baseRating - 5 + (Math.random() * 4),
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

export const TEAMS: Record<string, Team> = {
    'Manchester Rovers': { name: 'Manchester Rovers', league: 'Premier League', players: generatePlayers(84, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 180000000 },
    'London City': { name: 'London City', league: 'Premier League', players: generatePlayers(86, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 93, chairmanPersonality: 'Ambitious Tycoon', balance: 550000000 },
    'Liverpool Wanderers': { name: 'Liverpool Wanderers', league: 'Premier League', players: generatePlayers(85, 'UK'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 280000000 },
    'Arsenal United': { name: 'Arsenal United', league: 'Premier League', players: generatePlayers(83, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 220000000 },
    'Southern Giants': { name: 'Southern Giants', league: 'Premier League', players: generatePlayers(80, 'UK'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 150000000 },
    'Newcastle Knights': { name: 'Newcastle Knights', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 350000000 },
    
    'Northern Power': { name: 'Northern Power', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000 },
    'Yorkshire Terriers': { name: 'Yorkshire Terriers', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 25000000 },
    
    'Madrid Kings': { name: 'Madrid Kings', league: 'La Liga', players: generatePlayers(88, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 96, chairmanPersonality: 'Ambitious Tycoon', balance: 600000000 },
    'Barcelona Giants': { name: 'Barcelona Giants', league: 'La Liga', players: generatePlayers(86, 'ES'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 94, chairmanPersonality: 'Fan-Focused Owner', balance: 350000000 },

    'Turin Zebras': { name: 'Turin Zebras', league: 'Serie A', players: generatePlayers(85, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 92, chairmanPersonality: 'Traditionalist', balance: 220000000 },
    'Milan Devils': { name: 'Milan Devils', league: 'Serie A', players: generatePlayers(84, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 190000000 },
    
    'Munich Wall': { name: 'Munich Wall', league: 'Bundesliga', players: generatePlayers(88, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'All-Out Attack' }, prestige: 95, chairmanPersonality: 'Ambitious Tycoon', balance: 450000000 },
    'Paris Blues': { name: 'Paris Blues', league: 'Ligue 1', players: generatePlayers(89, 'FR'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 94, chairmanPersonality: 'Ambitious Tycoon', balance: 750000000 },

    'Miami Pink': { name: 'Miami Pink', league: 'MLS', players: generatePlayers(76, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Ambitious Tycoon', balance: 90000000 },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'Leo Messi', position: 'CF', rating: 94, age: 39, nationality: '🇦🇷', personality: 'Ambitious', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Eric Haaland', position: 'ST', rating: 93, age: 26, nationality: '🇳🇴', personality: 'Ambitious', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Kylian Mbappa', position: 'ST', rating: 93, age: 27, nationality: '🇫🇷', personality: 'Ambitious', wage: 450000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Jude Bellinger', position: 'CM', rating: 91, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Trent A-A', position: 'RB', rating: 88, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
];
