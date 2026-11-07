import React, { useRef, useEffect, useState } from 'react';
import { LoaderCircle, Smartphone, Video, Volume2, X, Activity, ArrowDownUp, Banknote, BadgeCheck, Circle, Flag, Gauge, HeartPulse, Play, RectangleVertical, SkipForward } from 'lucide-react';
import type { Fixture, MatchState, LeagueTableEntry, TouchlineShout, Team, MatchEvent, TacticalShout } from '../types';
import { GameState } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { MusicalNoteIcon } from './icons/MusicalNoteIcon';
import { TOUCHLINE_SHOUTS } from '../constants';
import { getAssistantAnalysis, playMatchCommentary, generateReplayVideo, getContextAwareShouts, processTouchlineInteraction, generateSocialPost, isPaidAudioEnabled, isPaidVideoEnabled, type SocialPostData } from '../services/geminiService';
import { UserIcon } from './icons/UserIcon';
import PitchView from './PitchView';
import AtmosphereWidget from './AtmosphereWidget';
import ClubCrest from './ClubCrest';
import { createChantForCue, type Chant } from '../services/chantService';
import { createAtmosphereCueMemory, selectAtmosphereCues } from '../engine/atmosphereCues';
import { stadiumAudio } from '../services/audioDirector';
import { summarizeMatch } from '../engine/matchPlayback';

interface MatchViewProps {
    fixture: Fixture | undefined;
    weeklyResults: Fixture[];
    matchState: MatchState | null;
    gameState: GameState;
    onPlayFirstHalf: () => void;
    onPlaySecondHalf: (shout: TouchlineShout) => void;
    onPauseMatch: () => void;
    onSimulateSegment: (targetMinute: number, momentumShift?: number) => void;
    onNextMatch: () => void;
    error: string | null;
    isSeasonOver: boolean;
    userTeamName: string | null;
    leagueTable: LeagueTableEntry[];
    isLoading: boolean;
    currentWeek: number;
    teams: Record<string, Team>;
    matchSpeed: 'slow' | 'normal' | 'fast' | 'instant';
    onMatchSpeedChange: (speed: 'slow' | 'normal' | 'fast' | 'instant') => void;
}

export default function MatchView({
    fixture, weeklyResults, matchState, gameState,
    onPlayFirstHalf, onPlaySecondHalf, onSimulateSegment, onNextMatch,
    userTeamName, teams, isLoading, currentWeek, error, isSeasonOver,
    onPauseMatch, matchSpeed, onMatchSpeedChange
}: MatchViewProps) {
    const isPaidAudio = isPaidAudioEnabled();
    const isPaidVideo = isPaidVideoEnabled();

    const feedRef = useRef<HTMLDivElement>(null);
    const lastEventCountRef = useRef(0);
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
    const atmosphereMemoryRef = useRef(createAtmosphereCueMemory());
    const [chantQueue, setChantQueue] = useState<Chant[]>([]);
    const handleChantFinished = React.useCallback((id: string) => setChantQueue(queue => queue[0]?.id === id ? queue.slice(1) : queue), []);

    // THE SICK FEATURE: Touchline Scream
    const [customShout, setCustomShout] = useState('');
    const [isShouting, setIsShouting] = useState(false);
    const [shoutFeedback, setShoutFeedback] = useState<{msg: string, effect: string} | null>(null);
    const [autoFollowFeed, setAutoFollowFeed] = useState(false);
    const [hasNewFeedEvents, setHasNewFeedEvents] = useState(false);
    const [feedOrder, setFeedOrder] = useState<'latest' | 'chronological'>('latest');
    const [mobilePanel, setMobilePanel] = useState<'notes' | 'pitch'>('pitch');

    // Feed behavior: default to manual reading. Auto-follow is opt-in.
    useEffect(() => {
        const count = matchState?.events?.length ?? 0;
        const prev = lastEventCountRef.current;
        if (count <= prev) return;
        lastEventCountRef.current = count;

        if (!feedRef.current) return;
        if (autoFollowFeed) {
            const targetTop = feedOrder === 'latest' ? 0 : feedRef.current.scrollHeight;
            feedRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
            setHasNewFeedEvents(false);
        } else if (prev > 0) {
            setHasNewFeedEvents(true);
        }
    }, [matchState?.events?.length, autoFollowFeed, feedOrder]);

    const jumpToLatest = () => {
        if (!feedRef.current) return;
        const targetTop = feedOrder === 'latest' ? 0 : feedRef.current.scrollHeight;
        feedRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
        setHasNewFeedEvents(false);
    };

    const onFeedScroll = () => {
        if (!feedRef.current) return;
        const el = feedRef.current;
        const nearLatest = feedOrder === 'latest'
            ? el.scrollTop < 24
            : (el.scrollHeight - el.scrollTop - el.clientHeight < 24);
        if (nearLatest) {
            setHasNewFeedEvents(false);
        }
    };

    // Load Shouts at Halftime
    useEffect(() => {
        if (gameState === GameState.PAUSED && [45, 105].includes(matchState?.currentMinute || 0) && userTeamName && fixture) {
            const userTeam = teams[userTeamName];
            if (!userTeam) {
                setAvailableShouts([]);
                return;
            }
            const isHome = fixture.homeTeam === userTeamName;
            getContextAwareShouts(userTeam, isHome, matchState)
                .then(setAvailableShouts)
                .catch(() => setAvailableShouts([]));
        }
    }, [gameState, matchState, userTeamName, fixture, teams]);

    // Viral Clip Audio Auto-Play
    useEffect(() => {
        if (videoUrl && videoFormat === 'portrait' && socialPost && currentClipEventId) {
            playMatchCommentary(socialPost.caption, currentClipEventId * 999);
        }
    }, [videoUrl, videoFormat, socialPost, currentClipEventId]);

    useEffect(() => {
        atmosphereMemoryRef.current = createAtmosphereCueMemory();
        setChantQueue([]);
    }, [fixture?.id]);

    useEffect(() => {
        if (!fixture || !matchState) return;
        const { cues, memory } = selectAtmosphereCues({
            matchId: `${fixture.id}|${matchState.sessionId || 'live'}`, homeTeamName: fixture.homeTeam, awayTeamName: fixture.awayTeam,
            currentMinute: matchState.currentMinute, momentum: matchState.momentum, events: matchState.events,
            isLive: gameState !== GameState.PRE_MATCH && !matchState.isFinished, isFinished: matchState.isFinished,
        }, atmosphereMemoryRef.current);
        atmosphereMemoryRef.current = memory;
        if (!cues.length) return;
        const goals = cues.filter(cue => cue.kind === 'goal').map(createChantForCue);
        const others = cues.filter(cue => cue.kind !== 'goal').map(createChantForCue);
        setChantQueue(queue => goals.length ? [...goals, ...others] : [...queue, ...others].slice(0, 8));
    }, [fixture?.id, gameState, matchState?.currentMinute, matchState?.events, matchState?.momentum, matchState?.isFinished]);

    const handleKickoffWithAudio = async () => {
        await stadiumAudio.unlockFromUserGesture();
        onPlayFirstHalf();
    };

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
        onSimulateSegment(0, result.momentumChange);
        setTimeout(() => setShoutFeedback(null), 5000);
    };

    const handlePlayAudio = async (event: MatchEvent) => {
        setPlayingAudioId(event.id);
        setMediaError(null);
        const commentary = `${event.minute}th minute. ${event.description}`;
        try {
            await playMatchCommentary(commentary, event.id);
            setTimeout(() => setPlayingAudioId(null), 6000);
        } catch (e) {
            setMediaError("Audio unavailable.");
            setPlayingAudioId(null);
        }
    };

    const handleGenerateVideo = async (event: MatchEvent, format: 'landscape' | 'portrait') => {
        if (!isPaidVideo) {
            setMediaError("Replay videos are disabled. Toggle paid video on to use.");
            return;
        }
        setGeneratingVideoId(event.id);
        setVideoFormat(format);
        setCurrentClipEventId(event.id);
        setMediaError(null);
        setSocialPost(null);

        const description = `${event.teamName} scores a goal. ${event.description}`;

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
        let color = 'fm-match-event-default';
        let icon: React.ReactNode = <Circle size={12} strokeWidth={1.75} aria-hidden="true" />;

        if (event.type === 'goal') { color = 'fm-match-event-goal font-bold'; icon = <FootballIcon className="h-4 w-4" />; }
        if (event.type === 'card') {
            if (event.cardType === 'red') { color = 'fm-match-event-danger font-bold'; icon = <RectangleVertical size={15} fill="currentColor" aria-hidden="true" />; }
            else { color = 'fm-match-event-caution'; icon = <RectangleVertical size={15} fill="currentColor" aria-hidden="true" />; }
        }
        if (event.type === 'injury') { color = 'fm-match-event-danger font-bold'; icon = <HeartPulse size={16} strokeWidth={1.75} aria-hidden="true" />; }
        if (event.type === 'sub') { color = 'fm-match-event-sub'; icon = <ArrowDownUp size={16} strokeWidth={1.75} aria-hidden="true" />; }
        if (event.type === 'whistle') { color = 'fm-match-muted italic'; icon = <Flag size={16} strokeWidth={1.75} aria-hidden="true" />; }

        return (
            <div key={event.id} className={`fm-match-event grid grid-cols-[2rem_minmax(0,1fr)] gap-2 items-start py-3 ${event.type === 'goal' ? 'is-goal' : ''}`}>
                <span className="fm-match-muted text-right tabular-nums text-xs pt-0.5">{event.minute}'</span>
                <div className="flex-1 min-w-0">
                     <p className={`text-sm leading-relaxed ${color} break-words whitespace-normal`}>
                        <span className="mr-2 inline-flex align-middle" title={event.type === 'card' ? `${event.cardType || 'yellow'} card` : event.type}>{icon}</span>
                        {event.description}
                        {event.scoreAfter && <span className="fm-match-event-score ml-2 px-1.5 tabular-nums inline-block">{event.scoreAfter}</span>}
                    </p>
                {event.type === 'goal' && (
                    <div className="fm-match-event-actions mt-2 flex gap-1">
                        <button onClick={() => handlePlayAudio(event)} disabled={playingAudioId === event.id} className={`fm-button-secondary p-2 ${playingAudioId === event.id ? 'fm-match-live animate-pulse' : ''}`} title="Listen" aria-label="Listen">
                            <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <button onClick={() => handleGenerateVideo(event, 'landscape')} disabled={!isPaidVideo || generatingVideoId === event.id} className="fm-button-secondary p-2" title={!isPaidVideo ? "Video disabled in settings" : "Replay"} aria-label={!isPaidVideo ? "Video disabled in settings" : "Replay"}>
                            {generatingVideoId === event.id ? <LoaderCircle size={16} strokeWidth={1.75} aria-hidden="true" /> : <Video size={16} strokeWidth={1.75} aria-hidden="true" />}
                        </button>
                        <button onClick={() => handleGenerateVideo(event, 'portrait')} disabled={!isPaidVideo || generatingVideoId === event.id} className="fm-button-secondary p-2" title={!isPaidVideo ? "Video disabled in settings" : "Clip It"} aria-label={!isPaidVideo ? "Video disabled in settings" : "Clip It"}>
                            <Smartphone size={16} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    </div>
                )}
                </div>
            </div>
        );
    }

    if (isSeasonOver) return (
        <div className="fm-panel p-6 sm:p-8">
            <h2 className="fm-screen-title text-3xl mb-4">Season Over!</h2>
            <button onClick={onNextMatch} disabled={isLoading} className="fm-button px-6">End Season</button>
        </div>
    );

    if (gameState === GameState.PRE_MATCH && !fixture) {
         return <div className="fm-panel p-6 sm:p-8"><h2 className="fm-screen-title text-2xl mb-2">Week {currentWeek}</h2><p>No match scheduled.</p><button onClick={onNextMatch} disabled={isLoading} className="fm-button mt-4 px-6">CONTINUE</button></div>;
    }

    const currentMinute = matchState?.currentMinute || 0;
    const score = matchState ? `${matchState.homeScore}-${matchState.awayScore}` : 'v';
    const feedEvents = feedOrder === 'latest'
        ? [...(matchState?.events || [])].reverse()
        : (matchState?.events || []);
    const spatialEvent = [...(matchState?.events || [])].reverse().find(event => event.play || event.pitchX !== undefined) || null;
    const matchStats = summarizeMatch(matchState?.events || [], fixture?.homeTeam || '', fixture?.awayTeam || '');

    return (
        <section className="fm-inverse fm-broadcast fm-match relative overflow-hidden" aria-label="Match">
            {videoUrl && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Replay">
                    <button onClick={() => setVideoUrl(null)} aria-label="Close replay" className="fm-button-secondary absolute top-4 right-4 z-50 p-2">
                        <X size={24} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <div className={`relative ${videoFormat === 'portrait' ? 'max-w-[320px] aspect-[9/16]' : 'w-full max-w-4xl aspect-[16/9]'} bg-black overflow-hidden`}>
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                        {videoFormat === 'portrait' && socialPost && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 z-10 flex flex-col justify-end h-1/3">
                                <div className="text-white space-y-2">
                                    <div>
                                        <h4 className="font-bold text-sm flex items-center gap-1">
                                            @{userTeamName?.replace(/\s/g, '').toLowerCase()}_official
                                            <BadgeCheck size={14} className="text-blue-400" aria-hidden="true" />
                                        </h4>
                                        <p className="text-xs mt-1 leading-snug opacity-90">{socialPost.caption}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1"><HeartIcon className="w-3 h-3 text-red-500" /> {socialPost.likes}</span>
                                            <span className="flex items-center gap-1"><ChatBubbleIcon className="w-3 h-3" /> {socialPost.comments.length * 120}</span>
                                            <span className="flex items-center gap-1"><ShareIcon className="w-3 h-3" /> {socialPost.shareCount}</span>
                                        </div>
                                        <div className="fm-match-earnings px-2 py-1 flex items-center gap-1"><Banknote size={14} strokeWidth={1.75} aria-hidden="true" /> {socialPost.estimatedEarnings}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-white/80 animate-pulse">
                                        <MusicalNoteIcon className="w-3 h-3" />
                                        <div className="overflow-hidden w-24 whitespace-nowrap">{socialPost.sound} - Original Audio</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <header className="fm-match-header grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="fm-match-scorebug grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <ClubCrest teamName={fixture?.homeTeam || 'Home'} className="w-9 h-9 sm:w-12 sm:h-12 shrink-0" />
                        <h3 className="fm-match-team min-w-0 text-base sm:text-2xl leading-tight" title={fixture?.homeTeam}>{fixture?.homeTeam}</h3>
                    </div>
                    <div className="fm-match-score px-3 sm:px-5 py-1 text-4xl sm:text-5xl font-bold tabular-nums leading-none whitespace-nowrap" aria-label={score}>{score}</div>
                    <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                        <h3 className="fm-match-team min-w-0 text-base sm:text-2xl leading-tight text-right" title={fixture?.awayTeam}>{fixture?.awayTeam}</h3>
                        <ClubCrest teamName={fixture?.awayTeam || 'Away'} className="w-9 h-9 sm:w-12 sm:h-12 shrink-0" />
                    </div>
                </div>
                <div className="fm-match-status flex flex-wrap xl:flex-col items-center xl:items-end justify-between gap-1 text-xs">
                    <span className="fm-eyebrow">{fixture?.league}</span>
                    <span className="fm-match-clock font-bold tabular-nums">{isLoading ? 'Thinking...' : (matchState?.isFinished ? 'Full Time' : `${currentMinute}' (LIVE)`)}</span>
                </div>
            </header>

            <div className="fm-match-transport px-4 sm:px-5 py-3">
                {gameState === GameState.PLAYING ? (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="fm-match-live fm-eyebrow inline-flex items-center gap-2">● LIVE MATCH</span>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="fm-eyebrow text-[10px]">Speed:</span>
                                <div className="fm-match-speed flex" aria-label="Match speed">
                                    {(['slow', 'normal', 'fast', 'instant'] as const).map(speed => (
                                        <button key={speed} onClick={() => onMatchSpeedChange(speed)} aria-label={`Match speed: ${speed}`} aria-pressed={matchSpeed === speed} title={`${speed[0].toUpperCase()}${speed.slice(1)} speed`} className={`fm-button-secondary fm-match-speed-option px-3 ${matchSpeed === speed ? 'is-active' : ''}`}>
                                            {speed === 'slow' ? <Activity size={16} aria-hidden="true" /> : speed === 'normal' ? <Play size={16} aria-hidden="true" /> : speed === 'fast' ? <Gauge size={16} aria-hidden="true" /> : <SkipForward size={16} aria-hidden="true" />}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={onPauseMatch} className="fm-button-secondary px-4">PAUSE</button>
                            </div>
                            <form onSubmit={handleCustomShout} className="fm-match-shout flex items-center gap-2 w-full xl:w-auto xl:flex-1 xl:min-w-[260px]">
                                <UserIcon className="w-4 h-4 shrink-0" />
                                <input type="text" value={customShout} onChange={(e) => setCustomShout(e.target.value)} placeholder="SHOUT INSTRUCTION (e.g. 'Press them!')" aria-label="Shout instruction" className="fm-field w-full min-w-0 text-xs" disabled={isShouting} />
                                <button type="submit" disabled={!customShout.trim() || isShouting} className="fm-button px-4">{isShouting ? '...' : 'Shout'}</button>
                            </form>
                        </div>
                        {shoutFeedback && <div className="fm-match-feedback mt-3 text-sm" aria-live="polite"><span className="font-bold">{shoutFeedback.effect}</span><p className="mt-1 italic">"{shoutFeedback.msg}"</p></div>}
                    </>
                ) : (
                    <div className="flex flex-wrap items-center gap-3">
                        {gameState === GameState.PRE_MATCH && fixture && <button onClick={() => void handleKickoffWithAudio()} className="fm-button inline-flex items-center justify-center gap-2 px-6"><FootballIcon className="w-5 h-5" /> KICK OFF</button>}
                        {gameState === GameState.PAUSED && (
                            <>
                                <p className="fm-eyebrow">MATCH PAUSED</p>
                                {[45, 105].includes(matchState?.currentMinute || 0) && (
                                    <div className="flex flex-wrap items-center gap-3 flex-1">
                                        <h4 className="fm-eyebrow">{matchState?.currentMinute === 105 ? 'Extra-time interval' : 'Half Time Talk'}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {availableShouts.map(shout => <button key={shout.id} onClick={() => setSelectedShout(shout)} aria-pressed={selectedShout?.id === shout.id} className={`fm-button-secondary px-3 text-xs ${selectedShout?.id === shout.id ? 'is-active' : ''}`}>{shout.label}</button>)}
                                        </div>
                                        <button onClick={() => onPlaySecondHalf(selectedShout?.label || 'Demand More')} className="fm-button sm:ml-auto px-5">{matchState?.currentMinute === 105 ? 'Resume extra time' : 'Start 2nd Half'}</button>
                                    </div>
                                )}
                                {matchState?.currentMinute !== 45 && (matchState?.currentMinute || 0) < 90 && <div className="flex flex-wrap gap-2 sm:ml-auto"><button onClick={() => onPlaySecondHalf('resume')} className="fm-button px-5">RESUME MATCH</button><button onClick={() => onSimulateSegment(90)} className="fm-button-secondary px-5">Sim to End</button></div>}
                            </>
                        )}
                        {(gameState === GameState.POST_MATCH || (gameState === GameState.PRE_MATCH && !fixture)) && <button onClick={onNextMatch} disabled={isLoading} className="fm-button px-6">CONTINUE</button>}
                    </div>
                )}
            </div>

            <div className="fm-match-production flex flex-wrap justify-between items-center gap-x-4 gap-y-1 px-4 sm:px-5 py-2 text-[11px]">
                {matchState?.presentation && <p className={matchState.presentation.mode === 'ai' ? 'fm-match-live' : 'fm-match-muted'}>{matchState.presentation.mode === 'ai' ? 'AI match director connected' : matchState.presentation.reason || 'Local match commentary'}</p>}
                {(!isPaidAudio || !isPaidVideo) && <div className="fm-match-muted flex flex-wrap gap-x-4 gap-y-1">
                    {!isPaidAudio && <span className="inline-flex items-center gap-1"><Volume2 size={13} aria-hidden="true" />Free Speech Engine Active</span>}
                    {!isPaidVideo && <span className="inline-flex items-center gap-1"><Video size={13} aria-hidden="true" />3D Replay Videos Disabled</span>}
                </div>}
                {mediaError && <p className="fm-match-error w-full font-bold" role="alert">{mediaError}</p>}
            </div>

            <div className="px-3 sm:px-5 pt-3 sm:pt-4">
                {gameState !== GameState.PRE_MATCH && <div className="fm-match-mobile-tabs grid grid-cols-2 gap-2 sm:hidden mb-3">
                    <button onClick={() => setMobilePanel('pitch')} aria-pressed={mobilePanel === 'pitch'} className={`fm-button-secondary ${mobilePanel === 'pitch' ? 'is-active' : ''}`}>Pitch</button>
                    <button onClick={() => setMobilePanel('notes')} aria-pressed={mobilePanel === 'notes'} className={`fm-button-secondary ${mobilePanel === 'notes' ? 'is-active' : ''}`}>Live Notes</button>
                </div>}
                <div className="fm-match-main grid grid-cols-1 gap-4 lg:gap-5 items-start">
                    <div className={`${mobilePanel === 'pitch' || gameState === GameState.PRE_MATCH ? 'block' : 'hidden'} sm:block min-w-0`}>
                        <div className="fm-match-pitch">
                            <PitchView momentum={matchState?.momentum || 0} homeTeamName={fixture?.homeTeam || 'Home'} awayTeamName={fixture?.awayTeam || 'Away'} lastEvent={spatialEvent} currentMinute={matchState?.currentMinute || 0} homeScore={matchState?.homeScore} awayScore={matchState?.awayScore} homeTeam={fixture ? teams[fixture.homeTeam] : undefined} awayTeam={fixture ? teams[fixture.awayTeam] : undefined} paused={gameState !== GameState.PLAYING} />
                        </div>
                    </div>
                    <aside className={`fm-match-notes ${mobilePanel === 'notes' || gameState === GameState.PRE_MATCH ? 'block' : 'hidden'} sm:block min-w-0`} aria-label="Live Notes">
                        <h3 className="fm-eyebrow mb-3">Live Notes</h3>
                        {matchState && <div className="fm-match-stats grid grid-cols-[1fr_2fr_1fr] items-center gap-x-2 gap-y-2 text-center text-xs py-3 mb-3 tabular-nums">
                            <span className="font-bold">{matchStats.home.shots} / {matchStats.home.onTarget}</span><span className="fm-match-muted">Shots / on target</span><span className="font-bold">{matchStats.away.shots} / {matchStats.away.onTarget}</span>
                            <span className="fm-match-xg font-bold">{matchStats.home.xG.toFixed(2)}</span><span className="fm-match-muted">Expected goals</span><span className="fm-match-xg font-bold">{matchStats.away.xG.toFixed(2)}</span>
                        </div>}
                        <div className="fm-match-feed-tools flex flex-wrap items-center gap-2 pb-3">
                            <button onClick={() => setAutoFollowFeed(prev => !prev)} aria-pressed={autoFollowFeed} className={`fm-button-secondary text-[11px] px-3 ${autoFollowFeed ? 'is-active' : ''}`}>Auto-follow: {autoFollowFeed ? 'ON' : 'OFF'}</button>
                            <button onClick={() => setFeedOrder(prev => prev === 'latest' ? 'chronological' : 'latest')} className="fm-button-secondary text-[11px] px-3">{feedOrder === 'latest' ? 'Latest First' : 'Chronological'}</button>
                            {hasNewFeedEvents && <button onClick={jumpToLatest} className="fm-button text-[11px] px-3">Jump to latest</button>}
                        </div>
                        <div ref={feedRef} onScroll={onFeedScroll} className="fm-match-feed overflow-y-auto scroll-smooth h-[340px] sm:h-[300px] lg:h-[360px] pr-1">
                            {(!matchState?.events || matchState.events.length === 0) && <p className="fm-match-muted italic text-sm py-8">Match is about to start...</p>}
                            {feedEvents.map(renderEvent)}
                            {isLoading && <div className="flex justify-center py-4"><FootballIcon className="w-6 h-6 fm-match-live animate-spin" /></div>}
                        </div>
                    </aside>
                </div>
            </div>

            {gameState !== GameState.PRE_MATCH && <div className="px-3 sm:px-5 mt-4 pb-4 sm:pb-5"><AtmosphereWidget chant={chantQueue[0] ?? null} momentum={matchState?.momentum || 0} teamName={fixture?.homeTeam || 'Home'} onChantFinished={handleChantFinished} /></div>}

            {assistantAdvice && (
                <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Assistant Manager">
                    <div className="fm-match-dialog p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4 pb-3"><UserIcon className="w-6 h-6" /><h4 className="fm-screen-title text-2xl">Assistant Manager</h4></div>
                        <div className="space-y-2 text-sm leading-relaxed whitespace-pre-line">{assistantAdvice}</div>
                        <button onClick={() => setAssistantAdvice(null)} className="fm-button-secondary mt-6 w-full">Got it, Boss.</button>
                    </div>
                </div>
            )}
        </section>
    );
}
