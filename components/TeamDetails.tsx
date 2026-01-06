
import React, { useState, useMemo } from 'react';
import type { Team, Tactic, Formation, Mentality, Player, GameState, PlayerPosition } from '../types';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { FORMATIONS, MENTALITIES, CHAIRMAN_PERSONALITIES } from '../constants';
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

const getPositionColor = (pos: PlayerPosition) => {
    if (pos === 'GK') return 'bg-yellow-600';
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'bg-blue-600';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(pos)) return 'bg-green-600';
    return 'bg-red-600';
};

const TeamDetails: React.FC<TeamDetailsProps> = ({ team, onTacticChange, onNavigateToTransfers, onNavigateToNews, onToggleStarter, gameState }) => {
    const [view, setView] = useState<'squad' | 'tactics'>('squad');
    const starters = team.players.filter(p => p.isStarter);
    const isInternational = team.league === 'International';
    
    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-xl font-bold text-green-400">{team.name}</h2>
                    {!isInternational && (
                        <p className="text-xs text-blue-400 font-mono font-bold uppercase">£{team.balance.toLocaleString()}</p>
                    )}
                </div>
                <div className="flex bg-gray-900 rounded p-1 border border-gray-700 shadow-inner">
                    <button onClick={() => setView('squad')} className={`p-1.5 rounded transition-all ${view === 'squad' ? 'bg-gray-700 text-green-400 shadow' : 'text-gray-500 hover:text-gray-400'}`}><UserGroupIcon className="w-4 h-4" /></button>
                    <button onClick={() => setView('tactics')} className={`p-1.5 rounded transition-all ${view === 'tactics' ? 'bg-gray-700 text-green-400 shadow' : 'text-gray-500 hover:text-gray-400'}`}><GlobeAltIcon className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{isInternational ? 'Federation Goals' : 'Board Focus'}</p>
                <div className="bg-gray-900/50 p-2 rounded border border-gray-700 group relative">
                    <p className="text-xs font-bold text-gray-300">{team.chairmanPersonality}</p>
                    <div className="hidden group-hover:block absolute top-full left-0 right-0 z-50 bg-black border border-gray-600 p-2 text-[10px] text-white rounded mt-1 shadow-2xl">
                        {CHAIRMAN_PERSONALITIES[team.chairmanPersonality]}
                    </div>
                </div>
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

            <div className="flex-grow overflow-y-auto pr-1">
                {view === 'tactics' ? (
                    <TacticsBoard starters={starters} formation={team.tactic.formation} onPlayerClick={p => onToggleStarter(p.name)} />
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1 pl-1">Starting XI ({starters.length}/11)</p>
                            <ul className="space-y-1">
                                {team.players.filter(p => p.isStarter).map(p => (
                                    <li key={p.name} onClick={() => onToggleStarter(p.name)} className="p-2 rounded border border-gray-700 bg-gray-800 cursor-pointer flex items-center gap-2 hover:bg-gray-700 transition-all group">
                                        <span className={`w-7 h-5 text-[9px] font-black flex items-center justify-center rounded text-white ${getPositionColor(p.position)}`}>{p.position}</span>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-bold truncate text-gray-200">{p.name}</p>
                                        </div>
                                        <span className="text-xs font-black text-green-400">{p.rating}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pl-1">Bench ({team.players.length - starters.length})</p>
                            <ul className="space-y-1">
                                {team.players.filter(p => !p.isStarter).map(p => (
                                    <li key={p.name} onClick={() => onToggleStarter(p.name)} className="p-2 rounded border border-gray-700 bg-gray-900/50 cursor-pointer flex items-center gap-2 opacity-60 hover:opacity-100 hover:bg-gray-700 transition-all group">
                                        <span className={`w-7 h-5 text-[9px] font-black flex items-center justify-center rounded text-white ${getPositionColor(p.position)}`}>{p.position}</span>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-bold truncate text-gray-200">{p.name}</p>
                                        </div>
                                        <span className="text-xs font-black text-gray-400">{p.rating}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-700">
                <button onClick={onNavigateToNews} className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-black flex items-center justify-center gap-1.5"><NewspaperIcon className="w-3.5 h-3.5" /> NEWS</button>
                <button onClick={onNavigateToTransfers} className="p-2.5 bg-blue-900 hover:bg-blue-800 rounded text-[10px] font-black flex items-center justify-center gap-1.5 text-blue-100 uppercase tracking-tighter">
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" /> {isInternational ? 'Selection' : 'Scouting'}
                </button>
            </div>
        </div>
    );
};

export default TeamDetails;
