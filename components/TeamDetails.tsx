
import React, { useState, useMemo } from 'react';
import type { Team, Tactic, Formation, Mentality, PlayerEffect, Player, GameState, PlayerPersonality } from '../types';
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
        case 'GK': return 'bg-yellow-600/80 text-yellow-50 border border-yellow-500';
        case 'DEF': return 'bg-blue-600/80 text-blue-50 border border-blue-500';
        case 'MID': return 'bg-green-600/80 text-green-50 border border-green-500';
        case 'FWD': return 'bg-red-600/80 text-red-50 border border-red-500';
        default: return 'bg-gray-500 text-white';
    }
};

const getPersonalityIcon = (personality: PlayerPersonality) => {
    switch (personality) {
        case 'Ambitious': return { icon: '🚀', label: 'Ambitious', color: 'text-purple-400' };
        case 'Loyal': return { icon: '🛡️', label: 'Loyal', color: 'text-blue-400' };
        case 'Mercenary': return { icon: '💰', label: 'Mercenary', color: 'text-yellow-400' };
        case 'Young Prospect': return { icon: '💎', label: 'Prospect', color: 'text-cyan-400' };
        default: return { icon: '👤', label: 'Balanced', color: 'text-gray-400' };
    }
};

const getEffectIndicators = (player: Player) => {
    const indicators = [];
    
    // 1. HARD STATUS (Blocks playing)
    if (player.status.type === 'Injured') {
        indicators.push(
            <span key="inj" className="flex items-center bg-red-900/80 border border-red-500 px-1.5 py-0.5 rounded text-[10px] text-red-100 font-bold uppercase tracking-wider">
                🚑 {player.status.weeks}w
            </span>
        );
    }
    if (player.status.type === 'Suspended') {
        indicators.push(
            <span key="susp" className="flex items-center bg-red-900/80 border border-red-500 px-1.5 py-0.5 rounded text-[10px] text-red-100 font-bold uppercase tracking-wider">
                ⛔ Susp
            </span>
        );
    }
    if (player.status.type === 'SentOff') {
        indicators.push(
            <span key="rc" className="flex items-center bg-red-900/80 border border-red-500 px-1.5 py-0.5 rounded text-[10px] text-red-100 font-bold uppercase tracking-wider">
                🟥 Sent Off
            </span>
        );
    }
    if (player.status.type === 'On International Duty') {
        indicators.push(
            <span key="int" className="flex items-center bg-blue-900/80 border border-blue-500 px-1.5 py-0.5 rounded text-[10px] text-blue-100 font-bold uppercase tracking-wider">
                ✈️ Intl
            </span>
        );
    }

    // 2. IN-MATCH CARDS
    if (player.matchCard === 'yellow') {
        indicators.push(<span key="yc" title="Yellow Card" className="text-yellow-400 text-sm">🟨</span>);
    }

    // 3. MORALE & CHEMISTRY (Effects)
    // Default Morale if no specific effect
    const moraleEffect = player.effects.find(e => e.type === 'PostTournamentMorale');
    if (moraleEffect && moraleEffect.type === 'PostTournamentMorale') {
        if (moraleEffect.morale === 'Winner') indicators.push(<span key="m-win" title="Morale: High (Winner)" className="text-sm">🏆</span>);
        if (moraleEffect.morale === 'FiredUp') indicators.push(<span key="m-fire" title="Morale: High (Fired Up)" className="text-sm">🔥</span>);
        if (moraleEffect.morale === 'Disappointed') indicators.push(<span key="m-sad" title="Morale: Low (Disappointed)" className="text-sm">😞</span>);
    } else {
        // Neutral/Good morale default
        indicators.push(<span key="m-ok" title="Morale: Okay" className="text-sm grayscale opacity-30">🙂</span>);
    }

    const chemEffect = player.effects.find(e => e.type === 'BadChemistry');
    if (chemEffect) {
        indicators.push(
            <span key="chem" title="Bad Chemistry" className="flex items-center text-orange-400">
                <BrokenLinkIcon className="w-4 h-4" />
            </span>
        );
    }

    return indicators;
}


const TeamDetails: React.FC<TeamDetailsProps> = ({ team, onTacticChange, onNavigateToTransfers, onNavigateToNews, onStartContractTalk, onToggleStarter, gameState, subsUsed, onSubstitute }) => {
    const [showContracts, setShowContracts] = useState(false);
    const [subSelection, setSubSelection] = useState<Player | null>(null);

    const isNationalTeam = team.league === 'International';
    const isMatchLive = gameState === 'PAUSED';

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
    const sentOffStarters = starters.filter(p => p.status.type === 'SentOff');


    const handlePlayerClick = (player: Player, isBench: boolean) => {
        if (player.status.type === 'SentOff') return;
        if (player.status.type === 'Suspended') return;
        if (player.status.type === 'Injured' && gameState === 'PRE_MATCH') return;

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

    const renderPlayerRow = (player: Player, isBench: boolean) => {
        const personality = getPersonalityIcon(player.personality);
        const isDisabled = player.status.type === 'SentOff' || player.status.type === 'Suspended' || (player.status.type === 'Injured' && gameState === 'PRE_MATCH');
        const isSelectedSub = isMatchLive && subSelection?.name === player.name;

        return (
            <li key={player.name} 
                onClick={() => handlePlayerClick(player, isBench)}
                className={`relative flex items-center p-2 mb-1 border rounded-lg cursor-pointer transition-all duration-200 group ${
                    isDisabled ? 'bg-black/40 border-gray-800 opacity-60 cursor-not-allowed' :
                    isSelectedSub ? 'bg-green-900/40 border-green-400 ring-1 ring-green-400 translate-x-1' :
                    isBench ? 'bg-gray-800/60 border-gray-700 hover:bg-gray-700' : 
                    'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                }`}
            >
                {/* Position & Flag */}
                <div className="flex flex-col items-center justify-center w-10 mr-3 gap-1">
                    <span className={`w-8 h-6 flex items-center justify-center text-[10px] font-black rounded shadow-sm ${getPositionColor(player.position)}`}>
                        {player.position}
                    </span>
                    <span className="text-lg leading-none filter drop-shadow-md">{player.nationality}</span>
                </div>

                {/* Name & Personality */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm truncate ${isDisabled ? 'text-gray-500' : 'text-gray-200'}`}>
                            {player.name}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                        {/* Personality Badge */}
                        <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/30 border border-white/5 ${personality.color}`}>
                            <span>{personality.icon}</span>
                            <span>{personality.label}</span>
                        </div>
                        {/* Status Icons */}
                        <div className="flex items-center gap-1">
                            {getEffectIndicators(player)}
                        </div>
                    </div>
                </div>

                {/* Rating */}
                <div className="ml-3 flex flex-col items-center justify-center min-w-[2.5rem]">
                    <span className={`text-lg font-bold font-mono ${player.rating >= 85 ? 'text-green-400' : player.rating >= 80 ? 'text-green-200' : 'text-gray-400'}`}>
                        {player.rating}
                    </span>
                </div>
            </li>
        );
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 space-y-4 h-full flex flex-col">
            <div>
                <h2 className="text-xl font-bold text-center text-green-400 tracking-wide">{team.name}</h2>
                {isNationalTeam && <p className="text-xs text-center text-gray-400 uppercase tracking-widest mt-1">National Team Manager</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label htmlFor="formation-select" className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Formation</label>
                    <select 
                        id="formation-select" 
                        value={team.tactic.formation} 
                        onChange={(e) => onTacticChange({ formation: e.target.value as Formation })}
                        disabled={isMatchLive}
                        className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2 disabled:opacity-50"
                    >
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="mentality-select" className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Mentality</label>
                    <select 
                        id="mentality-select" 
                        value={team.tactic.mentality} 
                        onChange={(e) => onTacticChange({ mentality: e.target.value as Mentality })}
                        className="bg-gray-700 border border-gray-600 text-white text-xs rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2"
                    >
                        {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                 <button
                    onClick={onNavigateToNews}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                    <NewspaperIcon className="w-5 h-5 text-gray-300"/>
                    <span className="text-[10px] mt-1 font-bold text-gray-400">NEWS</span>
                </button>
                <button
                    onClick={onNavigateToTransfers}
                    disabled={isNationalTeam || gameState !== 'PRE_MATCH'}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${isNationalTeam || gameState !== 'PRE_MATCH' ? 'bg-gray-800 opacity-50 cursor-not-allowed' : 'bg-blue-900/50 hover:bg-blue-800/50 border border-blue-800'}`}
                >
                    <ArrowsRightLeftIcon className="w-5 h-5 text-blue-300"/>
                    <span className="text-[10px] mt-1 font-bold text-blue-400">TRANSFER</span>
                </button>
                {!isNationalTeam && (
                    <button 
                        onClick={() => setShowContracts(!showContracts)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${playersWithContractIssues.length > 0 ? 'bg-yellow-900/50 hover:bg-yellow-800/50 border border-yellow-800' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <DocumentCheckIcon className={`w-5 h-5 ${playersWithContractIssues.length > 0 ? 'text-yellow-300' : 'text-gray-300'}`} />
                        <span className={`text-[10px] mt-1 font-bold ${playersWithContractIssues.length > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>CONTRACTS</span>
                    </button>
                )}
            </div>

             {/* Contracts Dropdown */}
             {showContracts && playersWithContractIssues.length > 0 && (
                 <div className="bg-gray-900/50 p-2 rounded-lg border border-yellow-800/30 space-y-1">
                    {playersWithContractIssues.map(player => (
                        <div key={player.name} className="flex justify-between items-center p-1.5 rounded bg-gray-800">
                            <span className="text-xs font-semibold text-gray-300">{player.name}</span>
                            <button onClick={() => onStartContractTalk(player)} className="text-[10px] font-bold bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-0.5 rounded">
                                Renew
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {/* --- SQUAD LIST --- */}
            <div className="flex-grow overflow-y-auto pr-1">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-700 sticky top-0 bg-[#1f2937] z-10 pt-2">
                    <h3 className="text-sm font-bold text-gray-200 flex items-center">
                        <UserGroupIcon className="w-4 h-4 mr-2 text-blue-400" /> 
                        SQUAD SELECTION
                    </h3>
                    {isMatchLive ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${subsUsed >= 5 ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                            SUBS: {subsUsed}/5
                        </span>
                    ) : (
                         <span className={`font-mono text-sm font-bold ${starterColor}`}>{starterCount}/11</span>
                    )}
                </div>

                {/* Analysis Box */}
                {(activeChemistryRifts.length > 0 || injuredStarters.length > 0 || sentOffStarters.length > 0) && (
                     <div className="bg-red-950/50 border border-red-500/30 rounded p-2 mb-3">
                        {sentOffStarters.map(p => (
                             <div key={p.name} className="text-xs text-red-300 font-bold flex items-center gap-2">
                                🟥 {p.name} (Sent Off)
                             </div>
                        ))}
                        {injuredStarters.map(p => (
                             <div key={p.name} className="text-xs text-red-300 font-bold flex items-center gap-2">
                                🚑 {p.name} (Injured) - {subsUsed >= 5 ? "NO SUBS LEFT!" : "SUB NOW"}
                             </div>
                        ))}
                        {activeChemistryRifts.map((rift, i) => (
                             <div key={i} className="text-xs text-orange-300 flex items-center gap-2">
                                <BrokenLinkIcon className="w-3 h-3" />
                                <span>{rift.replace('-', ' & ')}</span>
                             </div>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-2 pl-1">Starting XI</h4>
                        <ul className="space-y-1">
                            {starters.map(p => renderPlayerRow(p, false))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Bench</h4>
                        <ul className="space-y-1">
                            {bench.map(p => renderPlayerRow(p, true))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamDetails;
