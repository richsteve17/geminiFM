import React from 'react';
import type { LeagueTableEntry } from '../types';

interface LeagueTableViewProps {
    table: LeagueTableEntry[];
    userTeamName: string | null;
}

const LeagueTableView: React.FC<LeagueTableViewProps> = ({ table, userTeamName }) => {
    const sortedTable = [...table].sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        if (b.goalDifference !== a.goalDifference) {
            return b.goalDifference - a.goalDifference;
        }
        return b.goalsFor - a.goalsFor;
    });

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-center text-green-400 tracking-wide">League Table</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-2 py-3 text-center">Pos</th>
                            <th scope="col" className="px-4 py-3">Team</th>
                            <th scope="col" className="px-2 py-3 text-center">P</th>
                            <th scope="col" className="px-2 py-3 text-center">W</th>
                            <th scope="col" className="px-2 py-3 text-center">D</th>
                            <th scope="col" className="px-2 py-3 text-center">L</th>
                            <th scope="col" className="px-2 py-3 text-center">GD</th>
                            <th scope="col" className="px-2 py-3 text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTable.map((entry, index) => (
                            <tr key={entry.teamName} className={`border-b border-gray-700 ${entry.teamName === userTeamName ? 'bg-green-900/40' : 'hover:bg-gray-700/30'}`}>
                                <td className="px-2 py-2 font-medium text-center">{index + 1}</td>
                                <td className="px-4 py-2 font-semibold">{entry.teamName}</td>
                                <td className="px-2 py-2 text-center">{entry.played}</td>
                                <td className="px-2 py-2 text-center">{entry.won}</td>
                                <td className="px-2 py-2 text-center">{entry.drawn}</td>
                                <td className="px-2 py-2 text-center">{entry.lost}</td>
                                <td className="px-2 py-2 text-center">{entry.goalDifference}</td>
                                <td className="px-2 py-2 font-bold text-center">{entry.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeagueTableView;
