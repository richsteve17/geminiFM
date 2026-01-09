
import React, { useRef, useEffect, useState } from 'react';
import type { Fixture, MatchState, LeagueTableEntry, TouchlineShout, Team, MatchEvent } from '../types';
import { GameState } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { TOUCHLINE_SHOUTS } from '../constants';
import { getAssistantAnalysis, playMatchCommentary, generateReplayVideo, getContextAwareShouts, TacticalShout } from '../services/geminiService';
import { UserIcon } from './icons/UserIcon';
import PitchView from './PitchView';
import AtmosphereWidget from './AtmosphereWidget';
import { generatePunkChant, Chant } from '../services/chantService'; 

interface MatchViewProps {
    fixture: Fixture | undefined;
    weeklyResults: Fixture[];
    matchState: MatchState | null;
    gameState: GameState;
    onPlayFirstHalf: () => void;
    onPlaySecondHalf: (shout: TouchlineShout) => void;
    onSimulateSegment: (targetMinute: number) => void;
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
    userTeamName, teams, isLoading, currentWeek, error, isSeasonOver 
}: MatchViewProps) {
    
    const feedRef = useRef<HTMLDivElement>(null);
    const [assistantAdvice, setAssistantAdvice] = useState<string | null>(null);
    const [isAskingAssistant, setIsAskingAssistant] = useState(false);
    
    // Feature States
    const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
    const [generatingVideoId, setGeneratingVideoId] = useState<number | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [mediaError, setMediaError] = useState<string | null>(null);

    // Atmosphere
    const [availableShouts, setAvailableShouts] = useState<TacticalShout[]>([]);
    const [selectedShout, setSelectedShout] = useState<TacticalShout | null>(null);
    const [currentChant, setCurrentChant] = useState<Chant | null>(null);

    // Auto-scroll feed
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [matchState?.events.length]);

    // Load Shouts at Halftime
    useEffect(() => {
        if (gameState === GameState.PAUSED && matchState?.currentMinute === 45 && userTeamName && fixture) {
            const userTeam = teams[userTeamName];
            const isHome = fixture.homeTeam === userTeamName;
            getContextAwareShouts(userTeam, isHome, matchState).then(setAvailableShouts);
        }
    }, [gameState, matchState, userTeamName, fixture, teams]);

    // Chant Trigger Logic
    useEffect(() => {
        if (matchState?.events.length) {
            const lastEvent = matchState.events[matchState.events.length - 1];
            if (lastEvent.type === 'goal') {
                const isUserGoal = lastEvent.teamName === userTeamName;
                const player = lastEvent.player || "Unknown";
                generatePunkChant(userTeamName || "Team", isUserGoal ? 'goal' : 'losing', player).then(chant => {
                    setCurrentChant(chant);
                    setTimeout(() => setCurrentChant(null), 8000);
                });
            } else if (matchState.momentum && matchState.momentum < -4 && userTeamName) {
                generatePunkChant(userTeamName, 'bad_call').then(chant => setCurrentChant(chant));
                setTimeout(() => setCurrentChant(null), 6000);
            }
        }
    }, [matchState?.events.length, userTeamName, matchState?.momentum]);

    const handleAskAssistant = async () => {
        if (!fixture || !matchState || !userTeamName) return;
        setIsAskingAssistant(true);
        const homeTeam = teams[fixture.homeTeam] || { name: fixture.homeTeam } as Team;
        const awayTeam = teams[fixture.awayTeam] || { name: fixture.awayTeam } as Team;
        const advice = await getAssistantAnalysis(homeTeam, awayTeam, matchState, userTeamName);
        setAssistantAdvice(advice);
        setIsAskingAssistant(false);
    }

    // --- MEDIA HANDLERS ---
    const handlePlayAudio = async (event: MatchEvent) => {
        setPlayingAudioId(event.id);
        setMediaError(null);
        const commentary = `${event.minute}th minute. ${event.description}`;
        try {
            await playMatchCommentary(commentary, event.id); // Pass ID for caching
            // Reset icon after a reasonable duration if audio plays fire-and-forget
            setTimeout(() => setPlayingAudioId(null), 5000); 
        } catch (e) {
            setMediaError("Audio unavailable.");
            setPlayingAudioId(null);
        }
    };

    const handleGenerateVideo = async (event: MatchEvent) => {
        setGeneratingVideoId(event.id);
        setMediaError(null);
        const description = `${event.teamName} scores a goal. ${event.description}`;
        try {
            const url = await generateReplayVideo(description, event.id); // Pass ID for caching
            if (url) {
                setVideoUrl(url);
            } else {
                setMediaError("Replay generation timed out.");
            }
        } catch (e) {
            setMediaError("Video generation failed.");
        } finally {
            setGeneratingVideoId(null);
        }
    };

    const renderEvent = (event: MatchEvent) => {
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
            <div key={event.id} className={`flex gap-3 items-start py-2 border-b border-gray-800 ${event.type === 'goal' ? 'bg-green-900/10' : ''}`}>
                <span className="w-8 text-right font-mono text-gray-500 text-xs pt-1">{event.minute}'</span>
                <div className="flex-1">
                     <p className={`text-sm ${color}`}>
                        <span className="mr-2">{icon}</span>
                        {event.description} 
                        {event.scoreAfter && <span className="ml-2 text-white border border-gray-600 px-1 rounded bg-gray-800">{event.scoreAfter}</span>}
                    </p>
                </div>
                
                {/* MEDIA BUTTONS FOR GOALS */}
                {event.type === 'goal' && (
                    <div className="flex gap-2 mr-2">
                        <button 
                            onClick={() => handlePlayAudio(event)}
                            disabled={playingAudioId === event.id}
                            className={`p-1 rounded hover:bg-gray-700 transition-colors ${playingAudioId === event.id ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}
                            title="Listen to Radio Commentary (TTS)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                                <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                            </svg>
                        </button>
                        
                        <button 
                            onClick={() => handleGenerateVideo(event)}
                            disabled={generatingVideoId === event.id}
                            className={`p-1 rounded hover:bg-gray-700 transition-colors ${generatingVideoId === event.id ? 'text-yellow-400 animate-spin' : 'text-gray-500'}`}
                            title="Generate Replay (Video)"
                        >
                            {generatingVideoId === event.id ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Render Logic...
    if (isSeasonOver) return <div className="text-center p-8"><h2 className="text-3xl font-bold text-green-400 mb-4">Season Over!</h2></div>;
    
    if (gameState === GameState.PRE_MATCH && !fixture) {
         return <div className="text-center p-8"><h2 className="text-xl font-bold mb-2 text-green-400">Week {currentWeek}</h2><p>No match scheduled.</p></div>;
    }

    const currentMinute = matchState?.currentMinute || 0;
    const score = matchState ? `${matchState.homeScore}-${matchState.awayScore}` : 'v';

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden min-h-[600px] flex flex-col relative">
            
            {/* VIDEO MODAL */}
            {videoUrl && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <button onClick={() => setVideoUrl(null)} className="absolute top-4 right-4 text-white hover:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                    <h3 className="text-green-400 font-bold mb-4 text-xl tracking-widest uppercase">Instant Replay (AI Generated)</h3>
                    <video src={videoUrl} controls autoPlay className="max-w-full max-h-[80vh] rounded border-2 border-green-600 shadow-2xl" />
                </div>
            )}

            {/* ATMOSPHERE */}
            {gameState !== GameState.PRE_MATCH && (
                <AtmosphereWidget chant={currentChant} momentum={matchState?.momentum || 0} teamName={userTeamName || "Home"} />
            )}

            {/* SCOREBOARD */}
            <div className="bg-black p-4 rounded-t-lg border-b border-gray-700">
                 <div className="flex justify-between items-center text-xs uppercase text-gray-500 mb-1">
                    <span>{fixture?.league}</span>
                    <span>{isLoading ? 'Simulating...' : (matchState?.isFinished ? 'Full Time' : `${currentMinute}'`)}</span>
                </div>
                <div className="flex justify-between items-center">
                     <h3 className="text-xl sm:text-2xl font-bold w-1/3 text-right text-white">{fixture?.homeTeam}</h3>
                     <div className="px-4 py-1 bg-gray-800 rounded text-3xl font-mono font-bold text-yellow-500 mx-2">
                        {score}
                     </div>
                     <h3 className="text-xl sm:text-2xl font-bold w-1/3 text-left text-white">{fixture?.awayTeam}</h3>
                </div>
                {/* Media Error Toast */}
                {mediaError && <div className="text-center text-red-400 text-xs mt-2 animate-pulse font-bold">{mediaError}</div>}
            </div>

            {/* LIVE FEED */}
            <div className="flex-grow bg-gray-900/50 p-4 flex flex-col min-h-[300px] max-h-[400px]">
                {gameState !== GameState.PRE_MATCH && (
                    <PitchView momentum={matchState?.momentum || 0} homeTeamName={fixture?.homeTeam || 'Home'} awayTeamName={fixture?.awayTeam || 'Away'} lastEvent={matchState?.events[matchState.events.length-1] || null} />
                )}
                
                <div ref={feedRef} className="overflow-y-auto space-y-1 scroll-smooth flex-1 pr-2">
                    {matchState?.events.length === 0 && <div className="text-center text-gray-500 italic mt-10">Match is about to start...</div>}
                    {matchState?.events.map(renderEvent)}
                    {isLoading && <div className="flex justify-center py-4"><FootballIcon className="w-6 h-6 text-green-500 animate-spin" /></div>}
                </div>
            </div>

            {/* CONTROLS */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
                {isLoading ? (
                    <div className="text-center text-yellow-400 font-mono text-sm animate-pulse">ASSISTANT MANAGER IS THINKING...</div>
                ) : (
                    <>
                        {gameState === GameState.PRE_MATCH && fixture && (
                            <button onClick={onPlayFirstHalf} className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 flex items-center justify-center gap-2"> 
                                <FootballIcon className="w-5 h-5" /> KICK OFF 
                            </button> 
                        )}

                        {gameState === GameState.PAUSED && (
                            <div className="space-y-3">
                                {currentMinute === 45 && (
                                    <div className="flex flex-col items-center space-y-2">
                                        <h4 className="text-gray-400 text-xs uppercase font-bold">Team Talk</h4>
                                        <div className="flex gap-2">
                                            {availableShouts.map(shout => (
                                                <button key={shout.id} onClick={() => setSelectedShout(shout)} className={`px-3 py-1 text-xs rounded border ${selectedShout?.id === shout.id ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'}`}>{shout.label}</button>
                                            ))}
                                        </div>
                                        <button onClick={() => onPlaySecondHalf(selectedShout || { id: 'none', label: 'None', description: '', effect: '' })} className="w-full py-2 bg-green-600 text-white font-bold rounded">Start 2nd Half</button>
                                    </div>
                                )}
                                {currentMinute > 45 && currentMinute < 90 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {currentMinute < 75 && <button onClick={() => onSimulateSegment(currentMinute + 15)} className="py-2 bg-gray-600 text-white rounded font-bold">Sim 15m</button>}
                                        <button onClick={() => onSimulateSegment(90)} className="py-2 bg-green-600 text-white rounded font-bold col-span-2">To Full Time</button>
                                    </div>
                                )}
                                <button onClick={handleAskAssistant} disabled={isAskingAssistant} className="w-full py-2 border border-blue-600 text-blue-400 text-xs font-bold rounded hover:bg-blue-900/30">
                                    {isAskingAssistant ? "Consulting..." : "Ask Assistant"}
                                </button>
                            </div>
                        )}

                        {(gameState === GameState.POST_MATCH || (gameState === GameState.PRE_MATCH && !fixture)) && (
                            <button onClick={onNextMatch} className="w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">CONTINUE</button>
                        )}
                    </>
                )}
            </div>

            {/* Assistant Overlay */}
            {assistantAdvice && (
                <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-gray-800 border-2 border-blue-500 rounded-lg p-6 max-w-md w-full shadow-2xl">
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-2">
                            <div className="p-2 bg-blue-900 rounded-full"><UserIcon className="w-6 h-6 text-blue-300" /></div>
                            <div><h4 className="font-bold text-blue-400 text-lg">Assistant Manager</h4></div>
                            </div>
                            <div className="space-y-2 text-gray-200 text-sm font-medium leading-relaxed whitespace-pre-line">{assistantAdvice}</div>
                            <button onClick={() => setAssistantAdvice(null)} className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-bold">Got it, Boss.</button>
                    </div>
                </div>
            )}
        </div>
    );
}
