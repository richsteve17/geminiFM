
import React from 'react';
import type { LeagueTableEntry, Fixture, Team, BoardConfidenceStatus, FormResult } from '../types';
import LeagueTableView from './LeagueTableView';

interface BoardSidebarPanelProps {
    leagueTable: LeagueTableEntry[];
    userTeamName: string | null;
    userTeam: Team | null;
    boardConfidence: number;
    boardStatus: BoardConfidenceStatus;
    knockoutResults: Fixture[];
    currentWeek: number;
    weeksInSeason: number;
}

const STATUS_CONFIG: Record<BoardConfidenceStatus, { color: string; bar: string; icon: string; description: string }> = {
    'Delighted': {
        color: 'text-emerald-400',
        bar: 'bg-emerald-500',
        icon: '🟢',
        description: 'The board is fully behind you.'
    },
    'Satisfied': {
        color: 'text-green-400',
        bar: 'bg-green-500',
        icon: '🟩',
        description: 'Results are meeting expectations.'
    },
    'Cautious': {
        color: 'text-yellow-400',
        bar: 'bg-yellow-500',
        icon: '🟨',
        description: 'The board is watching closely.'
    },
    'Concerned': {
        color: 'text-orange-400',
        bar: 'bg-orange-500',
        icon: '🟧',
        description: 'The board is unhappy with recent form.'
    },
    'Under Threat': {
        color: 'text-red-400',
        bar: 'bg-red-600',
        icon: '🔴',
        description: 'Your position is under serious threat.'
    },
};

const FormBadge: React.FC<{ result: FormResult }> = ({ result }) => {
    const cls = result === 'W'
        ? 'bg-green-600 text-white'
        : result === 'D'
        ? 'bg-yellow-600 text-white'
        : 'bg-red-700 text-white';
    return (
        <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-black rounded ${cls}`}>
            {result}
        </span>
    );
};

const BoardSidebarPanel: React.FC<BoardSidebarPanelProps> = ({
    leagueTable,
    userTeamName,
    userTeam,
    boardConfidence,
    boardStatus,
    knockoutResults,
    currentWeek,
    weeksInSeason,
}) => {
    const cfg = STATUS_CONFIG[boardStatus];
    const form = userTeam?.form ?? [];
    const weeklyWages = userTeam
        ? userTeam.players.reduce((sum, p) => sum + (p.isStarter || true ? p.wage : 0), 0)
        : 0;

    return (
        <div className="space-y-3">
            {/* Board Confidence */}
            <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Board Status</h3>

                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg leading-none">{cfg.icon}</span>
                    <div>
                        <p className={`text-base font-black ${cfg.color}`}>{boardStatus}</p>
                        <p className="text-[11px] text-gray-400">{cfg.description}</p>
                    </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-700 ${cfg.bar}`}
                        style={{ width: `${boardConfidence}%` }}
                    />
                </div>

                {/* Recent form */}
                {form.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Recent Form</p>
                        <div className="flex gap-1">
                            {form.map((r, i) => <FormBadge key={i} result={r} />)}
                        </div>
                    </div>
                )}

                {/* Season progress */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Week {currentWeek}</span>
                    <span>of {weeksInSeason}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                    <div
                        className="h-1 rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, (currentWeek / weeksInSeason) * 100)}%` }}
                    />
                </div>
            </div>

            {/* Finances */}
            {userTeam && (
                <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Finances</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Balance</span>
                            <span className={`text-sm font-black ${userTeam.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {userTeam.balance >= 0 ? '+' : ''}${(userTeam.balance / 1_000_000).toFixed(1)}M
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Wage Bill / wk</span>
                            <span className="text-sm font-bold text-gray-200">
                                ${weeklyWages.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* League Table */}
            <LeagueTableView
                table={leagueTable}
                userTeamName={userTeamName}
                knockoutResults={knockoutResults}
            />
        </div>
    );
};

export default BoardSidebarPanel;
