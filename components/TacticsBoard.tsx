
import React from 'react';
import type { Player, Formation, PlayerPosition } from '../types';

interface TacticsBoardProps {
    starters: Player[];
    formation: Formation;
    onPlayerClick: (player: Player) => void;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ starters, formation, onPlayerClick }) => {
    
    // Mapping specific granular positions to pitch coordinates (x, y) 0-100
    // x: 0 left, 100 right
    // y: 0 goal opponent, 100 goal own
    const getCoordinates = () => {
        const coords: { name: string, x: number, y: number, pos: PlayerPosition }[] = [];
        
        // Use a map to track used specific roles in formation to avoid overlaps
        // e.g., if there are multiple CBs, we need to space them
        const roleCounts: Partial<Record<PlayerPosition, number>> = {};
        
        starters.forEach(player => {
            let x = 50;
            let y = 50;
            const pos = player.position;
            roleCounts[pos] = (roleCounts[pos] || 0) + 1;
            const currentCount = roleCounts[pos] || 1;

            switch (pos) {
                case 'GK': x = 50; y = 92; break;
                
                // Defense
                case 'LB': x = 15; y = 75; break;
                case 'LWB': x = 10; y = 65; break;
                case 'RB': x = 85; y = 75; break;
                case 'RWB': x = 90; y = 65; break;
                case 'CB': 
                    // Handle 2 or 3 CBs
                    const cbCount = starters.filter(p => p.position === 'CB').length;
                    if (cbCount === 1) x = 50;
                    else if (cbCount === 2) x = currentCount === 1 ? 35 : 65;
                    else if (cbCount === 3) x = currentCount === 1 ? 25 : currentCount === 2 ? 50 : 75;
                    y = 80; 
                    break;
                
                // Midfield
                case 'DM': 
                    const dmCount = starters.filter(p => p.position === 'DM').length;
                    if (dmCount === 1) x = 50;
                    else x = currentCount === 1 ? 40 : 60;
                    y = 60; 
                    break;
                case 'CM': 
                    const cmCount = starters.filter(p => p.position === 'CM').length;
                    if (cmCount === 1) x = 50;
                    else if (cmCount === 2) x = currentCount === 1 ? 35 : 65;
                    else if (cmCount === 3) x = currentCount === 1 ? 25 : currentCount === 2 ? 50 : 75;
                    y = 45; 
                    break;
                case 'AM': 
                    const amCount = starters.filter(p => p.position === 'AM').length;
                    if (amCount === 1) x = 50;
                    else x = currentCount === 1 ? 40 : 60;
                    y = 30; 
                    break;
                case 'LM': x = 15; y = 45; break;
                case 'RM': x = 85; y = 45; break;
                
                // Attack
                case 'LW': x = 20; y = 20; break;
                case 'RW': x = 80; y = 20; break;
                case 'ST':
                case 'CF':
                    const stCount = starters.filter(p => p.position === 'ST' || p.position === 'CF').length;
                    if (stCount === 1) x = 50;
                    else if (stCount === 2) x = currentCount === 1 ? 35 : 65;
                    else if (stCount === 3) x = currentCount === 1 ? 20 : currentCount === 2 ? 50 : 80;
                    y = 15;
                    break;
                
                default: x = 50; y = 50; break;
            }
            
            coords.push({ name: player.name, x, y, pos });
        });

        return coords;
    };

    const playerCoords = getCoordinates();

    const getPositionGroup = (position: PlayerPosition): 'GK' | 'DEF' | 'MID' | 'FWD' => {
        if (position === 'GK') return 'GK';
        if (['LB', 'RB', 'CB', 'LWB', 'RWB'].includes(position)) return 'DEF';
        if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'MID';
        return 'FWD';
    };

    return (
        <div className="relative w-full aspect-[4/5] bg-green-800 rounded-lg overflow-hidden border-2 border-green-900/50 shadow-inner">
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded shadow">
                <p className="font-black uppercase tracking-widest">Formation {formation}</p>
                <p className="text-[9px]">Numbers = DEF - MID - FWD</p>
            </div>
            {/* Pitch markings */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-x-4 top-0 h-px bg-white"></div>
                <div className="absolute inset-x-4 bottom-0 h-px bg-white"></div>
                <div className="absolute inset-y-0 left-4 w-px bg-white"></div>
                <div className="absolute inset-y-0 right-4 w-px bg-white"></div>
                <div className="absolute top-1/2 left-4 right-4 h-px bg-white"></div>
                <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-0 left-1/2 w-40 h-20 border border-t-0 border-white -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-40 h-20 border border-b-0 border-white -translate-x-1/2"></div>
            </div>

            {/* Players */}
            {playerCoords.map((coord, idx) => {
                const player = starters.find(p => p.name === coord.name);
                if (!player) return null;

                const group = getPositionGroup(player.position);
                const colorClass = 
                    group === 'GK' ? 'bg-yellow-500' :
                    group === 'DEF' ? 'bg-blue-500' :
                    group === 'MID' ? 'bg-green-500' : 'bg-red-500';

                return (
                    <button
                        key={idx}
                        onClick={() => onPlayerClick(player)}
                        className="absolute group -translate-x-1/2 -translate-y-1/2 focus:outline-none z-10"
                        style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                        title={`${player.name} (${player.position})`}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg transition-transform hover:scale-125 ${colorClass}`}>
                            {player.position}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-black/80 rounded text-[8px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-20">
                            {player.name} ({player.condition}%)
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default TacticsBoard;
