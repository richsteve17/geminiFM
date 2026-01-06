
import React from 'react';
import type { Team, LeagueTier } from '../types';

interface TeamSelectionScreenProps {
    teams: Team[];
    onTeamSelect: (teamName: string) => void;
    onBack: () => void;
}

const TeamSelectionScreen: React.FC<TeamSelectionScreenProps> = ({ teams, onTeamSelect, onBack }) => {
    // Group teams by league
    const teamsByLeague = teams.reduce((acc, team) => {
        if (!acc[team.league]) {
            acc[team.league] = [];
        }
        acc[team.league].push(team);
        return acc;
    }, {} as Record<LeagueTier, Team[]>);

    // Sort leagues - Priority order
    const leagueOrder: LeagueTier[] = ['International', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Championship', 'MLS'];
    const sortedLeagues = Object.keys(teamsByLeague).sort((a, b) => {
        return leagueOrder.indexOf(a as LeagueTier) - leagueOrder.indexOf(b as LeagueTier);
    }) as LeagueTier[];

    return (
        <div className="mt-8 max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Choose Your Team</h2>
                <p className="text-lg text-gray-400">Select a team to begin.</p>
            </div>
            
            <div className="space-y-8">
                {sortedLeagues.map(league => (
                    <div key={league} className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                        <h3 className="text-2xl font-bold text-green-400 mb-4 border-b border-gray-700 pb-2">{league}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teamsByLeague[league]
                                .sort((a, b) => b.prestige - a.prestige)
                                .map(team => (
                                <div key={team.name} className="bg-gray-800/80 rounded-lg shadow-lg border border-gray-700 p-4 flex flex-col hover:border-green-500 transition-colors">
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-white">{team.name}</h3>
                                            <span className="text-xs font-bold px-2 py-1 bg-gray-700 rounded text-green-400">{team.prestige} Prestige</span>
                                        </div>
                                        <div className="text-sm text-gray-400 space-y-1">
                                            <p><span className="text-gray-500">Formation:</span> {team.tactic.formation}</p>
                                            <p><span className="text-gray-500">Style:</span> {team.tactic.mentality}</p>
                                            <p><span className="text-gray-500">Chairman:</span> {team.chairmanPersonality === 'Traditionalist' ? 'Football Federation' : team.chairmanPersonality}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onTeamSelect(team.name)}
                                        className="mt-4 w-full py-2 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors duration-200"
                                    >
                                        Manage
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center mt-12 mb-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors bg-gray-800 px-6 py-2 rounded-full border border-gray-700">
                    &larr; Back to Main Menu
                </button>
            </div>
        </div>
    );
};

export default TeamSelectionScreen;
