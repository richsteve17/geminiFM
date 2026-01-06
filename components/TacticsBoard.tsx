
import React from 'react';
import type { Player, Formation } from '../types';

interface TacticsBoardProps {
    starters: Player[];
    formation: Formation;
    onPlayerClick: (player: Player) => void;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ starters, formation, onPlayerClick }) => {
    // Map positions to coordinates (0-100)
    const getCoordinates = () => {
        const coords: { name: string, x: number, y: number, pos: string }[] = [];
        
        // Always 1 GK
        const gk = starters.find(p => p.position === 'GK');
        if (gk) coords.push({ name: gk.name, x: 50, y: 90, pos: 'GK' });

        const defs = starters.filter(p => p.position === 'DEF');
        const mids = starters.filter(p => p.position === 'MID');
        const fwds = starters.filter(p => p.position === 'FWD');

        // Helper to distribute along X
        const distributeX = (players: Player[], y: number) => {
            const step = 80 / (players.length + 1);
            players.forEach((p, i) => {
                coords.push({ name: p.name, x: 10 + step * (i + 1), y, pos: p.position });
            });
        };

        distributeX(defs, 70);
        distributeX(mids, 40);
        distributeX(fwds, 15);

        return coords;
    };

    const playerCoords = getCoordinates();

    return (
        <div className="relative w-full aspect-[4/5] bg-green-800 rounded-lg overflow-hidden border-2 border-green-900/50 shadow-inner">
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

                const colorClass = 
                    player.position === 'GK' ? 'bg-yellow-500' :
                    player.position === 'DEF' ? 'bg-blue-500' :
                    player.position === 'MID' ? 'bg-green-500' : 'bg-red-500';

                return (
                    <button
                        key={idx}
                        onClick={() => onPlayerClick(player)}
                        className="absolute group -translate-x-1/2 -translate-y-1/2 focus:outline-none z-10"
                        style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                        title={player.name}
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
