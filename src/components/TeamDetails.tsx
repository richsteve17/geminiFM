
import React, { useState, useMemo } from 'react';
import type { Team, Tactic, Formation, Mentality, PlayerEffect, Player, GameState, PlayerPersonality } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { FORMATIONS, MENTALITIES, CHAIRMAN_PERSONALITIES, PLAYER_PERSONALITIES } from '../constants';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import TacticsBoard from './TacticsBoard';

interface TeamDetailsProps {
    team: Team;
    onTacticChange: (tactic: Partial<Tactic>) => void;
    onNavigateToTransfers: () => void;
    onNavigateToNews: () => void;
    onStartContractTalk: (player: Player) => void;
    onToggleStarter: (playerName: string) => void;
    gameState: GameState;
    subsUsed: number;
    onSubstitute: (playerIn: Player, playerOut: Player) => void;
}

const getPositionColor = (position: string) => {
    switch (position) {
        case 'GK': return 'bg-yellow-600 text-white';
        case 'DEF': return 'bg-blue-600 text-white';
        case 'MID': return 'bg-green-600 text-white';
        case 'FWD': return 'bg-red-600 text-white';
        default: return 'bg-gray-500 text-white';
    }
};

const getPersonalityBadgeColor = (p: PlayerPersonality) => {
    switch (p) {
        case 'Ambitious': return 'text-purple-400 bg-purple-900/30 border-purple-800';
        case 'Loyal': return 'text-blue-400 bg-blue-900/30 border-blue-800';
        case 'Mercenary': return 'text-green-400 bg-green-900/30 border-green-800';
        case 'Volatile': return 'text-red-400 bg-red-900/30 border-red-800';
        case 'Leader': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
        case 'Young Prospect': return 'text-teal-400 bg-teal-900/30 border-teal-800';
        default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
}

const TeamDetails: React.FC<TeamDetailsProps> = ({ team, onTacticChange, onNavigateToTransfers, onNavigateToNews, onStartContractTalk, onToggleStarter, gameState, subsUsed, onSubstitute }) => {
    const [view, setView] = useState<'squad' | 'tactics'>('squad');
    const [showContracts, setShowContracts] = useState(false);
    const [subSelection, setSubSelection] = useState<Player | null>(null);

    const isNationalTeam = team.league === 'International';
    const isMatchLive = gameState === 'PAUSED'; 

    const playersWithContractIssues = !isNationalTeam ? team.players
        .filter(p => p.contractExpires < 2)
        .sort((a, b) => a.contractExpires - b.contractExpires) : [];

    const starters = team.players.filter(p => p.isStarter);
    const bench = team.players.filter(p => !p.isStarter);

    const handlePlayerClick = (player: Player, isBench: boolean) => {
        if (isMatchLive) {
            if (subsUsed >= 5) return; 
            if (isBench) {
                if (subSelection?.name === player.name) setSubSelection(null); 
                else setSubSelection(player);
            } else {
                if (subSelection) {
                    onSubstitute(subSelection, player);
                    setSubSelection(null);
                }
            }
        } else if (gameState === 'PRE_MATCH') {
            onToggleStarter(player.name);
        }
    };

    const renderPlayerItem = (player: Player, isBench: boolean) => {
        const personalityColor = getPersonalityBadgeColor(player.personality);
        
        // Effects & Status
        const effects = [];
        if (player.status.type === 'Injured') effects.push(<span key="inj" className="text-sm" title={`Injured (${player.status.weeks} wks)`}>🚑</span>);
        if (player.status.type === 'Suspended') effects.push(<span key="sus" className="text-sm" title="Suspended">🟥</span>);
        
        player.effects.forEach((eff, i) => {
            if (eff.type === 'PostTournamentMorale') {
                if (eff.morale === 'FiredUp') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Fired Up">🔥</span>);
                if (eff.morale === 'Winner') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Winner">🏆</span>);
                if (eff.morale === 'Disappointed') effects.push(<span key={`m-${i}`} className="text-xs" title="Morale: Disappointed">😔</span>);
            }
            if (eff.type === 'BadChemistry') {
                effects.push(<span key={`c-${i}`} className="text-xs" title={`Chemistry Rift with ${eff.with}`}><BrokenLinkIcon className="w-3 h-3 text-orange-500 inline" /></span>);
            }
        });

        const isSelectedSub = subSelection?.name === player.name && isMatchLive;

        return (
            <li key={player.name} onClick={() => handlePlayerClick(player, isBench)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all group ${
                player.status.type === 'Injured' ? 'bg-red-900/30 border-red-500' :
                isSelectedSub ? 'bg-green-900/40 border-green-500 opacity-100 animate-pulse' :
                isBench ? 'bg-gray-900/50 border-gray-700 hover:bg-gray-700 opacity-80 hover:opacity-100' :
                'bg-gray-800 border-gray-700 hover:bg-gray-700'
            }`}>
                <span className={`w-8 h-6 text-[10px] font-black flex items-center justify-center rounded ${getPositionColor(player.position)}`}>{player.position}</span>
                
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate text-gray-200">{player.name}</p>
                        <div className="flex gap-1">{effects}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 rounded border ${personalityColor} uppercase tracking-wider`}>
                            {player.personality}
                        </span>
                        {!isNationalTeam && (
                            <span className="text-[9px] text-gray-500">
                                {player.contractExpires === 0 ? <span className="text-red-400 font-bold">Expiring!</span> : `${player.contractExpires}y`}
                            </span>
                        )}
                    </div>
                </div>
                
                <span className={`text-sm font-black ${player.rating >= 85 ? 'text-yellow-400' : 'text-green-400'}`}>{player.rating}</span>
            </li>
        );
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-xl font-bold text-green-400">{team.name}</h2>
                    {!isNationalTeam && (
                        <p className="text-xs text-blue-400 font-mono font-bold uppercase">£{team.balance.toLocaleString()}</p>
                    )}
                </div>
                <div className="flex bg-gray-900 rounded p-1 border border-gray-700 shadow-inner">
                    <button onClick={() => setView('squad')} className={`p-1.5 rounded transition-all ${view === 'squad' ? 'bg-gray-700 text-green-400 shadow' : 'text-gray-500 hover:text-gray-400'}`}><UserGroupIcon className="w-4 h-4" /></button>
                    <button onClick={() => setView('tactics')} className={`p-1.5 rounded transition-all ${view === 'tactics' ? 'bg-gray-700 text-green-400 shadow' : 'text-gray-500 hover:text-gray-400'}`}><GlobeAltIcon className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{isNationalTeam ? 'Federation Goals' : 'Board Focus'}</p>
                <div className="bg-gray-900/50 p-2 rounded border border-gray-700 group relative">
                    <p className="text-xs font-bold text-gray-300">{team.chairmanPersonality}</p>
                    <div className="hidden group-hover:block absolute top-full left-0 right-0 z-50 bg-black border border-gray-600 p-2 text-[10px] text-white rounded mt-1 shadow-2xl w-64">
                        {CHAIRMAN_PERSONALITIES[team.chairmanPersonality]}
                    </div>
                </div>
                {team.objectives && team.objectives.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {team.objectives.map((obj, i) => (
                            <div key={i} className="text-[10px] font-bold text-blue-300 bg-blue-900/20 px-2 py-1 rounded border border-blue-900/50">
                                • {obj}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Formation</label>
                    <select value={team.tactic.formation} onChange={e => onTacticChange({ formation: e.target.value as Formation })} className="w-full bg-gray-700 text-xs rounded p-2 border border-gray-600 focus:ring-1 focus:ring-green-500 outline-none">
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Style</label>
                    <select value={team.tactic.mentality} onChange={e => onTacticChange({ mentality: e.target.value as Mentality })} className="w-full bg-gray-700 text-xs rounded p-2 border border-gray-600 focus:ring-1 focus:ring-green-500 outline-none">
                        {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* View Content */}
            <div className="flex-grow overflow-y-auto pr-1">
                {view === 'tactics' ? (
                    <TacticsBoard starters={starters} formation={team.tactic.formation} onPlayerClick={p => onToggleStarter(p.name)} />
                ) : (
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1 pl-1">
                                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Starting XI ({starters.length}/11)</p>
                                {isMatchLive && <span className="text-[10px] text-blue-400 font-bold uppercase">SUBS: {subsUsed}/5</span>}
                            </div>
                            
                            {!isNationalTeam && playersWithContractIssues.length > 0 && gameState === 'PRE_MATCH' && (
                                <button 
                                    onClick={() => setShowContracts(!showContracts)}
                                    className="w-full mb-2 flex justify-between items-center text-[10px] font-bold bg-red-900/40 text-red-200 border border-red-800 p-1.5 rounded hover:bg-red-900/60 transition-colors"
                                >
                                    <span className="flex items-center"><DocumentCheckIcon className="w-3 h-3 mr-1" /> {playersWithContractIssues.length} Contracts Expiring</span>
                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${showContracts ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                            
                            {showContracts && (
                                <div className="mb-2 space-y-1">
                                    {playersWithContractIssues.map(player => (
                                        <div key={`con-${player.name}`} className="flex justify-between items-center p-1.5 rounded bg-red-900/20 border border-red-900/50">
                                            <span className="text-xs font-bold text-red-300">{player.name}</span>
                                            <button onClick={() => onStartContractTalk(player)} className="text-[9px] font-bold bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded">RENEW</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <ul className="space-y-1">
                                {starters.map(p => renderPlayerItem(p, false))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pl-1">Bench ({bench.length})</p>
                            <ul className="space-y-1">
                                {bench.map(p => renderPlayerItem(p, true))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend - Added per feedback */}
            <div className="mt-2 py-2 px-3 bg-gray-900/50 rounded border border-gray-800 flex flex-wrap gap-3 justify-center text-[9px] text-gray-400">
                <span className="flex items-center gap-1"><span className="text-xs">🔥</span> On Fire</span>
                <span className="flex items-center gap-1"><span className="text-xs">🏆</span> Winner</span>
                <span className="flex items-center gap-1"><span className="text-xs">😔</span> Sad</span>
                <span className="flex items-center gap-1"><BrokenLinkIcon className="w-3 h-3 text-orange-500" /> Clash</span>
                <span className="flex items-center gap-1"><span className="text-xs">🚑</span> Injured</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700">
                <button onClick={onNavigateToNews} className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-black flex items-center justify-center gap-1.5"><NewspaperIcon className="w-3.5 h-3.5" /> NEWS</button>
                <button onClick={onNavigateToTransfers} disabled={isNationalTeam} className={`p-2.5 rounded text-[10px] font-black flex items-center justify-center gap-1.5 uppercase tracking-tighter ${isNationalTeam ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800 text-blue-100'}`}>
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" /> {isNationalTeam ? 'Selection' : 'Scouting'}
                </button>
            </div>
        </div>
    );
};

export default TeamDetails;
