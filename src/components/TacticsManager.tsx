import React, { useState, useMemo } from 'react';
import { GameState } from '../types';
import type { Team, Tactic, Formation, Mentality, Player, PlayerPosition } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import TacticsBoard from './TacticsBoard';
import { analyzeTactics } from '../utils';
import { FORMATIONS, MENTALITIES, PLAYER_PERSONALITIES } from '../constants';

interface TacticsManagerProps {
    team: Team;
    onTacticChange: (tactic: Partial<Tactic>) => void;
    onStartContractTalk: (player: Player) => void;
    onToggleStarter: (playerName: string) => void;
    onSwapPlayers?: (p1: Player, p2: Player) => void;
    gameState: GameState;
    subsUsed: number;
    onSubstitute: (playerIn: Player, playerOut: Player) => void;
    onReorderPlayers?: (players: Player[]) => void;
    isNationalTeam: boolean;
}

const getPositionColor = (position: PlayerPosition) => {
    if (position === 'GK') return 'bg-yellow-950/80 border border-yellow-800 text-yellow-400';
    if (['LB', 'RB', 'CB', 'LWB', 'RWB'].includes(position)) return 'bg-blue-950/80 border border-blue-800 text-blue-400';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'bg-green-950/80 border border-green-800 text-green-400';
    return 'bg-red-950/80 border border-red-800 text-red-400';
};

const getPersonalityBadgeColor = (personality: string) => {
    switch (personality) {
        case 'Leader': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
        case 'Young Prospect': return 'text-teal-400 bg-teal-900/30 border-teal-800';
        case 'Professional': return 'text-emerald-400 bg-emerald-900/30 border-emerald-800';
        case 'Volatile': return 'text-red-400 bg-red-900/30 border-red-800';
        default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
};

const TacticsManager: React.FC<TacticsManagerProps> = ({
    team,
    onTacticChange,
    onStartContractTalk,
    onToggleStarter,
    onSwapPlayers,
    gameState,
    subsUsed,
    onSubstitute,
    onReorderPlayers,
    isNationalTeam
}) => {
    const [showContracts, setShowContracts] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [selectedListPlayer, setSelectedListPlayer] = useState<string | null>(null);
    const [dragSourcePlayer, setDragSourcePlayer] = useState<string | null>(null);
    const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

    const isMatchLive = gameState === GameState.PAUSED;

    const starters = useMemo(() => team.players.filter(p => p.isStarter), [team.players]);
    const bench = useMemo(() => team.players.filter(p => !p.isStarter), [team.players]);

    const tacticalAnalysis = useMemo(() => analyzeTactics(starters, team.tactic.formation), [starters, team.tactic.formation]);

    const playersWithContractIssues = useMemo(() => {
        if (isNationalTeam) return [];
        return team.players
            .filter(p => p.contractExpires < 2)
            .sort((a, b) => a.contractExpires - b.contractExpires);
    }, [team.players, isNationalTeam]);

    const handleSlotClick = (clickedSlotIndex: number) => {
        if (selectedSlot === null) {
            setSelectedSlot(clickedSlotIndex);
        } else {
            if (selectedSlot === clickedSlotIndex) {
                setSelectedSlot(null);
                return;
            }
            const currentStarters = [...starters];
            if (currentStarters[selectedSlot] && currentStarters[clickedSlotIndex]) {
                const temp = currentStarters[selectedSlot];
                currentStarters[selectedSlot] = currentStarters[clickedSlotIndex];
                currentStarters[clickedSlotIndex] = temp;
                if (onReorderPlayers) {
                    onReorderPlayers([...currentStarters, ...bench]);
                }
            }
            setSelectedSlot(null);
        }
    };

    const swapByName = (sourceName: string, targetName: string) => {
        if (sourceName === targetName) return;
        const p1 = team.players.find(p => p.name === sourceName);
        const p2 = team.players.find(p => p.name === targetName);
        if (!p1 || !p2) return;

        if (isMatchLive) {
            const isP1Starter = p1.isStarter;
            const isP2Starter = p2.isStarter;

            if (isP1Starter !== isP2Starter) {
                if (subsUsed >= 5) {
                    alert("Tactical Error: You have already used all 5 substitutions!");
                    return;
                }
                const playerIn = isP1Starter ? p2 : p1;
                const playerOut = isP1Starter ? p1 : p2;
                onSubstitute(playerIn, playerOut);
                return;
            }
        }

        if (onSwapPlayers) {
            onSwapPlayers(p1, p2);
        }
    };

    const handleListClick = (clickedPlayer: Player) => {
        if (selectedListPlayer === null) {
            setSelectedListPlayer(clickedPlayer.name);
        } else {
            if (selectedListPlayer === clickedPlayer.name) {
                setSelectedListPlayer(null);
            } else {
                swapByName(selectedListPlayer, clickedPlayer.name);
                setSelectedListPlayer(null);
            }
        }
    };

    const renderPlayerItem = (player: Player, isBench: boolean) => {
        const personalityColor = getPersonalityBadgeColor(player.personality);
        const isSelected = selectedListPlayer === player.name;

        // Effects & Status
        const effects = [];
        if (player.status.type === 'Injured') effects.push(<span key="inj" className="text-sm" title={`Injured (${player.status.weeks} wks)`}>🚑</span>);
        if (player.status.type === 'Suspended') effects.push(<span key="sus" className="text-sm" title="Suspended">🟥</span>);

        player.effects.forEach((eff, i) => {
            if (eff.type === 'PostTournamentMorale') {
                if (eff.morale === 'FiredUp') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Fired Up">🔥</span>);
                if (eff.morale === 'Winner') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Winner flex">🏆</span>);
                if (eff.morale === 'Disappointed') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Disappointed">😔</span>);
            }
            if (eff.type === 'BadChemistry') {
                effects.push(<span key={`c-${i}`} className="text-xs" title={`Chemistry Rift with ${eff.with}`}><BrokenLinkIcon className="w-3 h-3 text-orange-500 inline" /></span>);
            }
            if (eff.type === 'InternationalRift') {
                const color = eff.severity === 'serious' ? 'text-red-500' : eff.severity === 'moderate' ? 'text-orange-500' : 'text-yellow-500';
                effects.push(
                    <span key={`ir-${i}`} className="text-xs" title={`International Rift (${eff.severity}) with ${eff.with}: ${eff.message}`}>
                        <BrokenLinkIcon className={`w-3 h-3 ${color} inline`} />
                    </span>
                );
            }
            if (eff.type === 'TeammateBond') {
                effects.push(
                    <span key={`tb-${i}`} className="text-xs" title={`Teammate Bond with ${eff.with}: ${eff.message}`}>🤝</span>
                );
            }
        });

        const assignment = !isBench ? tacticalAnalysis.assignments.find(a => a.player.name === player.name) : null;
        const outOfPosition = assignment?.isOutOfPosition;

        return (
            <li
                key={player.name}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/player-name', player.name);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragSourcePlayer(player.name);
                    setSelectedListPlayer(null);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (dragSourcePlayer && dragSourcePlayer !== player.name) {
                        setDragOverPlayer(player.name);
                    }
                }}
                onDragLeave={() => {
                    if (dragOverPlayer === player.name) setDragOverPlayer(null);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const sourceName = e.dataTransfer.getData('text/player-name') || dragSourcePlayer;
                    if (sourceName) swapByName(sourceName, player.name);
                    setDragOverPlayer(null);
                    setDragSourcePlayer(null);
                }}
                onDragEnd={() => {
                    setDragOverPlayer(null);
                    setDragSourcePlayer(null);
                }}
                onClick={() => handleListClick(player)}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all group ${
                    dragOverPlayer === player.name ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-950/20' :
                    isSelected ? 'bg-yellow-950/40 border-yellow-500 ring-1 ring-yellow-500' :
                    player.status.type === 'Injured' ? 'bg-red-950/40 border-red-500/80' :
                    isBench ? 'bg-gray-900/40 border-gray-800 hover:bg-gray-800/80 opacity-85 hover:opacity-100' :
                    'bg-gray-850 border-gray-800 hover:bg-gray-850'
                }`}
            >
                <span className={`w-9 h-7 text-[10px] font-black flex items-center justify-center rounded-md ${getPositionColor(player.position)}`}>
                    {player.position}
                </span>

                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-yellow-300' : 'text-gray-100'}`}>
                            {player.name}
                        </p>
                        <div className="flex gap-1 items-center">{effects}</div>
                        {outOfPosition && (
                            <span className="text-[10px] text-orange-400 font-bold" title={`Playing as ${assignment?.formationRole}`}>
                                ⚠️
                            </span>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${personalityColor} uppercase tracking-wider`}>
                            {player.personality}
                        </span>
                        
                        {/* Condition Bar */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-gray-500 font-bold uppercase">FIT:</span>
                            <div className="w-12 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                <div 
                                    className={`h-full ${player.condition > 80 ? 'bg-emerald-500' : player.condition > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${player.condition}%` }}
                                ></div>
                            </div>
                            <span className={`text-[8px] font-bold font-mono ${player.condition > 80 ? 'text-emerald-400' : player.condition > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {player.condition}%
                            </span>
                        </div>

                        {!isNationalTeam && (
                            <span className="text-[8px] text-gray-500 font-medium">
                                {player.contractExpires === 0 ? <span className="text-red-400 font-bold">Expiring!</span> : `${player.contractExpires}y`} &bull; ${player.wage.toLocaleString()}/wk
                            </span>
                        )}
                        
                        {player.stats && player.stats.appearances > 0 && (
                            <span className="text-[8px] font-bold text-blue-300 bg-blue-950/40 px-1.5 py-0.5 border border-blue-900/60 rounded">
                                Rating: ★{player.stats.averageRating} &bull; Goals: {player.stats.goals}
                            </span>
                        )}
                    </div>
                </div>

                {isSelected ? (
                    <ArrowsRightLeftIcon className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
                ) : (
                    <span className={`text-base font-mono font-black flex-shrink-0 ${player.rating >= 85 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {player.rating}
                    </span>
                )}
            </li>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Widescreen Pitch Visualizer & Selection */}
            <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-gray-800/60 border border-gray-700 p-5 rounded-xl shadow-xl backdrop-blur-md">
                    {/* Setup Toggles */}
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700/50">
                        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span>📋</span> Pitch Lineup & Tactics
                        </h3>
                        <div className="flex gap-3">
                            <div>
                                <select 
                                    value={team.tactic.formation} 
                                    onChange={e => onTacticChange({ formation: e.target.value as Formation })} 
                                    className="bg-gray-900 border border-gray-700 text-xs rounded-md p-1.5 font-bold text-white focus:outline-none"
                                >
                                    {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <select 
                                    value={team.tactic.mentality} 
                                    onChange={e => onTacticChange({ mentality: e.target.value as Mentality })} 
                                    className="bg-gray-900 border border-gray-700 text-xs rounded-md p-1.5 font-bold text-white focus:outline-none"
                                >
                                    {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Glossy Pitch Board */}
                    <div className="max-w-[450px] mx-auto shadow-2xl rounded-lg overflow-hidden border border-gray-800">
                        <TacticsBoard 
                            assignments={tacticalAnalysis.assignments} 
                            formation={team.tactic.formation} 
                            onSlotClick={handleSlotClick} 
                            onSlotSwap={(fromIndex, toIndex) => {
                                if (fromIndex === toIndex) return;
                                const currentStarters = [...starters];
                                if (!currentStarters[fromIndex] || !currentStarters[toIndex]) return;
                                const temp = currentStarters[fromIndex];
                                currentStarters[fromIndex] = currentStarters[toIndex];
                                currentStarters[toIndex] = temp;
                                if (onReorderPlayers) {
                                    onReorderPlayers([...currentStarters, ...bench]);
                                }
                                setSelectedSlot(null);
                            }}
                            selectedSlotIndex={selectedSlot}
                        />
                    </div>
                </div>

                {/* Efficiency Analysis Panel */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 shadow-xl backdrop-blur-md">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tactical Analysis Report</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-black font-mono shadow ${
                            tacticalAnalysis.score > 80 ? 'bg-green-950/70 border border-green-800 text-green-400' :
                            tacticalAnalysis.score > 50 ? 'bg-yellow-950/70 border border-yellow-800 text-yellow-400' :
                            'bg-red-950/70 border border-red-800 text-red-500'
                        }`}>
                            {tacticalAnalysis.score}% Efficiency
                        </span>
                    </div>
                    <div className="space-y-2">
                        {tacticalAnalysis.feedback.length > 0 ? (
                            tacticalAnalysis.feedback.map((msg, i) => (
                                <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                    <span className="text-slate-500 mt-0.5">•</span> {msg}
                                </p>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500 italic">No selections warnings. Roster is fully optimized.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Spacious Squad Roster List */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-gray-800/60 border border-gray-700 p-5 rounded-xl shadow-xl backdrop-blur-md">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700/50">
                        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span>👥</span> Starting XI ({starters.length}/11)
                        </h3>
                        {isMatchLive && (
                            <span className="text-xs text-blue-400 font-bold bg-blue-950/45 px-2 py-0.5 rounded border border-blue-900">
                                SUBS USED: {subsUsed}/5
                            </span>
                        )}
                    </div>

                    {/* Expiring contracts banner inside panel */}
                    {!isNationalTeam && playersWithContractIssues.length > 0 && gameState === GameState.PRE_MATCH && (
                        <div className="mb-4">
                            <button 
                                onClick={() => setShowContracts(!showContracts)}
                                className="w-full flex justify-between items-center text-xs font-black bg-red-950/50 text-red-300 border border-red-900/60 p-2.5 rounded-lg hover:bg-red-900/30 transition-colors"
                            >
                                <span className="flex items-center"><DocumentCheckIcon className="w-4 h-4 mr-1.5 text-red-400" /> {playersWithContractIssues.length} Payroll Contracts Expiring</span>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showContracts ? 'rotate-180' : ''}`} />
                            </button>
                            {showContracts && (
                                <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-150">
                                    {playersWithContractIssues.map(player => (
                                        <div key={`con-${player.name}`} className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50 border border-gray-800">
                                            <span className="text-xs font-bold text-gray-200">{player.name} ({player.position})</span>
                                            <button 
                                                onClick={() => onStartContractTalk(player)} 
                                                className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded uppercase tracking-wider"
                                            >
                                                RENEW
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Swap Mode Indicator */}
                    {selectedListPlayer && (
                        <div className="bg-blue-950/55 border border-blue-800 p-3 rounded-lg text-center animate-pulse mb-3">
                            <p className="text-xs font-black text-blue-200 uppercase tracking-widest">Swap Mode Active</p>
                            <p className="text-[10px] text-blue-400 mt-0.5">Click another player in the squad below to swap them.</p>
                            <button onClick={() => setSelectedListPlayer(null)} className="text-[10px] text-red-400 font-bold underline mt-1.5 uppercase">Cancel Swap</button>
                        </div>
                    )}

                    <ul className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {starters.map(p => renderPlayerItem(p, false))}
                    </ul>
                </div>

                <div className="bg-gray-800/60 border border-gray-700 p-5 rounded-xl shadow-xl backdrop-blur-md">
                    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 pb-3 border-b border-gray-700/50 flex items-center gap-2">
                        <span>🪑</span> Substitutes & Reserves ({bench.length})
                    </h3>
                    
                    <ul className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {bench.map(p => renderPlayerItem(p, true))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TacticsManager;
