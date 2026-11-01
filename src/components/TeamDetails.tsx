import React from 'react';
import { Gamepad2, ClipboardList, Newspaper, Search, Handshake, Trophy, House, Plane, CircleDollarSign, type LucideIcon } from 'lucide-react';
import { GameState } from '../types';
import type { Team, Fixture } from '../types';
import ClubCrest from './ClubIdentity';

interface TeamDetailsProps {
    team: Team;
    gameState: GameState;
    managerReputation: number;
    nextFixture: Fixture | null;
    activeTab: 'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors';
    onNavigateToTab: (tab: 'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors') => void;
    onResign?: () => void;
}

type GameplayTab = TeamDetailsProps['activeTab'];

const navigationItems: Array<{
    tab: Exclude<GameplayTab, 'scouting_market'>;
    label: string;
    Icon: LucideIcon;
}> = [
    { tab: 'match', label: 'Match Center', Icon: Gamepad2 },
    { tab: 'tactics', label: 'Roster & Tactics', Icon: ClipboardList },
    { tab: 'news', label: 'Inbox Feed', Icon: Newspaper },
    { tab: 'scouting', label: 'Scout Network', Icon: Search },
    { tab: 'transfers', label: 'Negotiations', Icon: Handshake },
    { tab: 'honors', label: 'Trophy Room', Icon: Trophy },
];

const TeamDetails: React.FC<TeamDetailsProps> = ({
    team,
    gameState,
    managerReputation,
    nextFixture,
    activeTab,
    onNavigateToTab,
    onResign,
}) => {
    const isNationalTeam = team.league === 'International';
    const managerName = typeof window === 'undefined' ? 'Manager' : window.localStorage.getItem('gfm_manager_name') || 'Manager';
    const totalWageBill = team.players.reduce((sum, player) => sum + player.wage, 0);

    let opponentName = 'No Match';
    let isHome = true;
    if (nextFixture) {
        isHome = nextFixture.homeTeam === team.name;
        opponentName = isHome ? nextFixture.awayTeam : nextFixture.homeTeam;
    }

    return (
        <div className="flex h-full flex-col gap-5 rounded-xl border border-slate-700/90 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-4 border-b border-slate-700/70 pb-4">
                <ClubCrest name={team.name} size="h-14 w-14" />
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-black leading-tight text-white">{team.name}</h2>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{team.league}</p>
                </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/45 p-3.5">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500">Manager</span>
                    <span className="max-w-[120px] truncate text-xs font-bold text-white">{managerName}</span>
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="font-black uppercase text-slate-500">Reputation</span>
                        <span className="font-mono font-bold text-emerald-400">{managerReputation}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300" style={{ width: `${managerReputation}%` }} />
                    </div>
                </div>
                {onResign && (
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to resign? Your manager reputation will suffer!')) onResign();
                        }}
                        className="mt-1.5 w-full rounded-md border border-red-900/30 bg-red-950/30 py-1.5 text-[9px] font-black uppercase tracking-wider text-red-400 transition-colors hover:bg-red-950/60"
                    >
                        Resign position
                    </button>
                )}
            </div>

            {nextFixture && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950/45 p-3.5">
                    <div className="mb-1 flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500">Next Match</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[8px] font-black text-slate-400">WEEK {nextFixture.week}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">vs {opponentName}</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                            {isHome ? <House className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Plane className="h-3.5 w-3.5" strokeWidth={1.8} />}
                            {isHome ? 'Home' : 'Away'}
                        </span>
                    </div>
                </div>
            )}

            {!isNationalTeam && (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/45 p-3.5">
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black uppercase text-slate-500">Balance</span>
                        <span className="font-mono font-bold text-emerald-400">${team.balance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black uppercase text-slate-500">Wage Bill</span>
                        <span className="font-mono font-medium text-slate-300">${totalWageBill.toLocaleString()}/wk</span>
                    </div>
                </div>
            )}

            <nav className="mt-auto flex flex-col gap-1.5 border-t border-slate-700/70 pt-4" aria-label="Team console navigation">
                <span className="mb-1 pl-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Console Navigation</span>
                {navigationItems.slice(0, 4).map(({ tab, label, Icon }) => {
                    const isActive = activeTab === tab || (tab === 'scouting' && activeTab === 'scouting_market');
                    return (
                        <button
                            key={tab}
                            onClick={() => onNavigateToTab(tab)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 ${
                                isActive ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-100 shadow-[inset_2px_0_0_#34d399]' : 'border-transparent text-slate-400 hover:bg-slate-950/55 hover:text-slate-200'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            {label}
                        </button>
                    );
                })}
                <button
                    onClick={() => onNavigateToTab('scouting_market')}
                    aria-current={activeTab === 'scouting_market' ? 'page' : undefined}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 ${activeTab === 'scouting_market' ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-100 shadow-[inset_2px_0_0_#34d399]' : 'border-transparent text-slate-400 hover:bg-slate-950/55 hover:text-slate-200'}`}
                >
                    <CircleDollarSign className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    Free Agency
                </button>
                {navigationItems.slice(4).map(({ tab, label, Icon }) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => onNavigateToTab(tab)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 ${
                                isActive ? 'border-emerald-500/70 bg-emerald-950/70 text-emerald-100 shadow-[inset_2px_0_0_#34d399]' : 'border-transparent text-slate-400 hover:bg-slate-950/55 hover:text-slate-200'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            {label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default TeamDetails;
