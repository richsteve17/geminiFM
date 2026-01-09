
import React, { useState } from 'react';
import type { Player } from '../types';
import { UserIcon } from './icons/UserIcon';
import { FootballIcon } from './icons/FootballIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface ScoutingScreenProps {
    onScout: (request: string, useRealWorld: boolean) => Promise<void>;
    scoutResults: Player[];
    isLoading: boolean;
    onSignPlayer: (player: Player) => void;
    onBack: () => void;
    onGoToTransfers?: () => void;
    isNationalTeam?: boolean; 
}

const ScoutingScreen: React.FC<ScoutingScreenProps> = ({ onScout, scoutResults, isLoading, onSignPlayer, onBack, onGoToTransfers, isNationalTeam }) => {
    const [request, setRequest] = useState('');
    const [useRealWorld, setUseRealWorld] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (request.trim()) {
            onScout(request, useRealWorld);
        }
    };

    return (
        <div className="mt-8 max-w-4xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div className="flex-grow">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {isNationalTeam ? "National Pool Selection" : "Global Scouting Network"}
                    </h2>
                    <p className="text-lg text-gray-400">
                        {isNationalTeam 
                            ? "Review the eligible player pool for your national squad." 
                            : "Tell your scout exactly what you are looking for."}
                    </p>
                </div>
                {onGoToTransfers && (
                    <button 
                        onClick={onGoToTransfers}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 px-4 rounded border border-gray-500 whitespace-nowrap"
                    >
                        {isNationalTeam ? "View All Eligible" : "View Transfer List"}
                    </button>
                )}
            </div>

            {/* Input Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 shadow-lg">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    {/* Toggle */}
                    {!isNationalTeam && (
                        <div 
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${useRealWorld ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-700/30 border-gray-600'}`}
                            onClick={() => setUseRealWorld(!useRealWorld)}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${useRealWorld ? 'bg-blue-500 border-blue-400' : 'border-gray-400'}`}>
                                {useRealWorld && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${useRealWorld ? 'text-blue-300' : 'text-gray-300'}`}>Use Real World Network</p>
                                <p className="text-xs text-gray-500">Searches live football databases via Google (Powered by Gemini Grounding)</p>
                            </div>
                            <GlobeAltIcon className={`w-6 h-6 ${useRealWorld ? 'text-blue-400' : 'text-gray-600'}`} />
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-grow">
                            <label htmlFor="scoutRequest" className="sr-only">Search Request</label>
                            <input
                                type="text"
                                id="scoutRequest"
                                value={request}
                                onChange={(e) => setRequest(e.target.value)}
                                placeholder={isNationalTeam 
                                    ? "e.g. 'Find me fit strikers playing in Premier League'" 
                                    : "e.g. 'A tall, aggressive centre back from Italy under 25'"}
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
                                    {isNationalTeam ? "Searching..." : "Scouting..."}
                                </>
                            ) : (
                                isNationalTeam ? "Filter Pool" : "Send Scout"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
                {scoutResults.length > 0 && <h3 className="text-xl font-bold text-gray-300 mb-4">{isNationalTeam ? "Eligible Players" : "Scouting Reports"}</h3>}
                
                {scoutResults.map((player, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row items-center gap-6 shadow-md hover:border-blue-500 transition-colors">
                        {/* Avatar / Flag */}
                        <div className="flex flex-col items-center">
                            <span className="text-4xl mb-1">{player.nationality}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded text-white ${
                                player.position === 'GK' ? 'bg-yellow-600' :
                                ['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(player.position) ? 'bg-blue-600' :
                                ['DM', 'CM', 'AM', 'LM', 'RM'].includes(player.position) ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                                {player.position}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-grow text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                <h4 className="text-xl font-bold text-white">{player.name}</h4>
                                <span className="text-gray-400 text-sm">Age: {player.age}</span>
                                {player.currentClub && <span className="text-gray-500 text-xs px-2 py-0.5 bg-gray-900 rounded">{player.currentClub}</span>}
                            </div>
                            <p className="text-sm text-gray-300 italic mb-2">"{player.scoutingReport || 'Available for selection.'}"</p>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start text-xs">
                                <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Rating: <span className="text-white font-bold">{player.rating}</span></span>
                                {!isNationalTeam && <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Wage: <span className="text-white font-bold">£{player.wage.toLocaleString()}/wk</span></span>}
                                {!isNationalTeam && <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">Value: <span className="text-white font-bold">£{(player.marketValue || player.wage * 100).toLocaleString()}</span></span>}
                            </div>
                        </div>

                        {/* Action */}
                        <div>
                            <button
                                onClick={() => onSignPlayer(player)}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition-colors whitespace-nowrap"
                            >
                                {isNationalTeam ? "Call Up" : "Approach"}
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
