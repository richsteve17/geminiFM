
import React, { useState } from 'react';
import type { Player, Formation, PlayerPosition } from '../types';
import type { TacticalAssignment } from '../utils';
import { FORMATION_SLOTS } from '../utils';

interface TacticsBoardProps {
    assignments: TacticalAssignment[];
    formation: Formation;
    onSlotClick: (slotIndex: number) => void;
    onSlotSwap?: (fromSlotIndex: number, toSlotIndex: number) => void;
    selectedSlotIndex: number | null;
}

const TacticsBoard: React.FC<TacticsBoardProps> = ({ assignments, formation, onSlotClick, onSlotSwap, selectedSlotIndex }) => {
    const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
    
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
        <figure className="fm-tactics-diagram m-0">
            <div className="fm-tactics-board relative w-full aspect-[3/4] overflow-hidden select-none">
                <svg className="fm-tactics-markings absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 400" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                    <rect x="16" y="16" width="268" height="368" />
                    <path d="M16 200H284" />
                    <circle cx="150" cy="200" r="35" />
                    <circle cx="150" cy="200" r="2" fill="currentColor" stroke="none" />
                    <path d="M82 16V76H218V16 M116 16V42H184V16 M82 384V324H218V384 M116 384V358H184V384" />
                    <path d="M125 76Q150 106 175 76 M125 324Q150 294 175 324" />
                    <path d="M134 16V8H166V16 M134 384V392H166V384" />
                </svg>
                {currentFormationSlots.map((role, idx) => {
                    const totalInRole = roleCounts[role] || 1;
                    const indexInRole = roleCurrentIndex[role] || 0;
                    roleCurrentIndex[role] = indexInRole + 1;
                    const { x, y } = getSlotCoordinates(role, indexInRole, totalInRole);
                    const assignment = assignments.find(a => a.slotIndex === idx);
                    const player = assignment?.player;
                    const isSelected = selectedSlotIndex === idx;
                    const group = player ? getPositionGroup(player.position).toLowerCase() : 'empty';
                    return (
                        <button
                            key={idx}
                            type="button"
                            draggable={Boolean(player)}
                            onDragStart={(e) => {
                                e.dataTransfer.setData('text/slot-index', String(idx));
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                                if (!onSlotSwap) return;
                                e.preventDefault();
                                setDragOverSlotIndex(idx);
                            }}
                            onDragLeave={() => {
                                if (dragOverSlotIndex === idx) setDragOverSlotIndex(null);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const from = Number(e.dataTransfer.getData('text/slot-index'));
                                if (Number.isFinite(from) && onSlotSwap) onSlotSwap(from, idx);
                                setDragOverSlotIndex(null);
                            }}
                            onDragEnd={() => setDragOverSlotIndex(null)}
                            onClick={() => onSlotClick(idx)}
                            aria-label={player ? `${player.name}, ${player.position}, ${player.rating}${assignment?.isOutOfPosition ? `, playing as ${role}` : ''}` : `${role} Needed`}
                            aria-pressed={isSelected}
                            className={`fm-tactics-slot absolute cursor-pointer z-10 ${isSelected ? 'is-selected z-20' : ''} ${dragOverSlotIndex === idx ? 'is-drop-target' : ''}`}
                            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <div className={`fm-tactics-token w-11 h-11 rounded-full flex flex-col items-center justify-center relative is-${group} ${assignment?.penaltySeverity === 'high' ? 'is-high-penalty' : assignment?.penaltySeverity === 'low' ? 'is-low-penalty' : ''}`}>
                                <span className="text-sm font-bold leading-none tabular-nums">{player ? player.rating : role}</span>
                                {player && <span className="text-[9px] font-bold leading-none mt-1">{player.position}</span>}
                            </div>
                            {player ? (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center pointer-events-none">
                                    <span className="fm-tactics-name px-1 py-0.5 text-[10px] font-semibold whitespace-nowrap">{player.name.split(' ').pop()}</span>
                                    <div className="flex gap-1 mt-0.5">
                                        {player.condition < 90 && <span className="fm-tactics-status-tired w-1.5 h-1.5 rounded-full" title="Tired" />}
                                        {player.effects.some(e => e.type === 'PostTournamentMorale' && e.morale === 'FiredUp') && <span className="fm-tactics-status-positive h-1.5 w-1.5 rounded-full" role="img" aria-label="Morale: fired up" title="Morale: fired up" />}
                                        {player.effects.some(e => e.type === 'PostTournamentMorale' && e.morale === 'Disappointed') && <span className="fm-tactics-status-muted h-1.5 w-1.5 rounded-full" role="img" aria-label="Morale: disappointed" title="Morale: disappointed" />}
                                    </div>
                                </div>
                            ) : <span className="fm-tactics-name absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1 py-0.5 text-[10px] whitespace-nowrap">{role} Needed</span>}
                            {assignment?.isOutOfPosition && <span className="fm-tactics-warning absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">!</span>}
                        </button>
                    );
                })}
            </div>
            <figcaption className="fm-tactics-caption flex justify-between items-center gap-3 py-3 text-[10px]">
                <span className="fm-eyebrow">DRAG OR TAP TO SWAP</span>
                <span className="font-bold tabular-nums">{formation}</span>
            </figcaption>
        </figure>
    );
};

export default TacticsBoard;
