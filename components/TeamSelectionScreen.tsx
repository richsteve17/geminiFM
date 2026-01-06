import React from 'react';
import type { Team } from '../types';

interface TeamSelectionScreenProps {
    teams: Team[];
    onTeamSelect: (teamName: string) => void;
    onBack: () => void;
}

const TeamSelectionScreen: React.FC<TeamSelectionScreenProps> = ({ teams, onTeamSelect, onBack }) => {
    const sortedTeams = [...teams].sort((a, b) => b.prestige - a.prestige);

    return (
        <div className="mt-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Choose Your Club</h2>
                <p className="text-lg text-gray-400">Select a team to begin your managerial journey.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedTeams.map(team => (
                    <div key={team.name} className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex flex-col">
                        <div className="flex-grow">
                            <h3 className="text-xl font-bold text-green-400">{team.name}</h3>
                            <p className="text-sm text-gray-300 mt-2">Prestige: <span className="font-bold">{team.prestige}</span></p>
                            <p className="text-sm text-gray-400">Tactic: {team.tactic.formation} ({team.tactic.mentality})</p>
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
            <div className="text-center mt-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Menu
                </button>
            </div>
        </div>
    );
};

export default TeamSelectionScreen;
