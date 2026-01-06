
import type { Team, Tactic, ChairmanPersonality, Player, PlayerPersonality, TouchlineShout, ExperienceLevel } from './types';
import { generateName } from './utils';

export const FORMATIONS: Tactic['formation'][] = ['4-4-2', '4-3-3', '5-3-2', '3-5-2'];
export const MENTALITIES: Tactic['mentality'][] = ['All-Out Attack', 'Attacking', 'Balanced', 'Defensive', 'Park the Bus'];
export const CHAIRMAN_PERSONALITIES: Record<ChairmanPersonality, string> = {
    'Traditionalist': 'Values defensive solidity and fiscal responsibility.',
    'Ambitious Tycoon': 'Demands attacking football and immediate success.',
    'Moneyball Advocate': 'Focuses on data, analytics, and smart spending.',
    'Fan-Focused Owner': 'Wants exciting play and a strong bond with supporters.'
};
export const PLAYER_PERSONALITIES: Record<PlayerPersonality, string> = {
    'Ambitious': 'Wants to win major trophies and play at the highest level.',
    'Loyal': 'Values stability and has a strong connection to their current club.',
    'Mercenary': 'Primarily motivated by financial rewards.',
    'Young Prospect': 'Looking for playing time and a good environment to develop.',
    'Leader': 'A natural leader who organizes the team and keeps morale high.',
    'Professional': 'A model professional who trains hard and avoids controversy.',
    'Volatile': 'A talented player who can be unpredictable and prone to disciplinary issues.'
};

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
    {
        id: 'sunday',
        label: 'Sunday League Footballer',
        description: 'You played locally with friends. Clubs will be skeptical, and opportunities will be scarce. Expect offers only from struggling teams.',
        prestigeCap: 72,
        prestigeMin: 0
    },
    {
        id: 'semi-pro',
        label: 'Semi-Professional',
        description: 'You had a decent career in lower leagues. You can command respect in the Championship or MLS.',
        prestigeCap: 78,
        prestigeMin: 65
    },
    {
        id: 'pro',
        label: 'Professional Footballer',
        description: 'You played at a high level. Most mid-table top-tier clubs will be willing to listen to your ideas.',
        prestigeCap: 85,
        prestigeMin: 75
    },
    {
        id: 'international',
        label: 'International Star',
        description: 'You captained your country. You are a household name. Top clubs are interested.',
        prestigeCap: 92,
        prestigeMin: 82
    },
    {
        id: 'legend',
        label: 'World Class Legend',
        description: 'You are football royalty. You can walk into almost any job in the world, if it is available.',
        prestigeCap: 100,
        prestigeMin: 90
    }
];

export const TOUCHLINE_SHOUTS: Record<TouchlineShout, string> = {
    'Encourage': 'Boost morale and inspire players to keep fighting.',
    'Demand More': 'Challenge your players to increase their intensity and effort.',
    'Tighten Up': 'Instruct the team to focus on defensive shape and reduce risks.',
    'Push Forward': 'Urge players to take more risks and commit to attacking.',
};

const NATIONALITIES = {
    UK: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇮🇪'],
    ES: ['🇪🇸', '🇪🇸', '🇪🇸', '🇦🇷', '🇨🇴', '🇺🇾'],
    IT: ['🇮🇹', '🇮🇹', '🇮🇹', '🇦🇷', '🇧🇷', '🇭🇷'],
    DE: ['🇩🇪', '🇩🇪', '🇩🇪', '🇦🇹', '🇨🇭', '🇵🇱'],
    FR: ['🇫🇷', '🇫🇷', '🇫🇷', '🇨🇮', '🇸🇳', '🇩🇿'],
    US: ['🇺🇸', '🇺🇸', '🇺🇸', '🇨🇦', '🇲🇽', '🇯🇲']
};

const generatePlayers = (baseRating: number, region: keyof typeof NATIONALITIES): Player[] => {
    const nats = NATIONALITIES[region];
    const players: Player[] = [
        { name: generateName(nats[0]), position: 'GK', rating: baseRating + 2, age: 28, nationality: nats[Math.floor(Math.random() * nats.length)], personality: 'Loyal', wage: 50000, status: { type: 'Available' }, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1, isStarter: true, condition: 100 },
        ...Array.from({ length: 4 }, (_, i) => ({ name: generateName(nats[0]), position: 'DEF' as const, rating: baseRating - 2 + i, age: 26+i, nationality: nats[Math.floor(Math.random() * nats.length)], personality: 'Loyal' as const, wage: 40000 + i*2000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1, isStarter: true, condition: 100 })),
        ...Array.from({ length: 4 }, (_, i) => ({ name: generateName(nats[0]), position: 'MID' as const, rating: baseRating + i, age: 24+i, nationality: nats[Math.floor(Math.random() * nats.length)], personality: 'Ambitious' as const, wage: 60000 + i*5000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1, isStarter: true, condition: 100 })),
        ...Array.from({ length: 2 }, (_, i) => ({ name: generateName(nats[0]), position: 'FWD' as const, rating: baseRating + 3 + i, age: 22+i, nationality: nats[Math.floor(Math.random() * nats.length)], personality: 'Ambitious' as const, wage: 80000 + i*10000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1, isStarter: true, condition: 100 })),
        ...Array.from({ length: 7 }, (_, i) => ({ name: generateName(nats[0]), position: (['DEF', 'MID', 'FWD', 'GK', 'MID', 'DEF', 'FWD'] as const)[i], rating: baseRating - 5 + i, age: 18+i, nationality: nats[Math.floor(Math.random() * nats.length)], personality: 'Young Prospect' as const, wage: 15000 + i * 1000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 3) + 1, isStarter: false, condition: 100 })),
    ];
    return players;
};

export const TEAMS: Record<string, Team> = {
    'Manchester Rovers': { name: 'Manchester Rovers', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 85, chairmanPersonality: 'Fan-Focused Owner', balance: 120000000 },
    'London City': { name: 'London City', league: 'Premier League', players: [...generatePlayers(85, 'UK').slice(0, 17), { name: 'Kev De Bruin', position: 'MID', rating: 92, age: 35, nationality: '🇧🇪', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 0, isStarter: true, condition: 100 }], tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 92, chairmanPersonality: 'Ambitious Tycoon', balance: 450000000 },
    'Liverpool Wanderers': { name: 'Liverpool Wanderers', league: 'Premier League', players: [...generatePlayers(84, 'UK').slice(0, 16), { name: 'Vince Van Dijk', position: 'DEF', rating: 90, age: 35, nationality: '🇳🇱', personality: 'Loyal', wage: 280000, status: { type: 'Available' }, effects: [], contractExpires: 0, isStarter: true, condition: 100 }, { name: 'Mo Salah', position: 'FWD', rating: 90, age: 34, nationality: '🇪🇬', personality: 'Loyal', wage: 320000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 }], tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 90, chairmanPersonality: 'Ambitious Tycoon', balance: 250000000 },
    'Arsenal United': { name: 'Arsenal United', league: 'Premier League', players: generatePlayers(80, 'UK'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 180000000 },
    'Southern Giants': { name: 'Southern Giants', league: 'Premier League', players: [...generatePlayers(79, 'UK').slice(0, 17), { name: 'Jude Bellinger', position: 'MID', rating: 91, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 }], tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate', balance: 95000000 },
    'Newcastle Knights': { name: 'Newcastle Knights', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 79, chairmanPersonality: 'Ambitious Tycoon', balance: 350000000 },
    'Northern Power': { name: 'Northern Power', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 15000000 },
    'West Country AFC': { name: 'West Country AFC', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 70, chairmanPersonality: 'Moneyball Advocate', balance: 8000000 },
    'Midlands FC': { name: 'Midlands FC', league: 'Championship', players: generatePlayers(73, 'UK'), tactic: { formation: '5-3-2', mentality: 'Park the Bus' }, prestige: 72, chairmanPersonality: 'Traditionalist', balance: 12000000 },
    'Yorkshire Terriers': { name: 'Yorkshire Terriers', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 68, chairmanPersonality: 'Traditionalist', balance: 5000000 },
    'Sussex Seasiders': { name: 'Sussex Seasiders', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 9000000 },
    'Welsh Dragons': { name: 'Welsh Dragons', league: 'Championship', players: generatePlayers(73, 'UK'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 73, chairmanPersonality: 'Fan-Focused Owner', balance: 14000000 },
    'Madrid Kings': { name: 'Madrid Kings', league: 'La Liga', players: generatePlayers(86, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 95, chairmanPersonality: 'Ambitious Tycoon', balance: 500000000 },
    'Barcelona Giants': { name: 'Barcelona Giants', league: 'La Liga', players: generatePlayers(85, 'ES'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 94, chairmanPersonality: 'Fan-Focused Owner', balance: 300000000 },
    'Atletico Stripes': { name: 'Atletico Stripes', league: 'La Liga', players: generatePlayers(83, 'ES'), tactic: { formation: '4-4-2', mentality: 'Park the Bus' }, prestige: 88, chairmanPersonality: 'Traditionalist', balance: 150000000 },
    'Seville FC': { name: 'Seville FC', league: 'La Liga', players: generatePlayers(80, 'ES'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Moneyball Advocate', balance: 60000000 },
    'Valencia Orange': { name: 'Valencia Orange', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 80, chairmanPersonality: 'Traditionalist', balance: 45000000 },
    'Basque Athletic': { name: 'Basque Athletic', league: 'La Liga', players: generatePlayers(78, 'ES'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 78, chairmanPersonality: 'Fan-Focused Owner', balance: 35000000 },
    'Turin Zebras': { name: 'Turin Zebras', league: 'Serie A', players: generatePlayers(84, 'IT'), tactic: { formation: '3-5-2', mentality: 'Defensive' }, prestige: 90, chairmanPersonality: 'Traditionalist', balance: 140000000 },
    'Milan Devils': { name: 'Milan Devils', league: 'Serie A', players: generatePlayers(83, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Ambitious Tycoon', balance: 120000000 },
    'Milan Snakes': { name: 'Milan Snakes', league: 'Serie A', players: generatePlayers(84, 'IT'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 91, chairmanPersonality: 'Moneyball Advocate', balance: 130000000 },
    'Rome Wolves': { name: 'Rome Wolves', league: 'Serie A', players: generatePlayers(80, 'IT'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 75000000 },
    'Napoli Blue': { name: 'Napoli Blue', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 84, chairmanPersonality: 'Ambitious Tycoon', balance: 85000000 },
    'Lazio Eagles': { name: 'Lazio Eagles', league: 'Serie A', players: generatePlayers(79, 'IT'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Traditionalist', balance: 55000000 },
    'Munich Wall': { name: 'Munich Wall', league: 'Bundesliga', players: generatePlayers(87, 'DE'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 96, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000 },
    'Dortmund Yellows': { name: 'Dortmund Yellows', league: 'Bundesliga', players: generatePlayers(82, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Moneyball Advocate', balance: 110000000 },
    'Leipzig Bulls': { name: 'Leipzig Bulls', league: 'Bundesliga', players: generatePlayers(81, 'DE'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Moneyball Advocate', balance: 120000000 },
    'Leverkusen 04': { name: 'Leverkusen 04', league: 'Bundesliga', players: generatePlayers(80, 'DE'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 70000000 },
    'Paris Blues': { name: 'Paris Blues', league: 'Ligue 1', players: generatePlayers(88, 'FR'), tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 94, chairmanPersonality: 'Ambitious Tycoon', balance: 650000000 },
    'Marseille O': { name: 'Marseille O', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 65000000 },
    'Lyon Lions': { name: 'Lyon Lions', league: 'Ligue 1', players: generatePlayers(78, 'FR'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 79, chairmanPersonality: 'Moneyball Advocate', balance: 50000000 },
    'Monaco Royals': { name: 'Monaco Royals', league: 'Ligue 1', players: generatePlayers(78, 'FR'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate', balance: 90000000 },
    'Miami Pink': { name: 'Miami Pink', league: 'MLS', players: [...generatePlayers(72, 'US').slice(0, 16), { name: 'Leo Messi', position: 'FWD', rating: 94, age: 39, nationality: '🇦🇷', personality: 'Ambitious', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 }], tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 45000000 },
    'LA Galaxy Stars': { name: 'LA Galaxy Stars', league: 'MLS', players: generatePlayers(71, 'US'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 72, chairmanPersonality: 'Fan-Focused Owner', balance: 35000000 },
    'NY Apples': { name: 'NY Apples', league: 'MLS', players: generatePlayers(70, 'US'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Moneyball Advocate', balance: 25000000 },
    'Seattle Sound': { name: 'Seattle Sound', league: 'MLS', players: generatePlayers(70, 'US'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Fan-Focused Owner', balance: 28000000 },
    'Atlanta Five': { name: 'Atlanta Five', league: 'MLS', players: generatePlayers(69, 'US'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 69, chairmanPersonality: 'Ambitious Tycoon', balance: 30000000 },
    'Toronto Reds': { name: 'Toronto Reds', league: 'MLS', players: generatePlayers(68, 'US'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 68, chairmanPersonality: 'Traditionalist', balance: 20000000 },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'Leo Messi', position: 'FWD', rating: 94, age: 39, nationality: '🇦🇷', personality: 'Ambitious', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Cristian Rolando', position: 'FWD', rating: 92, age: 41, nationality: '🇵🇹', personality: 'Mercenary', wage: 600000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Kylian Mbappa', position: 'FWD', rating: 93, age: 27, nationality: '🇫🇷', personality: 'Ambitious', wage: 450000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Eric Haaland', position: 'FWD', rating: 93, age: 26, nationality: '🇳🇴', personality: 'Ambitious', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Luka Modric', position: 'MID', rating: 88, age: 41, nationality: '🇭🇷', personality: 'Loyal', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Kevin De Bruyne', position: 'MID', rating: 91, age: 35, nationality: '🇧🇪', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'Sergio Ramos', position: 'DEF', rating: 84, age: 40, nationality: '🇪🇸', personality: 'Loyal', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Trent A-A', position: 'DEF', rating: 87, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Loyal', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Manuel Neuer', position: 'GK', rating: 86, age: 40, nationality: '🇩🇪', personality: 'Loyal', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'Thibaut Courtois', position: 'GK', rating: 90, age: 34, nationality: '🇧🇪', personality: 'Ambitious', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
];
