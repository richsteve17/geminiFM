
import type { NationalTeam, Team, Player, PlayerPosition, PlayerPersonality, Formation, PlayerEffect } from './types';
import { generateName } from './utils';

// Helper for minor nations (background simulation only)
const getGenericPlayer = (nationalityCode: string, flag: string, rating: number, position: PlayerPosition, isStarter: boolean = true): Player => ({
    name: generateName(flag), // Use flag for name generation to match utils.ts
    nationality: flag,
    rating: Math.round(rating),
    position,
    age: 20 + Math.floor(Math.random() * 12),
    personality: 'Ambitious',
    wage: 50000,
    status: { type: 'Available' },
    effects: [],
    contractExpires: 3,
    isStarter: isStarter,
    condition: 100
});

const generateGenericSquad = (flag: string, rating: number, countryCode: string): Player[] => {
    return [
        getGenericPlayer(countryCode, flag, rating + 1, 'GK', true),
        getGenericPlayer(countryCode, flag, rating, 'CB', true),
        getGenericPlayer(countryCode, flag, rating - 1, 'CB', true),
        getGenericPlayer(countryCode, flag, rating - 1, 'LB', true),
        getGenericPlayer(countryCode, flag, rating - 1, 'RB', true),
        getGenericPlayer(countryCode, flag, rating, 'DM', true),
        getGenericPlayer(countryCode, flag, rating + 1, 'CM', true),
        getGenericPlayer(countryCode, flag, rating + 1, 'CM', true),
        getGenericPlayer(countryCode, flag, rating + 2, 'LW', true),
        getGenericPlayer(countryCode, flag, rating + 2, 'ST', true),
        getGenericPlayer(countryCode, flag, rating + 1, 'RW', true),
        // Bench - Explicitly set isStarter to false
        ...Array(12).fill(null).map(() => getGenericPlayer(countryCode, flag, rating - 5, 'CM', false))
    ];
};

// REAL SQUADS
const ENGLAND_SQUAD: Player[] = [
    { name: 'J. Pickford', position: 'GK', rating: 86, age: 33, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Volatile', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'L. Shaw', position: 'LB', rating: 84, age: 31, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 90 },
    { name: 'J. Stones', position: 'CB', rating: 87, age: 33, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'M. Guehi', position: 'CB', rating: 85, age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'K. Walker', position: 'RB', rating: 85, age: 37, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'D. Rice', position: 'DM', rating: 90, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'J. Bellingham', position: 'CM', rating: 94, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 300000, status: { type: 'Available' }, effects: [{type: 'PostTournamentMorale', morale: 'Winner', message: 'Golden Boy', until: 10}], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'P. Foden', position: 'AM', rating: 91, age: 27, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'B. Saka', position: 'RW', rating: 90, age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'H. Kane', position: 'ST', rating: 92, age: 33, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'A. Gordon', position: 'LW', rating: 84, age: 26, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Volatile', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    // Bench
    { name: 'A. Ramsdale', position: 'GK', rating: 82, age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'C. Palmer', position: 'AM', rating: 88, age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'K. Mainoo', position: 'CM', rating: 85, age: 22, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Young Prospect', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'O. Watkins', position: 'ST', rating: 84, age: 31, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'L. Colwill', position: 'CB', rating: 83, age: 24, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'E. Eze', position: 'AM', rating: 83, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'T. Alexander-Arnold', position: 'RB', rating: 88, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

const FRANCE_SQUAD: Player[] = [
    { name: 'M. Maignan', position: 'GK', rating: 88, age: 31, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'T. Hernandez', position: 'LB', rating: 87, age: 29, nationality: '🇫🇷', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'W. Saliba', position: 'CB', rating: 89, age: 26, nationality: '🇫🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Upamecano', position: 'CB', rating: 86, age: 28, nationality: '🇫🇷', personality: 'Volatile', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Kounde', position: 'RB', rating: 87, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 170000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Tchouameni', position: 'DM', rating: 88, age: 27, nationality: '🇫🇷', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'E. Camavinga', position: 'CM', rating: 89, age: 24, nationality: '🇫🇷', personality: 'Ambitious', wage: 190000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'A. Griezmann', position: 'AM', rating: 86, age: 36, nationality: '🇫🇷', personality: 'Leader', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'K. Mbappe', position: 'LW', rating: 95, age: 28, nationality: '🇫🇷', personality: 'Ambitious', wage: 600000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'O. Dembele', position: 'RW', rating: 86, age: 30, nationality: '🇫🇷', personality: 'Volatile', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 95 },
    { name: 'M. Thuram', position: 'ST', rating: 85, age: 29, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    // Bench
    { name: 'B. Samba', position: 'GK', rating: 83, age: 33, nationality: '🇫🇷', personality: 'Leader', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'I. Konate', position: 'CB', rating: 85, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'W. Zaire-Emery', position: 'CM', rating: 86, age: 21, nationality: '🇫🇷', personality: 'Young Prospect', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: false, condition: 100 },
    { name: 'R. Kolo Muani', position: 'ST', rating: 84, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'B. Barcola', position: 'LW', rating: 85, age: 24, nationality: '🇫🇷', personality: 'Ambitious', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
];

const BRAZIL_SQUAD: Player[] = [
    { name: 'Ederson', position: 'GK', rating: 89, age: 33, nationality: '🇧🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Gabriel M.', position: 'CB', rating: 87, age: 29, nationality: '🇧🇷', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'E. Militao', position: 'CB', rating: 88, age: 29, nationality: '🇧🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Danilo', position: 'RB', rating: 82, age: 35, nationality: '🇧🇷', personality: 'Leader', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'Arana', position: 'LB', rating: 83, age: 29, nationality: '🇧🇷', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'B. Guimaraes', position: 'DM', rating: 87, age: 29, nationality: '🇧🇷', personality: 'Volatile', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'D. Luiz', position: 'CM', rating: 86, age: 29, nationality: '🇧🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'L. Paqueta', position: 'AM', rating: 85, age: 29, nationality: '🇧🇷', personality: 'Volatile', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Vini Jr', position: 'LW', rating: 92, age: 26, nationality: '🇧🇷', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Rodrygo', position: 'RW', rating: 89, age: 26, nationality: '🇧🇷', personality: 'Professional', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Endrick', position: 'ST', rating: 85, age: 20, nationality: '🇧🇷', personality: 'Young Prospect', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    // Bench
    { name: 'Alisson', position: 'GK', rating: 89, age: 34, nationality: '🇧🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'Marquinhos', position: 'CB', rating: 86, age: 33, nationality: '🇧🇷', personality: 'Leader', wage: 170000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'Savinho', position: 'RW', rating: 84, age: 23, nationality: '🇧🇷', personality: 'Young Prospect', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'Raphinha', position: 'LW', rating: 85, age: 30, nationality: '🇧🇷', personality: 'Professional', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'G. Martinelli', position: 'LW', rating: 85, age: 26, nationality: '🇧🇷', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
];

const GERMANY_SQUAD: Player[] = [
    { name: 'M. Ter Stegen', position: 'GK', rating: 88, age: 35, nationality: '🇩🇪', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'J. Kimmich', position: 'RB', rating: 88, age: 32, nationality: '🇩🇪', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'A. Rudiger', position: 'CB', rating: 88, age: 34, nationality: '🇩🇪', personality: 'Volatile', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'N. Schlotterbeck', position: 'CB', rating: 86, age: 27, nationality: '🇩🇪', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Raum', position: 'LB', rating: 84, age: 29, nationality: '🇩🇪', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'R. Andrich', position: 'DM', rating: 84, age: 32, nationality: '🇩🇪', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'J. Musiala', position: 'AM', rating: 91, age: 24, nationality: '🇩🇪', personality: 'Ambitious', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'F. Wirtz', position: 'AM', rating: 91, age: 24, nationality: '🇩🇪', personality: 'Ambitious', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'L. Sane', position: 'RW', rating: 86, age: 31, nationality: '🇩🇪', personality: 'Volatile', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'K. Havertz', position: 'ST', rating: 87, age: 28, nationality: '🇩🇪', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'N. Fullkrug', position: 'ST', rating: 83, age: 34, nationality: '🇩🇪', personality: 'Leader', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    // Bench
    { name: 'A. Nubel', position: 'GK', rating: 82, age: 30, nationality: '🇩🇪', personality: 'Professional', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'J. Tah', position: 'CB', rating: 85, age: 31, nationality: '🇩🇪', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'A. Pavlovic', position: 'CM', rating: 83, age: 23, nationality: '🇩🇪', personality: 'Young Prospect', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'S. Gnabry', position: 'LW', rating: 84, age: 31, nationality: '🇩🇪', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'K. Adeyemi', position: 'LW', rating: 83, age: 25, nationality: '🇩🇪', personality: 'Volatile', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
];

const ARGENTINA_SQUAD: Player[] = [
    { name: 'E. Martinez', position: 'GK', rating: 88, age: 34, nationality: '🇦🇷', personality: 'Volatile', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'N. Molina', position: 'RB', rating: 84, age: 29, nationality: '🇦🇷', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'C. Romero', position: 'CB', rating: 87, age: 29, nationality: '🇦🇷', personality: 'Volatile', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'L. Martinez', position: 'CB', rating: 86, age: 29, nationality: '🇦🇷', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'N. Tagliafico', position: 'LB', rating: 82, age: 34, nationality: '🇦🇷', personality: 'Loyal', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'R. De Paul', position: 'CM', rating: 86, age: 33, nationality: '🇦🇷', personality: 'Leader', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'E. Fernandez', position: 'CM', rating: 86, age: 26, nationality: '🇦🇷', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'A. Mac Allister', position: 'CM', rating: 86, age: 28, nationality: '🇦🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Messi', position: 'RW', rating: 93, age: 39, nationality: '🇦🇷', personality: 'Leader', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'J. Alvarez', position: 'ST', rating: 87, age: 27, nationality: '🇦🇷', personality: 'Professional', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Martinez', position: 'ST', rating: 89, age: 29, nationality: '🇦🇷', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    // Bench
    { name: 'G. Rulli', position: 'GK', rating: 81, age: 35, nationality: '🇦🇷', personality: 'Professional', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 100 },
    { name: 'N. Otamendi', position: 'CB', rating: 81, age: 39, nationality: '🇦🇷', personality: 'Leader', wage: 50000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 90 },
    { name: 'G. Lo Celso', position: 'CM', rating: 83, age: 31, nationality: '🇦🇷', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'A. Garnacho', position: 'LW', rating: 84, age: 22, nationality: '🇦🇷', personality: 'Ambitious', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'P. Dybala', position: 'AM', rating: 85, age: 33, nationality: '🇦🇷', personality: 'Loyal', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
];

const SPAIN_SQUAD: Player[] = [
    { name: 'U. Simon', position: 'GK', rating: 86, age: 29, nationality: '🇪🇸', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'D. Carvajal', position: 'RB', rating: 86, age: 35, nationality: '🇪🇸', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'R. Le Normand', position: 'CB', rating: 84, age: 30, nationality: '🇪🇸', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Laporte', position: 'CB', rating: 85, age: 33, nationality: '🇪🇸', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'M. Cucurella', position: 'LB', rating: 84, age: 28, nationality: '🇪🇸', personality: 'Volatile', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Rodri', position: 'DM', rating: 92, age: 30, nationality: '🇪🇸', personality: 'Leader', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Pedri', position: 'CM', rating: 88, age: 24, nationality: '🇪🇸', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Fabian', position: 'CM', rating: 84, age: 31, nationality: '🇪🇸', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'L. Yamal', position: 'RW', rating: 90, age: 19, nationality: '🇪🇸', personality: 'Young Prospect', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'N. Williams', position: 'LW', rating: 87, age: 24, nationality: '🇪🇸', personality: 'Ambitious', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Olmo', position: 'AM', rating: 86, age: 29, nationality: '🇪🇸', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    // Bench
    { name: 'D. Raya', position: 'GK', rating: 85, age: 31, nationality: '🇪🇸', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
    { name: 'P. Cubarsi', position: 'CB', rating: 82, age: 20, nationality: '🇪🇸', personality: 'Young Prospect', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: false, condition: 100 },
    { name: 'M. Zubimendi', position: 'DM', rating: 84, age: 28, nationality: '🇪🇸', personality: 'Loyal', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
    { name: 'A. Morata', position: 'ST', rating: 83, age: 34, nationality: '🇪🇸', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 100 },
    { name: 'F. Torres', position: 'RW', rating: 82, age: 27, nationality: '🇪🇸', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

export const NATIONAL_TEAMS: NationalTeam[] = [
    { name: 'England', countryCode: 'ENG', prestige: 91, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: ENGLAND_SQUAD },
    { name: 'France', countryCode: 'FRA', prestige: 94, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: FRANCE_SQUAD },
    { name: 'Brazil', countryCode: 'BRA', prestige: 93, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, players: BRAZIL_SQUAD },
    { name: 'Argentina', countryCode: 'ARG', prestige: 92, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: ARGENTINA_SQUAD },
    { name: 'Spain', countryCode: 'ESP', prestige: 90, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: SPAIN_SQUAD },
    { name: 'Germany', countryCode: 'GER', prestige: 89, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: GERMANY_SQUAD },
    // Lower tier nations simulated for tournament structure
    { name: 'Portugal', countryCode: 'POR', prestige: 88, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateGenericSquad('🇵🇹', 85, 'ES') },
    { name: 'Netherlands', countryCode: 'NED', prestige: 86, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateGenericSquad('🇳🇱', 84, 'DE') },
    { name: 'Italy', countryCode: 'ITA', prestige: 87, tactic: { formation: '3-5-2', mentality: 'Balanced' }, players: generateGenericSquad('🇮🇹', 85, 'IT') },
    { name: 'USA', countryCode: 'USA', prestige: 80, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateGenericSquad('🇺🇸', 79, 'US') },
    { name: 'Japan', countryCode: 'JPN', prestige: 81, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateGenericSquad('🇯🇵', 80, 'EN') },
    { name: 'Morocco', countryCode: 'MAR', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateGenericSquad('🇲🇦', 81, 'FR') },
    { name: 'Belgium', countryCode: 'BEL', prestige: 84, tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, players: generateGenericSquad('🇧🇪', 83, 'FR') },
    { name: 'Croatia', countryCode: 'CRO', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateGenericSquad('🇭🇷', 82, 'DE') },
    { name: 'Uruguay', countryCode: 'URU', prestige: 83, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: generateGenericSquad('🇺🇾', 82, 'ES') },
    { name: 'Colombia', countryCode: 'COL', prestige: 82, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateGenericSquad('🇨🇴', 81, 'ES') },
];

export interface GroupStanding {
    teamName: string;
    group: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
}

export const calculateWorldCupQualifiers = (leagueTable: import('./types').LeagueTableEntry[]): { qualifiers: string[], thirdPlaceTeams: string[] } => {
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const qualifiers: string[] = [];
    const thirdPlacers: GroupStanding[] = [];

    groupLetters.forEach(g => {
        const groupTeams = leagueTable
            .filter(t => t.group === g)
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                return b.goalsFor - a.goalsFor;
            });

        if (groupTeams.length >= 2) {
            qualifiers.push(groupTeams[0].teamName);
            qualifiers.push(groupTeams[1].teamName);
        }
        if (groupTeams.length >= 3) {
            thirdPlacers.push({
                teamName: groupTeams[2].teamName,
                group: g,
                points: groupTeams[2].points,
                goalDifference: groupTeams[2].goalDifference,
                goalsFor: groupTeams[2].goalsFor,
            });
        }
    });

    thirdPlacers.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });

    const best8ThirdPlacers = thirdPlacers.slice(0, 8).map(t => t.teamName);

    return { qualifiers: [...qualifiers, ...best8ThirdPlacers], thirdPlaceTeams: best8ThirdPlacers };
};

export const generateKnockoutFixtures = (teams: string[], stage: import('./types').TournamentStage, startWeek: number): import('./types').Fixture[] => {
    const fixtures: import('./types').Fixture[] = [];
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) {
            fixtures.push({
                id: `wc-${stage}-${shuffled[i]}-${shuffled[i + 1]}-${startWeek}`,
                week: startWeek,
                league: 'International',
                homeTeam: shuffled[i],
                awayTeam: shuffled[i + 1],
                played: false,
                stage,
                isKnockout: true,
            });
        }
    }
    return fixtures;
};

export const generateWorldCupStructure = (): Record<string, Team> => {
    const teams: Record<string, Team> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    let teamCounter = 0;
    
    groupLetters.forEach(group => {
        for (let i = 0; i < 4; i++) {
            const template = NATIONAL_TEAMS[teamCounter % NATIONAL_TEAMS.length];
            
            // Ensure unique name for EVERY team in the 48-team tournament
            let uniqueName = template.name;
            if (teams[uniqueName]) {
                uniqueName = `${template.name} (${group})`;
            }
            
            const prestigeAdjustment = i * 2; 
            
            teams[uniqueName] = { 
                name: uniqueName, 
                league: 'International', 
                balance: 0, 
                group, 
                chairmanPersonality: 'Football Federation',
                prestige: Math.max(50, template.prestige - prestigeAdjustment), 
                // Only top 6 teams get their Real Roster. Clones/Minor nations get generic.
                players: (i === 0 && teamCounter < 6) ? template.players : generateGenericSquad(template.players[0].nationality, template.prestige - 5 - prestigeAdjustment, template.countryCode),
                tactic: { ...template.tactic },
                objectives: [],
                activePromises: []
            };
            teamCounter++;
        }
    });
    return teams;
};
