
import type { NationalTeam, Tournament, Player, PlayerPersonality, Team, Formation } from './types';
import { TRANSFER_TARGETS, FORMATIONS } from './constants';
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
        isStarter,
        // Added condition to satisfy Player interface
        condition: 100
    };
};

// Generate a filler team with DYNAMIC formations
const createFillerTeam = (name: string, countryCode: string, flag: string, prestige: number): NationalTeam => {
    // Pick a random formation
    const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
    
    let defCount = 4;
    let midCount = 4;
    let fwdCount = 2;

    switch (formation) {
        case '4-3-3': defCount = 4; midCount = 3; fwdCount = 3; break;
        case '5-3-2': defCount = 5; midCount = 3; fwdCount = 2; break;
        case '3-5-2': defCount = 3; midCount = 5; fwdCount = 2; break;
        case '4-4-2': default: defCount = 4; midCount = 4; fwdCount = 2; break;
    }

    // Generate starters based on formation
    const starters = [
        generateGenericNationalPlayer(flag, 'GK', prestige - 2, true),
        ...Array.from({ length: defCount }, () => generateGenericNationalPlayer(flag, 'DEF', prestige - 3, true)),
        ...Array.from({ length: midCount }, () => generateGenericNationalPlayer(flag, 'MID', prestige - 3, true)),
        ...Array.from({ length: fwdCount }, () => generateGenericNationalPlayer(flag, 'FWD', prestige - 1, true)),
    ];

    // Standard Bench
    const bench = [
        ...Array.from({ length: 2 }, () => generateGenericNationalPlayer(flag, 'DEF', prestige - 5, false)),
        ...Array.from({ length: 3 }, () => generateGenericNationalPlayer(flag, 'MID', prestige - 5, false)),
        ...Array.from({ length: 2 }, () => generateGenericNationalPlayer(flag, 'FWD', prestige - 5, false)),
    ];

    return {
        name,
        countryCode,
        prestige,
        tactic: { formation: formation, mentality: 'Balanced' },
        players: [...starters, ...bench]
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
        isStarter,
        // Added condition to satisfy Player interface
        condition: 100
    }
}

// 5 Detailed Teams with proper defensive lines
const DETAILED_TEAMS: NationalTeam[] = [
    {
        name: 'Argentina',
        countryCode: 'ARG',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 92,
        players: [
            // Starters (11) - 4-3-3
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇦🇷').map(p => ({...p, isStarter: true})), // Messi (FWD)
            getNationalPlayer('🇦🇷', 'E. Martinez', 89, 'GK', 34, 'Ambitious'),
            getNationalPlayer('🇦🇷', 'C. Romero', 87, 'DEF', 29, 'Ambitious'),
            getNationalPlayer('🇦🇷', 'Li. Martinez', 86, 'DEF', 29, 'Ambitious'),
            getNationalPlayer('🇦🇷', 'N. Molina', 84, 'DEF', 29),
            getNationalPlayer('🇦🇷', 'N. Tagliafico', 83, 'DEF', 34, 'Loyal'),
            getNationalPlayer('🇦🇷', 'E. Fernandez', 87, 'MID', 26, 'Young Prospect'),
            getNationalPlayer('🇦🇷', 'R. De Paul', 85, 'MID', 33, 'Loyal'),
            getNationalPlayer('🇦🇷', 'A. Mac Allister', 86, 'MID', 28),
            getNationalPlayer('🇦🇷', 'La. Martinez', 88, 'FWD', 29),
            getNationalPlayer('🇦🇷', 'J. Alvarez', 87, 'FWD', 27),
            
            // Bench
            getNationalPlayer('🇦🇷', 'G. Rulli', 80, 'GK', 34, 'Loyal', false),
            getNationalPlayer('🇦🇷', 'N. Otamendi', 83, 'DEF', 39, 'Loyal', false),
            getNationalPlayer('🇦🇷', 'G. Montiel', 81, 'DEF', 30, 'Loyal', false),
            getNationalPlayer('🇦🇷', 'G. Lo Celso', 83, 'MID', 30, 'Ambitious', false),
            getNationalPlayer('🇦🇷', 'L. Paredes', 82, 'MID', 32, 'Ambitious', false),
            getNationalPlayer('🇦🇷', 'A. Di Maria', 85, 'FWD', 39, 'Loyal', false),
            getNationalPlayer('🇦🇷', 'P. Dybala', 84, 'FWD', 33, 'Ambitious', false),
        ]
    },
    {
        name: 'France',
        countryCode: 'FRA',
        tactic: { formation: '4-3-3', mentality: 'Balanced' },
        prestige: 94,
        players: [
             // Starters (11) - 4-3-3
             ...TRANSFER_TARGETS.filter(p => p.nationality === '🇫🇷').map(p => ({...p, isStarter: true})), // Mbappe (FWD)
             getNationalPlayer('🇫🇷', 'M. Maignan', 89, 'GK', 31),
             getNationalPlayer('🇫🇷', 'T. Hernandez', 88, 'DEF', 29, 'Attacking' as any),
             getNationalPlayer('🇫🇷', 'W. Saliba', 88, 'DEF', 26),
             getNationalPlayer('🇫🇷', 'D. Upamecano', 86, 'DEF', 28),
             getNationalPlayer('🇫🇷', 'J. Kounde', 87, 'DEF', 28),
             getNationalPlayer('🇫🇷', 'A. Tchouameni', 88, 'MID', 27),
             getNationalPlayer('🇫🇷', 'E. Camavinga', 87, 'MID', 24, 'Young Prospect'),
             getNationalPlayer('🇫🇷', 'A. Griezmann', 88, 'MID', 36, 'Loyal'),
             getNationalPlayer('🇫🇷', 'O. Dembele', 86, 'FWD', 30),
             getNationalPlayer('🇫🇷', 'M. Thuram', 85, 'FWD', 29),

             // Bench
             getNationalPlayer('🇫🇷', 'A. Areola', 82, 'GK', 34, 'Loyal', false),
             getNationalPlayer('🇫🇷', 'I. Konate', 85, 'DEF', 28, 'Ambitious', false),
             getNationalPlayer('🇫🇷', 'F. Mendy', 84, 'DEF', 31, 'Loyal', false),
             getNationalPlayer('🇫🇷', 'Y. Fofana', 83, 'MID', 28, 'Balanced' as any, false),
             getNationalPlayer('🇫🇷', 'W. Zaire-Emery', 82, 'MID', 21, 'Young Prospect', false),
             getNationalPlayer('🇫🇷', 'R. Kolo Muani', 84, 'FWD', 28, 'Ambitious', false),
             getNationalPlayer('🇫🇷', 'O. Giroud', 80, 'FWD', 40, 'Loyal', false),
        ]
    },
    {
        name: 'Brazil',
        countryCode: 'BRA',
        tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, 
        prestige: 93,
        players: [
            // Starters (11) - 4-3-3
            getNationalPlayer('🇧🇷', 'Alisson', 90, 'GK', 34),
            getNationalPlayer('🇧🇷', 'Danilo', 84, 'DEF', 35, 'Loyal'),
            getNationalPlayer('🇧🇷', 'Marquinhos', 88, 'DEF', 33, 'Leader' as any),
            getNationalPlayer('🇧🇷', 'E. Militao', 87, 'DEF', 29),
            getNationalPlayer('🇧🇷', 'G. Magalhaes', 86, 'DEF', 29),
            getNationalPlayer('🇧🇷', 'Casemiro', 87, 'MID', 35),
            getNationalPlayer('🇧🇷', 'B. Guimaraes', 87, 'MID', 29),
            getNationalPlayer('🇧🇷', 'L. Paqueta', 85, 'MID', 29),
            getNationalPlayer('🇧🇷', 'Vini Jr.', 92, 'FWD', 26, 'Ambitious'),
            getNationalPlayer('🇧🇷', 'Rodrygo', 88, 'FWD', 26),
            getNationalPlayer('🇧🇷', 'Neymar Jr.', 88, 'FWD', 35, 'Mercenary'),

            // Bench
            getNationalPlayer('🇧🇷', 'Ederson', 89, 'GK', 33, 'Ambitious', false),
            getNationalPlayer('🇧🇷', 'Bremer', 85, 'DEF', 30, 'Loyal', false),
            getNationalPlayer('🇧🇷', 'Vanderson', 82, 'DEF', 25, 'Young Prospect', false),
            getNationalPlayer('🇧🇷', 'Douglas Luiz', 84, 'MID', 29, 'Balanced' as any, false),
            getNationalPlayer('🇧🇷', 'Martinelli', 86, 'FWD', 25, 'Young Prospect', false),
            getNationalPlayer('🇧🇷', 'Endrick', 83, 'FWD', 20, 'Young Prospect', false),
            getNationalPlayer('🇧🇷', 'Raphinha', 85, 'FWD', 30, 'Ambitious', false),
        ]
    },
    {
        name: 'England',
        countryCode: 'ENG',
        tactic: { formation: '5-3-2', mentality: 'Attacking' }, // CHANGED TO 5-3-2
        prestige: 91,
        players: [
            // Starters (11) - 5-3-2 (5 DEF, 3 MID, 2 FWD)
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🏴󠁧󠁢󠁥󠁮󠁧󠁿').map(p => ({...p, isStarter: true})), // Trent (DEF)
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Pickford', 86, 'GK', 33),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'K. Walker', 85, 'DEF', 37, 'Loyal'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Stones', 88, 'DEF', 33),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'M. Guehi', 85, 'DEF', 26, 'Ambitious'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L. Shaw', 84, 'DEF', 31),
            // Mids
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'D. Rice', 90, 'MID', 28, 'Leader' as any),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Bellingham', 93, 'MID', 23, 'Ambitious'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'P. Foden', 90, 'MID', 27),
            // Fwds
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'B. Saka', 90, 'FWD', 25),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'H. Kane', 92, 'FWD', 33),

            // Bench
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Grealish', 85, 'FWD', 31, 'Ambitious', false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'A. Ramsdale', 83, 'GK', 29, 'Loyal', false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'H. Maguire', 82, 'DEF', 34, 'Loyal', false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'B. Chillwell', 83, 'DEF', 30, 'Injured' as any, false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'C. Palmer', 87, 'MID', 25, 'Young Prospect', false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'K. Mainoo', 84, 'MID', 22, 'Young Prospect', false),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'O. Watkins', 85, 'FWD', 31, 'Ambitious', false),
        ]
    },
     {
        name: 'Portugal',
        countryCode: 'POR',
        tactic: { formation: '3-5-2', mentality: 'Attacking' }, // CHANGED TO 3-5-2
        prestige: 90,
        players: [
            // Starters (11) - 3-5-2 (3 DEF, 5 MID, 2 FWD)
            getNationalPlayer('🇵🇹', 'D. Costa', 87, 'GK', 27),
            // 3 CBs
            getNationalPlayer('🇵🇹', 'R. Dias', 90, 'DEF', 30),
            getNationalPlayer('🇵🇹', 'G. Inacio', 85, 'DEF', 25),
            getNationalPlayer('🇵🇹', 'A. Silva', 84, 'DEF', 23, 'Young Prospect'),
            // 5 Mids (Inc Wingbacks)
            getNationalPlayer('🇵🇹', 'J. Cancelo', 87, 'MID', 33), // Playing WB as MID slot
            getNationalPlayer('🇵🇹', 'N. Mendes', 86, 'MID', 25), // Playing WB as MID slot
            getNationalPlayer('🇵🇹', 'J. Palhinha', 86, 'MID', 31),
            getNationalPlayer('🇵🇹', 'B. Fernandes', 89, 'MID', 32, 'Ambitious'),
            getNationalPlayer('🇵🇹', 'B. Silva', 88, 'MID', 32),
            // 2 Fwds
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇵🇹').map(p => ({...p, isStarter: true})), // Ronaldo (FWD)
            getNationalPlayer('🇵🇹', 'R. Leao', 88, 'FWD', 28),

            // Bench
            getNationalPlayer('🇵🇹', 'D. Jota', 86, 'FWD', 30, 'Ambitious', false),
            getNationalPlayer('🇵🇹', 'J. Sa', 82, 'GK', 34, 'Loyal', false),
            getNationalPlayer('🇵🇹', 'D. Dalot', 84, 'DEF', 28, 'Balanced' as any, false),
            getNationalPlayer('🇵🇹', 'Vitinha', 85, 'MID', 27, 'Balanced' as any, false),
            getNationalPlayer('🇵🇹', 'J. Neves', 84, 'MID', 22, 'Young Prospect', false),
            getNationalPlayer('🇵🇹', 'J. Felix', 85, 'FWD', 27, 'Ambitious', false),
            getNationalPlayer('🇵🇹', 'G. Ramos', 84, 'FWD', 26, 'Young Prospect', false),
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
            group: GROUP_NAMES[groupIndex],
            // Added balance to satisfy Team interface
            balance: 0
        };
    });

    return wcTeams;
};

export const TOURNAMENTS: Tournament[] = [
    { name: 'Euros', host: 'UK/Ireland', year: 2028, teams: ['ENG', 'FRA', 'GER', 'ITA', 'ESP', 'POR', 'NED', 'BEL', 'CRO', 'DEN', 'SUI', 'AUT', 'POL', 'TUR', 'SCO', 'UKR'] },
    { name: 'Copa América', host: 'TBC', year: 2028, teams: ['ARG', 'BRA', 'URU', 'COL', 'CHI', 'ECU', 'PER', 'PAR', 'VEN', 'BOL', 'USA', 'MEX'] },
    { name: 'World Cup', host: 'Spain/Portugal/Morocco', year: 2030, teams: ['ALL'] },
];
