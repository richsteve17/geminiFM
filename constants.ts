import type { Team, Tactic, ChairmanPersonality, Player, PlayerPersonality, TouchlineShout } from './types';

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
    'Young Prospect': 'Looking for playing time and a good environment to develop.'
};

export const TOUCHLINE_SHOUTS: Record<TouchlineShout, string> = {
    'Encourage': 'Boost morale and inspire players to keep fighting.',
    'Demand More': 'Challenge your players to increase their intensity and effort.',
    'Tighten Up': 'Instruct the team to focus on defensive shape and reduce risks.',
    'Push Forward': 'Urge players to take more risks and commit to attacking.',
};

const PREMIER_LEAGUE_NATIONALITIES = [
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇧🇷', '🇧🇷', '🇪🇸', '🇪🇸', '🇫🇷', '🇵🇹', '🇳🇱', '🇦🇷', '🇩🇪', '🇮🇪', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🇧🇪', '🇨🇮', '🇳🇬', '🇸🇳', '🇩🇰', '🇨🇭'
];

const generatePlayers = (baseRating: number, namePrefix: string): Player[] => ([
    { name: `${namePrefix} GK`, position: 'GK', rating: baseRating + 2, age: 28, nationality: PREMIER_LEAGUE_NATIONALITIES[Math.floor(Math.random() * PREMIER_LEAGUE_NATIONALITIES.length)], personality: 'Loyal', wage: 50000, status: { type: 'Available' }, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1 },
    ...Array.from({ length: 4 }, (_, i) => ({ name: `${namePrefix} DEF ${i+1}`, position: 'DEF' as const, rating: baseRating - 2 + i, age: 26+i, nationality: PREMIER_LEAGUE_NATIONALITIES[Math.floor(Math.random() * PREMIER_LEAGUE_NATIONALITIES.length)], personality: 'Loyal' as const, wage: 40000 + i*2000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1 })),
    ...Array.from({ length: 4 }, (_, i) => ({ name: `${namePrefix} MID ${i+1}`, position: 'MID' as const, rating: baseRating + i, age: 24+i, nationality: PREMIER_LEAGUE_NATIONALITIES[Math.floor(Math.random() * PREMIER_LEAGUE_NATIONALITIES.length)], personality: 'Ambitious' as const, wage: 60000 + i*5000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1 })),
    ...Array.from({ length: 2 }, (_, i) => ({ name: `${namePrefix} FWD ${i+1}`, position: 'FWD' as const, rating: baseRating + 3 + i, age: 22+i, nationality: PREMIER_LEAGUE_NATIONALITIES[Math.floor(Math.random() * PREMIER_LEAGUE_NATIONALITIES.length)], personality: 'Ambitious' as const, wage: 80000 + i*10000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 4) + 1 })),
    ...Array.from({ length: 7 }, (_, i) => ({ name: `Sub ${i+1}`, position: (['DEF', 'MID', 'FWD', 'GK', 'MID', 'DEF', 'FWD'] as const)[i], rating: baseRating - 5 + i, age: 18+i, nationality: PREMIER_LEAGUE_NATIONALITIES[Math.floor(Math.random() * PREMIER_LEAGUE_NATIONALITIES.length)], personality: 'Young Prospect' as const, wage: 15000 + i * 1000, status: { type: 'Available' } as const, effects: [], contractExpires: Math.floor(Math.random() * 3) + 1 })),
]);

export const TEAMS: Record<string, Team> = {
    'Manchester Rovers': {
        name: 'Manchester Rovers', players: generatePlayers(82, 'Rov'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 85, chairmanPersonality: 'Fan-Focused Owner'
    },
    'London City': {
        name: 'London City', players: [
            ...generatePlayers(85, 'LC').slice(0, 17),
            { name: 'Kev De Bruin', position: 'MID', rating: 92, age: 32, nationality: '🇧🇪', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 0 },
        ], tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 92, chairmanPersonality: 'Ambitious Tycoon'
    },
    'Liverpool Wanderers': {
        name: 'Liverpool Wanderers', players: [
            ...generatePlayers(84, 'Liv').slice(0, 16),
            { name: 'Vince Van Dijk', position: 'DEF', rating: 90, age: 32, nationality: '🇳🇱', personality: 'Loyal', wage: 280000, status: { type: 'Available' }, effects: [], contractExpires: 0 },
            { name: 'Mo Salah', position: 'FWD', rating: 90, age: 31, nationality: '🇪🇬', personality: 'Loyal', wage: 320000, status: { type: 'Available' }, effects: [], contractExpires: 1 },
        ], tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 90, chairmanPersonality: 'Ambitious Tycoon'
    },
    'Arsenal United': {
        name: 'Arsenal United', players: generatePlayers(80, 'Ars'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 82, chairmanPersonality: 'Traditionalist'
    },
    'Northern Power': {
        name: 'Northern Power', players: generatePlayers(78, 'NP'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner'
    },
    'West Country AFC': {
        name: 'West Country AFC', players: generatePlayers(75, 'WC'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 70, chairmanPersonality: 'Moneyball Advocate'
    },
    'Midlands FC': {
        name: 'Midlands FC', players: generatePlayers(76, 'Mid'), tactic: { formation: '5-3-2', mentality: 'Park the Bus' }, prestige: 72, chairmanPersonality: 'Traditionalist'
    },
    'Southern Giants': {
        name: 'Southern Giants', players: [
            ...generatePlayers(79, 'SG').slice(0, 17),
            { name: 'Jude Bellinger', position: 'MID', rating: 91, age: 20, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 4 },
        ], tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate'
    },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'Leo Messi', position: 'FWD', rating: 94, age: 36, nationality: '🇦🇷', personality: 'Ambitious', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1 },
    { name: 'Cristian Rolando', position: 'FWD', rating: 92, age: 38, nationality: '🇵🇹', personality: 'Mercenary', wage: 600000, status: { type: 'Available' }, effects: [], contractExpires: 1 },
    { name: 'Kylian Mbappa', position: 'FWD', rating: 93, age: 24, nationality: '🇫🇷', personality: 'Ambitious', wage: 450000, status: { type: 'Available' }, effects: [], contractExpires: 5 },
    { name: 'Eric Haaland', position: 'FWD', rating: 93, age: 23, nationality: '🇳🇴', personality: 'Ambitious', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 4 },
];