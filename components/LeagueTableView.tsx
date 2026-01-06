
import React, { useState, useMemo } from 'react';
import type { LeagueTableEntry, LeagueTier } from '../types';

interface LeagueTableViewProps {
    table: LeagueTableEntry[];
    userTeamName: string | null;
}

const LeagueTableView: React.FC<LeagueTableViewProps> = ({ table, userTeamName }) => {
    
    // Check if we are in World Cup Mode or Champions League
    const isWorldCup = table.some(t => t.league === 'International' && t.group);
    const isChampionsLeague = table.some(t => t.league === 'Champions League');

    // Determine default view
    const userLeagueOrGroup = useMemo(() => {
        if (!userTeamName) return isWorldCup ? 'Group A' : (isChampionsLeague ? 'Champions League' : 'Premier League');
        const userEntry = table.find(t => t.teamName === userTeamName);
        if (isWorldCup && userEntry?.group) return `Group ${userEntry.group}`;
        return userEntry ? userEntry.league : 'Premier League';
    }, [table, userTeamName, isWorldCup, isChampionsLeague]);

    const [selectedView, setSelectedView] = useState<string>(userLeagueOrGroup);

    // Get all unique views (Leagues or Groups)
    const views = useMemo(() => {
        if (isWorldCup) {
             const uniqueGroups = Array.from(new Set(table.map(t => t.group))).filter(Boolean).sort();
             return uniqueGroups.map(g => `Group ${g}`);
        } else if (isChampionsLeague) {
            return ['Champions League'];
        } else {
             const uniqueLeagues = Array.from(new Set(table.map(t => t.league))) as LeagueTier[];
             const priorityOrder: LeagueTier[] = ['Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'MLS'];
             return uniqueLeagues.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
        }
    }, [table, isWorldCup, isChampionsLeague]);
    
    const filteredTable = isWorldCup 
        ? table.filter(t => `Group ${t.group}` === selectedView)
        : table.filter(t => t.league === selectedView);

    const sortedTable = [...filteredTable].sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        if (b.goalDifference !== a.goalDifference) {
            return b.goalDifference - a.goalDifference;
        }
        return b.goalsFor - a.goalsFor;
    });

    const getRowClass = (index: number) => {
        if (isChampionsLeague) {
            if (index < 8) return 'border-l-4 border-l-green-500'; // R16 Direct
            if (index < 24) return 'border-l-4 border-l-yellow-500'; // Playoffs
            return 'border-l-4 border-l-red-500'; // Eliminated
        }
        if (isWorldCup && index < 2) return 'border-l-4 border-l-green-500';
        if (!isWorldCup && index < 4) return 'border-l-4 border-l-blue-500'; // Generic CL spots
        return '';
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700 h-full overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-center text-green-400 tracking-wide">
                {isWorldCup ? 'Group Stage' : (isChampionsLeague ? 'League Phase' : 'League Table')}
            </h2>
            
            {!isChampionsLeague && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {views.map(view => (
                        <button
                            key={view}
                            onClick={() => setSelectedView(view)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border border-gray-600 ${selectedView === view ? 'bg-green-600 text-white border-green-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            )}

            {isChampionsLeague && (
                <div className="flex justify-center gap-4 mb-2 text-[10px] font-bold uppercase text-gray-400">
                    <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>Qual</span>
                    <span className="flex items-center"><span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>Play-off</span>
                    <span className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>Elim</span>
                </div>
            )}

            <div className="overflow-x-auto flex-grow">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-2 py-3 text-center">Pos</th>
                            <th scope="col" className="px-4 py-3">Team</th>
                            <th scope="col" className="px-2 py-3 text-center">P</th>
                            <th scope="col" className="px-2 py-3 text-center">GD</th>
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
                                <td className="px-2 py-2 text-center text-gray-400">{entry.played}</td>
                                <td className="px-2 py-2 text-center text-gray-400">{entry.goalDifference}</td>
                                <td className="px-2 py-2 font-bold text-center text-white">{entry.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeagueTableView;
