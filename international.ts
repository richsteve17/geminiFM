

// FIX: Imported Player and PlayerPersonality types to ensure type safety.
import type { NationalTeam, Tournament, Player, PlayerPersonality } from './types';
import { TRANSFER_TARGETS } from './constants';

// FIX: Added Player return type and missing properties (status, effects) to conform to the Player type. The personality type was also updated to PlayerPersonality.
const getNationalPlayer = (nationality: string, name: string, rating: number, position: 'GK' | 'DEF' | 'MID' | 'FWD', age: number, personality: PlayerPersonality = 'Ambitious'): Player => {
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
        contractExpires: 3, // Default value for national players
    }
}

export const NATIONAL_TEAMS: NationalTeam[] = [
    {
        name: 'Argentina',
        countryCode: 'ARG',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 92,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇦🇷'),
            getNationalPlayer('🇦🇷', 'E. Martinez', 88, 'GK', 31),
            getNationalPlayer('🇦🇷', 'C. Romero', 86, 'DEF', 26),
            getNationalPlayer('🇦🇷', 'L. Martinez', 87, 'FWD', 26),
            getNationalPlayer('🇦🇷', 'A. Di Maria', 85, 'FWD', 36, 'Loyal'),
            getNationalPlayer('🇦🇷', 'E. Fernandez', 86, 'MID', 23, 'Young Prospect'),
        ]
    },
    {
        name: 'France',
        countryCode: 'FRA',
        tactic: { formation: '4-3-3', mentality: 'Balanced' },
        prestige: 94,
        players: [
             ...TRANSFER_TARGETS.filter(p => p.nationality === '🇫🇷'),
             getNationalPlayer('🇫🇷', 'M. Maignan', 89, 'GK', 28),
             getNationalPlayer('🇫🇷', 'W. Saliba', 87, 'DEF', 23, 'Young Prospect'),
             getNationalPlayer('🇫🇷', 'A. Griezmann', 89, 'FWD', 33),
             getNationalPlayer('🇫🇷', 'A. Tchouameni', 88, 'MID', 24, 'Young Prospect'),
             getNationalPlayer('🇫🇷', 'O. Dembele', 86, 'FWD', 27),
        ]
    },
    {
        name: 'Brazil',
        countryCode: 'BRA',
        tactic: { formation: '4-3-3', mentality: 'All-Out Attack' },
        prestige: 93,
        players: [
            getNationalPlayer('🇧🇷', 'Alisson', 90, 'GK', 31),
            getNationalPlayer('🇧🇷', 'Marquinhos', 88, 'DEF', 30),
            getNationalPlayer('🇧🇷', 'Vini Jr.', 92, 'FWD', 23, 'Ambitious'),
            getNationalPlayer('🇧🇷', 'Neymar Jr.', 88, 'FWD', 32),
            getNationalPlayer('🇧🇷', 'Casemiro', 88, 'MID', 32),
            getNationalPlayer('🇧🇷', 'Rodrygo', 87, 'FWD', 23, 'Young Prospect'),
        ]
    },
    {
        name: 'England',
        countryCode: 'ENG',
        // FIX: '4-2-3-1' is not a valid formation type. Changed to '4-3-3' which is valid and fits an attacking style.
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 91,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'H. Kane', 92, 'FWD', 30),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'D. Rice', 89, 'MID', 25),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'P. Foden', 90, 'MID', 24, 'Young Prospect'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'K. Walker', 86, 'DEF', 34, 'Loyal'),
            getNationalPlayer('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'J. Pickford', 86, 'GK', 30),
        ]
    },
     {
        name: 'Portugal',
        countryCode: 'POR',
        tactic: { formation: '4-3-3', mentality: 'Attacking' },
        prestige: 90,
        players: [
            ...TRANSFER_TARGETS.filter(p => p.nationality === '🇵🇹'),
            getNationalPlayer('🇵🇹', 'B. Fernandes', 89, 'MID', 29),
            getNationalPlayer('🇵🇹', 'R. Dias', 89, 'DEF', 27),
            getNationalPlayer('🇵🇹', 'B. Silva', 88, 'MID', 29),
            getNationalPlayer('🇵🇹', 'R. Leao', 87, 'FWD', 25),
        ]
    },
];

export const TOURNAMENTS: Tournament[] = [
    { name: 'World Cup', host: 'USA/Mexico/Canada', year: 2026, teams: ['ALL'] },
    { name: 'Euros', host: 'UK/Ireland', year: 2028, teams: ['ENG', 'FRA', 'GER', 'ITA', 'ESP', 'POR', 'NED', 'BEL', 'CRO', 'DEN', 'SUI', 'AUT', 'POL', 'TUR', 'SCO', 'UKR'] },
    { name: 'Copa América', host: 'TBC', year: 2028, teams: ['ARG', 'BRA', 'URU', 'COL', 'CHI', 'ECU', 'PER', 'PAR', 'VEN', 'BOL', 'USA', 'MEX'] },
];