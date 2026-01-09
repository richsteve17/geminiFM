
import React, { useState, useEffect } from 'react';
import { Fixture, MatchState, GameState, Team, LeagueTableEntry, TouchlineShout } from '../types';
import AtmosphereWidget from './AtmosphereWidget';
import { generatePunkChant, Chant } from '../services/chantService'; 
import { getContextAwareShouts, TacticalShout } from '../services/geminiService';

interface MatchViewProps {
    fixture?: Fixture;
    weeklyResults: Fixture[];
    matchState: MatchState | null;
    gameState: GameState;
    onPlayFirstHalf: () => void;
    onPlaySecondHalf: (shout: TouchlineShout) => void;
    onSimulateSegment: (minute: number) => void;
    onNextMatch: () => void;
    error: string | null;
    isSeasonOver: boolean;
    userTeamName: string | null;
    leagueTable: LeagueTableEntry[];
    isLoading: boolean;
    currentWeek: number;
    teams: Record<string, Team>;
}

export default function MatchView({ 
    fixture, weeklyResults, matchState, gameState, 
    onPlayFirstHalf, onPlaySecondHalf, onSimulateSegment, onNextMatch, 
    userTeamName, teams, isLoading 
}: MatchViewProps) {
    
    const [availableShouts, setAvailableShouts] = useState<TacticalShout[]>([]);
    const [selectedShout, setSelectedShout] = useState<TacticalShout | null>(null);
    const [currentChant, setCurrentChant] = useState<Chant | null>(null);

    // Load Shouts at Halftime
    useEffect(() => {
        if (gameState === GameState.PAUSED && matchState?.currentMinute === 45 && userTeamName && fixture) {
            const userTeam = teams[userTeamName];
            const isHome = fixture.homeTeam === userTeamName;
            getContextAwareShouts(userTeam, isHome, matchState).then(setAvailableShouts);
        }
    }, [gameState, matchState, userTeamName, fixture, teams]);

    // CHANT TRIGGER LOGIC
    useEffect(() => {
        if (matchState?.events.length) {
            const lastEvent = matchState.events[matchState.events.length - 1];
            // If the last event was a GOAL and it just happened (checking against local timestamp would be better, but this works for now)
            if (lastEvent.type === 'goal') {
                const isUserGoal = lastEvent.teamName === userTeamName;
                const player = lastEvent.player || "Unknown";
                
                generatePunkChant(
                    userTeamName || "Team", 
                    isUserGoal ? 'goal' : 'losing', // Simple logic: if they score, we are "losing"
                    player
                ).then(chant => {
                    setCurrentChant(chant);
                    setTimeout(() => setCurrentChant(null), 8000); // Hide after 8s
                });
            }
        }
    }, [matchState?.events.length, userTeamName]);


    if (!fixture) return <div className="p-10 text-center text-gray-500">No Match Scheduled</div>;

    const homeTeam = teams[fixture.homeTeam];
    const awayTeam = teams[fixture.awayTeam];

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden min-h-[600px] flex flex-col">
            
            {/* 1. ATMOSPHERE WIDGET (The Punk Layer) */}
            {gameState !== GameState.PRE_MATCH && (
                <AtmosphereWidget 
                    chant={currentChant} 
                    momentum={matchState?.momentum || 0} 
                    teamName={userTeamName || "Home"}
                />
            )}

            {/* 2. SCOREBOARD */}
            <div className="bg-black p-6 text-center border-b border-gray-700">
                <div className="flex justify-between items-center max-w-2xl mx-auto">
                    <div className="text-right w-1/3">
                        <h2 className="text-2xl font-bold text-white">{homeTeam.name}</h2>
                        <div className="text-sm text-gray-400">{homeTeam.tactic.formation}</div>
                    </div>
                    <div className="w-1/3 flex flex-col items-center">
                        <div className="text-5xl font-black text-yellow-500 tracking-widest">
                            {matchState ? matchState.homeScore : 0} - {matchState ? matchState.awayScore : 0}
                        </div>
                        <div className="text-xs text-red-500 mt-2 font-mono uppercase animate-pulse">
                            {gameState === GameState.SIMULATING ? "LIVE SIMULATION..." : 
                             gameState === GameState.PAUSED ? "HALFTIME" : 
                             gameState === GameState.POST_MATCH ? "FULL TIME" : 
                             `${matchState?.currentMinute || 0}'`}
                        </div>
                    </div>
                    <div className="text-left w-1/3">
                        <h2 className="text-2xl font-bold text-white">{awayTeam.name}</h2>
                        <div className="text-sm text-gray-400">{awayTeam.tactic.formation}</div>
                    </div>
                </div>
            </div>

            {/* 3. MATCH FEED (The Commentary) */}
            <div className="flex-1 p-4 bg-gray-900 overflow-y-auto max-h-[400px] border-b border-gray-700 space-y-2">
                {matchState?.events.length === 0 && (
                    <div className="text-center text-gray-600 italic mt-10">The stadium is waiting...</div>
                )}
                {[...(matchState?.events || [])].reverse().map((ev) => (
                    <div key={ev.id} className={`p-2 rounded border-l-4 ${ev.type === 'goal' ? 'bg-green-900 border-green-500' : ev.type === 'card' ? 'bg-yellow-900 border-yellow-500' : 'bg-gray-800 border-gray-600'}`}>
                        <span className="font-mono font-bold text-blue-400 mr-2">{ev.minute}'</span>
                        <span className="text-gray-200">{ev.description}</span>
                    </div>
                ))}
            </div>

            {/* 4. CONTROLS (The Dugout) */}
            <div className="p-4 bg-gray-800">
                {isLoading ? (
                    <div className="text-center text-yellow-400 font-mono">ASSISTANT MANAGER IS THINKING...</div>
                ) : (
                    <div className="flex justify-center space-x-4">
                        {gameState === GameState.PRE_MATCH && (
                            <button onClick={onPlayFirstHalf} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg transform hover:scale-105 transition">
                                KICK OFF
                            </button>
                        )}

                        {gameState === GameState.PAUSED && matchState?.currentMinute === 45 && (
                            <div className="flex flex-col items-center space-y-2 w-full">
                                <h3 className="text-gray-400 text-sm uppercase">Team Talk (Select Shout)</h3>
                                <div className="flex space-x-2">
                                    {availableShouts.map(shout => (
                                        <button 
                                            key={shout.id}
                                            onClick={() => setSelectedShout(shout)}
                                            className={`px-3 py-2 text-sm rounded border ${selectedShout?.id === shout.id ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                                        >
                                            {shout.label}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => onPlaySecondHalf(selectedShout || { id: 'none', label: 'None', description: '', effect: '' })}
                                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded w-full max-w-md mt-2"
                                >
                                    START SECOND HALF
                                </button>
                            </div>
                        )}

                        {gameState === GameState.POST_MATCH && (
                            <button onClick={onNextMatch} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded">
                                CONTINUE
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
