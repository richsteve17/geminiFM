
import React from 'react';
import type { Player, Formation, PlayerPosition } from '../types';
import type { TacticalAssignment } from '../utils';
import { FORMATION_SLOTS } from '../utils';

interface TacticsBoardProps {
    assignments: TacticalAssignment[];
    formation: Formation;
    onSlotClick: (slotIndex: number) => void;
    selectedSlotIndex: number | null;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ assignments, formation, onSlotClick, selectedSlotIndex }) => {
    
    // Mapping FORMATION SLOTS to pitch coordinates
    const getSlotCoordinates = (role: PlayerPosition, indexInRole: number, totalInRole: number) => {
        let x = 50;
        let y = 50;

        switch (role) {
            case 'GK': x = 50; y = 88; break;
            
            // Defense
            case 'LB': x = 15; y = 72; break;
            case 'LWB': x = 10; y = 60; break;
            case 'RB': x = 85; y = 72; break;
            case 'RWB': x = 90; y = 60; break;
            case 'CB': 
                if (totalInRole === 1) x = 50;
                else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
                else if (totalInRole === 3) x = indexInRole === 0 ? 25 : indexInRole === 1 ? 50 : 75;
                y = 75; 
                break;
            
            // Midfield
            case 'DM': 
                if (totalInRole === 1) x = 50;
                else x = indexInRole === 0 ? 40 : 60;
                y = 60; 
                break;
            case 'CM': 
                if (totalInRole === 1) x = 50;
                else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
                else if (totalInRole === 3) x = indexInRole === 0 ? 25 : indexInRole === 1 ? 50 : 75;
                y = 45; 
                break;
            case 'AM': 
                if (totalInRole === 1) x = 50;
                else x = indexInRole === 0 ? 35 : 65;
                y = 28; 
                break;
            case 'LM': x = 15; y = 45; break;
            case 'RM': x = 85; y = 45; break;
            
            // Attack
            case 'LW': x = 20; y = 20; break;
            case 'RW': x = 80; y = 20; break;
            case 'ST':
            case 'CF':
                if (totalInRole === 1) x = 50;
                else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
                else if (totalInRole === 3) x = indexInRole === 0 ? 20 : indexInRole === 1 ? 50 : 80;
                y = 12;
                break;
            
            default: x = 50; y = 50; break;
        }
        return { x, y };
    };

    const getPositionGroup = (position: PlayerPosition): 'GK' | 'DEF' | 'MID' | 'FWD' => {
        if (position === 'GK') return 'GK';
        if (['LB', 'RB', 'CB', 'LWB', 'RWB'].includes(position)) return 'DEF';
        if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'MID';
        return 'FWD';
    };

    // Prepare layout data by iterating through the DEFINED formation slots
    // This ensures we draw every slot, even if a player isn't assigned (though logic forces 11 starters)
    const currentFormationSlots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    
    const roleCounts: Record<string, number> = {};
    currentFormationSlots.forEach(role => roleCounts[role] = (roleCounts[role] || 0) + 1);
    
    const roleCurrentIndex: Record<string, number> = {};

    return (
        <div className="relative w-full aspect-[3/4] bg-green-800 rounded-lg overflow-hidden border-2 border-green-900/50 shadow-inner select-none">
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

            {/* Title */}
            <div className="absolute top-2 left-2 text-[10px] font-bold text-white/50 bg-black/20 px-2 py-1 rounded">
                TAP TO SWAP
            </div>

            {/* Render Slots */}
            {currentFormationSlots.map((role, idx) => {
                const totalInRole = roleCounts[role] || 1;
                const indexInRole = roleCurrentIndex[role] || 0;
                roleCurrentIndex[role] = indexInRole + 1;

                const { x, y } = getSlotCoordinates(role, indexInRole, totalInRole);
                
                // Find the assigned player for this specific slot index
                const assignment = assignments.find(a => a.slotIndex === idx);
                const player = assignment?.player;

                const isSelected = selectedSlotIndex === idx;
                
                // Styling
                let group = 'MID';
                let colorClass = 'bg-gray-600 border-gray-400';
                
                if (player) {
                    group = getPositionGroup(player.position);
                    colorClass = 
                        group === 'GK' ? 'bg-yellow-600 border-yellow-400' :
                        group === 'DEF' ? 'bg-blue-600 border-blue-400' :
                        group === 'MID' ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400';
                    
                    if (assignment?.penaltySeverity === 'high') colorClass = 'bg-red-900 border-red-500 animate-pulse';
                    else if (assignment?.penaltySeverity === 'low') colorClass = 'bg-orange-600 border-orange-400';
                }

                if (isSelected) {
                    colorClass = 'bg-white border-blue-500 ring-4 ring-blue-400/50 text-blue-900 z-50 scale-110';
                }

                return (
                    <div
                        key={idx}
                        onClick={() => onSlotClick(idx)}
                        className="absolute cursor-pointer transition-all duration-200 transform hover:scale-110 z-10"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        {/* Jersey / Circle */}
                        <div className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center shadow-lg ${colorClass}`}>
                            <span className="text-[10px] font-black leading-none">{player ? player.rating : role}</span>
                            {player && (
                                <span className="text-[8px] font-bold leading-none opacity-80">{player.position}</span>
                            )}
                        </div>

                        {/* Name Label */}
                        {player && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center">
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap shadow-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-black/80 text-white'}`}>
                                    {player.name.split(' ').pop()}
                                </div>
                                {/* Condition / Status Icons */}
                                <div className="flex gap-0.5 mt-0.5">
                                    {player.condition < 90 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Tired"></span>}
                                    {player.effects.some(e => e.type === 'PostTournamentMorale' && e.morale === 'FiredUp') && <span className="text-[8px]">🔥</span>}
                                    {player.effects.some(e => e.type === 'PostTournamentMorale' && e.morale === 'Disappointed') && <span className="text-[8px]">⬇️</span>}
                                </div>
                            </div>
                        )}

                        {/* Empty Slot Label */}
                        {!player && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-gray-800/80 rounded text-[8px] text-gray-300 font-bold">
                                {role} Needed
                            </div>
                        )}

                        {/* Out of position Warning */}
                        {assignment?.isOutOfPosition && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border border-white text-[10px] shadow-sm">
                                !
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TacticsBoard;
