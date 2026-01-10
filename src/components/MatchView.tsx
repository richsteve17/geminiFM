
import React, { useRef, useEffect, useState } from 'react';
import type { Fixture, MatchState, LeagueTableEntry, TouchlineShout, Team, MatchEvent, TacticalShout } from '../types';
import { GameState } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { DevicePhoneMobileIcon } from './icons/DevicePhoneMobileIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { MusicalNoteIcon } from './icons/MusicalNoteIcon';
import { TOUCHLINE_SHOUTS } from '../constants';
import { getAssistantAnalysis, playMatchCommentary, generateReplayVideo, getContextAwareShouts, processTouchlineInteraction, generateSocialPost, type SocialPostData } from '../services/geminiService';
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
    onSimulateSegment: (targetMinute: number, momentumShift?: number) => void;
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
    const [videoFormat, setVideoFormat] = useState<'landscape' | 'portrait'>('landscape');
    const [currentClipEventId, setCurrentClipEventId] = useState<number | null>(null);
    const [mediaError, setMediaError] = useState<string | null>(null);
    
    // Social Studio State
    const [socialPost, setSocialPost] = useState<SocialPostData | null>(null);

    // Atmosphere & Interaction
    const [availableShouts, setAvailableShouts] = useState<TacticalShout[]>([]);
    const [selectedShout, setSelectedShout] = useState<TacticalShout | null>(null);
    const [currentChant, setCurrentChant] = useState<Chant | null>(null);
    
    // THE SICK FEATURE: Touchline Scream
    const [customShout, setCustomShout] = useState('');
    const [isShouting, setIsShouting] = useState(false);
    const [shoutFeedback, setShoutFeedback] = useState<{msg: string, effect: string} | null>(null);

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

    // Viral Clip Audio Auto-Play
    useEffect(() => {
        if (videoUrl && videoFormat === 'portrait' && socialPost && currentClipEventId) {
            // Trigger TTS for the caption as a "Voiceover"
            playMatchCommentary(socialPost.caption, currentClipEventId * 999); // Use unique ID for viral clip audio
        }
    }, [videoUrl, videoFormat, socialPost, currentClipEventId]);

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

    const handleCustomShout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customShout.trim() || !userTeamName || !matchState) return;
        
        setIsShouting(true);
        const userTeam = teams[userTeamName];
        const isHome = fixture?.homeTeam === userTeamName;
        
        const result = await processTouchlineInteraction(customShout, userTeam, matchState, isHome);
        
        setShoutFeedback({ msg: result.commentary, effect: result.effectDescription });
        setCustomShout('');
        setIsShouting(false);

        // Apply effect immediately by triggering a small simulation segment with momentum bias
        if (matchState.currentMinute < 90) {
             const nextMinute = Math.min(90, matchState.currentMinute + 5);
             onSimulateSegment(nextMinute, result.momentumChange);
        }
        
        setTimeout(() => setShoutFeedback(null), 5000);
    };

    // --- MEDIA HANDLERS ---
    const handlePlayAudio = async (event: MatchEvent) => {
        setPlayingAudioId(event.id);
        setMediaError(null);
        const commentary = `${event.minute}th minute. ${event.description}`;
        try {
            await playMatchCommentary(commentary, event.id);
            setTimeout(() => setPlayingAudioId(null), 5000); 
        } catch (e) {
            setMediaError("Audio unavailable.");
            setPlayingAudioId(null);
        }
    };

    const handleGenerateVideo = async (event: MatchEvent, format: 'landscape' | 'portrait') => {
        setGeneratingVideoId(event.id);
        setVideoFormat(format);
        setCurrentClipEventId(event.id);
        setMediaError(null);
        setSocialPost(null); // Reset previous social data

        const description = `${event.teamName} scores a goal. ${event.description}`;
        
        // Parallel execution: Start generating social data immediately if portrait
        if (format === 'portrait' && userTeamName) {
            generateSocialPost(description, userTeamName, 'goal').then(setSocialPost);
        }

        try {
            const url = await generateReplayVideo(description, event.id, format); 
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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleGenerateVideo(event, 'landscape')}
                            disabled={generatingVideoId === event.id}
                            className={`p-1 rounded hover:bg-gray-700 transition-colors ${generatingVideoId === event.id ? 'text-yellow-400 animate-spin' : 'text-gray-500'}`}
                            title="Generate Broadcast Replay"
                        >
                            {generatingVideoId === event.id ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" /></svg>}
                        </button>
                        <button 
                            onClick={() => handleGenerateVideo(event, 'portrait')}
                            disabled={generatingVideoId === event.id}
                            className={`p-1 rounded hover:bg-purple-900/50 transition-colors ${generatingVideoId === event.id ? 'text-purple-400 animate-spin' : 'text-purple-400 hover:text-purple-300'}`}
                            title="Clip It! (9:16 Social Video)"
                        >
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }

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
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in backdrop-blur-md">
                    <button onClick={() => setVideoUrl(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 bg-gray-800/50 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <div className={`relative ${videoFormat === 'portrait' ? 'max-w-[320px] aspect-[9/16] rounded-3xl border-0 ring-4 ring-gray-800' : 'w-full max-w-4xl aspect-[16/9] rounded-lg border-2 border-green-600'} shadow-2xl bg-black overflow-hidden`}>
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                        
                        {/* STREAMER STUDIO OVERLAY */}
                        {videoFormat === 'portrait' && (
                            <>
                                {/* Right Sidebar Actions */}
                                <div className="absolute bottom-4 right-2 flex flex-col gap-4 items-center z-20">
                                    <div className="group flex flex-col items-center gap-1 cursor-pointer">
                                        <div className="w-10 h-10 bg-gray-800/60 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-gray-700 transition">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 p-0.5">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-black text-xs text-white">
                                                    {userTeamName?.substring(0, 1)}
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold text-white border border-black">+</div>
                                        </div>
                                    </div>

                                    <div className="group flex flex-col items-center gap-1 cursor-pointer">
                                        <HeartIcon className="w-8 h-8 text-white drop-shadow-md group-hover:text-red-500 transition-colors" />
                                        <span className="text-[10px] font-bold text-white drop-shadow">{socialPost?.likes || '...'}</span>
                                    </div>

                                    <div className="group flex flex-col items-center gap-1 cursor-pointer">
                                        <ChatBubbleIcon className="w-8 h-8 text-white drop-shadow-md group-hover:text-blue-400 transition-colors" />
                                        <span className="text-[10px] font-bold text-white drop-shadow">{socialPost?.comments.length || 0}</span>
                                    </div>

                                    <div className="group flex flex-col items-center gap-1 cursor-pointer">
                                        <ShareIcon className="w-8 h-8 text-white drop-shadow-md group-hover:text-green-400 transition-colors" />
                                        <span className="text-[10px] font-bold text-white drop-shadow">{socialPost?.shareCount || '...'}</span>
                                    </div>
                                    
                                    <div className="w-8 h-8 bg-gray-800/80 rounded-full flex items-center justify-center animate-spin-slow border-2 border-gray-600 mt-2">
                                        <div className="w-4 h-4 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Bottom Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-12 p-3 bg-gradient-to-t from-black/80 to-transparent pt-12 z-10">
                                    <div className="text-white">
                                        <h4 className="font-bold text-sm shadow-black drop-shadow-md">@{userTeamName?.replace(/\s/g, '').toLowerCase()}_official <span className="text-blue-400 text-[10px]">✓</span></h4>
                                        <p className="text-xs mt-1 leading-snug drop-shadow-md">
                                            {socialPost?.caption || "Generating caption..."} {socialPost?.hashtags.map(t => <span key={t} className="font-bold text-white">{t} </span>)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] opacity-90">
                                            <MusicalNoteIcon className="w-3 h-3 animate-bounce" />
                                            {/* Sound Indicator */}
                                            <div className="flex items-center gap-1">
                                                <span className="animate-pulse font-bold text-green-400">♫ Playing:</span>
                                                <span className="truncate max-w-[120px]">{socialPost?.sound || "Original Sound"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Comments (Mock) */}
                                {socialPost && (
                                    <div className="absolute bottom-24 left-3 w-48 space-y-2 pointer-events-none">
                                        {socialPost.comments.map((comment, i) => (
                                            <div key={i} className="bg-black/40 backdrop-blur-md rounded-lg p-2 text-white text-xs animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: `${i * 1.5}s`, opacity: 0, animationFillMode: 'forwards' }}>
                                                <span className="font-bold text-gray-300">{comment.username}</span>: {comment.text}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
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
                                {/* OPEN ENDED SHOUT BOX */}
                                <form onSubmit={handleCustomShout} className="relative">
                                    <input 
                                        type="text" 
                                        value={customShout}
                                        onChange={(e) => setCustomShout(e.target.value)}
                                        placeholder="SCREAM FROM TOUCHLINE (e.g. 'Press them harder!')"
                                        className="w-full bg-gray-700 border-2 border-gray-600 rounded p-3 pl-10 text-white text-sm focus:border-green-500 outline-none"
                                        disabled={isShouting}
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                        <UserIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={!customShout.trim() || isShouting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded uppercase"
                                    >
                                        {isShouting ? '...' : 'Shout'}
                                    </button>
                                </form>
                                {shoutFeedback && (
                                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                        <span className="text-xs font-bold bg-blue-900 text-blue-200 px-2 py-1 rounded border border-blue-500">{shoutFeedback.effect}</span>
                                        <p className="text-xs text-gray-300 mt-1 italic">"{shoutFeedback.msg}"</p>
                                    </div>
                                )}

                                {currentMinute === 45 && (
                                    <div className="flex flex-col items-center space-y-2 mt-4 pt-4 border-t border-gray-700">
                                        <h4 className="text-gray-400 text-xs uppercase font-bold">Team Talk Options</h4>
                                        <div className="flex gap-2">
                                            {availableShouts.map(shout => (
                                                <button key={shout.id} onClick={() => setSelectedShout(shout)} className={`px-3 py-1 text-xs rounded border ${selectedShout?.id === shout.id ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'}`}>{shout.label}</button>
                                            ))}
                                        </div>
                                        <button onClick={() => onPlaySecondHalf((selectedShout as any) || { id: 'none', label: 'None', description: '', effect: '' })} className="w-full py-2 bg-green-600 text-white font-bold rounded">Start 2nd Half</button>
                                    </div>
                                )}
                                
                                {currentMinute > 45 && currentMinute < 90 && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
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
