
import React, { useRef, useEffect } from 'react';
import type { Fixture, MatchState, LeagueTableEntry, TouchlineShout } from '../types';
import { GameState } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { TOUCHLINE_SHOUTS } from '../constants';

interface MatchViewProps {
    fixture: Fixture | undefined;
    weeklyResults: Fixture[];
    matchState: MatchState | null;
    gameState: GameState;
    onPlayFirstHalf: () => void; // Used for "Kick Off" (0-45)
    onPlaySecondHalf: (shout: TouchlineShout) => void; // Legacy hook, used for HT team talk + 45-60
    onSimulateSegment: (targetMinute: number) => void; // New hook for 60-75, 75-90
    onNextMatch: () => void;
    error: string | null;
    isSeasonOver: boolean;
    userTeamName: string | null;
    leagueTable: LeagueTableEntry[];
    isLoading: boolean;
    currentWeek: number;
}

const MatchView: React.FC<MatchViewProps> = ({ fixture, weeklyResults, matchState, gameState, onPlayFirstHalf, onPlaySecondHalf, onSimulateSegment, onNextMatch, error, isSeasonOver, userTeamName, isLoading, currentWeek }) => {

    const feedRef = useRef<HTMLDivElement>(null);

    // Auto-scroll feed
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [matchState?.events.length]);

    const renderEvent = (event: any) => {
        let color = 'text-gray-300';
        let icon = '•';
        
        if (event.type === 'goal') { color = 'text-green-400 font-bold'; icon = '⚽'; }
        if (event.type === 'card') { 
            if (event.cardType === 'red') { color = 'text-red-500 font-bold'; icon = '🟥'; }
            else { color = 'text-yellow-400'; icon = '🟨'; }
        }
        if (event.type === 'injury') { color = 'text-red-500 font-bold animate-pulse'; icon = '🚑'; }
        if (event.type === 'sub') { color = 'text-blue-400'; icon = '🔄'; }
        if (event.type === 'whistle') { color = 'text-gray-500 italic'; icon = '📢'; }

        return (
            <div key={event.id} className={`flex gap-3 items-start py-1 ${event.type === 'goal' ? 'bg-green-900/20 rounded p-1' : ''}`}>
                <span className="w-8 text-right font-mono text-gray-500 text-xs pt-1">{event.minute}'</span>
                <div className="flex-1">
                     <p className={`text-sm ${color}`}>
                        <span className="mr-2">{icon}</span>
                        {event.description} 
                        {event.scoreAfter && <span className="ml-2 text-white border border-gray-600 px-1 rounded bg-gray-800">{event.scoreAfter}</span>}
                    </p>
                </div>
            </div>
        );
    }

    const renderWeeklyResults = () => {
        if (weeklyResults.length === 0) return null;
        return (
            <div className="mt-6 bg-gray-900/50 p-4 rounded-lg">
                <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Around the Grounds</h3>
                <ul className="space-y-2">
                    {weeklyResults.map(res => (
                         <li key={res.id} className="flex justify-between text-sm">
                            <span className="text-right w-5/12 text-gray-300">{res.homeTeam}</span>
                            <span className="w-2/12 text-center font-bold text-white bg-gray-800 rounded px-1">{res.score}</span>
                            <span className="text-left w-5/12 text-gray-300">{res.awayTeam}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    const renderTacticalMonitor = () => {
        if (!matchState || gameState === GameState.PRE_MATCH) return null;
        
        // Calculate momentum bar width
        // Range -10 to 10. Normalize to 0-100%. 0 is full away, 100 is full home.
        const normalized = Math.min(Math.max(((matchState.momentum + 10) / 20) * 100, 0), 100);

        return (
            <div className="bg-black/40 p-3 rounded-lg border border-gray-700 mb-2">
                <div className="flex justify-between text-xs text-gray-400 uppercase font-bold mb-1">
                    <span>Momentum</span>
                </div>
                <div className="h-2 w-full bg-gray-700 rounded-full mb-2 relative overflow-hidden">
                    <div 
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 via-gray-400 to-green-500 transition-all duration-1000" 
                        style={{ width: '100%', left: '0' }}
                    >
                        {/* Marker */}
                        <div 
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-all duration-1000"
                            style={{ left: `${normalized}%` }}
                        />
                    </div>
                </div>
                <div className="text-xs text-gray-300 italic text-center">
                    "{matchState.tacticalAnalysis || "The match is underway."}"
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (isSeasonOver) {
             return (
                <div className="text-center p-8">
                    <h2 className="text-3xl font-bold text-green-400 mb-4">Season Over!</h2>
                    <p className="text-xl text-white">Check the final league table.</p>
                </div>
            );
        }

        if (gameState === GameState.PRE_MATCH && !fixture) {
             return (
                <div className="text-center p-8">
                    <h2 className="text-xl font-bold mb-2 text-green-400">Week {currentWeek}</h2>
                    <div className="bg-gray-800/50 p-4 rounded-lg my-4">
                        <p className="text-gray-300">No match for your team this week.</p>
                    </div>
                    {renderWeeklyResults()}
                </div>
            );
        }

        // --- MATCH HEADER ---
        const currentMinute = matchState?.currentMinute || 0;
        const score = matchState ? `${matchState.homeScore}-${matchState.awayScore}` : 'v';
        
        return (
            <div className="flex flex-col h-full">
                <div className="bg-gray-900/80 p-4 rounded-t-lg border-b border-gray-700">
                     <div className="flex justify-between items-center text-xs uppercase text-gray-500 mb-1">
                        <span>{fixture?.league}</span>
                        <span>{fixture?.stage || `Week ${currentWeek}`}</span>
                        <span>{isLoading ? 'Simulating...' : (matchState?.isFinished ? 'Full Time' : `${currentMinute}'`)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                         <h3 className="text-xl sm:text-2xl font-bold w-1/3 text-right">{fixture?.homeTeam}</h3>
                         <div className="px-4 py-1 bg-black/50 rounded text-2xl font-mono font-bold text-white mx-2">
                            {score}
                         </div>
                         <h3 className="text-xl sm:text-2xl font-bold w-1/3 text-left">{fixture?.awayTeam}</h3>
                    </div>
                    {error && <p className="text-red-500 text-center text-sm mt-2">{error}</p>}
                </div>

                {/* --- LIVE FEED --- */}
                <div className="flex-grow bg-black/20 p-4 flex flex-col min-h-[300px] max-h-[400px]">
                    {renderTacticalMonitor()}
                    
                    <div ref={feedRef} className="overflow-y-auto space-y-1 scroll-smooth flex-1">
                        {matchState?.events.length === 0 && (
                            <div className="text-center text-gray-500 italic mt-10">Match is about to start...</div>
                        )}
                        {matchState?.events.map(renderEvent)}
                        {isLoading && (
                            <div className="flex justify-center py-4">
                                <FootballIcon className="w-6 h-6 text-green-500 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* --- CONTROLS FOOTER --- */}
                <div className="bg-gray-800 p-3 rounded-b-lg border-t border-gray-700">
                    {renderControls(currentMinute)}
                </div>
                
                {gameState === GameState.POST_MATCH && renderWeeklyResults()}
            </div>
        );
    };

    const renderControls = (minute: number) => {
        if (isLoading) return <div className="text-center text-gray-500 text-sm">Simulating...</div>;
        
        if (gameState === GameState.PRE_MATCH && fixture) {
            return ( 
                <button onClick={onPlayFirstHalf} className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors flex items-center justify-center"> 
                    <FootballIcon className="w-5 h-5 mr-2" /> Kick Off 
                </button> 
            );
        }

        if (gameState === GameState.POST_MATCH || (gameState === GameState.PRE_MATCH && !fixture)) {
            return ( <button onClick={onNextMatch} className="w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors"> Continue </button> );
        }

        if (gameState === GameState.PAUSED) {
            // Half Time (45)
            if (minute === 45) {
                 return (
                    <div>
                        <div className="mb-3 text-center">
                            <h4 className="text-yellow-400 font-bold text-sm uppercase mb-2">Half Time Team Talk</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(TOUCHLINE_SHOUTS) as TouchlineShout[]).map(shout => (
                                    <button key={shout} onClick={() => onPlaySecondHalf(shout)} className="py-2 text-xs bg-gray-700 text-white font-semibold rounded hover:bg-green-700">
                                        {shout}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-center text-gray-500 text-xs italic">Tip: You can make substitutions in the Squad panel above.</p>
                    </div>
                );
            }
            
            // Mid-game Pauses (60, 75)
            return (
                <div className="space-y-2">
                    <p className="text-center text-green-400 font-bold text-sm">Match Paused ({minute}')</p>
                    <p className="text-center text-gray-500 text-xs mb-2">Make substitutions now if needed.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {minute < 75 && (
                             <button onClick={() => onSimulateSegment(minute + 15)} className="py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-bold">
                                Play to {minute + 15}'
                            </button>
                        )}
                        <button onClick={() => onSimulateSegment(90)} className={`py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold ${minute >= 75 ? 'col-span-2' : ''}`}>
                            Play to Full Time
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="h-full">
            {renderContent()}
        </div>
    );
};

export default MatchView;
