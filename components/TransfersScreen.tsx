import React from 'react';
import type { Player } from '../types';
import { PLAYER_PERSONALITIES } from '../constants';

interface TransfersScreenProps {
    targets: Player[];
    onApproachPlayer: (player: Player) => void;
    onBack: () => void;
}

const getPositionColor = (position: string) => {
    switch (position) {
        case 'GK': return 'border-yellow-500';
        case 'DEF': return 'border-blue-500';
        case 'MID': return 'border-green-500';
        case 'FWD': return 'border-red-500';
        default: return 'border-gray-500';
    }
};

const TransfersScreen: React.FC<TransfersScreenProps> = ({ targets, onApproachPlayer, onBack }) => {
    const sortedTargets = [...targets].sort((a, b) => b.rating - a.rating);

    return (
        <div className="mt-8 max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Transfer Market</h2>
                <p className="text-lg text-gray-400">Scout for talent to improve your squad.</p>
            </div>
            <div className="space-y-3">
                {sortedTargets.map(player => (
                    <div key={player.name} className={`bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex flex-col sm:flex-row items-center justify-between border-l-4 ${getPositionColor(player.position)}`}>
                        <div className="flex-grow sm:flex items-center text-center sm:text-left">
                            <div className="flex items-center justify-center">
                                <span className="text-3xl mr-4">{player.nationality}</span>
                                <div>
                                    <h3 className="text-xl font-bold text-green-400">{player.name}</h3>
                                    <p className="text-sm text-gray-300">{player.age} y/o {player.position}</p>
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-0 sm:ml-8">
                                <p className="text-sm text-gray-400" title={PLAYER_PERSONALITIES[player.personality]}>
                                    Personality: <span className="font-semibold text-gray-300">{player.personality}</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                    Wage: <span className="font-semibold text-gray-300">£{player.wage.toLocaleString()}/wk</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center mt-4 sm:mt-0">
                             <div className="text-center mr-6">
                                <p className="text-xs text-gray-400">Rating</p>
                                <p className="text-2xl font-bold text-white">{player.rating}</p>
                            </div>
                            <button
                                onClick={() => onApproachPlayer(player)}
                                className="py-2 px-5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                Approach
                            </button>
                        </div>
                    </div>
                ))}
            </div>
             <div className="text-center mt-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Screen
                </button>
            </div>
        </div>
    );
};

export default TransfersScreen;