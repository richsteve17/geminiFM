
import React, { useState } from 'react';
import type { Player } from '../types';
import { UserIcon } from './icons/UserIcon';
import { FootballIcon } from './icons/FootballIcon';

interface ScoutingScreenProps {
    onScout: (request: string) => Promise<void>;
    scoutResults: Player[];
    isLoading: boolean;
    onSignPlayer: (player: Player) => void;
    onBack: () => void;
}

const ScoutingScreen: React.FC<ScoutingScreenProps> = ({ onScout, scoutResults, isLoading, onSignPlayer, onBack }) => {
    const [request, setRequest] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (request.trim()) {
            onScout(request);
        }
    };

    return (
        <div className="mt-8 max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Global Scouting Network</h2>
                <p className="text-lg text-gray-400">Tell your scout exactly what you are looking for.</p>
            </div>

            {/* Input Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 shadow-lg">
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                        <label htmlFor="scoutRequest" className="sr-only">Scouting Request</label>
                        <input
                            type="text"
                            id="scoutRequest"
                            value={request}
                            onChange={(e) => setRequest(e.target.value)}
                            placeholder="e.g. 'A tall, aggressive centre back from Italy under 25'"
                            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !request.trim()}
                        className={`px-8 py-4 bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    >
                        {isLoading ? (
                            <>
                                <FootballIcon className="w-5 h-5 mr-2 animate-spin" />
                                Scouting...
                            </>
                        ) : (
                            "Send Scout"
                        )}
                    </button>
                </form>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
                {scoutResults.length > 0 && <h3 className="text-xl font-bold text-gray-300 mb-4">Scouting Reports</h3>}
                
                {scoutResults.map((player, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row items-center gap-6 shadow-md hover:border-blue-500 transition-colors">
                        {/* Avatar / Flag */}
                        <div className="flex flex-col items-center">
                            <span className="text-4xl mb-1">{player.nationality}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded text-white ${
                                player.position === 'GK' ? 'bg-yellow-600' :
                                player.position === 'DEF' ? 'bg-blue-600' :
                                player.position === 'MID' ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                                {player.position}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-grow text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                <h4 className="text-xl font-bold text-white">{player.name}</h4>
                                <span className="text-gray-400 text-sm">Age: {player.age}</span>
                            </div>
                            <p className="text-sm text-gray-300 italic mb-2">"{player.scoutingReport}"</p>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-xs">
                                <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Rating: <span className="text-white font-bold">{player.rating}</span></span>
                                <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Wage: <span className="text-white font-bold">£{player.wage.toLocaleString()}/wk</span></span>
                                <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Value: <span className="text-white font-bold">£{(player.marketValue || player.wage * 100).toLocaleString()}</span></span>
                            </div>
                        </div>

                        {/* Action */}
                        <div>
                            <button
                                onClick={() => onSignPlayer(player)}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition-colors whitespace-nowrap"
                            >
                                Approach
                            </button>
                        </div>
                    </div>
                ))}

                {!isLoading && scoutResults.length === 0 && request && (
                    <div className="text-center text-gray-500 italic mt-8">
                        Enter a request above to find players.
                    </div>
                )}
            </div>

            <div className="text-center mt-12">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Team
                </button>
            </div>
        </div>
    );
};

export default ScoutingScreen;
