import React from 'react';
import { GameState } from '../types';
import type { Team, Fixture } from '../types';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';

interface TeamDetailsProps {
    team: Team;
    gameState: GameState;
    managerReputation: number;
    nextFixture: Fixture | null;
    activeTab: 'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors';
    onNavigateToTab: (tab: 'match' | 'tactics' | 'news' | 'scouting' | 'transfers' | 'honors') => void;
    onResign?: () => void;
}

const TeamDetails: React.FC<TeamDetailsProps> = ({
    team,
    gameState,
    managerReputation,
    nextFixture,
    activeTab,
    onNavigateToTab,
    onResign
}) => {
    const isNationalTeam = team.league === 'International';
    const managerName = localStorage.getItem('gfm_manager_name') || 'Manager';

    const primaryColor = team.colors?.primary || '#333333';
    const secondaryColor = team.colors?.secondary || '#666666';
    const textColor = team.colors?.text || '#FFFFFF';

    // Financial Snapshot
    const totalWageBill = team.players.reduce((sum, p) => sum + p.wage, 0);

    // Opponent Parser
    let opponentName = 'No Match';
    let isHome = true;
    if (nextFixture) {
        isHome = nextFixture.homeTeam === team.name;
        opponentName = isHome ? nextFixture.awayTeam : nextFixture.homeTeam;
    }

    return (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full gap-5">
            {/* Identity & Logo Jersey */}
            <div className="flex items-center gap-4 border-b border-gray-700/50 pb-4">
                <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-md flex-shrink-0">
                    <path d="M 15,30 L 0,40 L 10,55 L 25,45 Z" fill={secondaryColor} stroke={primaryColor} strokeWidth="1" />
                    <path d="M 85,30 L 100,40 L 90,55 L 75,45 Z" fill={secondaryColor} stroke={primaryColor} strokeWidth="1" />
                    <path d="M 25,25 L 75,25 L 75,85 L 25,85 Z" fill={primaryColor} />
                    <path d="M 40,25 L 40,85 M 50,25 L 50,85 M 60,25 L 60,85" stroke={secondaryColor} strokeWidth="4" opacity="0.4" />
                    <path d="M 40,25 L 50,35 L 60,25" fill="none" stroke={textColor} strokeWidth="2" />
                </svg>
                <div className="min-w-0">
                    <h2 className="text-lg font-black text-white truncate leading-tight">{team.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{team.league}</p>
                </div>
            </div>

            {/* Manager Profile card */}
            <div className="bg-gray-900/40 border border-gray-800 p-3.5 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black">Manager</span>
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{managerName}</span>
                </div>
                <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-500 uppercase font-black">Reputation</span>
                        <span className="text-emerald-400 font-mono font-bold">{managerReputation}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-850">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
                            style={{ width: `${managerReputation}%` }}
                        ></div>
                    </div>
                </div>

                {onResign && (
                    <button 
                        onClick={() => {
                            if (confirm("Are you sure you want to resign? Your manager reputation will suffer!")) {
                                onResign();
                            }
                        }}
                        className="w-full mt-1.5 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 text-[9px] font-black rounded-md uppercase tracking-wider transition-colors"
                    >
                        Resign position
                    </button>
                )}
            </div>

            {/* Next Match Summary */}
            {nextFixture && (
                <div className="bg-gray-900/40 border border-gray-800 p-3.5 rounded-lg flex flex-col gap-1.5">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-1.5 mb-1">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Next Match</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[8px] font-black rounded font-mono">WEEK {nextFixture.week}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-bold">vs {opponentName}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{isHome ? '🏠 HOME' : '✈️ AWAY'}</span>
                    </div>
                </div>
            )}

            {/* Finances */}
            {!isNationalTeam && (
                <div className="bg-gray-900/40 border border-gray-800 p-3.5 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 uppercase font-black">Balance</span>
                        <span className="text-emerald-400 font-mono font-bold">${team.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 uppercase font-black">Wage Bill</span>
                        <span className="text-slate-300 font-mono font-medium">${totalWageBill.toLocaleString()}/wk</span>
                    </div>
                </div>
            )}

            {/* Sidebar Navigation Shortcut Buttons */}
            <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-700/50 pt-4">
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest pl-1 mb-1">Console Navigation</span>
                
                <button 
                    onClick={() => onNavigateToTab('match')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'match' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>🎮</span> Match Center
                </button>

                <button 
                    onClick={() => onNavigateToTab('tactics')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'tactics' ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>📋</span> Roster & Tactics
                </button>

                <button 
                    onClick={() => onNavigateToTab('news')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'news' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>📰</span> Inbox Feed
                </button>

                <button 
                    onClick={() => onNavigateToTab('scouting')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'scouting' || activeTab === 'scouting_market' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>🔍</span> Scout Network
                </button>

                <button 
                    onClick={() => onNavigateToTab('transfers')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'transfers' ? 'bg-gradient-to-r from-green-700 to-emerald-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>🤝</span> Negotiations
                </button>

                <button 
                    onClick={() => onNavigateToTab('honors')} 
                    className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTab === 'honors' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/45'
                    }`}
                >
                    <span>🏆</span> Trophy Room
                </button>
            </div>
        </div>
    );
};

export default TeamDetails;
