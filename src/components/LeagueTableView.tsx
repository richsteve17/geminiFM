import React, { useState, useMemo } from 'react';
import type { LeagueTableEntry, LeagueTier } from '../types';

interface LeagueTableViewProps {
    table: LeagueTableEntry[];
    userTeamName: string | null;
}

const LeagueTableView: React.FC<LeagueTableViewProps> = ({ table, userTeamName }) => {
    const isWorldCup = table.some(t => t.league === 'International' && t.group);
    const isChampionsLeague = table.some(t => t.league === 'Champions League');
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
            if (index < 8) return 'border-l-2 border-l-[#18392F]';
            if (index < 24) return 'border-l-2 border-l-[#A47837]';
            return 'border-l-2 border-l-[#8B554A]';
        }
        if (isWorldCup && index < 2) return 'border-l-2 border-l-[#18392F]';
        if (!isWorldCup && index < 4) return 'border-l-2 border-l-[#A47837]';
        return 'border-l-2 border-l-transparent';
    };
    const title = isWorldCup ? 'Group Stage' : isChampionsLeague ? 'League Phase' : 'League Table';

    return (
        <section className="fm-panel flex h-full min-w-0 flex-col p-4 sm:p-5" aria-label={title}>
            <div className="mb-4 border-b-2 border-[#18392F] pb-4">
                <h2 className="text-3xl font-bold leading-none">{title}</h2>
                <label htmlFor="league-table-view" className="fm-eyebrow mb-2 mt-4 block">{isWorldCup ? 'Group' : 'Competition'}</label>
                <select id="league-table-view" value={selectedView} onChange={event => setSelectedView(event.target.value)} className="fm-field min-h-11 w-full px-3 text-sm" disabled={views.length === 0}>
                    {views.length === 0 ? <option value={selectedView}>No standings available</option> : views.map(view => <option key={view} value={view}>{view}</option>)}
                </select>
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto" tabIndex={0} role="region" aria-label={`${selectedView} standings, scroll for all columns`}>
                <table className="fm-data-table w-full min-w-[520px] text-left text-sm tabular-nums">
                    <caption className="sr-only">{selectedView} {title}. Ordered by points, goal difference, then goals scored.</caption>
                    <thead>
                        <tr>
                            <th scope="col" className="px-2 py-3 text-center!">Pos</th>
                            <th scope="col" className="px-3 py-3">Team</th>
                            <th scope="col" className="px-2 py-3 text-center!" title="Played">P</th>
                            <th scope="col" className="px-2 py-3 text-center!" title="Won">W</th>
                            <th scope="col" className="px-2 py-3 text-center!" title="Drawn">D</th>
                            <th scope="col" className="px-2 py-3 text-center!" title="Lost">L</th>
                            <th scope="col" className="px-2 py-3 text-center!" title="Goal Difference">GD</th>
                            <th scope="col" className="px-2 py-3 text-center!">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTable.map((entry, index) => (
                            <tr key={entry.teamName} aria-current={entry.teamName === userTeamName ? 'true' : undefined} className={`border-b border-[#172B24]/15 ${entry.teamName === userTeamName ? 'bg-[#18392F]/10 font-semibold' : 'hover:bg-[#172B24]/5'} ${getRowClass(index)}`}>
                                <td className="px-2 py-3 text-center!">{index + 1}</td>
                                <th scope="row" className="px-3 py-3 text-left font-semibold" style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', color: 'var(--fm-ink)' }} title={entry.teamName}>{entry.teamName}</th>
                                <td className="px-2 py-3 text-center!">{entry.played}</td>
                                <td className="px-2 py-3 text-center!">{entry.won}</td>
                                <td className="px-2 py-3 text-center!">{entry.drawn}</td>
                                <td className="px-2 py-3 text-center!">{entry.lost}</td>
                                <td className="px-2 py-3 text-center!">{entry.goalDifference}</td>
                                <td className="px-2 py-3 text-center! font-bold">{entry.points}</td>
                            </tr>
                        ))}
                        {sortedTable.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-[#637169]">No standings available.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default LeagueTableView;
