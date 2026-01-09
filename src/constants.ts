
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

const ARSENAL_SQUAD: Player[] = [
    { name: 'D. Raya', position: 'GK', rating: 85, age: 31, nationality: '🇪🇸', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'B. White', position: 'RB', rating: 86, age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'W. Saliba', position: 'CB', rating: 89, age: 26, nationality: '🇫🇷', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Gabriel', position: 'CB', rating: 87, age: 29, nationality: '🇧🇷', personality: 'Leader', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Timber', position: 'LB', rating: 84, age: 26, nationality: '🇳🇱', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Rice', position: 'DM', rating: 90, age: 28, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 250000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Odegaard', position: 'CM', rating: 89, age: 28, nationality: '🇳🇴', personality: 'Leader', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Merino', position: 'CM', rating: 84, age: 31, nationality: '🇪🇸', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'B. Saka', position: 'RW', rating: 90, age: 25, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'G. Martinelli', position: 'LW', rating: 85, age: 26, nationality: '🇧🇷', personality: 'Ambitious', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'K. Havertz', position: 'ST', rating: 87, age: 28, nationality: '🇩🇪', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    // Bench
    { name: 'O. Zinchenko', position: 'LB', rating: 82, age: 30, nationality: '🇺🇦', personality: 'Leader', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'R. Calafiori', position: 'LB', rating: 83, age: 25, nationality: '🇮🇹', personality: 'Ambitious', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
    { name: 'T. Tomiyasu', position: 'RB', rating: 82, age: 28, nationality: '🇯🇵', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'T. Partey', position: 'DM', rating: 83, age: 34, nationality: '🇬🇭', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 90 },
    { name: 'L. Trossard', position: 'LW', rating: 84, age: 32, nationality: '🇧🇪', personality: 'Volatile', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'G. Jesus', position: 'ST', rating: 83, age: 30, nationality: '🇧🇷', personality: 'Ambitious', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 95 },
    { name: 'Raheem Sterling', position: 'RW', rating: 82, age: 32, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Volatile', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 100 },
];

const REAL_MADRID_SQUAD: Player[] = [
    { name: 'T. Courtois', position: 'GK', rating: 90, age: 35, nationality: '🇧🇪', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'D. Carvajal', position: 'RB', rating: 86, age: 35, nationality: '🇪🇸', personality: 'Leader', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'E. Militao', position: 'CB', rating: 88, age: 29, nationality: '🇧🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Rudiger', position: 'CB', rating: 88, age: 34, nationality: '🇩🇪', personality: 'Volatile', wage: 190000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'F. Mendy', position: 'LB', rating: 84, age: 32, nationality: '🇫🇷', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'A. Tchouameni', position: 'DM', rating: 88, age: 27, nationality: '🇫🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'F. Valverde', position: 'CM', rating: 90, age: 29, nationality: '🇺🇾', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'J. Bellingham', position: 'CM', rating: 94, age: 23, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Rodrygo', position: 'RW', rating: 89, age: 26, nationality: '🇧🇷', personality: 'Professional', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Vini Jr', position: 'LW', rating: 92, age: 26, nationality: '🇧🇷', personality: 'Ambitious', wage: 350000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'K. Mbappe', position: 'ST', rating: 95, age: 28, nationality: '🇫🇷', personality: 'Ambitious', wage: 600000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'E. Camavinga', position: 'DM', rating: 89, age: 24, nationality: '🇫🇷', personality: 'Ambitious', wage: 170000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: false, condition: 100 },
];

const BARCELONA_SQUAD: Player[] = [
    { name: 'M. Ter Stegen', position: 'GK', rating: 88, age: 35, nationality: '🇩🇪', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'J. Kounde', position: 'RB', rating: 87, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'P. Cubarsi', position: 'CB', rating: 82, age: 20, nationality: '🇪🇸', personality: 'Young Prospect', wage: 60000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'R. Araujo', position: 'CB', rating: 86, age: 28, nationality: '🇺🇾', personality: 'Leader', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Balde', position: 'LB', rating: 84, age: 23, nationality: '🇪🇸', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'F. De Jong', position: 'DM', rating: 87, age: 30, nationality: '🇳🇱', personality: 'Professional', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'Pedri', position: 'CM', rating: 88, age: 24, nationality: '🇪🇸', personality: 'Ambitious', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'Gavi', position: 'CM', rating: 86, age: 22, nationality: '🇪🇸', personality: 'Volatile', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'L. Yamal', position: 'RW', rating: 90, age: 19, nationality: '🇪🇸', personality: 'Young Prospect', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'Raphinha', position: 'LW', rating: 85, age: 30, nationality: '🇧🇷', personality: 'Ambitious', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'R. Lewandowski', position: 'ST', rating: 87, age: 38, nationality: '🇵🇱', personality: 'Leader', wage: 300000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'D. Olmo', position: 'AM', rating: 86, age: 29, nationality: '🇪🇸', personality: 'Ambitious', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

const BAYERN_SQUAD: Player[] = [
    { name: 'M. Neuer', position: 'GK', rating: 86, age: 41, nationality: '🇩🇪', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'A. Davies', position: 'LB', rating: 86, age: 26, nationality: '🇨🇦', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'D. Upamecano', position: 'CB', rating: 86, age: 28, nationality: '🇫🇷', personality: 'Volatile', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'M. Kim', position: 'CB', rating: 86, age: 30, nationality: '🇰🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Kimmich', position: 'RB', rating: 88, age: 32, nationality: '🇩🇪', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'J. Palhinha', position: 'DM', rating: 86, age: 31, nationality: '🇵🇹', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Musiala', position: 'AM', rating: 91, age: 24, nationality: '🇩🇪', personality: 'Ambitious', wage: 220000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'M. Olise', position: 'RW', rating: 85, age: 25, nationality: '🇫🇷', personality: 'Volatile', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Sane', position: 'LW', rating: 86, age: 31, nationality: '🇩🇪', personality: 'Volatile', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'H. Kane', position: 'ST', rating: 92, age: 33, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Leader', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'T. Muller', position: 'AM', rating: 82, age: 37, nationality: '🇩🇪', personality: 'Leader', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 80 },
    { name: 'S. Gnabry', position: 'RW', rating: 84, age: 31, nationality: '🇩🇪', personality: 'Ambitious', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
    { name: 'K. Coman', position: 'LW', rating: 85, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

const PSG_SQUAD: Player[] = [
    { name: 'G. Donnarumma', position: 'GK', rating: 88, age: 28, nationality: '🇮🇹', personality: 'Professional', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Hakimi', position: 'RB', rating: 87, age: 28, nationality: '🇲🇦', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Marquinhos', position: 'CB', rating: 86, age: 33, nationality: '🇧🇷', personality: 'Leader', wage: 170000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'L. Hernandez', position: 'CB', rating: 84, age: 31, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'N. Mendes', position: 'LB', rating: 85, age: 25, nationality: '🇵🇹', personality: 'Volatile', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'W. Zaire-Emery', position: 'CM', rating: 86, age: 21, nationality: '🇫🇷', personality: 'Young Prospect', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'Vitinha', position: 'CM', rating: 86, age: 27, nationality: '🇵🇹', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'F. Ruiz', position: 'CM', rating: 84, age: 31, nationality: '🇪🇸', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'O. Dembele', position: 'RW', rating: 86, age: 30, nationality: '🇫🇷', personality: 'Volatile', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 95 },
    { name: 'B. Barcola', position: 'LW', rating: 85, age: 24, nationality: '🇫🇷', personality: 'Ambitious', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100 },
    { name: 'R. Kolo Muani', position: 'ST', rating: 84, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'G. Ramos', position: 'ST', rating: 83, age: 26, nationality: '🇵🇹', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: false, condition: 100 },
];

const JUVENTUS_SQUAD: Player[] = [
    { name: 'M. Di Gregorio', position: 'GK', rating: 83, age: 29, nationality: '🇮🇹', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Danilo', position: 'RB', rating: 82, age: 35, nationality: '🇧🇷', personality: 'Leader', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'Bremer', position: 'CB', rating: 86, age: 30, nationality: '🇧🇷', personality: 'Professional', wage: 140000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'P. Kalulu', position: 'CB', rating: 82, age: 27, nationality: '🇫🇷', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Cambiaso', position: 'LB', rating: 83, age: 27, nationality: '🇮🇹', personality: 'Professional', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Locatelli', position: 'DM', rating: 84, age: 29, nationality: '🇮🇹', personality: 'Leader', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'K. Thuram', position: 'CM', rating: 83, age: 26, nationality: '🇫🇷', personality: 'Ambitious', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'T. Koopmeiners', position: 'AM', rating: 85, age: 29, nationality: '🇳🇱', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'K. Yildiz', position: 'LW', rating: 84, age: 21, nationality: '🇹🇷', personality: 'Young Prospect', wage: 70000, status: { type: 'Available' }, effects: [], contractExpires: 6, isStarter: true, condition: 100 },
    { name: 'F. Conceicao', position: 'RW', rating: 82, age: 24, nationality: '🇵🇹', personality: 'Volatile', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'D. Vlahovic', position: 'ST', rating: 86, age: 27, nationality: '🇷🇸', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'N. Gonzalez', position: 'RW', rating: 83, age: 29, nationality: '🇦🇷', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

const INTER_MILAN_SQUAD: Player[] = [
    { name: 'Y. Sommer', position: 'GK', rating: 84, age: 38, nationality: '🇨🇭', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 90 },
    { name: 'B. Pavard', position: 'CB', rating: 84, age: 31, nationality: '🇫🇷', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'F. Acerbi', position: 'CB', rating: 83, age: 39, nationality: '🇮🇹', personality: 'Leader', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 80 },
    { name: 'A. Bastoni', position: 'CB', rating: 87, age: 28, nationality: '🇮🇹', personality: 'Loyal', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Dumfries', position: 'RWB', rating: 83, age: 31, nationality: '🇳🇱', personality: 'Volatile', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'F. Dimarco', position: 'LWB', rating: 85, age: 29, nationality: '🇮🇹', personality: 'Loyal', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'H. Calhanoglu', position: 'DM', rating: 86, age: 33, nationality: '🇹🇷', personality: 'Professional', wage: 160000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'N. Barella', position: 'CM', rating: 88, age: 30, nationality: '🇮🇹', personality: 'Leader', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'M. Thuram', position: 'ST', rating: 85, age: 29, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'L. Martinez', position: 'ST', rating: 89, age: 29, nationality: '🇦🇷', personality: 'Leader', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'M. Taremi', position: 'ST', rating: 82, age: 34, nationality: '🇮🇷', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: false, condition: 100 },
];

const AC_MILAN_SQUAD: Player[] = [
    { name: 'M. Maignan', position: 'GK', rating: 88, age: 31, nationality: '🇫🇷', personality: 'Professional', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'T. Hernandez', position: 'LB', rating: 87, age: 29, nationality: '🇫🇷', personality: 'Ambitious', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'F. Tomori', position: 'CB', rating: 84, age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'S. Pavlovic', position: 'CB', rating: 82, age: 26, nationality: '🇷🇸', personality: 'Volatile', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'Emerson Royal', position: 'RB', rating: 80, age: 28, nationality: '🇧🇷', personality: 'Professional', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'Y. Fofana', position: 'DM', rating: 83, age: 28, nationality: '🇫🇷', personality: 'Professional', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'T. Reijnders', position: 'CM', rating: 84, age: 28, nationality: '🇳🇱', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'C. Pulisic', position: 'RW', rating: 85, age: 28, nationality: '🇺🇸', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'R. Leao', position: 'LW', rating: 87, age: 28, nationality: '🇵🇹', personality: 'Volatile', wage: 180000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'A. Morata', position: 'ST', rating: 83, age: 34, nationality: '🇪🇸', personality: 'Professional', wage: 110000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 100 },
    { name: 'T. Abraham', position: 'ST', rating: 81, age: 29, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', personality: 'Ambitious', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: false, condition: 100 },
];

const INTER_MIAMI_SQUAD: Player[] = [
    { name: 'D. Callender', position: 'GK', rating: 76, age: 29, nationality: '🇺🇸', personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'J. Alba', position: 'LB', rating: 82, age: 38, nationality: '🇪🇸', personality: 'Leader', wage: 80000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'T. Aviles', position: 'CB', rating: 74, age: 23, nationality: '🇦🇷', personality: 'Young Prospect', wage: 15000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'S. Kryvtsov', position: 'CB', rating: 73, age: 36, nationality: '🇺🇦', personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 80 },
    { name: 'M. Weigandt', position: 'RB', rating: 75, age: 27, nationality: '🇦🇷', personality: 'Volatile', wage: 25000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'S. Busquets', position: 'DM', rating: 84, age: 38, nationality: '🇪🇸', personality: 'Leader', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'F. Redondo', position: 'CM', rating: 78, age: 24, nationality: '🇦🇷', personality: 'Young Prospect', wage: 30000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'D. Gomez', position: 'CM', rating: 77, age: 24, nationality: '🇵🇾', personality: 'Ambitious', wage: 25000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'L. Messi', position: 'RW', rating: 93, age: 39, nationality: '🇦🇷', personality: 'Leader', wage: 500000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'L. Suarez', position: 'ST', rating: 84, age: 40, nationality: '🇺🇾', personality: 'Volatile', wage: 150000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 70 },
    { name: 'R. Taylor', position: 'LW', rating: 75, age: 32, nationality: '🇫🇮', personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    // Bench
    { name: 'L. Campana', position: 'ST', rating: 76, age: 26, nationality: '🇪🇨', personality: 'Professional', wage: 30000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: false, condition: 100 },
];

export const TEAMS: Record<string, Team> = {
    // PREMIER LEAGUE (Full 20)
    'Manchester City': { name: 'Manchester City', league: 'Premier League', players: MAN_CITY_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 95, chairmanPersonality: 'Ambitious Tycoon', balance: 550000000, objectives: ['Win the League', 'Win Champions League'] },
    'Liverpool': { name: 'Liverpool', league: 'Premier League', players: LIVERPOOL_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 91, chairmanPersonality: 'Ambitious Tycoon', balance: 280000000, objectives: ['Renew V. van Dijk', 'Finish Top 2'] },
    'Arsenal': { name: 'Arsenal', league: 'Premier League', players: ARSENAL_SQUAD, tactic: { formation: '4-3-3' as any, mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 220000000, objectives: ['Finish Top 4'] },
    'Chelsea': { name: 'Chelsea', league: 'Premier League', players: CHELSEA_SQUAD, tactic: { formation: '4-2-3-1', mentality: 'All-Out Attack' }, prestige: 87, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000, objectives: ['Qualify for Champions League'] },
    'Tottenham': { name: 'Tottenham', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Fan-Focused Owner', balance: 250000000, objectives: ['Win a Trophy'] },
    'Newcastle United': { name: 'Newcastle United', league: 'Premier League', players: generatePlayers(82, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 350000000, objectives: ['Qualify for Europe'] },
    'Aston Villa': { name: 'Aston Villa', league: 'Premier League', players: generatePlayers(81, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Mid-table Finish'] },
    'West Ham': { name: 'West Ham', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 90000000, objectives: ['Avoid Relegation'] },
    'Brighton': { name: 'Brighton', league: 'Premier League', players: generatePlayers(79, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: ['Develop Youth'] },
    'Manchester United': { name: 'Manchester United', league: 'Premier League', players: generatePlayers(84, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 180000000, objectives: ['Finish Top 4'] },
    'Everton': { name: 'Everton', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 76, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: ['Avoid Relegation'] },
    'Wolves': { name: 'Wolves', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Traditionalist', balance: 60000000, objectives: ['Mid-table Finish'] },
    'Fulham': { name: 'Fulham', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: ['Avoid Relegation'] },
    'Nottingham Forest': { name: 'Nottingham Forest', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: ['Avoid Relegation'] },
    'Leicester City': { name: 'Leicester City', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: ['Avoid Relegation'] },
    'Bournemouth': { name: 'Bournemouth', league: 'Premier League', players: generatePlayers(75, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: ['Avoid Relegation'] },
    'Crystal Palace': { name: 'Crystal Palace', league: 'Premier League', players: generatePlayers(77, 'UK'), tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 50000000, objectives: ['Mid-table Finish'] },
    'Ipswich Town': { name: 'Ipswich Town', league: 'Premier League', players: generatePlayers(73, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Avoid Relegation'] },
    'Southampton': { name: 'Southampton', league: 'Premier League', players: generatePlayers(74, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: ['Avoid Relegation'] },
    'Brentford': { name: 'Brentford', league: 'Premier League', players: generatePlayers(76, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Moneyball Advocate', balance: 60000000, objectives: ['Avoid Relegation'] },

    // CHAMPIONSHIP (10 Teams)
    'Sunderland': { name: 'Sunderland', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'Burnley': { name: 'Burnley', league: 'Championship', players: generatePlayers(73, 'UK'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 30000000, objectives: [] },
    'Leeds United': { name: 'Leeds United', league: 'Championship', players: generatePlayers(74, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: ['Promotion'] },
    'Norwich City': { name: 'Norwich City', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 28000000, objectives: [] },
    'Watford': { name: 'Watford', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 70, chairmanPersonality: 'Ambitious Tycoon', balance: 35000000, objectives: [] },
    'Sheffield United': { name: 'Sheffield United', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '3-5-2', mentality: 'Defensive' }, prestige: 70, chairmanPersonality: 'Traditionalist', balance: 20000000, objectives: [] },
    'Middlesbrough': { name: 'Middlesbrough', league: 'Championship', players: generatePlayers(72, 'UK'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 71, chairmanPersonality: 'Traditionalist', balance: 25000000, objectives: [] },
    'West Brom': { name: 'West Brom', league: 'Championship', players: generatePlayers(71, 'UK'), tactic: { formation: '4-2-3-1', mentality: 'Defensive' }, prestige: 71, chairmanPersonality: 'Moneyball Advocate', balance: 22000000, objectives: [] },
    'Stoke City': { name: 'Stoke City', league: 'Championship', players: generatePlayers(70, 'UK'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 69, chairmanPersonality: 'Traditionalist', balance: 18000000, objectives: [] },
    'Coventry City': { name: 'Coventry City', league: 'Championship', players: generatePlayers(70, 'UK'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 69, chairmanPersonality: 'Fan-Focused Owner', balance: 20000000, objectives: [] },

    // LA LIGA (10 Teams)
    'Real Madrid': { name: 'Real Madrid', league: 'La Liga', players: REAL_MADRID_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 98, chairmanPersonality: 'Ambitious Tycoon', balance: 600000000, objectives: ['Win Everything'] },
    'FC Barcelona': { name: 'FC Barcelona', league: 'La Liga', players: BARCELONA_SQUAD, tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 95, chairmanPersonality: 'Fan-Focused Owner', balance: 150000000, objectives: ['Win the League'] },
    'Atletico Madrid': { name: 'Atletico Madrid', league: 'La Liga', players: generatePlayers(84, 'ES'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 88, chairmanPersonality: 'Traditionalist', balance: 180000000, objectives: [] },
    'Sevilla': { name: 'Sevilla', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 83, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [] },
    'Real Sociedad': { name: 'Real Sociedad', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 82, chairmanPersonality: 'Moneyball Advocate', balance: 75000000, objectives: [] },
    'Athletic Bilbao': { name: 'Athletic Bilbao', league: 'La Liga', players: generatePlayers(81, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [] },
    'Valencia': { name: 'Valencia', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 80, chairmanPersonality: 'Ambitious Tycoon', balance: 60000000, objectives: [] },
    'Villarreal': { name: 'Villarreal', league: 'La Liga', players: generatePlayers(80, 'ES'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [] },
    'Real Betis': { name: 'Real Betis', league: 'La Liga', players: generatePlayers(79, 'ES'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 79, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [] },
    'Girona': { name: 'Girona', league: 'La Liga', players: generatePlayers(78, 'ES'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [] },

    // SERIE A (10 Teams)
    'Juventus': { name: 'Juventus', league: 'Serie A', players: JUVENTUS_SQUAD, tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 90, chairmanPersonality: 'Traditionalist', balance: 200000000, objectives: ['Win the League'] },
    'Inter Milan': { name: 'Inter Milan', league: 'Serie A', players: INTER_MILAN_SQUAD, tactic: { formation: '3-5-2', mentality: 'Balanced' }, prestige: 91, chairmanPersonality: 'Traditionalist', balance: 180000000, objectives: ['Win the League'] },
    'AC Milan': { name: 'AC Milan', league: 'Serie A', players: AC_MILAN_SQUAD, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, prestige: 90, chairmanPersonality: 'Ambitious Tycoon', balance: 150000000, objectives: ['Win the League'] },
    'Napoli': { name: 'Napoli', league: 'Serie A', players: generatePlayers(83, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Fan-Focused Owner', balance: 150000000, objectives: [] },
    'AS Roma': { name: 'AS Roma', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 110000000, objectives: [] },
    'Lazio': { name: 'Lazio', league: 'Serie A', players: generatePlayers(80, 'IT'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Traditionalist', balance: 90000000, objectives: [] },
    'Atalanta': { name: 'Atalanta', league: 'Serie A', players: generatePlayers(81, 'IT'), tactic: { formation: '3-4-3' as any, mentality: 'All-Out Attack' }, prestige: 83, chairmanPersonality: 'Moneyball Advocate', balance: 80000000, objectives: [] },
    'Fiorentina': { name: 'Fiorentina', league: 'Serie A', players: generatePlayers(79, 'IT'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 80, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [] },
    'Bologna': { name: 'Bologna', league: 'Serie A', players: generatePlayers(78, 'IT'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: [] },
    'Torino': { name: 'Torino', league: 'Serie A', players: generatePlayers(76, 'IT'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [] },

    // BUNDESLIGA (10 Teams)
    'Bayern Munich': { name: 'Bayern Munich', league: 'Bundesliga', players: BAYERN_SQUAD, tactic: { formation: '4-2-3-1', mentality: 'All-Out Attack' }, prestige: 96, chairmanPersonality: 'Ambitious Tycoon', balance: 400000000, objectives: ['Win the League', 'Win Champions League'] },
    'Dortmund': { name: 'Dortmund', league: 'Bundesliga', players: generatePlayers(84, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 89, chairmanPersonality: 'Moneyball Advocate', balance: 120000000, objectives: ['Challenge Munich'] },
    'RB Leipzig': { name: 'RB Leipzig', league: 'Bundesliga', players: generatePlayers(82, 'DE'), tactic: { formation: '4-2-2-2' as any, mentality: 'Attacking' }, prestige: 86, chairmanPersonality: 'Ambitious Tycoon', balance: 150000000, objectives: [] },
    'Bayer Leverkusen': { name: 'Bayer Leverkusen', league: 'Bundesliga', players: generatePlayers(83, 'DE'), tactic: { formation: '3-4-2-1' as any, mentality: 'Attacking' }, prestige: 88, chairmanPersonality: 'Moneyball Advocate', balance: 100000000, objectives: [] },
    'Eintracht Frankfurt': { name: 'Eintracht Frankfurt', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Fan-Focused Owner', balance: 70000000, objectives: [] },
    'Stuttgart': { name: 'Stuttgart', league: 'Bundesliga', players: generatePlayers(79, 'DE'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 81, chairmanPersonality: 'Traditionalist', balance: 65000000, objectives: [] },
    'Wolfsburg': { name: 'Wolfsburg', league: 'Bundesliga', players: generatePlayers(77, 'DE'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 78, chairmanPersonality: 'Ambitious Tycoon', balance: 80000000, objectives: [] },
    'Gladbach': { name: 'Gladbach', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [] },
    'Union Berlin': { name: 'Union Berlin', league: 'Bundesliga', players: generatePlayers(75, 'DE'), tactic: { formation: '5-3-2', mentality: 'Defensive' }, prestige: 75, chairmanPersonality: 'Fan-Focused Owner', balance: 40000000, objectives: [] },
    'Hoffenheim': { name: 'Hoffenheim', league: 'Bundesliga', players: generatePlayers(76, 'DE'), tactic: { formation: '3-5-2', mentality: 'Attacking' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 45000000, objectives: [] },

    // LIGUE 1 (10 Teams)
    'PSG': { name: 'PSG', league: 'Ligue 1', players: PSG_SQUAD, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, prestige: 93, chairmanPersonality: 'Ambitious Tycoon', balance: 500000000, objectives: ['Win the League', 'Win Champions League'] },
    'Marseille': { name: 'Marseille', league: 'Ligue 1', players: generatePlayers(80, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 84, chairmanPersonality: 'Fan-Focused Owner', balance: 80000000, objectives: [] },
    'Lyon': { name: 'Lyon', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 82, chairmanPersonality: 'Traditionalist', balance: 70000000, objectives: [] },
    'Monaco': { name: 'Monaco', league: 'Ligue 1', players: generatePlayers(81, 'FR'), tactic: { formation: '4-4-2', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 120000000, objectives: [] },
    'Nice': { name: 'Nice', league: 'Ligue 1', players: generatePlayers(78, 'FR'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 79, chairmanPersonality: 'Moneyball Advocate', balance: 60000000, objectives: [] },
    'Lille': { name: 'Lille', league: 'Ligue 1', players: generatePlayers(79, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 81, chairmanPersonality: 'Moneyball Advocate', balance: 55000000, objectives: [] },
    'Lens': { name: 'Lens', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '3-4-3' as any, mentality: 'Attacking' }, prestige: 78, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'Rennes': { name: 'Rennes', league: 'Ligue 1', players: generatePlayers(77, 'FR'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 77, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [] },
    'Nantes': { name: 'Nantes', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-5-1', mentality: 'Defensive' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 30000000, objectives: [] },
    'Reims': { name: 'Reims', league: 'Ligue 1', players: generatePlayers(75, 'FR'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: [] },

    // MLS (12 Teams) - Adjusted prestige
    'Inter Miami': { name: 'Inter Miami', league: 'MLS', players: INTER_MIAMI_SQUAD, tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 85, chairmanPersonality: 'Ambitious Tycoon', balance: 90000000, objectives: ['Win MLS Cup'] },
    'LA Galaxy': { name: 'LA Galaxy', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 75, chairmanPersonality: 'Ambitious Tycoon', balance: 70000000, objectives: [] },
    'NYCFC': { name: 'NYCFC', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Moneyball Advocate', balance: 65000000, objectives: [] },
    'Atlanta United': { name: 'Atlanta United', league: 'MLS', players: generatePlayers(75, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Attacking' }, prestige: 77, chairmanPersonality: 'Fan-Focused Owner', balance: 55000000, objectives: [] },
    'Seattle Sounders': { name: 'Seattle Sounders', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Traditionalist', balance: 50000000, objectives: [] },
    'Portland Timbers': { name: 'Portland Timbers', league: 'MLS', players: generatePlayers(72, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Fan-Focused Owner', balance: 45000000, objectives: [] },
    'LAFC': { name: 'LAFC', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-3-3', mentality: 'Attacking' }, prestige: 76, chairmanPersonality: 'Fan-Focused Owner', balance: 60000000, objectives: [] },
    'Columbus Crew': { name: 'Columbus Crew', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, prestige: 74, chairmanPersonality: 'Moneyball Advocate', balance: 50000000, objectives: [] },
    'Toronto FC': { name: 'Toronto FC', league: 'MLS', players: generatePlayers(71, 'US'), tactic: { formation: '4-4-2', mentality: 'Defensive' }, prestige: 60, chairmanPersonality: 'Traditionalist', balance: 40000000, objectives: [] },
    'Chicago Fire': { name: 'Chicago Fire', league: 'MLS', players: generatePlayers(70, 'US'), tactic: { formation: '4-2-3-1' as any, mentality: 'Balanced' }, prestige: 58, chairmanPersonality: 'Traditionalist', balance: 35000000, objectives: [] },
    'Philadelphia Union': { name: 'Philadelphia Union', league: 'MLS', players: generatePlayers(74, 'US'), tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 73, chairmanPersonality: 'Moneyball Advocate', balance: 35000000, objectives: ['Develop Youth'] },
    'NY Red Bulls': { name: 'NY Red Bulls', league: 'MLS', players: generatePlayers(73, 'US'), tactic: { formation: '4-2-2-2' as any, mentality: 'Balanced' }, prestige: 72, chairmanPersonality: 'Moneyball Advocate', balance: 40000000, objectives: [] },
};

export const TRANSFER_TARGETS: Player[] = [
    { name: 'N. Neymar', position: 'LW', rating: 89, age: 35, nationality: '🇧🇷', personality: 'Volatile', wage: 400000, status: { type: 'Available' }, effects: [], contractExpires: 1, isStarter: true, condition: 85 },
    { name: 'V. Osimhen', position: 'ST', rating: 88, age: 28, nationality: '🇳🇬', personality: 'Ambitious', wage: 200000, status: { type: 'Available' }, effects: [], contractExpires: 2, isStarter: true, condition: 100 },
    { name: 'V. Gyokeres', position: 'ST', rating: 86, age: 28, nationality: '🇸🇪', personality: 'Professional', wage: 120000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'K. Kvaratskhelia', position: 'LW', rating: 86, age: 24, nationality: '🇬🇪', personality: 'Ambitious', wage: 90000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
    { name: 'N. Williams', position: 'LW', rating: 85, age: 22, nationality: '🇪🇸', personality: 'Loyal', wage: 100000, status: { type: 'Available' }, effects: [], contractExpires: 4, isStarter: true, condition: 100 },
    { name: 'A. Isak', position: 'ST', rating: 85, age: 25, nationality: '🇸🇪', personality: 'Professional', wage: 130000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
];
