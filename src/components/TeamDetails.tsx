import React, { useState, useMemo } from 'react';
import type { Team, Tactic, Formation, Mentality, PlayerEffect, Player, GameState } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { FORMATIONS, MENTALITIES } from '../constants';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';

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

const getEffectIndicators = (player: Player) => {
    const indicators = [];
    
    // Status
    if (player.status.type === 'On International Duty') indicators.push(<span key="int" className="text-xs font-bold text-blue-400">INT</span>);
    if (player.status.type === 'Injured') indicators.push(<span key="inj" className="text-lg" title="Injured">🚑</span>);

    // Effects
    player.effects.forEach((effect, index) => {
        if (effect.type === 'PostTournamentMorale') {
             if (effect.morale === 'Winner') indicators.push(<span key={`eff-${index}`} className="text-xs font-bold text-yellow-400" title={effect.message}>🏆</span>);
             if (effect.morale === 'FiredUp') indicators.push(<span key={`eff-${index}`} className="text-xs font-bold text-red-500" title={effect.message}>🔥</span>);
             if (effect.morale === 'Disappointed') indicators.push(<span key={`eff-${index}`} className="text-xs font-bold text-gray-400" title={effect.message}>😔</span>);
        }
        if (effect.type === 'BadChemistry') {
             indicators.push(<span key={`eff-${index}`} title={effect.message}><BrokenLinkIcon className="w-4 h-4 text-orange-400" /></span>);
        }
    });

    return indicators;
}


const TeamDetails: React.FC<TeamDetailsProps> = ({ team, onTacticChange, onNavigateToTransfers, onNavigateToNews, onStartContractTalk, onToggleStarter, gameState, subsUsed, onSubstitute }) => {
    const [showContracts, setShowContracts] = useState(false);
    const [subSelection, setSubSelection] = useState<Player | null>(null); // Track who is selected from BENCH to sub in

    const isNationalTeam = team.league === 'International';
    const isMatchLive = gameState === 'PAUSED'; // Only allow subs when paused (HT, 60, 75)

    const playersWithContractIssues = !isNationalTeam ? team.players
        .filter(p => p.contractExpires < 2)
        .sort((a, b) => a.contractExpires - b.contractExpires) : [];

    // Lineup Logic
    const starters = team.players.filter(p => p.isStarter);
    const bench = team.players.filter(p => !p.isStarter);
    
    const starterCount = starters.length;
    const starterColor = starterCount === 11 ? 'text-green-400' : 'text-red-400';

    // Analysis Logic
    const activeChemistryRifts = useMemo(() => {
        const rifts: string[] = [];
        starters.forEach(p1 => {
            p1.effects.forEach(e => {
                if (e.type === 'BadChemistry') {
                    const otherPlayer = starters.find(p2 => p2.name === e.with);
                    if (otherPlayer) {
                        const pairId = [p1.name, otherPlayer.name].sort().join('-');
                        if (!rifts.includes(pairId)) rifts.push(pairId);
                    }
                }
            })
        });
        return rifts;
    }, [starters]);

    const injuredStarters = starters.filter(p => p.status.type === 'Injured');


    const handlePlayerClick = (player: Player, isBench: boolean) => {
        if (isMatchLive) {
            // SUB MODE
            if (subsUsed >= 5) return; // Max subs reached

            if (isBench) {
                // Select bench player to come ON
                if (subSelection?.name === player.name) setSubSelection(null); // deselect
                else setSubSelection(player);
            } else {
                // Clicked a starter
                if (subSelection) {
                    // Perform Swap
                    onSubstitute(subSelection, player);
                    setSubSelection(null);
                }
            }
        } else if (gameState === 'PRE_MATCH') {
            // PRE-MATCH MODE: Simple toggle
            onToggleStarter(player.name);
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 space-y-4">
            <div>
                <h2 className="text-xl font-bold text-center text-green-400 tracking-wide">{team.name}</h2>
                {isNationalTeam && <p className="text-xs text-center text-gray-400 uppercase tracking-widest mt-1">National Team Manager</p>}
            </div>

            <div className="space-y-3">
                 <div>
                    <label htmlFor="formation-select" className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
                    <select 
                        id="formation-select" 
                        value={team.tactic.formation} 
                        onChange={(e) => onTacticChange({ formation: e.target.value as Formation })}
                        disabled={isMatchLive}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 disabled:opacity-50"
                    >
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="mentality-select" className="block text-sm font-medium text-gray-300 mb-1">Mentality</label>
                    <select 
                        id="mentality-select" 
                        value={team.tactic.mentality} 
                        onChange={(e) => onTacticChange({ mentality: e.target.value as Mentality })}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
                    >
                        {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                 <button
                    onClick={onNavigateToNews}
                    className="w-full flex items-center justify-center text-center text-sm font-semibold text-white p-2.5 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors"
                >
                    <NewspaperIcon className="w-5 h-5 mr-2"/>
                    News
                </button>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onNavigateToTransfers}
                        disabled={isNationalTeam || gameState !== 'PRE_MATCH'}
                        className={`w-full flex items-center justify-center text-center text-sm font-semibold text-white p-2.5 rounded-lg transition-colors ${isNationalTeam || gameState !== 'PRE_MATCH' ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <ArrowsRightLeftIcon className="w-5 h-5 mr-2"/>
                        Transfers
                    </button>
                    <button
                        disabled
                        className="w-full flex items-center justify-center text-center text-sm font-semibold text-white p-2.5 rounded-lg bg-indigo-600 cursor-not-allowed opacity-50"
                    >
                        <GlobeAltIcon className="w-5 h-5 mr-2"/>
                        International
                    </button>
                </div>
            </div>

             {/* Contracts Section */}
             {!isNationalTeam && playersWithContractIssues.length > 0 && gameState === 'PRE_MATCH' && (
                <div>
                    <button 
                        onClick={() => setShowContracts(!showContracts)}
                        className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-200 p-2 rounded-md hover:bg-gray-700/50"
                    >
                        <span className="flex items-center"><DocumentCheckIcon className="w-5 h-5 mr-2 text-orange-400" />Contracts</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${showContracts ? 'rotate-180' : ''}`} />
                    </button>
                    {showContracts && (
                         <div className="mt-2 space-y-1">
                            {playersWithContractIssues.map(player => (
                                <div key={player.name} className={`flex justify-between items-center p-2 rounded-md ${player.contractExpires === 0 ? 'bg-red-900/50' : 'bg-yellow-900/50'}`}>
                                    <div>
                                        <p className="font-semibold text-sm">{player.name}</p>
                                        <p className={`text-xs ${player.contractExpires === 0 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                                            {player.contractExpires === 0 ? 'Expiring' : `${player.contractExpires} yr`}
                                        </p>
                                    </div>
                                    <button onClick={() => onStartContractTalk(player)} className="text-xs font-bold bg-gray-600 hover:bg-gray-500 text-white py-1 px-2 rounded">
                                        Neg.
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* --- SQUAD SELECTION --- */}
            <div>
                <div className="flex justify-between items-center p-2 border-b border-gray-700 mb-2">
                    <h3 className="text-lg font-bold text-gray-200 flex items-center">
                        <UserGroupIcon className="w-5 h-5 mr-2 text-blue-400" /> Squad
                    </h3>
                    {isMatchLive ? (
                        <div className="flex items-center gap-2">
                             <span className="text-xs uppercase text-blue-400 font-bold">Subs: {subsUsed}/5</span>
                             {subSelection && <span className="text-xs text-yellow-400 animate-pulse">Select Player to OFF</span>}
                        </div>
                    ) : (
                         <span className={`font-mono font-bold ${starterColor}`}>{starterCount}/11</span>
                    )}
                </div>

                {/* Analysis Box */}
                {(activeChemistryRifts.length > 0 || injuredStarters.length > 0) && (
                     <div className="bg-red-900/30 border border-red-500/50 rounded-md p-3 mb-3 animate-pulse">
                        {injuredStarters.map(p => (
                             <p key={p.name} className="text-xs text-red-300 font-bold">
                                🚑 {p.name} is injured! SUB HIM OFF!
                             </p>
                        ))}
                        {activeChemistryRifts.map((rift, i) => (
                             <p key={i} className="text-xs text-red-200">
                                ⚠️ <strong>Bad Chemistry:</strong> {rift.replace('-', ' & ')}
                             </p>
                        ))}
                    </div>
                )}

                {/* Starters List */}
                <div className="mb-4">
                    <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2 px-2">Starting XI</h4>
                    <ul className="space-y-1">
                        {starters.map(player => (
                            <li key={player.name} 
                                onClick={() => handlePlayerClick(player, false)}
                                className={`flex justify-between items-center p-2 border rounded-md cursor-pointer transition-colors ${
                                    player.status.type === 'Injured' ? 'bg-red-900/40 border-red-500' :
                                    isMatchLive && subSelection ? 'bg-green-900/20 hover:bg-green-700/50 border-green-500/50 animate-pulse' :
                                    'bg-green-900/20 hover:bg-green-900/40 border-green-900/50'
                                }`}
                            >
                                <div className="flex items-center">
                                    <span className="mr-2 text-lg">{player.nationality}</span>
                                    <div className="w-8 flex items-center justify-center gap-1 mr-2">
                                        {getEffectIndicators(player)}
                                    </div>
                                    <span className={`w-8 h-6 flex items-center justify-center text-xs font-bold rounded ${getPositionColor(player.position)}`}>
                                        {player.position}
                                    </span>
                                    <span className="ml-3 text-sm font-semibold">{player.name}</span>
                                </div>
                                <span className="font-bold text-sm text-green-400">{player.rating}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bench List */}
                <div>
                     <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Bench</h4>
                     <ul className="space-y-1">
                        {bench.map(player => (
                            <li key={player.name} 
                                onClick={() => handlePlayerClick(player, true)}
                                className={`flex justify-between items-center p-2 border rounded-md cursor-pointer transition-colors ${
                                    isMatchLive && subSelection?.name === player.name ? 'bg-green-900/40 border-green-500 animate-pulse' :
                                    'bg-gray-800 hover:bg-gray-700 border-gray-600'
                                }`}
                            >
                                <div className="flex items-center">
                                    <span className="mr-2 text-lg">{player.nationality}</span>
                                    <div className="w-8 flex items-center justify-center gap-1 mr-2">
                                        {getEffectIndicators(player)}
                                    </div>
                                    <span className={`w-8 h-6 flex items-center justify-center text-xs font-bold rounded ${getPositionColor(player.position)}`}>
                                        {player.position}
                                    </span>
                                    <span className="ml-3 text-sm font-semibold">{player.name}</span>
                                </div>
                                <span className="font-bold text-sm text-gray-400">{player.rating}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TeamDetails;