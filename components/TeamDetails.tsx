import React, { useState } from 'react';
import type { Team, Tactic, Formation, Mentality, PlayerEffect, Player } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { FORMATIONS, MENTALITIES } from '../constants';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';

interface TeamDetailsProps {
    team: Team;
    onTacticChange: (tactic: Partial<Tactic>) => void;
    onNavigateToTransfers: () => void;
    onNavigateToNews: () => void;
    onStartContractTalk: (player: Player) => void;
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

const getEffectIndicators = (effects: PlayerEffect[]) => {
    return effects.map((effect, index) => {
        switch (effect.type) {
            case 'PostTournamentMorale':
                if (effect.morale === 'Winner') return <span key={index} className="text-xs font-bold text-yellow-400" title={effect.message}>🏆</span>;
                if (effect.morale === 'FiredUp') return <span key={index} className="text-xs font-bold text-red-500" title={effect.message}>🔥</span>;
                if (effect.morale === 'Disappointed') return <span key={index} className="text-xs font-bold text-gray-400" title={effect.message}>😔</span>;
                return null;
            case 'BadChemistry':
                 return <span key={index} title={effect.message}><BrokenLinkIcon className="w-4 h-4 text-orange-400" /></span>;
            default:
                return null;
        }
    });
}


const TeamDetails: React.FC<TeamDetailsProps> = ({ team, onTacticChange, onNavigateToTransfers, onNavigateToNews, onStartContractTalk }) => {
    const [showPlayers, setShowPlayers] = useState(true);
    const [showContracts, setShowContracts] = useState(true);

    const playersWithContractIssues = team.players
        .filter(p => p.contractExpires < 2)
        .sort((a, b) => a.contractExpires - b.contractExpires);

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 space-y-4">
            <div>
                <h2 className="text-xl font-bold text-center text-green-400 tracking-wide">{team.name}</h2>
            </div>

            <div className="space-y-3">
                 <div>
                    <label htmlFor="formation-select" className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
                    <select 
                        id="formation-select" 
                        value={team.tactic.formation} 
                        onChange={(e) => onTacticChange({ formation: e.target.value as Formation })}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5"
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
                        className="w-full flex items-center justify-center text-center text-sm font-semibold text-white p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        <ArrowsRightLeftIcon className="w-5 h-5 mr-2"/>
                        Transfers
                    </button>
                    <button
                        disabled
                        title="International Management coming soon!"
                        className="w-full flex items-center justify-center text-center text-sm font-semibold text-white p-2.5 rounded-lg bg-indigo-600 cursor-not-allowed opacity-50"
                    >
                        <GlobeAltIcon className="w-5 h-5 mr-2"/>
                        International
                    </button>
                </div>
            </div>

             {playersWithContractIssues.length > 0 && (
                <div>
                    <button 
                        onClick={() => setShowContracts(!showContracts)}
                        className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-200 p-2 rounded-md hover:bg-gray-700/50"
                        aria-expanded={showContracts}
                    >
                        <span className="flex items-center"><DocumentCheckIcon className="w-5 h-5 mr-2 text-orange-400" />Contract Negotiations</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${showContracts ? 'rotate-180' : ''}`} />
                    </button>
                    {showContracts && (
                         <div className="mt-2 space-y-1">
                            {playersWithContractIssues.map(player => (
                                <div key={player.name} className={`flex justify-between items-center p-2 rounded-md ${player.contractExpires === 0 ? 'bg-red-900/50' : 'bg-yellow-900/50'}`}>
                                    <div>
                                        <p className="font-semibold text-sm">{player.name}</p>
                                        <p className={`text-xs ${player.contractExpires === 0 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                                            {player.contractExpires === 0 ? 'Contract Expired' : `${player.contractExpires} year(s) left`}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => onStartContractTalk(player)}
                                        className="text-xs font-bold bg-gray-600 hover:bg-gray-500 text-white py-1 px-2 rounded"
                                    >
                                        Negotiate
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <div>
                <button 
                    onClick={() => setShowPlayers(!showPlayers)}
                    className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-200 p-2 rounded-md hover:bg-gray-700/50"
                    aria-expanded={showPlayers}
                >
                    Squad
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${showPlayers ? 'rotate-180' : ''}`} />
                </button>
                {showPlayers && (
                    <div className="mt-2 max-h-80 overflow-y-auto pr-2">
                        <ul className="space-y-1">
                            {team.players.map(player => (
                                <li key={player.name} className="flex justify-between items-center p-2 bg-gray-700/50 rounded-md">
                                    <div className="flex items-center">
                                        <span className="mr-2 text-lg">{player.nationality}</span>
                                        <div className="w-8 flex items-center justify-center gap-1 mr-2">
                                            {player.status.type === 'On International Duty' ? <span className="text-xs font-bold text-blue-400" title={`On International Duty until week ${player.status.until}`}>INT</span> : getEffectIndicators(player.effects)}
                                        </div>
                                        <span className={`w-8 h-6 flex items-center justify-center text-xs font-bold rounded ${getPositionColor(player.position)}`}>
                                            {player.position}
                                        </span>
                                        <span className="ml-3 text-sm">{player.name}</span>
                                    </div>
                                    <span className="font-bold text-sm text-green-400">{player.rating}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamDetails;