import type { Player, Formation, PlayerPosition } from '../types';

// --- TACTICAL ENGINE CONSTANTS ---

export const FORMATION_SLOTS: Record<Formation, PlayerPosition[]> = {
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'ST', 'RW'],
    '5-3-2': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'AM', 'LW', 'RW', 'ST'],
    '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LM', 'RM', 'ST']
};

const ROLE_COMPATIBILITY: Record<string, string[]> = {
    'GK': ['GK'],
    'CB': ['CB', 'DM'],
    'LB': ['LB', 'LWB', 'CB'],
    'RB': ['RB', 'RWB', 'CB'],
    'LWB': ['LWB', 'LB', 'LM', 'LW'],
    'RWB': ['RWB', 'RB', 'RM', 'RW'],
    'DM': ['DM', 'CM', 'CB'],
    'CM': ['CM', 'DM', 'AM'],
    'AM': ['AM', 'CM', 'ST', 'LW', 'RW', 'CF'],
    'LM': ['LM', 'LW', 'LWB', 'CM'],
    'RM': ['RM', 'RW', 'RWB', 'CM'],
    'LW': ['LW', 'LM', 'ST', 'AM'],
    'RW': ['RW', 'RM', 'ST', 'AM'],
    'ST': ['ST', 'CF', 'LW', 'RW'],
    'CF': ['CF', 'ST', 'AM']
};

export interface TacticalAssignment {
    slotIndex: number;
    formationRole: PlayerPosition;
    player: Player;
    isOutOfPosition: boolean;
    penaltySeverity: 'none' | 'low' | 'high';
    analysis: string | null;
}

export interface TacticalAnalysis {
    score: number; // 0-100
    assignments: TacticalAssignment[];
    feedback: string[];
}

export const analyzeTactics = (starters: Player[], formation: Formation): TacticalAnalysis => {
    // We assume the starters array is ALREADY sorted to match the formation slots
    // The UI handles the swapping to ensure index 0 is GK, index 1 is LB, etc.
    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    const assignments: TacticalAssignment[] = [];
    const feedback: string[] = [];
    let efficiencyScore = 100;

    // We only analyze up to the number of starters provided (usually 11)
    for (let i = 0; i < Math.min(slots.length, starters.length); i++) {
        const role = slots[i];
        const player = starters[i];

        let severity: 'none' | 'low' | 'high' = 'none';
        let analysis: string | null = null;

        // 1. Perfect Match
        if (player.position === role) {
            severity = 'none';
        }
        // 2. Compatible Match (e.g. RB playing RWB)
        else if (ROLE_COMPATIBILITY[role]?.includes(player.position)) {
            severity = 'low';
            analysis = `Adapting ${player.position} to ${role}`;
            efficiencyScore -= 2; // Small penalty
        }
        // 3. Incompatible
        else {
            severity = 'high';
            analysis = `Lost at ${role}`;
            efficiencyScore -= 15; // Heavy penalty
            feedback.push(`⚠️ ${player.name} (${player.position}) is out of position at ${role}.`);
        }

        // Special Check: GK
        if (role === 'GK' && player.position !== 'GK') {
            efficiencyScore -= 50; // massive penalty
            feedback.push(`CRITICAL: You need a Goalkeeper in the goal!`);
        }

        assignments.push({
            slotIndex: i,
            formationRole: role,
            player: player,
            isOutOfPosition: severity !== 'none',
            penaltySeverity: severity,
            analysis
        });
    }

    // Check for serious chemistry rifts or bad chemistry between any two starters
    const feudWarnings = new Set<string>();
    for (let i = 0; i < starters.length; i++) {
        const pA = starters[i];
        for (let j = i + 1; j < starters.length; j++) {
            const pB = starters[j];
            const pAHasRiftWithB = (pA.effects || []).some(e =>
                (e.type === 'InternationalRift' && e.severity === 'serious' && e.with === pB.name) ||
                (e.type === 'BadChemistry' && e.with === pB.name)
            );
            const pBHasRiftWithA = (pB.effects || []).some(e =>
                (e.type === 'InternationalRift' && e.severity === 'serious' && e.with === pA.name) ||
                (e.type === 'BadChemistry' && e.with === pA.name)
            );

            if (pAHasRiftWithB || pBHasRiftWithA) {
                const warningKey = [pA.name, pB.name].sort().join(" vs ");
                if (!feudWarnings.has(warningKey)) {
                    feudWarnings.add(warningKey);
                    efficiencyScore -= 30;
                    feedback.push(`⚠️ Feud Alert: ${pA.name} and ${pB.name} have a serious rift and refuse to cooperate on the pitch!`);
                }
            }

            const pAHasBondWithB = (pA.effects || []).some(e => e.type === 'TeammateBond' && e.with === pB.name);
            const pBHasBondWithA = (pB.effects || []).some(e => e.type === 'TeammateBond' && e.with === pA.name);
            if (pAHasBondWithB || pBHasBondWithA) {
                const bondKey = [pA.name, pB.name].sort().join(" bond ");
                if (!feudWarnings.has(bondKey)) {
                    feudWarnings.add(bondKey);
                    efficiencyScore += 5;
                }
            }
        }
    }

    // Check for unavailable players (Injured, Suspended, SentOff) in the starting lineup
    starters.forEach(p => {
        if (p.status.type === 'Injured') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} is injured and cannot take the pitch!`);
        } else if (p.status.type === 'Suspended') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} is suspended and cannot take the pitch!`);
        } else if (p.status.type === 'SentOff') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} has been sent off!`);
        }
    });

    // General Balance Check
    if (efficiencyScore < 50) feedback.push("The team looks confused by this shape.");
    else if (efficiencyScore < 80) feedback.push("Some square pegs in round holes.");
    else feedback.push("The tactical balance looks solid.");

    return {
        score: Math.max(0, efficiencyScore),
        assignments: assignments, // Order is preserved
        feedback
    };
};
