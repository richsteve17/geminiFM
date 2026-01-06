
import type { NationalTeam, Tournament, Player, PlayerPersonality, Team } from './types';
import { TRANSFER_TARGETS } from './constants';
import { generateName } from './utils';

// Helper to generate a generic player for filler teams
const generateGenericNationalPlayer = (nationality: string, position: 'GK' | 'DEF' | 'MID' | 'FWD', rating: number, isStarter: boolean): Player => {
    return {
        name: generateName(nationality),
        nationality,
        rating,
        position,
        age: Math.floor(Math.random() * 10) + 20,
        personality: 'Loyal',
        wage: 50000,
        status: { type: 'Available' },
        effects: [],
        contractExpires: 3,
        isStarter
    };
};

// Generate a filler team (e.g., Germany) if not detailed
const createFillerTeam = (name: string, countryCode: string, flag: string, prestige: number): NationalTeam => {
    return {
        name,
        countryCode,
        prestige,
        tactic: { formation: '4-4-2', mentality: 'Balanced' },
        players: [
            generateGenericNationalPlayer(flag, 'GK', prestige - 2, true),
            ...Array.from({ length: 4 }, () => generateGenericNationalPlayer(flag, 'DEF', prestige - 3, true)),
            ...Array.from({ length: 4 }, () => generateGenericNationalPlayer(flag, 'MID', prestige - 3, true)),
            ...Array.from({ length: 2 }, () => generateGenericNationalPlayer(flag, 'FWD', prestige - 1, true)),
            ...Array.from({ length: 7 }, () => generateGenericNationalPlayer(flag, 'MID', prestige - 5, false)), // Bench
        ]
    };
};

const getNationalPlayer = (nationality: string, name: string, rating: number, position: 'GK' | 'DEF' | 'MID' | 'FWD', age: number, personality: PlayerPersonality = 'Ambitious', isStarter: boolean = true): Player => {
    return {
        name,
        nationality,
        rating,
        position,
        age,
        personality,
        wage: rating * 5000,
        status: { type: 'Available' },
        effects: [],
        contractExpires: 3,
        isStarter
    }
}

// 5 Detailed Teams
const DETAILED_TEAMS: NationalTeam[] = [
    {
        name: 'Argentina',
        countryCode: 'ARG',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 92,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇦🇷').map(p => ({...p, isStarter: true})),
            getNationalPlayer('🇦🇷', 'E. Martinez', 88, 'GK', 34),
            getNationalPlayer('🇦🇷', 'C. Romero', 86, 'DEF', 29),
            getNationalPlayer('🇦🇷', 'L. Martinez', 87, 'FWD', 29),
            getNationalPlayer('🇦🇷', 'A. Di Maria', 85, 'FWD', 39, 'Loyal'),
            getNationalPlayer('🇦🇷', 'E. Fernandez', 86, 'MID', 26, 'Young Prospect'),
            ...Array.from({ length: 5 }, () => generateGenericNationalPlayer('🇦🇷', 'MID', 82, false)), // Fill bench
        ]
    },
    {
        name: 'France',
        countryCode: 'FRA',
        tactic: { formation: '4-3-3', mentality: 'Balanced' },
        prestige: 94,
        players: [
             ...TRANSFER_TARGETS.filter(p => p.nationality === '🇫🇷').map(p => ({...p, isStarter: true})),
             getNationalPlayer('🇫🇷', 'M. Maignan', 89, 'GK', 31),
             getNationalPlayer('🇫🇷', 'W. Saliba', 87, 'DEF', 26, 'Young Prospect'),
             getNationalPlayer('🇫🇷', 'A. Griezmann', 89, 'FWD', 36),
             getNationalPlayer('🇫🇷', 'A. Tchouameni', 88, 'MID', 27, 'Young Prospect'),
             getNationalPlayer('🇫🇷', 'O. Dembele', 86, 'FWD', 30),
             ...Array.from({ length: 5 }, () => generateGenericNationalPlayer('🇫🇷', 'DEF', 83, false)),
        ]
    },
    {
        name: 'Brazil',
        countryCode: 'BRA',
        tactic: { formation: '4-3-3', mentality: 'All-Out Attack' },
        prestige: 93,
        players: [
            getNationalPlayer('🇧🇷', 'Alisson', 90, 'GK', 34),
            getNationalPlayer('🇧🇷', 'Marquinhos', 88, 'DEF', 33),
            getNationalPlayer('🇧🇷', 'Vini Jr.', 92, 'FWD', 26, 'Ambitious'),
            getNationalPlayer('🇧🇷', 'Neymar Jr.', 88, 'FWD', 35),
            getNationalPlayer('🇧🇷', 'Casemiro', 88, 'MID', 35),
            getNationalPlayer('🇧🇷', 'Rodrygo', 87, 'FWD', 26, 'Young Prospect'),
            ...Array.from({ length: 5 }, () => generateGenericNationalPlayer('🇧🇷', 'MID', 84, false)),
        ]
    },
    {
        name: 'England',
        countryCode: 'ENG',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 91,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🏴󠁧󠁢󠁥󠁮󠁧󠁿').map(p => ({...p, isStarter: true})),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'H. Kane', 92, 'FWD', 33),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'D. Rice', 89, 'MID', 28),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'P. Foden', 90, 'MID', 27, 'Young Prospect'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'K. Walker', 86, 'DEF', 37, 'Loyal'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Pickford', 86, 'GK', 33),
            ...Array.from({ length: 5 }, () => generateGenericNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'DEF', 82, false)),
        ]
    },
     {
        name: 'Portugal',
        countryCode: 'POR',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 90,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇵🇹').map(p => ({...p, isStarter: true})),
            getNationalPlayer('🇵🇹', 'B. Fernandes', 89, 'MID', 32),
            getNationalPlayer('🇵🇹', 'R. Dias', 89, 'DEF', 30),
            getNationalPlayer('🇵🇹', 'B. Silva', 88, 'MID', 32),
            getNationalPlayer('🇵🇹', 'R. Leao', 87, 'FWD', 28),
            ...Array.from({ length: 7 }, () => generateGenericNationalPlayer('🇵🇹', 'MID', 81, false)),
        ]
    },
];

const FILLER_TEAMS = [
    createFillerTeam('Germany', 'GER', '🇩🇪', 89),
    createFillerTeam('Spain', 'ESP', '🇪🇸', 89),
    createFillerTeam('Italy', 'ITA', '🇮🇹', 88),
    createFillerTeam('Netherlands', 'NED', '🇳🇱', 86),
    createFillerTeam('Belgium', 'BEL', '🇧🇪', 85),
    createFillerTeam('Croatia', 'CRO', '🇭🇷', 84),
    createFillerTeam('Uruguay', 'URU', '🇺🇾', 83),
    createFillerTeam('USA', 'USA', '🇺🇸', 80),
    createFillerTeam('Mexico', 'MEX', '🇲🇽', 79),
    createFillerTeam('Japan', 'JPN', '🇯🇵', 79),
    createFillerTeam('Morocco', 'MAR', '🇲🇦', 82),
    createFillerTeam('Senegal', 'SEN', '🇸🇳', 78),
    createFillerTeam('South Korea', 'KOR', '🇰🇷', 78),
    createFillerTeam('Switzerland', 'SUI', '🇨🇭', 79),
    createFillerTeam('Denmark', 'DEN', '🇩🇰', 79),
    createFillerTeam('Colombia', 'COL', '🇨🇴', 80),
    createFillerTeam('Chile', 'CHI', '🇨🇱', 77),
    createFillerTeam('Nigeria', 'NGA', '🇳🇬', 76),
    createFillerTeam('Egypt', 'EGY', '🇪🇬', 76),
    createFillerTeam('Australia', 'AUS', '🇦🇺', 74),
    createFillerTeam('Canada', 'CAN', '🇨🇦', 75),
    createFillerTeam('Poland', 'POL', '🇵🇱', 78),
    createFillerTeam('Turkey', 'TUR', '🇹🇷', 77),
    createFillerTeam('Ukraine', 'UKR', '🇺🇦', 76),
    createFillerTeam('Sweden', 'SWE', '🇸🇪', 77),
    createFillerTeam('Iran', 'IRN', '🇮🇷', 75),
    createFillerTeam('Saudi Arabia', 'KSA', '🇸🇦', 73),
    // Additional Expansion teams to reach 48+
    createFillerTeam('Serbia', 'SRB', '🇷🇸', 77),
    createFillerTeam('Austria', 'AUT', '🇦🇹', 77),
    createFillerTeam('Hungary', 'HUN', '🇭🇺', 75),
    createFillerTeam('Scotland', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 75),
    createFillerTeam('Wales', 'WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 74),
    createFillerTeam('Norway', 'NOR', '🇳🇴', 78),
    createFillerTeam('Czechia', 'CZE', '🇨🇿', 76),
    createFillerTeam('Ivory Coast', 'CIV', '🇨🇮', 77),
    createFillerTeam('Ghana', 'GHA', '🇬🇭', 76),
    createFillerTeam('Algeria', 'ALG', '🇩🇿', 77),
    createFillerTeam('Tunisia', 'TUN', '🇹🇳', 74),
    createFillerTeam('Cameroon', 'CMR', '🇨🇲', 75),
    createFillerTeam('Costa Rica', 'CRC', '🇨🇷', 73),
    createFillerTeam('Panama', 'PAN', '🇵🇦', 72),
    createFillerTeam('Jamaica', 'JAM', '🇯🇲', 73),
    createFillerTeam('Ecuador', 'ECU', '🇪🇨', 78),
    createFillerTeam('Paraguay', 'PAR', '🇵🇾', 75),
    createFillerTeam('Peru', 'PER', '🇵🇪', 74),
    createFillerTeam('Qatar', 'QAT', '🇶🇦', 71),
    createFillerTeam('New Zealand', 'NZL', '🇳🇿', 70),
    createFillerTeam('Slovenia', 'SVN', '🇸🇮', 74),
    createFillerTeam('Slovakia', 'SVK', '🇸🇰', 74),
    createFillerTeam('Romania', 'ROU', '🇷🇴', 75),
];

// Combine and Export
export const NATIONAL_TEAMS = [...DETAILED_TEAMS, ...FILLER_TEAMS];

// Groups Config for 2026 (48 team format)
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const generateWorldCupStructure = (): Record<string, Team> => {
    // Convert NationalTeam to Team and Assign Groups
    const shuffled = [...NATIONAL_TEAMS].sort(() => 0.5 - Math.random());
    const wcTeams: Record<string, Team> = {};

    // Ensure we fill 12 groups of 4 (48 teams)
    const teams48 = shuffled.slice(0, 48);

    teams48.forEach((nt, index) => {
        const groupIndex = Math.floor(index / 4);
        wcTeams[nt.name] = {
            name: nt.name,
            league: 'International',
            players: nt.players,
            tactic: nt.tactic,
            prestige: nt.prestige,
            chairmanPersonality: 'Traditionalist',
            group: GROUP_NAMES[groupIndex]
        };
    });

    return wcTeams;
};

export const TOURNAMENTS: Tournament[] = [
    { name: 'Euros', host: 'UK/Ireland', year: 2028, teams: ['ENG', 'FRA', 'GER', 'ITA', 'ESP', 'POR', 'NED', 'BEL', 'CRO', 'DEN', 'SUI', 'AUT', 'POL', 'TUR', 'SCO', 'UKR'] },
    { name: 'Copa América', host: 'TBC', year: 2028, teams: ['ARG', 'BRA', 'URU', 'COL', 'CHI', 'ECU', 'PER', 'PAR', 'VEN', 'BOL', 'USA', 'MEX'] },
    { name: 'World Cup', host: 'Spain/Portugal/Morocco', year: 2030, teams: ['ALL'] },
];
