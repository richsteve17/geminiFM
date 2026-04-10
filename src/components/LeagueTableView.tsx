
import React, { useState, useMemo } from 'react';
import type { Fixture, LeagueTableEntry, LeagueTier } from '../types';

interface LeagueTableViewProps {
    table: LeagueTableEntry[];
    userTeamName: string | null;
    knockoutResults?: Fixture[];
}

const STAGE_ORDER = ['Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];

const KnockoutBracketView: React.FC<{ fixtures: Fixture[]; userTeamName: string | null }> = ({ fixtures, userTeamName }) => {
    const byStage = useMemo(() => {
        const map: Record<string, Fixture[]> = {};
        fixtures.forEach(f => {
            if (f.stage && STAGE_ORDER.includes(f.stage)) {
                if (!map[f.stage]) map[f.stage] = [];
                map[f.stage].push(f);
            }
        });
        return map;
    }, [fixtures]);

    if (Object.keys(byStage).length === 0) {
        return <p className="text-gray-500 text-xs text-center mt-4">Knockout bracket will appear after the group stage.</p>;
    }

    return (
        <div className="space-y-4">
            {STAGE_ORDER.filter(s => byStage[s]?.length > 0).map(stage => (
                <div key={stage}>
                    <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">{stage}</h3>
                    <div className="space-y-1">
                        {byStage[stage].map(f => {
                            const isUserMatch = f.homeTeam === userTeamName || f.awayTeam === userTeamName;
                            return (
                                <div key={f.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${isUserMatch ? 'bg-green-900/40 border border-green-800' : 'bg-gray-800/50'}`}>
                                    <span className={`truncate max-w-[80px] ${f.homeTeam === userTeamName ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{f.homeTeam}</span>
                                    <span className="text-gray-500 font-mono text-[10px] mx-1 shrink-0">
                                        {f.played ? f.score : 'vs'}
                                    </span>
                                    <span className={`truncate max-w-[80px] text-right ${f.awayTeam === userTeamName ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{f.awayTeam}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const LeagueTableView: React.FC<LeagueTableViewProps> = ({ table, userTeamName, knockoutResults = [] }) => {
    
    const isWorldCup = table.some(t => t.league === 'International' && t.group);
    const isChampionsLeague = table.some(t => t.league === 'Champions League');
    const hasKnockouts = knockoutResults.length > 0;

    const views = useMemo(() => {
        if (isWorldCup) {
             const uniqueGroups = Array.from(new Set(table.map(t => t.group))).filter(Boolean).sort();
             const groupViews = uniqueGroups.map(g => `Group ${g}`);
             if (hasKnockouts) groupViews.push('Knockout Bracket');
             return groupViews;
        } else if (isChampionsLeague) {
            return ['Champions League'];
        } else {
             const uniqueLeagues = Array.from(new Set(table.map(t => t.league))) as LeagueTier[];
             const priorityOrder: LeagueTier[] = ['Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'MLS'];
             return uniqueLeagues.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
        }
    }, [table, isWorldCup, isChampionsLeague, hasKnockouts]);

    const userLeagueOrGroup = useMemo(() => {
        if (!userTeamName) return views[0] || 'Premier League';
        const userEntry = table.find(t => t.teamName === userTeamName);
        if (isWorldCup && userEntry?.group) return `Group ${userEntry.group}`;
        return userEntry ? userEntry.league : views[0] || 'Premier League';
    }, [table, userTeamName, isWorldCup, views]);

    const [selectedView, setSelectedView] = useState<string>(userLeagueOrGroup);

    const filteredTable = isWorldCup 
        ? table.filter(t => `Group ${t.group}` === selectedView)
        : table.filter(t => t.league === selectedView);

    const sortedTable = [...filteredTable].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });

    const getRowClass = (index: number) => {
        if (isChampionsLeague) {
            if (index < 8) return 'border-l-4 border-l-green-500'; 
            if (index < 24) return 'border-l-4 border-l-yellow-500'; 
            return 'border-l-4 border-l-red-500'; 
        }
        if (isWorldCup && index < 2) return 'border-l-4 border-l-green-500';
        if (!isWorldCup && index < 4) return 'border-l-4 border-l-blue-500'; 
        return '';
    };

    const showingKnockout = selectedView === 'Knockout Bracket';

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 h-full overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-center text-green-400 tracking-wide">
                {isWorldCup ? (showingKnockout ? 'Knockout Bracket' : 'Group Stage') : (isChampionsLeague ? 'League Phase' : 'League Table')}
            </h2>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
                {views.map(view => (
                    <button
                        key={view}
                        onClick={() => setSelectedView(view)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors border border-gray-600 ${selectedView === view ? 'bg-green-600 text-white border-green-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                        {view}
                    </button>
                ))}
            </div>

            {showingKnockout ? (
                <div className="overflow-y-auto flex-grow pr-1">
                    <KnockoutBracketView fixtures={knockoutResults} userTeamName={userTeamName} />
                </div>
            ) : (
                <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-2 py-3 text-center">Pos</th>
                                <th scope="col" className="px-4 py-3">Team</th>
                                <th scope="col" className="px-2 py-3 text-center">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTable.map((entry, index) => (
                                <tr key={entry.teamName} className={`border-b border-gray-700 ${entry.teamName === userTeamName ? 'bg-green-900/40' : 'hover:bg-gray-700/30'} ${getRowClass(index)}`}>
                                    <td className="px-2 py-2 font-medium text-center">{index + 1}</td>
                                    <td className="px-4 py-2 font-semibold truncate max-w-[120px]" title={entry.teamName}>
                                        {entry.teamName}
                                    </td>
                                    <td className="px-2 py-2 font-bold text-center text-white">{entry.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LeagueTableView;
