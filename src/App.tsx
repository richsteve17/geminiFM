import { canEnterClub } from './engine/tutorialProgression';
import { Gamepad2, ClipboardList, Newspaper, Search, Handshake, Trophy, Globe2, Shield } from 'lucide-react';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TEAMS as clubSeedTeams, EXPERIENCE_LEVELS } from './constants';
import { createCurrentFreeAgentMarket, getCurrentClubTeams } from './engine/clubRosters';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, GameMode, NegotiationResult, MatchEvent, ContractTerms, TransferBid, CareerHistoryEntry, LeagueTier, PlayerEffect } from './types';
import { AppScreen, GameState } from './types';
import { hashSeed, simulateDeterministicShootout } from './engine/matchEngine';
import { kickoffParticipants, mergeMatchParticipants, pairPlayedTogether } from './engine/matchParticipants';
import { applyLiveFatigue, nextMatchBoundary, revealMatchMinute } from './engine/matchPlayback';
import { isFreeAgent, mergeFreeAgentsIntoMarket, signFreeAgent, toFreeAgent } from './engine/freeAgency';
import { applyPressConferenceTransition } from './engine/pressConference';
import { buildPressContext } from './engine/pressContext';
import { completeTutorialTournament } from './engine/tutorialTournament';
import { encodeCareerSave, decodeCareerSave, readCareerSaveMetadata, preserveCareerBackup } from './engine/careerStorage';
import { CAREER_SAVE_VERSION, migrateCareerSave } from './engine/careerSave';
import { applyIncidentEffects, advanceRelationship, buildRelationshipIncidents, getIncidentEffects, interveneRelationship, relationshipPlayerKey, type RelationshipIncident, type InternationalRelationshipFixture } from './engine/internationalRelationships';
import { hydrateNationalTeamsFromCareer, linkNationalRosterIdentitiesToClubTeams, NATIONAL_ROSTER_SNAPSHOT_DATE } from './engine/nationalRosters';
import { interpretRiftMediation } from './services/riftMediation';
import { bestTutorialResult, shouldRollClubSeason, canStartAtClub, careerGateLabel, normalizeTutorialResult, restoreTutorialHonors, tutorialResult, TUTORIAL_PROFILE_KEY, type TutorialResult, type TutorialFinish } from './engine/tutorialProgression';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import { simulateMatchSegment, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, scoutPlayers, generatePressConferenceQuestions, type PressConferenceContext, type PressQuestionGenerationResult, type PressConferenceReport, getInternationalBreakSummary, getTeammateTournamentRivalry } from './services/geminiService';
import { generateFixtures, simulateQuickMatch, generateSwissFixtures, analyzeTactics, FORMATION_SLOTS, calculatePlayerDevelopment, ensureTeamAndPlayerFields } from './utils';
import StartScreen from './components/StartScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import JobCentreScreen from './components/JobCentreScreen';
import JobInterviewScreen from './components/JobInterviewScreen';
import TransfersScreen from './components/TransfersScreen';
import PlayerTalkScreen from './components/PlayerTalkScreen';
import NewsScreen from './components/NewsScreen';
import InternationalBreakScreen from './components/InternationalBreakScreen';
import CreateManagerScreen from './components/CreateManagerScreen';
import TutorialOverlay from './components/TutorialOverlay';
import ScoutingScreen from './components/ScoutingScreen';
import PressConferenceScreen, { type PressProgress } from './components/PressConferenceScreen';
import MechanicsGuide from './components/MechanicsGuide';
import TransferCenter from './components/TransferCenter';
import TacticsManager from './components/TacticsManager';
import { 
    generateWorldCupStructure, 
    generateEurosStructure, 
    generateExpandedWorldCupStructure, 
    getGroupStandings, 
    extractAdvancingTeams, 
    generateSeededKnockoutRound, 
    sortQualifiedTeams, 
    simulateKnockoutQuickMatch, 
    NATIONAL_TEAMS,
    EXTRA_EUROPEAN_TEAMS,
    EXTRA_GLOBAL_TEAMS
} from './international';
import { getChampionsLeagueParticipants } from './europe';
import { CL_RESERVED_WEEKS, createSeasonTable, domesticSlotToWeek, generateMLSPlayoffFixtures, getDomesticSeasonLength, getMLSSeasonHonors, getMLSStandings, getMLSPlayoffMatchRules, isMLSPlayoffFixture, resolveMLSPlayoffMatch } from './engine/domesticSeason';

import Terminal from './components/Terminal';
import { logger, LogEntry } from './utils/logger';

const INTERNATIONAL_BREAK_WEEKS = [10, 20, 30];
const SIMULATION_CHUNK_MINUTES = 10; 
const CLEAN_SHEET_POSITIONS = new Set(['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB']);

// Immutable NEW-career source baseline. Continue restores parsed.teams instead.
const allTeams = linkNationalRosterIdentitiesToClubTeams(getCurrentClubTeams(ensureTeamAndPlayerFields(structuredClone(clubSeedTeams))));
const freshFreeAgents = createCurrentFreeAgentMarket();

// Construct only new/rolled seasons. Continue never refreshes a saved career's clubs or results.
const createClubSeason = (sourceTeams: Record<string, Team>, legacyFixtures: Fixture[] = []) => {
    const { participants, newTeams } = getChampionsLeagueParticipants(sourceTeams);
    const seasonTeams = { ...sourceTeams, ...newTeams };
    const members = Object.values(sourceTeams);
    const legacyMLS = members.filter(t => t.league === 'MLS').length !== 30;
    const domestic = generateFixtures(legacyMLS ? members.filter(t => t.league !== 'MLS') : members)
        .map(f => ({ ...f, week: domesticSlotToWeek(f.week) }));
    // An incomplete restored MLS universe keeps its old game-week template, not a fake 2026 schedule.
    if (legacyMLS) domestic.push(...legacyFixtures.filter(f => f.league === 'MLS' && !f.isKnockout).map(f => ({ id: f.id, league: f.league, week: f.week, homeTeam: f.homeTeam, awayTeam: f.awayTeam, played: false })));
    const european = generateSwissFixtures(participants.map(n => seasonTeams[n])).map(f => ({ ...f, week: CL_RESERVED_WEEKS[f.week - 1] }));
    const seasonFixtures = [...domestic, ...european].sort((a, b) => a.week - b.week);
    return { teams: seasonTeams, fixtures: seasonFixtures, table: createSeasonTable(seasonTeams, participants), weeks: Math.max(getDomesticSeasonLength(seasonFixtures), ...european.map(f => f.week), 0) + 10 };
};

const deterministicUnit = (...parts: Array<string | number>) => hashSeed(parts.join('|')) / 0xFFFFFFFF;

const convertNationalTeam = (nt: NationalTeam): Team => ({
    name: nt.name,
    league: 'International',
    players: nt.players,
    tactic: nt.tactic,
    prestige: nt.prestige,
    chairmanPersonality: 'Traditionalist',
    group: nt.group,
    balance: 0,
    weeklyWageBill: 0,
    matchDayRevenue: 0,
    transferBudget: 0,
    objectives: nt.objectives || [],
    activePromises: [],
    weeklyBroadcastRevenue: 0,
});

export default function App() {
    const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.START_SCREEN);
    const [userTeamName, setUserTeamName] = useState<string | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>('Club');
    const [isPrologue, setIsPrologue] = useState(false);
    const [currentYear, setCurrentYear] = useState<number>(1);
    const [internationalTournament, setInternationalTournament] = useState<any | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showMechanicsGuide, setShowMechanicsGuide] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [weeksInSeason, setWeeksInSeason] = useState(38); 
    const [teams, setTeams] = useState<Record<string, Team>>(() => {
        const hydrated = linkNationalRosterIdentitiesToClubTeams(ensureTeamAndPlayerFields(structuredClone(allTeams)));
        Object.keys(hydrated).forEach(tName => {
            hydrated[tName].players = hydrated[tName].players.map(p => {
                const baseStamina = p.stamina ?? (p.age < 22 ? 80 : p.age > 30 ? 65 : 75) + (p.personality === 'Professional' ? 5 : 0);
                const nameSeed = p.name.length + p.age;
                const variance = (nameSeed % 11) - 5; // -5 to +5
                const finalStamina = Math.min(99, Math.max(40, baseStamina + variance));
                return {
                    ...p,
                    stamina: p.stamina ?? finalStamina
                };
            });
        });
        return hydrated;
    });
    const [leagueTable, setLeagueTable] = useState<LeagueTableEntry[]>([]);
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [currentFixture, setCurrentFixture] = useState<Fixture | undefined>(undefined);
    
    // Game State Management
    const [gameState, setGameState] = useState<GameState>(GameState.PRE_MATCH);
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    
    // Playback State
    const [pendingEvents, setPendingEvents] = useState<MatchEvent[]>([]);
    const [simulationTargetMinute, setSimulationTargetMinute] = useState<number>(0);
    const [currentPlaybackMinute, setCurrentPlaybackMinute] = useState<number>(0);

    const [error, setError] = useState<string | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [weeklyResults, setWeeklyResults] = useState<Fixture[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [interview, setInterview] = useState<Interview | null>(null);
    const [jobOffer, setJobOffer] = useState<{ offer: boolean; reasoning: string } | null>(null);
    
    // Negotiation States
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<NegotiationResult | null>(null);
    const [pendingContractTerms, setPendingContractTerms] = useState<ContractTerms | null>(null);
    
    // Transfer Market State (Mutable!)
    const [transferMarket, setTransferMarket] = useState<Player[]>(() => structuredClone(freshFreeAgents));
    const [incomingBids, setIncomingBids] = useState<TransferBid[]>([]);

    const [activeShout, setActiveShout] = useState<TouchlineShout | undefined>(undefined);
    const [scoutResults, setScoutResults] = useState<Player[]>([]);
    const [pressInput, setPressInput] = useState<PressConferenceContext | null>(null);
    const [pressQuestionResult, setPressQuestionResult] = useState<PressQuestionGenerationResult | null>(null);
    const appliedPressEvaluationIdsRef = useRef(new Set<string>());
    const [pressProgress, setPressProgress] = useState<PressProgress | null>(null);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [managerReputation, setManagerReputation] = useState<number>(0);
    const [tutorialCompletion, setTutorialCompletion] = useState<TutorialResult | null>(() => {
        try { return normalizeTutorialResult(JSON.parse(localStorage.getItem(TUTORIAL_PROFILE_KEY) || 'null')); } catch { return null; }
    });
    const [hasClubCareer, setHasClubCareer] = useState(false);
    const [relationshipIncidents, setRelationshipIncidents] = useState<RelationshipIncident[]>([]);
    const relationshipsRef = useRef<RelationshipIncident[]>([]);
    relationshipsRef.current = relationshipIncidents;
    const careerGenerationRef = useRef(0);
    const advancingRef = useRef(false);
    const advanceRequestRef = useRef(false);
    const committedWeekRef = useRef<string | null>(null);
    const [advanceRevision, setAdvanceRevision] = useState(0);
    const teamsRef = useRef(teams);
    teamsRef.current = teams;
    const [prologueArchive, setPrologueArchive] = useState<{ teams: Record<string, Team>; fixtures: Fixture[]; champion?: string } | null>(null);
    useEffect(() => {
        if (tutorialCompletion) localStorage.setItem(TUTORIAL_PROFILE_KEY, JSON.stringify(tutorialCompletion));
    }, [tutorialCompletion]);
    const [careerHistory, setCareerHistory] = useState<CareerHistoryEntry[]>([]);
    
    const [matchSpeed, setMatchSpeed] = useState<'slow' | 'normal' | 'fast' | 'instant'>('normal');
    const [gameplayTab, setGameplayTab] = useState<'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors' | 'international'>('match');

    // --- THEMING STATE ---
    const [activeTheme, setActiveTheme] = useState<{ primary: string, secondary: string, text: string } | null>(null);

    const userTeam = userTeamName ? teams[userTeamName] : null;
    const liveSessionRef = useRef<string | undefined>(undefined);
    liveSessionRef.current = matchState?.sessionId;
    const simulationInFlightRef = useRef<string | null>(null);
    const finishedMatchRef = useRef<string | null>(null);
    const freeAgentSigningKeysRef = useRef(new Set<string>());

    // Logger Subscription
    useEffect(() => {
        const unsubscribe = logger.subscribe((entry) => {
            setLogs(prev => [...prev, entry].slice(-100)); // Keep last 100 logs
        });
        logger.system("App Initialized. Logger connected.");
        return unsubscribe;
    }, []);

    // Apply Theme Effects
    useEffect(() => {
        // If a user team is selected, use its colors.
        // If not, allow manual override (via Start Screen) or default.
        if (userTeam && userTeam.colors) {
            setActiveTheme(userTeam.colors);
        } else if (!userTeamName && !activeTheme) {
            // Default Theme
            setActiveTheme({ primary: '#1f2937', secondary: '#22c55e', text: '#FFFFFF' });
        }
    }, [userTeam, userTeamName]);

    // Apply CSS Variables
    useEffect(() => {
        if (activeTheme) {
            document.documentElement.style.setProperty('--team-primary', activeTheme.primary);
            document.documentElement.style.setProperty('--team-secondary', activeTheme.secondary);
            document.documentElement.style.setProperty('--team-text', activeTheme.text);
        }
    }, [activeTheme]);
    
    useEffect(() => {
        if (error) {
            logger.error(error);
        }
    }, [error]);

    // --- LIVE SIMULATION LOOP ---
    useEffect(() => {
        console.log("Playback loop useEffect triggered:", { gameState, currentPlaybackMinute, simulationTargetMinute, isLoading });
        let timeoutId: ReturnType<typeof setTimeout>;

        const runPlaybackTick = async () => {
            console.log("Playback tick:", { gameState, currentPlaybackMinute, simulationTargetMinute, isLoading, hasFixture: !!currentFixture, hasTeam: !!userTeam, hasMatchState: !!matchState });
            if (gameState === GameState.PLAYING && currentFixture && userTeam && matchState && !isLoading) {
                
                if (currentPlaybackMinute >= simulationTargetMinute) {
                    const directPenalties = getMLSPlayoffMatchRules(currentFixture)?.extraTime === false;
                    const boundary = directPenalties && matchState.currentMinute >= 90
                        ? { kind: 'finish' as const, shootout: matchState.homeScore === matchState.awayScore }
                        : nextMatchBoundary(matchState, currentFixture, !!activeShout, SIMULATION_CHUNK_MINUTES);
                    if (boundary.kind === 'finish') {
                        let completed = matchState;
                        if (boundary.shootout) {
                            const pens = simulateDeterministicShootout(teams[currentFixture.homeTeam], teams[currentFixture.awayTeam], `${currentFixture.id}|${matchState.simulationSeed ?? 0}`);
                            completed = { ...matchState, penaltyWinner: pens.penaltyWinner, penalties: pens.penalties, events: [...matchState.events, {
                                id: hashSeed(`${matchState.simulationSeed ?? 0}|${matchState.currentMinute}|shootout`), minute: matchState.currentMinute, type: 'commentary',
                                description: `Penalty shootout: ${currentFixture.homeTeam} ${pens.homePenalties}-${pens.awayPenalties} ${currentFixture.awayTeam}.`,
                            }] };
                        }
                        finishMatch(completed);
                        return;
                    }
                    if (boundary.kind === 'half-time') {
                        setGameState(GameState.PAUSED);
                        return;
                    }
                    const nextTarget = boundary.target;
                    const session = matchState.sessionId;
                    const requestKey = `${session}|${currentPlaybackMinute}|${nextTarget}`;
                    if (simulationInFlightRef.current) return;
                    simulationInFlightRef.current = requestKey;
                    setIsLoading(true);
                    
                    // --- CONSTRUCT TACTICAL CONTEXT ---
                    const starters = userTeam.players.filter(p => p.isStarter);
                    const analysis = analyzeTactics(starters, userTeam.tactic.formation);
                    const formationSlots = FORMATION_SLOTS[userTeam.tactic.formation] || FORMATION_SLOTS['4-4-2'];
                    
                    let tacticalContext = `User Team Efficiency: ${analysis.score}%.\nFormation: ${userTeam.tactic.formation}\n`;
                    tacticalContext += `Lineup:\n`;
                    starters.forEach((p, i) => {
                        const slotRole = formationSlots[i] || "Sub";
                        const oopWarning = analysis.assignments[i]?.isOutOfPosition ? `[OOP! playing as ${slotRole}]` : `(${slotRole})`;
                        tacticalContext += `- ${p.name} (${p.position}): ${oopWarning}\n`;
                    });
                    
                    if (analysis.score < 50) {
                        tacticalContext += `\nCRITICAL: The team is confused. Players are out of position. Expect errors.`;
                    }

                    const homeTeam = teams[currentFixture.homeTeam];
                    const awayTeam = teams[currentFixture.awayTeam];
                    if (!homeTeam || !awayTeam) {
                        setError(`Missing team data for fixture: ${currentFixture.homeTeam} vs ${currentFixture.awayTeam}`);
                        setGameState(GameState.PAUSED);
                        setIsLoading(false);
                        return;
                    }

                    try {
                        const result = await simulateMatchSegment(
                            homeTeam,
                            awayTeam,
                            matchState,
                            nextTarget,
                            { shout: activeShout, userTeamName, tacticalContext }
                        );
                        if (liveSessionRef.current !== session) return;

                        const rawEvents = Array.isArray(result?.events) ? result.events : [];
                        const safeEvents: MatchEvent[] = rawEvents.map((event: any, index: number) => {
                            const parsedMinute = Number(event?.minute);
                            const minute = Number.isFinite(parsedMinute)
                                ? Math.max(currentPlaybackMinute + 1, Math.min(nextTarget, Math.floor(parsedMinute)))
                                : nextTarget;
                            const validTypes: MatchEvent['type'][] = ['goal', 'sub', 'injury', 'card', 'whistle', 'commentary'];
                            const type: MatchEvent['type'] = validTypes.includes(event?.type) ? event.type : 'commentary';
                            return {
                                id: Number.isFinite(Number(event?.id)) ? Number(event.id) : Date.now() + index,
                                minute,
                                type,
                                teamName: typeof event?.teamName === 'string' ? event.teamName : undefined,
                                player: typeof event?.player === 'string' ? event.player : undefined,
                                description: typeof event?.description === 'string' && event.description.trim()
                                    ? event.description
                                    : 'The play develops without a clear chance.',
                                scoreAfter: typeof event?.scoreAfter === 'string' ? event.scoreAfter : undefined,
                                cardType: event?.cardType === 'yellow' || event?.cardType === 'red' ? event.cardType : undefined,
                                pitchX: Number.isFinite(Number(event?.pitchX)) ? Math.max(0, Math.min(100, Number(event.pitchX))) : undefined,
                                pitchY: Number.isFinite(Number(event?.pitchY)) ? Math.max(0, Math.min(100, Number(event.pitchY))) : undefined,
                                play: event.play,
                                isPenalty: event.isPenalty,
                                goalkeeper: event.goalkeeper,
                                xG: event.xG,
                                onTarget: event.onTarget,
                                momentumAfter: event.momentumAfter,
                            };
                        });

                        const safeAnalysis = typeof result?.tacticalAnalysis === 'string' && result.tacticalAnalysis.trim()
                            ? result.tacticalAnalysis
                            : 'The match continues.';

                        setPendingEvents(prev => [...prev, ...safeEvents]);
                        setMatchState(prev => prev ? ({
                            ...prev,
                            tacticalAnalysis: safeAnalysis,
                            presentation: result.presentation,
                        }) : null);
                        setSimulationTargetMinute(nextTarget);
                        if (activeShout) setActiveShout(undefined);
                        setError(null);
                    } catch (simError) {
                        console.error("Live simulation tick failed", simError);
                        setError("Match simulation failed for this segment. Resume to continue.");
                        setGameState(GameState.PAUSED);
                    } finally {
                        simulationInFlightRef.current = null;
                        setIsLoading(false);
                    }
                    return; 
                }

                // --- PLAYBACK ---
                const nextMinute = currentPlaybackMinute + 1;
                const eventsNow = pendingEvents.filter(e => e.minute === nextMinute);
                const hasGoal = eventsNow.some(e => e.type === 'goal');
                
                const tickDelayForSpeed = matchSpeed === 'slow' ? 1500 : matchSpeed === 'fast' ? 250 : matchSpeed === 'instant' ? 15 : 600;
                const delay = hasGoal ? (matchSpeed === 'instant' ? 50 : 3000) : tickDelayForSpeed;

                timeoutId = setTimeout(() => {
                    setCurrentPlaybackMinute(nextMinute);
                    
                    setTeams(prev => applyLiveFatigue(prev, currentFixture.homeTeam, currentFixture.awayTeam));
                    setMatchState(prev => prev ? revealMatchMinute(prev, pendingEvents, nextMinute, currentFixture.homeTeam, currentFixture.awayTeam) : null);
                }, delay);
            }
        };

        runPlaybackTick();

        return () => clearTimeout(timeoutId);
    }, [
        gameState,
        currentPlaybackMinute,
        simulationTargetMinute,
        isLoading,
        matchSpeed,
        currentFixture,
        userTeam,
        matchState,
        pendingEvents,
        teams,
        activeShout,
        userTeamName
    ]); 

    // --- SAVE / LOAD SYSTEM ---
    const saveGame = () => {
        if (advancingRef.current) { setError('Wait for the current week to finish before saving.'); return; }
        if (userTeamName || appScreen === AppScreen.JOB_CENTRE) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket, internationalTournament, incomingBids, careerHistory, tutorialCompletion, hasClubCareer, prologueArchive, availableJobs, relationshipIncidents,
                matchState, pendingEvents, currentPlaybackMinute, simulationTargetMinute,
                version: CAREER_SAVE_VERSION, pressInput, pressQuestionResult, pressProgress, appliedPressEvaluationIds: [...appliedPressEvaluationIdsRef.current]
            };
            try { localStorage.setItem('gfm_save_v1', encodeCareerSave(stateToSave)); } catch { setError('Browser storage could not save this career. The previous save is preserved; free browser storage before continuing.'); return; }
            logger.success("Game Saved Successfully!");
            alert("Game Saved Successfully!");
        }
    };

    useEffect(() => {
        if (advancingRef.current) return;
        if ((userTeamName || appScreen === AppScreen.JOB_CENTRE) && appScreen !== AppScreen.START_SCREEN) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket, internationalTournament, incomingBids, careerHistory, tutorialCompletion, hasClubCareer, prologueArchive, availableJobs, relationshipIncidents,
                matchState, pendingEvents, currentPlaybackMinute, simulationTargetMinute,
                version: CAREER_SAVE_VERSION, pressInput, pressQuestionResult, pressProgress, appliedPressEvaluationIds: [...appliedPressEvaluationIdsRef.current]
            };
            try { localStorage.setItem('gfm_save_v1', encodeCareerSave(stateToSave)); } catch { setError('Browser storage could not save this career. The previous save is preserved; free browser storage before continuing.'); return; }
        }
    }, [advanceRevision, currentWeek, gameState, managerReputation, currentYear, internationalTournament, incomingBids, teams, news, careerHistory, matchState, pendingEvents, currentPlaybackMinute, simulationTargetMinute, transferMarket, pressInput, pressQuestionResult, pressProgress, appScreen, tutorialCompletion, hasClubCareer, prologueArchive, availableJobs, relationshipIncidents]);

    const handleQuit = () => {
        if (advancingRef.current) { setError('Wait for the current week to finish before leaving the career.'); return; }
        careerGenerationRef.current++;
        setAppScreen(AppScreen.START_SCREEN);
        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setUserTeamName(null);
        setCareerHistory([]);
        setHasClubCareer(false);
        setPrologueArchive(null);
        setRelationshipIncidents([]); relationshipsRef.current = [];
        setTeams(ensureTeamAndPlayerFields(structuredClone(allTeams)));
        setTransferMarket(structuredClone(freshFreeAgents));
        setIncomingBids([]);
        setCurrentYear(1);
        setInternationalTournament(null);
        setActiveTheme({ primary: '#1f2937', secondary: '#22c55e', text: '#FFFFFF' }); // Reset theme
    };

    const handleResign = () => {
        if (!userTeamName) return;
        const oldTeam = userTeamName;
        setUserTeamName(undefined);
        
        const nextRep = Math.max(10, Math.round(managerReputation * 0.9));
        setManagerReputation(nextRep);
        
        setNews(prev => [
            {
                id: Date.now(),
                week: currentWeek,
                title: 'Manager Resigns',
                body: `You have resigned from your position as manager of ${oldTeam}. Your reputation has dropped to ${nextRep}.`,
                type: 'player-departure' as const
            },
            ...prev
        ].slice(0, 1000));
        
        generateJobs(nextRep);
    };

    const handleContinue = () => {
        careerGenerationRef.current++;
        const savedData = localStorage.getItem('gfm_save_v1');
        if (savedData) {
            try {
                const parsed = migrateCareerSave(decodeCareerSave(savedData));
                if (!preserveCareerBackup(localStorage, savedData)) logger.warn('Backup storage is full; loading the valid primary career without replacing it.');
                appliedPressEvaluationIdsRef.current = new Set(parsed.appliedPressEvaluationIds);
                setPressInput(parsed.pressInput || null);
                setPressQuestionResult(parsed.pressQuestionResult || null);
                setPressProgress(parsed.pressProgress || null);
                finishedMatchRef.current = null;
                freeAgentSigningKeysRef.current.clear();
                setUserTeamName(parsed.userTeamName);
                setGameMode(parsed.gameMode);
                setIsPrologue(parsed.isPrologue);
                setCurrentWeek(parsed.currentWeek);
                setWeeksInSeason(parsed.weeksInSeason);
                setCurrentYear(parsed.currentYear || 1);
                setInternationalTournament(parsed.internationalTournament || null);
                setTeams(parsed.teams);
                setLeagueTable(parsed.leagueTable);
                setFixtures(parsed.fixtures);
                setNews(parsed.news);
                setWeeklyResults(parsed.weeklyResults);
                setGameState(parsed.gameState);
                const restoredMatchState = parsed.matchState || null;
                setMatchState(restoredMatchState);
                setPendingEvents(Array.isArray(parsed.pendingEvents) ? parsed.pendingEvents : []);
                setCurrentPlaybackMinute(Number.isFinite(parsed.currentPlaybackMinute)
                    ? parsed.currentPlaybackMinute
                    : restoredMatchState?.currentMinute || 0);
                setSimulationTargetMinute(Number.isFinite(parsed.simulationTargetMinute)
                    ? parsed.simulationTargetMinute
                    : restoredMatchState?.currentMinute || 0);
                setManagerReputation(parsed.managerReputation);
                setTutorialCompletion(prev => bestTutorialResult(prev, bestTutorialResult(normalizeTutorialResult(parsed.tutorialCompletion), restoreTutorialHonors(parsed.careerHistory || []))));
                setHasClubCareer(parsed.hasClubCareer ?? (parsed.gameMode === 'Club' && !!parsed.userTeamName));
                setPrologueArchive(parsed.prologueArchive || null);
                setAvailableJobs(parsed.availableJobs || []);
                setRelationshipIncidents(parsed.relationshipIncidents || []); relationshipsRef.current = parsed.relationshipIncidents || [];
                if (parsed.transferMarket) setTransferMarket(parsed.transferMarket);
                if (parsed.incomingBids) setIncomingBids(parsed.incomingBids);
                if (parsed.careerHistory) setCareerHistory(parsed.careerHistory);
                
                if ((parsed.appScreen === AppScreen.PRESS_CONFERENCE && parsed.pressInput && parsed.pressQuestionResult) || parsed.appScreen === AppScreen.GAMEPLAY || parsed.appScreen === AppScreen.JOB_CENTRE) {
                    setAppScreen(parsed.appScreen);
                } else {
                    setAppScreen(AppScreen.GAMEPLAY);
                }

                const f = parsed.fixtures.find((fx: Fixture) => 
                    (fx.homeTeam === parsed.userTeamName || fx.awayTeam === parsed.userTeamName) && fx.week === parsed.currentWeek
                );
                setCurrentFixture(f);

            } catch (e) {
                console.error("Failed to load save", e);
                alert(e instanceof Error ? e.message : "Save file corrupted.");
            }
        }
    };

    const startTutorial = () => { setTutorialStep(0); setShowTutorial(true); };

    const initializeWorldCup = (selectedNationalTeamName: string) => {
        careerGenerationRef.current++;
        setGameMode('WorldCup');
        setIsPrologue(true);
        setManagerReputation(90);
        setHasClubCareer(false);
        setPrologueArchive(null);
        setCareerHistory([]);
        setCurrentYear(1);
        setRelationshipIncidents([]); relationshipsRef.current = [];
        setPressInput(null); setPressQuestionResult(null); setPressProgress(null);
        
        const wcTeamsRecord = hydrateNationalTeamsFromCareer(generateWorldCupStructure(), linkNationalRosterIdentitiesToClubTeams(ensureTeamAndPlayerFields(structuredClone(allTeams))));
        setTeams(wcTeamsRecord);

        let actualTeamName = selectedNationalTeamName;
        if (!wcTeamsRecord[actualTeamName]) {
            const found = Object.keys(wcTeamsRecord).find(k => k.startsWith(selectedNationalTeamName));
            if (found) actualTeamName = found;
        }
        setUserTeamName(actualTeamName);

        const allWcTeams = Object.values(wcTeamsRecord);
        const groupFixtures: Fixture[] = [];
        const groups: Record<string, string[]> = {};
        allWcTeams.forEach((t: Team) => {
            if (t.group) {
                if (!groups[t.group]) groups[t.group] = [];
                groups[t.group].push(t.name);
            }
        });
        Object.entries(groups).forEach(([groupName, teamNames]) => {
            if (teamNames.length === 4) {
                 groupFixtures.push({ id: `g-${groupName}-1-1`, week: 1, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[1], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-1-2`, week: 1, league: 'International', homeTeam: teamNames[2], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-2-1`, week: 2, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-2-2`, week: 2, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-3-1`, week: 3, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-3-2`, week: 3, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
            }
        });
        setWeeksInSeason(8); setFixtures(groupFixtures);
        const initialTable = allWcTeams.map((t: Team) => ({ teamName: t.name, league: 'International' as const, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, group: t.group }));
        setLeagueTable(initialTable);
        setCurrentWeek(1); setGameState(GameState.PRE_MATCH);
        setNews([{ id: Date.now(), week: 1, title: 'World Cup Tutorial Begins', body: 'The verified 2026 World Cup squads enter a simulated 12-group draw. Your finish unlocks RTG clubs; your results create the tournament history carried into that career.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        const week1Fixtures = groupFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === actualTeamName || f.awayTeam === actualTeamName);
        setCurrentFixture(userMatch); setWeeklyResults([]); startTutorial();
    };

    const initializeGame = useCallback((selectedTeamName: string, entry: 'Career' | 'RTG' = 'RTG') => {
        careerGenerationRef.current++;
        const selected = allTeams[selectedTeamName];
        if (!selected) { setError('Club not found.'); return; }
        if (!hasClubCareer && !canEnterClub(selected, tutorialCompletion, entry)) {
            setError(careerGateLabel(tutorialCompletion));
            return;
        }
        if (hasClubCareer && gameMode === 'Club') {
            setUserTeamName(selectedTeamName); setAppScreen(AppScreen.GAMEPLAY);
            setCurrentFixture(fixtures.find(f => f.week === currentWeek && !f.played && (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName)));
            setGameState(GameState.PRE_MATCH); setMatchState(null); setPendingEvents([]); return;
        }
        setGameMode('Club');
        if (!hasClubCareer) setManagerReputation(entry === 'Career' ? selected.prestige : tutorialCompletion?.reputation ?? 15);
        setTransferMarket(structuredClone(freshFreeAgents));
        setIncomingBids([]);
        setIsPrologue(false);
        setHasClubCareer(true);
        if (entry === 'Career') { relationshipsRef.current = []; setRelationshipIncidents([]); }
        const season = createClubSeason(linkNationalRosterIdentitiesToClubTeams(ensureTeamAndPlayerFields(structuredClone(allTeams))));
        let finalTeamsState = season.teams;
        const finalFixtures = season.fixtures;
        setWeeksInSeason(season.weeks);
        setLeagueTable(season.table); setFixtures(finalFixtures); setCurrentWeek(1);
        if (prologueArchive && !hasClubCareer && entry === 'RTG') {
            const played = prologueArchive.fixtures.filter(f => f.played).map(f => ({ ...f, week: 1, tournamentId: 'tutorial-worldcup', year: 1 }));
            const carried = buildRelationshipIncidents({ clubTeams: finalTeamsState, nationalTeams: prologueArchive.teams, fixtures: played, tournamentType: 'WorldCup', year: 1, week: 1, weeksPerYear: season.weeks });
            relationshipsRef.current = carried; setRelationshipIncidents(carried);
            finalTeamsState = applyIncidentEffects(finalTeamsState, carried.flatMap(i => getIncidentEffects(i, { year: 1, week: 1 })));
            setNews(prev => [...carried.filter(i => i.clubName === selectedTeamName).map(relationshipNews), ...prev].slice(0, 1000));
        }
        setTeams(finalTeamsState); setUserTeamName(selectedTeamName); setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName) && f.week === 1));
        startTutorial();
    }, [hasClubCareer, tutorialCompletion, prologueArchive, gameMode, fixtures, currentWeek]);

    const handleCreateManager = (name: string, _exp: ExperienceLevel) => {
        localStorage.setItem('gfm_manager_name', name.trim().slice(0, 80) || 'Manager');
        // Playing background is roleplay, never a free elite-career unlock.
        setHasClubCareer(false);
        setUserTeamName(null);
        setIsPrologue(false);
        setGameMode('Club');
        const initialRep = tutorialCompletion?.reputation ?? 15;
        setManagerReputation(initialRep);
        generateJobs(initialRep, tutorialCompletion);
    };

    const generateJobs = (currentRep: number | ExperienceLevel, completion: TutorialResult | null = tutorialCompletion) => {
        const rep = typeof currentRep === 'number' ? currentRep : managerReputation;
        const allTeamList: Team[] = Object.values(allTeams).filter(t => hasClubCareer || canStartAtClub(t, completion));
        const shuffle = (array: Team[]) => array.sort(() => 0.5 - Math.random());
        let vacancies: Team[] = [];
        const feasible = allTeamList.filter(t => t.prestige <= rep && t.prestige >= rep - 20);
        const reach = allTeamList.filter(t => t.prestige > rep && t.prestige <= rep + 10);
        const safety = allTeamList.filter(t => t.prestige < rep - 20);
        vacancies = [...shuffle(feasible).slice(0, 4), ...shuffle(reach).slice(0, 2), ...shuffle(safety).slice(0, 1)];
        if (vacancies.length === 0) vacancies = shuffle(allTeamList).slice(0, 3);
        const jobs: Job[] = vacancies.map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality }));
        setAvailableJobs(jobs); setAppScreen(AppScreen.JOB_CENTRE);
    }

    const handleApplyForJob = async (teamName: string) => {
        setAppScreen(AppScreen.JOB_INTERVIEW); setIsLoading(true); setInterview(null); setJobOffer(null); setError(null);
        const team = allTeams[teamName];
        if (team && !hasClubCareer && !canStartAtClub(team, tutorialCompletion)) { setError(careerGateLabel(tutorialCompletion)); setIsLoading(false); setAppScreen(AppScreen.JOB_CENTRE); return; }
        if (!team) { setError("Team not found."); setIsLoading(false); return; }
        try {
            const questions = await getInterviewQuestions(teamName, team.chairmanPersonality, team.league);
            setInterview({ teamName: teamName, questions: questions, answers: [], currentQuestionIndex: 0, chairmanPersonality: team.chairmanPersonality });
        } catch (e) { setError("The Chairman refused to meet."); } finally { setIsLoading(false); }
    };

    const handleJobInterviewAnswer = async (answer: string) => {
        if (!interview) return;
        const newAnswers = [...interview.answers, answer];
        if (interview.currentQuestionIndex < interview.questions.length - 1) {
            setInterview({ ...interview, answers: newAnswers, currentQuestionIndex: interview.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            try {
                const result = await evaluateInterview(interview.teamName, interview.questions, newAnswers, interview.chairmanPersonality);
                setJobOffer(result);
            } catch (e) { setError("Evaluation failed."); } finally { setIsLoading(false); }
        }
    };

    const handleTacticChange = (newTactic: Partial<Tactic>) => {
        if (!userTeamName) return;
        setTeams(prev => ({ ...prev, [userTeamName]: { ...prev[userTeamName], tactic: { ...prev[userTeamName].tactic, ...newTactic } } }));
    };

    const handleToggleStarter = (pName: string) => {
        if (!userTeamName) return;
        setTeams(prev => {
            const team = prev[userTeamName];
            const updated = team.players.map(p => p.name === pName ? { ...p, isStarter: !p.isStarter } : p);
            return { ...prev, [userTeamName]: { ...team, players: updated } };
        });
    };

    const handleSwapPlayers = (p1: Player, p2: Player) => {
        if (!userTeamName) return;
        setTeams(prev => {
            const team = prev[userTeamName];
            const players = [...team.players];
            const idx1 = players.findIndex(p => p.name === p1.name);
            const idx2 = players.findIndex(p => p.name === p2.name);
            
            if (idx1 === -1 || idx2 === -1) return prev;

            [players[idx1], players[idx2]] = [players[idx2], players[idx1]];

            const tempStarter = players[idx1].isStarter;
            players[idx1].isStarter = players[idx2].isStarter;
            players[idx2].isStarter = tempStarter;

            return { ...prev, [userTeamName]: { ...team, players } };
        });
    };

    const handleReorderPlayers = (newPlayerOrder: Player[]) => {
        if (!userTeamName) return;
        setTeams(prev => ({ ...prev, [userTeamName]: { ...prev[userTeamName], players: newPlayerOrder } }));
    };

    const handleAdvanceWeek = async () => {
        if (advanceRequestRef.current || advancingRef.current) return;
        advanceRequestRef.current = true;
        try {
        setIsLoading(true);
        if (gameState === GameState.POST_MATCH && matchState && userTeamName && currentFixture) {
            try { 
                const opponentName = currentFixture.homeTeam === userTeamName ? currentFixture.awayTeam : currentFixture.homeTeam;
                const snapshot = buildPressContext(currentFixture, matchState, teams[userTeamName], teams[opponentName], leagueTable, fixtures);
                setPressInput(snapshot);
                setPressProgress(null);
                const result = await generatePressConferenceQuestions(snapshot);
                setPressQuestionResult(result);
                setAppScreen(AppScreen.PRESS_CONFERENCE); 
                setIsLoading(false); 
                return; 
            } catch (e) {
                console.error(e);
            }
        }
        await proceedToNextWeek();
        } finally { advanceRequestRef.current = false; }
    };

    const transitionToClubCareer = (finalReputation: number, tournamentFixtures: Fixture[] = fixtures) => {
        const finish: TutorialFinish = finalReputation >= 100 ? 'Winner' : finalReputation >= 90 ? 'Finalist' : finalReputation >= 85 ? 'Semi Final' : finalReputation >= 80 ? 'Quarter Final' : finalReputation >= 75 ? 'Round of 16' : finalReputation >= 70 ? 'Round of 32' : 'Group Stage';
        const completion = bestTutorialResult(tutorialCompletion, tutorialResult(userTeamName || 'National team', finish));
        setTutorialCompletion(completion);
        const completedTournament = completeTutorialTournament(teams, tournamentFixtures);
        setPrologueArchive({ teams: structuredClone(teams), fixtures: completedTournament.fixtures, champion: completedTournament.champion });
        setCareerHistory(prev => prev.some(h => h.league === 'World Cup') ? prev : [...prev, { year: currentYear, teamName: userTeamName || 'National team', league: 'World Cup', finalPosition: finish, trophies: [] }]);
        setGameMode('Club');
        setIsPrologue(false);
        setHasClubCareer(false);
        setUserTeamName(null);
        setManagerReputation(completion?.reputation ?? finalReputation);
        setCurrentYear(1);
        setCurrentWeek(1);
        setTeams(ensureTeamAndPlayerFields(structuredClone(allTeams)));
        setFixtures([]); setLeagueTable([]); setCurrentFixture(undefined); setMatchState(null); setPendingEvents([]); setGameState(GameState.PRE_MATCH);
        generateJobs(completion?.reputation ?? finalReputation, completion);
    };

    const getWeeklyBroadcastRevenue = (league: LeagueTier, prestige: number): number => {
        if (league === 'Premier League') {
            return 1500000 + prestige * 25000;
        }
        if (['La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(league)) {
            return 1000000 + prestige * 15000;
        }
        if (['Championship', 'MLS'].includes(league)) {
            return 200000 + prestige * 5000;
        }
        return 100000;
    };

    const relationshipNews = (incident: RelationshipIncident): NewsItem => ({
        id: hashSeed(incident.id), week: incident.createdWeek,
        title: incident.kind === 'bond' ? `International bond: ${incident.playerA.name} / ${incident.playerB.name}` : `Return tension: ${incident.playerA.name} / ${incident.playerB.name}`,
        body: `${incident.trigger.homeNation} ${incident.trigger.score} ${incident.trigger.awayNation} · ${incident.trigger.tournamentType} ${incident.trigger.stage}. ${incident.playerA.name}: ${incident.trigger.playerAGoals} goals; ${incident.playerB.name}: ${incident.trigger.playerBGoals} goals. ${incident.trigger.labels.join(', ')}. Impact ${incident.strength}/100 (${incident.severity}).`,
        type: incident.kind === 'bond' ? 'teammate-bond' : incident.severity === 'serious' ? 'serious-rift' : 'chemistry-rift',
        relationshipId: incident.id,
        ...(incident.kind !== 'bond' ? { riftDecision: { riftPlayerA: incident.playerA.name, riftPlayerB: incident.playerB.name, relationshipId: incident.id } } : {}),
    });

    const processTeammateRivalries = (simulatedFixtures: InternationalRelationshipFixture[], week: number, nationalTeams: Record<string, Team>, tournamentType: 'WorldCup' | 'Euros' | 'Friendly') => {
        const current = relationshipsRef.current;
        const stamped = simulatedFixtures.map(f => ({ ...f, tournamentId: f.tournamentId || `${tournamentType}-${currentYear}`, year: currentYear }));
        const next = buildRelationshipIncidents({ clubTeams: teamsRef.current, nationalTeams, fixtures: stamped, tournamentType, year: currentYear, week, weeksPerYear: weeksInSeason, existingIncidents: current });
        const known = new Set(current.map(i => i.id));
        relationshipsRef.current = next; setRelationshipIncidents(next);
        const updates = next.flatMap(i => getIncidentEffects(i, { year: currentYear, week }));
        setTeams(prev => applyIncidentEffects(prev, updates));
        setNews(prev => [...next.filter(i => !known.has(i.id) && i.clubName === userTeamName).map(relationshipNews), ...prev].slice(0, 1000));
    };

    const advanceClubRelationships = (year: number, week: number, appearances?: { fixture: Fixture; events: MatchEvent[] }[]) => {
        const previous = relationshipsRef.current;
        const results = previous.map(i => advanceRelationship(i, { year, week, ...(appearances?.some(a => pairPlayedTogether(a.fixture, a.events, i.clubName, i.playerA.name, i.playerB.name)) ? { selectedPlayerKeys: [i.playerA.key, i.playerB.key] } : {}) }));
        const next = results.map(r => r.incident);
        relationshipsRef.current = next; setRelationshipIncidents(next);
        setTeams(prev => applyIncidentEffects(prev, results.flatMap(r => r.effects)));
        const transferred = next.filter(i => i.transferRequestedPlayerKeys.length > (previous.find(p => p.id === i.id)?.transferRequestedPlayerKeys.length || 0) && i.clubName === userTeamName);
        setNews(prev => [...transferred.map(i => ({ id: hashSeed(`${i.id}|transfer-request`), week, title: 'Unresolved rift: transfer requested', body: `${i.playerA.name} / ${i.playerB.name}: repeated co-selection under serious unresolved tension has produced a transfer request. Separation or roster changes may be required.`, type: 'player-departure', relationshipId: i.id })), ...prev].slice(0, 1000));
    };

    useEffect(() => {
        if (gameMode === 'Club' && relationshipsRef.current.length) advanceClubRelationships(currentYear, currentWeek);
    }, [currentYear, currentWeek, gameMode]);

    const runFriendlyInternationalBreak = (week: number) => {
        const nationalTeams = hydrateNationalTeamsFromCareer(generateWorldCupStructure(), teamsRef.current);
        const names = Object.keys(nationalTeams).sort((a, b) => hashSeed(`${currentYear}|${week}|${a}`) - hashSeed(`${currentYear}|${week}|${b}`));
        const played = [];
        for (let i = 0; i + 1 < names.length; i += 2) {
            const id = `friendly-${currentYear}-${week}-${i}`;
            const result = simulateQuickMatch(nationalTeams[names[i]], nationalTeams[names[i + 1]], id);
            played.push({ id, week, league: 'International' as const, homeTeam: names[i], awayTeam: names[i + 1], played: true, score: `${result.homeGoals}-${result.awayGoals}`, events: result.events, participantNames: result.participantNames, goalkeeperNames: result.goalkeeperNames });
        }
        processTeammateRivalries(played, week, nationalTeams, 'Friendly');
        setInternationalTournament({ type: 'Friendly', teams: nationalTeams, fixtures: played, leagueTable: [] });
        setNews(prev => [{ id: hashSeed(`international-return-${currentYear}-${week}`), week, title: 'International break: return report', body: `${played.length} simulated international friendlies completed. Actual selected players and scorer events are retained; squad incidents appear below. Roster source pool: ${NATIONAL_ROSTER_SNAPSHOT_DATE}; this is a game simulation, not live football results.`, type: 'tournament-result' }, ...prev].slice(0, 1000));
    };

    const simulateKnockoutRoundBackground = (
        koFixtures: Fixture[],
        teamsRecord: Record<string, Team>
    ): { simulated: Fixture[], winners: string[] } => {
        const simulated: Fixture[] = [];
        const winners: string[] = [];
        koFixtures.forEach(f => {
            const res = simulateKnockoutQuickMatch(teamsRecord[f.homeTeam], teamsRecord[f.awayTeam], f.id);
            simulated.push({
                ...f,
                played: true,
                score: `${res.homeGoals}-${res.awayGoals}`,
                penaltyWinner: res.penaltyWinner, penalties: res.penalties, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames
            });
            const isHomeWinner = res.penaltyWinner ? res.penaltyWinner === 'home' : res.homeGoals > res.awayGoals;
            winners.push(isHomeWinner ? f.homeTeam : f.awayTeam);
        });
        return { simulated, winners };
    };

    const runBackgroundTournamentWeek10 = async (tournamentType: 'Euros' | 'WorldCup') => {
        const intTeams = hydrateNationalTeamsFromCareer(tournamentType === 'Euros' ? generateEurosStructure() : generateExpandedWorldCupStructure(), teamsRef.current);
        const groups = tournamentType === 'Euros' 
            ? ['A', 'B', 'C', 'D', 'E', 'F'] 
            : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
        
        const intFixtures: Fixture[] = [];
        const intTable: LeagueTableEntry[] = Object.values(intTeams).map(t => ({
            teamName: t.name,
            league: 'International',
            played: 0, won: 0, drawn: 0, lost: 0,
            goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
            points: 0,
            group: t.group
        }));

        const groupsMap: Record<string, string[]> = {};
        Object.values(intTeams).forEach(t => {
            if (t.group) {
                if (!groupsMap[t.group]) groupsMap[t.group] = [];
                groupsMap[t.group].push(t.name);
            }
        });
        
        Object.entries(groupsMap).forEach(([groupName, teamNames]) => {
            if (teamNames.length === 4) {
                intFixtures.push({ id: `int-g-${groupName}-1-1`, week: 10, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[1], played: false, stage: 'Group Stage' });
                intFixtures.push({ id: `int-g-${groupName}-1-2`, week: 10, league: 'International', homeTeam: teamNames[2], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                intFixtures.push({ id: `int-g-${groupName}-2-1`, week: 10, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
                intFixtures.push({ id: `int-g-${groupName}-2-2`, week: 10, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                intFixtures.push({ id: `int-g-${groupName}-3-1`, week: 10, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                intFixtures.push({ id: `int-g-${groupName}-3-2`, week: 10, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
            }
        });

        const updateIntTeam = (table: LeagueTableEntry[], name: string, goalsFor: number, goalsAgainst: number) => {
            const idx = table.findIndex(t => t.teamName === name);
            if (idx !== -1) {
                const t = { ...table[idx] };
                t.played++;
                t.goalsFor += goalsFor;
                t.goalsAgainst += goalsAgainst;
                t.goalDifference = t.goalsFor - t.goalsAgainst;
                if (goalsFor > goalsAgainst) { t.won++; t.points += 3; }
                else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; }
                else { t.lost++; }
                table[idx] = t;
            }
        };

        const simulatedFixtures = intFixtures.map(f => {
            const res = simulateQuickMatch(intTeams[f.homeTeam], intTeams[f.awayTeam], f.id);
            updateIntTeam(intTable, f.homeTeam, res.homeGoals, res.awayGoals);
            updateIntTeam(intTable, f.awayTeam, res.awayGoals, res.homeGoals);
            return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames };
        });

        let qualifiedTeams: string[] = [];
        if (tournamentType === 'Euros') {
            const { top2, bestThird } = extractAdvancingTeams(intTable, groups, 4);
            qualifiedTeams = [...top2, ...bestThird];
            qualifiedTeams = sortQualifiedTeams(intTable, qualifiedTeams);
        } else {
            const { top2 } = extractAdvancingTeams(intTable, groups, 0);
            qualifiedTeams = sortQualifiedTeams(intTable, top2);
        }

        const nextStage = tournamentType === 'Euros' ? 'Round of 16' : 'Round of 32';
        const koFixtures = generateSeededKnockoutRound(qualifiedTeams, 20, nextStage);

        setInternationalTournament({
            type: tournamentType,
            teams: intTeams,
            fixtures: [...simulatedFixtures, ...koFixtures],
            leagueTable: intTable
        });

        await processTeammateRivalries(simulatedFixtures, 10, intTeams, tournamentType);

        const newsBody = `The ${tournamentType} Group Stage has finished! A total of ${simulatedFixtures.length} matches were simulated in the background. ${qualifiedTeams.length} teams qualify for the knockout stage.`;
        setNews(prev => [{
            id: Date.now(),
            week: 10,
            title: `${tournamentType} Group Stage Completed`,
            body: newsBody,
            type: 'tournament-result'
        }, ...prev]);
    };

    const runBackgroundTournamentWeek20 = async () => {
        if (!internationalTournament) return;
        const currentTourney = { ...internationalTournament };
        const allNewFixtures = [...currentTourney.fixtures];
        
        if (currentTourney.type === 'Euros') {
            const r16Fixtures = currentTourney.fixtures.filter(f => f.week === 20 && f.stage === 'Round of 16');
            const { simulated: simR16, winners: r16Winners } = simulateKnockoutRoundBackground(r16Fixtures, currentTourney.teams);
            
            const qfFixtures = generateSeededKnockoutRound(r16Winners, 20, 'Quarter Final');
            const { simulated: simQF, winners: qfWinners } = simulateKnockoutRoundBackground(qfFixtures, currentTourney.teams);
            
            const sfFixtures = generateSeededKnockoutRound(qfWinners, 30, 'Semi Final');
            
            const filteredFixtures = allNewFixtures.filter(f => !(f.week === 20 && f.stage === 'Round of 16'));
            allNewFixtures.length = 0;
            allNewFixtures.push(...filteredFixtures, ...simR16, ...simQF, ...sfFixtures);
            
            currentTourney.fixtures = allNewFixtures;
            setInternationalTournament(currentTourney);

            await processTeammateRivalries(simR16, 20, currentTourney.teams, currentTourney.type);
            await processTeammateRivalries(simQF, 20, currentTourney.teams, currentTourney.type);

            const body = `Euros Quarter-Finals completed! Advancing to the Semi-Finals: ${qfWinners.join(', ')}`;
            setNews(prev => [{
                id: Date.now(),
                week: 20,
                title: 'Euros Semi-Finalists Confirmed',
                body,
                type: 'tournament-result'
            }, ...prev]);
        } else {
            const r32Fixtures = currentTourney.fixtures.filter(f => f.week === 20 && f.stage === 'Round of 32');
            const { simulated: simR32, winners: r32Winners } = simulateKnockoutRoundBackground(r32Fixtures, currentTourney.teams);
            
            const r16Fixtures = generateSeededKnockoutRound(r32Winners, 20, 'Round of 16');
            const { simulated: simR16, winners: r16Winners } = simulateKnockoutRoundBackground(r16Fixtures, currentTourney.teams);
            
            const qfFixtures = generateSeededKnockoutRound(r16Winners, 20, 'Quarter Final');
            const { simulated: simQF, winners: qfWinners } = simulateKnockoutRoundBackground(qfFixtures, currentTourney.teams);
            
            const sfFixtures = generateSeededKnockoutRound(qfWinners, 30, 'Semi Final');
            
            const filteredFixtures = allNewFixtures.filter(f => !(f.week === 20 && f.stage === 'Round of 32'));
            allNewFixtures.length = 0;
            allNewFixtures.push(...filteredFixtures, ...simR32, ...simR16, ...simQF, ...sfFixtures);
            
            currentTourney.fixtures = allNewFixtures;
            setInternationalTournament(currentTourney);

            await processTeammateRivalries(simR32, 20, currentTourney.teams, currentTourney.type);
            await processTeammateRivalries(simR16, 20, currentTourney.teams, currentTourney.type);
            await processTeammateRivalries(simQF, 20, currentTourney.teams, currentTourney.type);

            const body = `World Cup Quarter-Finals completed! Advancing to the Semi-Finals: ${qfWinners.join(', ')}`;
            setNews(prev => [{
                id: Date.now(),
                week: 20,
                title: 'World Cup Semi-Finalists Confirmed',
                body,
                type: 'tournament-result'
            }, ...prev]);
        }
    };

    const runBackgroundTournamentWeek30 = async () => {
        if (!internationalTournament) return;
        const currentTourney = { ...internationalTournament };
        const allNewFixtures = [...currentTourney.fixtures];
        
        const sfFixtures = currentTourney.fixtures.filter(f => f.week === 30 && f.stage === 'Semi Final');
        const { simulated: simSF, winners: sfWinners } = simulateKnockoutRoundBackground(sfFixtures, currentTourney.teams);
        
        const finalFixtures = generateSeededKnockoutRound(sfWinners, 30, 'Final');
        const { simulated: simFinal, winners: finalWinner } = simulateKnockoutRoundBackground(finalFixtures, currentTourney.teams);
        
        const filteredFixtures = allNewFixtures.filter(f => !(f.week === 30 && f.stage === 'Semi Final'));
        allNewFixtures.length = 0;
        allNewFixtures.push(...filteredFixtures, ...simSF, ...simFinal);
        
        currentTourney.fixtures = allNewFixtures;
        setInternationalTournament(currentTourney);

        await processTeammateRivalries(simSF, 30, currentTourney.teams, currentTourney.type);
        await processTeammateRivalries(simFinal, 30, currentTourney.teams, currentTourney.type);

        const champion = finalWinner[0];
        const newsBody = `The tournament is over! ${champion} are the champions of the ${currentTourney.type}! They defeated ${sfWinners.find(w => w !== champion)} in the Final.`;
        setNews(prev => [{
            id: Date.now(),
            week: 30,
            title: `${champion} Wins the ${currentTourney.type}!`,
            body: newsBody,
            type: 'tournament-result'
        }, ...prev]);
        
    };

    const requestPressQuestions = async () => {
        if (!pressInput) return;
        setIsLoading(true);
        setPressQuestionResult(await generatePressConferenceQuestions(pressInput));
        setIsLoading(false);
    };

    const handleFinishPressConference = (report: PressConferenceReport) => {
        const transition = applyPressConferenceTransition<Player, Team>({ managerReputation, teams, userTeamName: userTeamName || null, appliedEvaluationIds: [...appliedPressEvaluationIdsRef.current] }, report);
        if (!transition.applied) return;
        appliedPressEvaluationIdsRef.current = new Set(transition.appliedEvaluationIds);
        setManagerReputation(transition.managerReputation);
        setTeams(transition.teams);
        setNews(prev => [{ id: Date.now(), week: currentWeek, title: `${report.newspaperName}: ${report.headline}`, body: `${report.article}\n\nEditorial basis: ${report.effectRationale}\nApplied reputation: ${transition.effects.managerReputationDelta >= 0 ? '+' : ''}${transition.effects.managerReputationDelta}. Starter form: ${report.squadFormChange >= 0 ? '+' : ''}${report.squadFormChange}.\n${report.answerAssessments.map(a => `"${a.evidenceQuote}" — ${a.disposition}: ${a.explanation}`).join('\n')}`, type: 'press' as const }, ...prev].slice(0, 1000));
        setPressInput(null); setPressQuestionResult(null); setPressProgress(null);
        void proceedToNextWeek({ teams: transition.teams, managerReputation: transition.managerReputation });
    };

    const proceedToNextWeek = async (snapshot?: { teams: Record<string, Team>; managerReputation: number }) => {
        const advanceKey = `${careerGenerationRef.current}:${currentYear}:${currentWeek}`;
        if (advancingRef.current || committedWeekRef.current === advanceKey) return;
        advancingRef.current = true;
        const before = structuredClone({ teams: snapshot?.teams || teams, leagueTable, fixtures, news, weeklyResults, currentYear, currentWeek, incomingBids, transferMarket, careerHistory, internationalTournament, relationshipIncidents, reputation: snapshot?.managerReputation ?? managerReputation });
        setIsLoading(true);
        try {
        const activeTeams = snapshot?.teams || teams;
        const activeManagerReputation = snapshot?.managerReputation ?? managerReputation;
        if (shouldRollClubSeason(gameMode, currentWeek, weeksInSeason)) {
            if (fixtures.some(f => !f.played && f.week <= weeksInSeason)) throw new Error('Season has unresolved fixtures. Rollover blocked to preserve results.');
            if (gameMode === 'Club') {
                const season = createClubSeason(activeTeams, fixtures);
                const nextYear = currentYear + 1;
                setCurrentYear(nextYear);
                committedWeekRef.current = advanceKey;
                setCurrentWeek(1);
                setLeagueTable(season.table);
                setFixtures(season.fixtures);
                setWeeksInSeason(season.weeks);
                const finalTeamsState = season.teams;

                // --- End-of-season Board Evaluation & Sacking Checks ---
                const clubLeague = userTeamName ? activeTeams[userTeamName]?.league : undefined;
                const finalStandings = clubLeague === 'MLS' ? getMLSStandings(Object.values(activeTeams), fixtures) : leagueTable.filter(t => t.league === clubLeague).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                const finalPosition = finalStandings.findIndex(t => t.teamName === userTeamName) + 1;
                const userClub = userTeamName ? finalTeamsState[userTeamName] : undefined;
                let isSacked = false;
                let sackMessage = '';

                const getTargetPosition = (objective: string): number => {
                    if (objective.includes('Win the League') || objective.includes('Win Everything')) return 1;
                    if (objective.includes('Finish Top 2')) return 2;
                    if (objective.includes('Finish Top 4') || objective.includes('Qualify for Champions League')) return 4;
                    if (objective.includes('Qualify for Europe')) return 6;
                    if (objective.includes('Mid-table Finish')) return 10;
                    if (objective.includes('Avoid Relegation')) return 17;
                    if (objective.includes('Promotion')) return 2;
                    return 10;
                };

                const departures: string[] = [];

                if (userClub && userClub.league !== 'International') {
                    // Board evaluation is not a promotion/relegation engine; do not claim movement into absent divisions.
                    {
                        const objective = userClub.objectives?.[0] || 'Mid-table Finish';
                        const targetPos = getTargetPosition(objective);
                        const gap = finalPosition - targetPos;

                        if (gap > 0) {
                            const sackingIndex = gap * 15 + (100 - activeManagerReputation) * 0.5;
                            if (sackingIndex >= 65) {
                                isSacked = true;
                                sackMessage = `Sacked: You finished in position ${finalPosition}, missing your board's target of ${targetPos} (${objective}). Due to poor performance and low confidence, you have been sacked.`;
                            } else {
                                const repLoss = gap * 5;
                                setManagerReputation(r => Math.max(0, r - repLoss));
                                departures.push(`Board Warning: The board is disappointed you finished ${finalPosition} (Target: ${targetPos}). You have been given a final warning.`);
                            }
                        } else {
                            setManagerReputation(r => Math.min(100, r + 5));
                            departures.push(`Board Praise: The board is thrilled with your ${finalPosition} finish (Target: ${targetPos}) and has boosted your transfer credibility.`);
                        }
                    }
                }

                // Apply player updates (aging, contracts, retirement)
                const nextYearTeams = { ...finalTeamsState };
                const releasedFreeAgents: Player[] = [];
                Object.keys(nextYearTeams).forEach(tName => {
                    const team = nextYearTeams[tName];
                    if (team.league !== 'International') {
                        team.players = team.players.map(p => {
                            const updated = { ...p };
                            if (p.stats && p.stats.appearances > 0) {
                                const history = p.history ? [...p.history] : [];
                                history.push({
                                    year: currentYear,
                                    teamName: team.name,
                                    appearances: p.stats.appearances,
                                    goals: p.stats.goals,
                                    cleanSheets: p.stats.cleanSheets,
                                    averageRating: p.stats.averageRating
                                });
                                updated.history = history;
                            }
                            updated.stats = undefined;
                            return updated;
                        }).filter(p => {
                            const remainingContracts = p.contractExpires - 1;
                            if (remainingContracts <= 0) {
                                departures.push(`Free Agent: ${p.name} leaves ${team.name} following contract expiration.`);
                                releasedFreeAgents.push(toFreeAgent({ ...p, age: p.age + 1 }));
                                return false;
                            }
                            p.contractExpires = remainingContracts;

                            p.age = p.age + 1;

                            if (p.age >= 35) {
                                const retireChance = p.age === 35 ? 0.20 : p.age === 36 ? 0.40 : p.age === 37 ? 0.60 : 0.80;
                                if (Math.random() < retireChance) {
                                    departures.push(`Retirement: ${p.name} (${team.name}) retires from professional football at age ${p.age}.`);
                                    return false;
                                }
                            }
                            return true;
                        });
                    }
                });
                setTeams(nextYearTeams);
                setTransferMarket(prev => mergeFreeAgentsIntoMarket(prev, releasedFreeAgents, Object.values(nextYearTeams).flatMap(team => team.players)));

                if (isSacked) {
                    const nextRep = Math.max(10, Math.round(activeManagerReputation * 0.8));
                    setManagerReputation(nextRep);
                    setUserTeamName(null);
                    
                    const departureNews = departures.map((text, idx) => ({
                        id: Date.now() + idx + 1,
                        week: 1,
                        title: text.startsWith('Retirement') ? 'Player Retirement' : 'Contract Expired',
                        body: text,
                        type: 'player-departure' as const
                    }));

                    setNews(prev => [
                        {
                            id: Date.now(),
                            week: 1,
                            title: 'Manager Sacked!',
                            body: sackMessage,
                            type: 'serious-rift' as const
                        },
                        ...departureNews,
                        ...prev
                    ].slice(0, 1000));

                    const honorsEntry = {
                        year: currentYear,
                        teamName: userTeamName,
                        league: userClub ? userClub.league : 'Club League',
                        finalPosition: `${finalPosition} (Sacked)`,
                        trophies: userClub?.league === 'MLS' ? getMLSSeasonHonors(Object.values(activeTeams), fixtures, userClub.name) : []
                    };
                    setCareerHistory(prev => [...prev, honorsEntry]);
                    
                    generateJobs(nextRep);
                    setCurrentFixture(undefined); setMatchState(null); setGameState(GameState.PRE_MATCH);
                    setIsLoading(false);
                    return;
                }

                if (userClub && userClub.league !== 'International') {
                    const finalPositionOrdinal = finalPosition === 1 ? '1st' : finalPosition === 2 ? '2nd' : finalPosition === 3 ? '3rd' : `${finalPosition}th`;
                    const trophiesWon: string[] = [];
                    if (userClub.league === 'MLS') trophiesWon.push(...getMLSSeasonHonors(Object.values(activeTeams), fixtures, userClub.name));
                    else if (finalPosition === 1) trophiesWon.push(`${userClub.league} Champion`);
                    const honorsEntry = {
                        year: currentYear,
                        teamName: userTeamName,
                        league: userClub.league,
                        finalPosition: finalPositionOrdinal,
                        trophies: trophiesWon
                    };
                    setCareerHistory(prev => [...prev, honorsEntry]);
                }

                const finalFixtures = season.fixtures;
                setCurrentFixture(finalFixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === 1));
                setMatchState(null);
                setGameState(GameState.PRE_MATCH);

                const departureNews = departures.map((text, idx) => ({
                    id: Date.now() + idx + 1,
                    week: 1,
                    title: text.startsWith('Retirement') ? 'Player Retirement' : 'Contract Expired',
                    body: text,
                    type: 'player-departure' as const
                }));

                setNews(prev => [
                    {
                        id: Date.now(),
                        week: 1,
                        title: `Welcome to Year ${nextYear}!`,
                        body: `The new domestic and European campaign has officially kicked off. Good luck!`,
                        type: 'tournament-result'
                    },
                    ...departureNews,
                    ...prev
                ].slice(0, 1000));

                setIsLoading(false);
                return;
            } else {
                setAppScreen(AppScreen.START_SCREEN);
                return;
            }
        }

        const nextW = currentWeek + 1;
        const results: Fixture[] = [];
        let updatedTable = [...leagueTable];
        const updateTeam = (table: any[], name: string, goalsFor: number, goalsAgainst: number, league: string) => {
            const idx = table.findIndex(t => t.teamName === name && t.league === league);
            if (idx !== -1) { 
                const t = { ...table[idx] }; 
                t.played++; 
                t.goalsFor += goalsFor; 
                t.goalsAgainst += goalsAgainst; 
                t.goalDifference = t.goalsFor - t.goalsAgainst; 
                if (goalsFor > goalsAgainst) { t.won++; t.points += 3; } 
                else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; } 
                else { t.lost++; } 
                table[idx] = t;
            }
        };

        const nextFixtures = fixtures.map(f => {
            if (!f.played && f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName) {
                if (isMLSPlayoffFixture(f)) {
                    const resolved = resolveMLSPlayoffMatch(f, activeTeams[f.homeTeam], activeTeams[f.awayTeam]);
                    results.push(resolved); return resolved;
                } else if (f.isKnockout) {
                    const res = simulateKnockoutQuickMatch(activeTeams[f.homeTeam], activeTeams[f.awayTeam], f.id);
                    results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, penaltyWinner: res.penaltyWinner, penalties: res.penalties, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames });
                    return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, penaltyWinner: res.penaltyWinner, penalties: res.penalties, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames };
                } else {
                    const res = simulateQuickMatch(activeTeams[f.homeTeam], activeTeams[f.awayTeam], f.id);
                    results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames });
                    updateTeam(updatedTable, f.homeTeam, res.homeGoals, res.awayGoals, f.league);
                    updateTeam(updatedTable, f.awayTeam, res.awayGoals, res.homeGoals, f.league);
                    return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, events: res.events, participantNames: res.participantNames, goalkeeperNames: res.goalkeeperNames };
                }
            }
            if (!f.played && f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && matchState?.isFinished) {
                return { 
                    ...f, 
                    played: true, 
                    score: `${matchState.homeScore}-${matchState.awayScore}`,
                    penaltyWinner: matchState.penaltyWinner as 'home' | 'away' | undefined, penalties: matchState.penalties,
                    events: matchState.events,
                    participantNames: mergeMatchParticipants(f, matchState.events, teams[f.homeTeam], teams[f.awayTeam]),
                    goalkeeperNames: f.goalkeeperNames || { home: teams[f.homeTeam].players.find(p => p.isStarter && p.position === 'GK')?.name, away: teams[f.awayTeam].players.find(p => p.isStarter && p.position === 'GK')?.name },
                };
            }
            return f;
        });

        if (gameMode === 'Club') {
            let playoffWeek = nextW;
            while ((CL_RESERVED_WEEKS as readonly number[]).includes(playoffWeek)) playoffWeek++;
            const additions = generateMLSPlayoffFixtures(Object.values(activeTeams), nextFixtures, playoffWeek);
            nextFixtures.push(...additions);
            if (additions.length) setWeeksInSeason(previous => Math.max(previous, getDomesticSeasonLength(nextFixtures) + 1));
        }

        // --- World Cup Prologue Knockout Generation ---
        if (gameMode === 'WorldCup' && isPrologue) {
            if (currentWeek === 3) {
                const { top2, bestThird } = extractAdvancingTeams(updatedTable, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], 8);
                const qualified = [...top2, ...bestThird];
                if (!userTeamName || !qualified.includes(userTeamName)) {
                    const finalRep = Math.max(0, 90 - 25);
                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: 'Heartbreak! Group Stage Exit',
                        body: `Your World Cup campaign with ${userTeamName} ends in the Group Stage. You have been sacked and will need to find a club job.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }

                const sorted = sortQualifiedTeams(updatedTable, qualified);
                const r32Fixtures = generateSeededKnockoutRound(sorted, 4, 'Round of 32');
                nextFixtures.push(...r32Fixtures);
                setNews(prev => [{
                    id: Date.now(),
                    week: nextW,
                    title: 'Qualified for Round of 32!',
                    body: `Congratulations! ${userTeamName} has progressed to the knockout stage. Your opponent is set.`,
                    type: 'tournament-result'
                }, ...prev]);
            }
            else if (currentWeek === 4) {
                const userFixture = nextFixtures.find(f => f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                if (!userFixture) return;

                const isHome = userFixture.homeTeam === userTeamName;
                const score = userFixture.score || '0-0';
                const [h, a] = score.split('-').map(Number);
                let won = false;
                if (h > a) won = isHome;
                else if (a > h) won = !isHome;
                else won = (userFixture.penaltyWinner === (isHome ? 'home' : 'away'));

                if (!won) {
                    const finalRep = Math.max(0, 90 - 20);
                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: 'Knocked Out in Round of 32',
                        body: `Your World Cup campaign with ${userTeamName} ends in the Round of 32. You transition to your club management career.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }

                const roundFixtures = nextFixtures.filter(f => f.week === currentWeek && f.stage === 'Round of 32');
                roundFixtures.sort((a, b) => a.id.localeCompare(b.id));
                const winners: string[] = [];
                roundFixtures.forEach(f => {
                    const s = f.score || '0-0';
                    const [hw, aw] = s.split('-').map(Number);
                    if (hw > aw) winners.push(f.homeTeam);
                    else if (aw > hw) winners.push(f.awayTeam);
                    else winners.push(f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam);
                });

                const r16Fixtures = [];
                for (let i = 0; i < winners.length; i += 2) {
                    r16Fixtures.push({
                        id: `ko_Round of 16_5_${i / 2}`,
                        week: 5,
                        league: 'International' as const,
                        homeTeam: winners[i],
                        awayTeam: winners[i + 1],
                        played: false,
                        stage: 'Round of 16' as const,
                        isKnockout: true
                    });
                }
                nextFixtures.push(...r16Fixtures);
                setNews(prev => [{
                    id: Date.now(),
                    week: nextW,
                    title: 'Qualified for Round of 16!',
                    body: `Superb! ${userTeamName} advances to the Round of 16.`,
                    type: 'tournament-result'
                }, ...prev]);
            }
            else if (currentWeek === 5) {
                const userFixture = nextFixtures.find(f => f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                if (!userFixture) return;

                const isHome = userFixture.homeTeam === userTeamName;
                const score = userFixture.score || '0-0';
                const [h, a] = score.split('-').map(Number);
                let won = false;
                if (h > a) won = isHome;
                else if (a > h) won = !isHome;
                else won = (userFixture.penaltyWinner === (isHome ? 'home' : 'away'));

                if (!won) {
                    const finalRep = Math.max(0, 90 - 15);
                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: 'Knocked Out in Round of 16',
                        body: `Your World Cup campaign with ${userTeamName} ends in the Round of 16. You transition to your club management career.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }

                const roundFixtures = nextFixtures.filter(f => f.week === currentWeek && f.stage === 'Round of 16');
                roundFixtures.sort((a, b) => a.id.localeCompare(b.id));
                const winners: string[] = [];
                roundFixtures.forEach(f => {
                    const s = f.score || '0-0';
                    const [hw, aw] = s.split('-').map(Number);
                    if (hw > aw) winners.push(f.homeTeam);
                    else if (aw > hw) winners.push(f.awayTeam);
                    else winners.push(f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam);
                });

                const qfFixtures = [];
                for (let i = 0; i < winners.length; i += 2) {
                    qfFixtures.push({
                        id: `ko_Quarter Final_6_${i / 2}`,
                        week: 6,
                        league: 'International' as const,
                        homeTeam: winners[i],
                        awayTeam: winners[i + 1],
                        played: false,
                        stage: 'Quarter Final' as const,
                        isKnockout: true
                    });
                }
                nextFixtures.push(...qfFixtures);
                setNews(prev => [{
                    id: Date.now(),
                    week: nextW,
                    title: 'Qualified for Quarter-Finals!',
                    body: `Incredible stuff! ${userTeamName} has reached the final 8.`,
                    type: 'tournament-result'
                }, ...prev]);
            }
            else if (currentWeek === 6) {
                const userFixture = nextFixtures.find(f => f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                if (!userFixture) return;

                const isHome = userFixture.homeTeam === userTeamName;
                const score = userFixture.score || '0-0';
                const [h, a] = score.split('-').map(Number);
                let won = false;
                if (h > a) won = isHome;
                else if (a > h) won = !isHome;
                else won = (userFixture.penaltyWinner === (isHome ? 'home' : 'away'));

                if (!won) {
                    const finalRep = Math.max(0, 90 - 10);
                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: 'Knocked Out in Quarter-Finals',
                        body: `Your World Cup campaign with ${userTeamName} ends in the Quarter-Finals. You transition to your club management career.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }

                const roundFixtures = nextFixtures.filter(f => f.week === currentWeek && f.stage === 'Quarter Final');
                roundFixtures.sort((a, b) => a.id.localeCompare(b.id));
                const winners: string[] = [];
                roundFixtures.forEach(f => {
                    const s = f.score || '0-0';
                    const [hw, aw] = s.split('-').map(Number);
                    if (hw > aw) winners.push(f.homeTeam);
                    else if (aw > hw) winners.push(f.awayTeam);
                    else winners.push(f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam);
                });

                const sfFixtures = [];
                for (let i = 0; i < winners.length; i += 2) {
                    sfFixtures.push({
                        id: `ko_Semi Final_7_${i / 2}`,
                        week: 7,
                        league: 'International' as const,
                        homeTeam: winners[i],
                        awayTeam: winners[i + 1],
                        played: false,
                        stage: 'Semi Final' as const,
                        isKnockout: true
                    });
                }
                nextFixtures.push(...sfFixtures);
                setNews(prev => [{
                    id: Date.now(),
                    week: nextW,
                    title: 'Qualified for Semi-Finals!',
                    body: `Breath-taking! ${userTeamName} is in the final 4.`,
                    type: 'tournament-result'
                }, ...prev]);
            }
            else if (currentWeek === 7) {
                const userFixture = nextFixtures.find(f => f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                if (!userFixture) return;

                const isHome = userFixture.homeTeam === userTeamName;
                const score = userFixture.score || '0-0';
                const [h, a] = score.split('-').map(Number);
                let won = false;
                if (h > a) won = isHome;
                else if (a > h) won = !isHome;
                else won = (userFixture.penaltyWinner === (isHome ? 'home' : 'away'));

                if (!won) {
                    const finalRep = Math.max(0, 90 - 5);
                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: 'Knocked Out in Semi-Finals',
                        body: `Your World Cup campaign with ${userTeamName} ends in the Semi-Finals. You transition to your club management career.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }

                const roundFixtures = nextFixtures.filter(f => f.week === currentWeek && f.stage === 'Semi Final');
                roundFixtures.sort((a, b) => a.id.localeCompare(b.id));
                const winners: string[] = [];
                roundFixtures.forEach(f => {
                    const s = f.score || '0-0';
                    const [hw, aw] = s.split('-').map(Number);
                    if (hw > aw) winners.push(f.homeTeam);
                    else if (aw > hw) winners.push(f.awayTeam);
                    else winners.push(f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam);
                });

                const finalFixtures = [{
                    id: `ko_Final_8_0`,
                    week: 8,
                    league: 'International' as const,
                    homeTeam: winners[0],
                    awayTeam: winners[1],
                    played: false,
                    stage: 'Final' as const,
                    isKnockout: true
                }];
                nextFixtures.push(...finalFixtures);
                setNews(prev => [{
                    id: Date.now(),
                    week: nextW,
                    title: 'Qualified for the Final!',
                    body: `Astonishing! ${userTeamName} has reached the World Cup Final!`,
                    type: 'tournament-result'
                }, ...prev]);
            }
            else if (currentWeek === 8) {
                const userFixture = nextFixtures.find(f => f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                if (userFixture) {
                    const isHome = userFixture.homeTeam === userTeamName;
                    const score = userFixture.score || '0-0';
                    const [h, a] = score.split('-').map(Number);
                    let won = false;
                    if (h > a) won = isHome;
                    else if (a > h) won = !isHome;
                    else won = (userFixture.penaltyWinner === (isHome ? 'home' : 'away'));

                    const finalRep = won ? 100 : 90;
                    const honorsEntry = {
                        year: 1,
                        teamName: userTeamName,
                        league: 'World Cup',
                        finalPosition: won ? 'Winner' : 'Runners-up',
                        trophies: won ? ['World Cup Champion'] : []
                    };
                    setCareerHistory([honorsEntry]);

                    setNews(prev => [{
                        id: Date.now(),
                        week: currentWeek,
                        title: won ? 'WORLD CHAMPIONS!' : 'World Cup Runners-up',
                        body: won 
                            ? `Incredible! You led ${userTeamName} to World Cup glory! Your managerial career is off to a flying start.`
                            : `So close! ${userTeamName} finished as World Cup runners-up. Your managerial career is off to a strong start.`,
                        type: 'tournament-result'
                    }, ...prev]);
                    transitionToClubCareer(finalRep, nextFixtures);
                    setIsLoading(false);
                    return;
                }
            }
        }
        
        setFixtures(nextFixtures);
        setLeagueTable(updatedTable);

        let updatedBids = [...incomingBids];

        // --- Increment pending weeks on current bids and filter expired ones ---
        updatedBids = updatedBids.map(b => ({ ...b, weeksPending: b.weeksPending + 1 }));
        
        const expiredBids = updatedBids.filter(b => b.weeksPending > 3);
        expiredBids.forEach(b => {
            setNews(prevNews => [
                {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    week: currentWeek,
                    title: `Bid Expired: ${b.player.name}`,
                    body: `${b.buyingClub} has withdrawn their offer of €${b.offeredFee.toLocaleString()} for ${b.player.name} after a lack of response.`,
                    type: 'finance'
                },
                ...prevNews
            ].slice(0, 1000));
        });
        
        updatedBids = updatedBids.filter(b => b.weeksPending <= 3);

        // --- Generative Bids generation ---
        if (gameMode === 'Club' && userTeamName && activeTeams[userTeamName]) {
            const userClub = activeTeams[userTeamName];
            userClub.players.forEach(p => {
                const bidChance = p.transferRequested ? 0.35 : 0.05;
                if (Math.random() < bidChance) {
                    const otherClubs = Object.keys(activeTeams).filter(t => t !== userTeamName && activeTeams[t].league !== 'International');
                    const buyingClub = otherClubs[Math.floor(Math.random() * otherClubs.length)] || 'Paris Saint-Germain';
                    
                    const marketValue = p.marketValue || Math.round(p.rating * p.rating * 15000 + (100 - p.age) * 20000);
                    const rate = p.transferRequested 
                        ? (0.65 + Math.random() * 0.20)
                        : (0.90 + Math.random() * 0.20);
                    const offeredFee = Math.round((marketValue * rate) / 100000) * 100000;
                    
                    const bidId = `bid-${Date.now()}-${p.name.replace(/\s+/g, '')}-${Math.floor(Math.random() * 1000)}`;
                    
                    const newBid: TransferBid = {
                        id: bidId,
                        player: p,
                        buyingClub,
                        offeredFee: offeredFee || 500000,
                        marketValue: marketValue || 500000,
                        weeksPending: 0,
                        history: [
                            { sender: 'director', message: `We would like to approach you with an initial valuation of €${(offeredFee || 500000).toLocaleString()} for your ${p.position}, ${p.name}. Let us know if you are open to terms.` }
                        ],
                        status: 'pending'
                    };
                    
                    updatedBids.push(newBid);
                    
                    setNews(prevNews => [
                        {
                            id: Date.now() + Math.floor(Math.random() * 1000),
                            week: currentWeek,
                            title: `Transfer Bid Received: ${p.name}`,
                            body: `${buyingClub} has submitted a €${offeredFee.toLocaleString()} bid for ${p.name}. View the Transfer Center to negotiate or delegate.`,
                            type: 'finance'
                        },
                        ...prevNews
                    ].slice(0, 1000));

                    logger.info(`Incoming transfer bid: ${buyingClub} offered €${offeredFee.toLocaleString()} for ${p.name}.`);
                }
            });
        }

        setIncomingBids(updatedBids);

        // --- Background Tournament Simulations (Euros / Expanded World Cup) ---
        if (gameMode === 'Club') {
            const isEurosYear = currentYear % 4 === 2;
            const isWorldCupYear = currentYear % 4 === 1 && currentYear > 1;

            if (nextW === 10) {
                if (isEurosYear) {
                    await runBackgroundTournamentWeek10('Euros');
                } else if (isWorldCupYear) {
                    await runBackgroundTournamentWeek10('WorldCup');
                }
            } else if (nextW === 20) {
                if (isEurosYear || isWorldCupYear) {
                    await runBackgroundTournamentWeek20();
                }
            } else if (nextW === 30) {
                if (isEurosYear || isWorldCupYear) {
                    await runBackgroundTournamentWeek30();
                }
            }
        }

        if (gameMode === 'Club' && INTERNATIONAL_BREAK_WEEKS.includes(nextW) && !(currentYear % 4 === 2 || (currentYear % 4 === 1 && currentYear > 1))) runFriendlyInternationalBreak(nextW);
        
        setTeams(prev => {
            const newTeams = { ...prev };

            // 1. Process weekly wages and broadcast revenues for all club activeTeams
            if (gameMode === 'Club') {
                Object.keys(newTeams).forEach(teamName => {
                    const team = newTeams[teamName];
                    if (team.league !== 'International') {
                        // Calculate weekly wage bill dynamically if not set
                        const wageBill = team.weeklyWageBill || team.players.reduce((sum, p) => sum + (p.wage || 0), 0);
                        const broadcast = team.weeklyBroadcastRevenue || getWeeklyBroadcastRevenue(team.league, team.prestige);
                        team.weeklyWageBill = wageBill;
                        team.weeklyBroadcastRevenue = broadcast;
                        team.balance = team.balance - wageBill + broadcast;
                    }
                });
            }

            // 2. Process matchday revenues for home activeTeams of matches played in currentWeek
            if (gameMode === 'Club') {
                nextFixtures.forEach(f => {
                    if (f.week === currentWeek && f.league !== 'International') {
                        const homeTeam = newTeams[f.homeTeam];
                        if (homeTeam) {
                            const matchDayRev = homeTeam.matchDayRevenue || Math.round(homeTeam.prestige * 30000 + (deterministicUnit(f.id, 'matchday-revenue') * 50000 - 25000));
                            homeTeam.matchDayRevenue = matchDayRev;
                            homeTeam.balance += matchDayRev;
                        }
                    }
                });
            }

            // 4. Update player match stats for all fixtures played in currentWeek
            nextFixtures.forEach(f => {
                if (f.week === currentWeek && f.played && f.score) {
                    const homeTeam = newTeams[f.homeTeam];
                    const awayTeam = newTeams[f.awayTeam];
                    
                    if (homeTeam && awayTeam) {
                        const [hG, aG] = f.score.split('-').map(Number);
                        const isUserHome = f.homeTeam === userTeamName;
                        const isUserAway = f.awayTeam === userTeamName;
                        
                        // Home Team stats
                        const homeStarters = homeTeam.players.filter(p => p.isStarter);
                        homeStarters.forEach(p => {
                            const stats = p.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                            stats.appearances++;
                            if (aG === 0 && ['GK', 'CB', 'LB', 'RB'].includes(p.position)) {
                                stats.cleanSheets++;
                            }
                            let rating = 6.0 + deterministicUnit(f.id, p.name, 'home-rating') * 2.0;
                            if (aG === 0) rating += 0.8;
                            if (hG > aG) rating += 0.5;
                            else if (hG < aG) rating -= 0.5;
                            
                            stats.ratingSum += rating;
                            stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                            p.stats = stats;
                        });
                        
                        // Away Team stats
                        const awayStarters = awayTeam.players.filter(p => p.isStarter);
                        awayStarters.forEach(p => {
                            const stats = p.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                            stats.appearances++;
                            if (hG === 0 && ['GK', 'CB', 'LB', 'RB'].includes(p.position)) {
                                stats.cleanSheets++;
                            }
                            let rating = 6.0 + deterministicUnit(f.id, p.name, 'away-rating') * 2.0;
                            if (hG === 0) rating += 0.8;
                            if (aG > hG) rating += 0.5;
                            else if (aG < hG) rating -= 0.5;
                            
                            stats.ratingSum += rating;
                            stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                            p.stats = stats;
                        });
                        
                        // Credit actual goal scorers and cards if user played
                        if (isUserHome && matchState) {
                            matchState.events.forEach(ev => {
                                if (ev.type === 'goal' && ev.player) {
                                    const scorer = homeTeam.players.find(p => p.name === ev.player);
                                    if (scorer) {
                                        const stats = scorer.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                        stats.goals++;
                                        stats.ratingSum += 1.5;
                                        stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                        scorer.stats = stats;
                                    }
                                } else if (ev.type === 'card' && ev.player) {
                                    const carded = homeTeam.players.find(p => p.name === ev.player);
                                    if (carded) {
                                        const stats = carded.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                        if (ev.cardType === 'red') stats.redCards++;
                                        else stats.yellowCards++;
                                        stats.ratingSum -= 0.5;
                                        stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                        carded.stats = stats;
                                    }
                                }
                            });
                        } else if (isUserAway && matchState) {
                            matchState.events.forEach(ev => {
                                if (ev.type === 'goal' && ev.player) {
                                    const scorer = awayTeam.players.find(p => p.name === ev.player);
                                    if (scorer) {
                                        const stats = scorer.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                        stats.goals++;
                                        stats.ratingSum += 1.5;
                                        stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                        scorer.stats = stats;
                                    }
                                } else if (ev.type === 'card' && ev.player) {
                                    const carded = awayTeam.players.find(p => p.name === ev.player);
                                    if (carded) {
                                        const stats = carded.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                        if (ev.cardType === 'red') stats.redCards++;
                                        else stats.yellowCards++;
                                        stats.ratingSum -= 0.5;
                                        stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                        carded.stats = stats;
                                    }
                                }
                            });
                        } else {
                            // Background simulated matches: randomly assign goals to starting attackers/midfielders
                            if (hG > 0) {
                                const scorersPool = homeStarters.filter(p => ['ST', 'CF', 'LW', 'RW', 'AM', 'LM', 'RM', 'CM'].includes(p.position));
                                for (let i = 0; i < hG; i++) {
                                    const pool = scorersPool.length ? scorersPool : homeStarters;
                                    const scorer = pool[Math.floor(deterministicUnit(f.id, 'home-scorer', i) * pool.length)];
                                    if (!scorer) continue;
                                    const stats = scorer.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                    stats.goals++;
                                    stats.ratingSum += 1.5;
                                    stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                    scorer.stats = stats;
                                }
                            }
                            if (aG > 0) {
                                const scorersPool = awayStarters.filter(p => ['ST', 'CF', 'LW', 'RW', 'AM', 'LM', 'RM', 'CM'].includes(p.position));
                                for (let i = 0; i < aG; i++) {
                                    const pool = scorersPool.length ? scorersPool : awayStarters;
                                    const scorer = pool[Math.floor(deterministicUnit(f.id, 'away-scorer', i) * pool.length)];
                                    if (!scorer) continue;
                                    const stats = scorer.stats || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 0, ratingSum: 0 };
                                    stats.goals++;
                                    stats.ratingSum += 1.5;
                                    stats.averageRating = Math.round((stats.ratingSum / stats.appearances) * 100) / 100;
                                    scorer.stats = stats;
                                }
                            }
                        }
                    }
                }
            });

            // 3. Process player development and condition recovery
            Object.keys(newTeams).forEach(teamName => {
                const team = newTeams[teamName];
                const isClub = team.league !== 'International';
                
                team.players = team.players.map(p => {
                    const condition = Math.min(100, p.condition + 15);
                    let updatedPlayer = p;
                    
                    if (isClub) {
                        const performanceFactor = p.isStarter ? (deterministicUnit(currentYear, nextW, teamName, p.name, 'development') - 0.5) : 0;
                        // Partnership synergy growth bonus if they share a TeammateBond with another starter on the field
                        let bondBoost = 0;
                        const hasBondWithStarter = (p.effects || []).some(e => e.type === 'TeammateBond' && team.players.some(op => op.name === e.with && op.isStarter));
                        if (hasBondWithStarter) {
                            bondBoost = 0.05;
                        }
                        updatedPlayer = calculatePlayerDevelopment(p, performanceFactor);
                        updatedPlayer.growthRate = Math.min(1.0, (updatedPlayer.growthRate || 0.4) + bondBoost);
                    }

                    // Ticking effects
                    const activeEffects = (updatedPlayer.effects || []).filter(e => e.until > nextW);
                    const expiredRifts = (updatedPlayer.effects || []).filter(e => e.until <= nextW && e.type === 'InternationalRift');
                    expiredRifts.forEach(r => {
                        if (r.type === 'InternationalRift') logger.info(`Tension has cooled down between ${updatedPlayer.name} and ${r.with}.`);
                    });

                    return {
                        ...updatedPlayer,
                        condition,
                        effects: activeEffects
                    };
                });
            });

            return newTeams;
        });

        // --- Weekly Poaching Job Offers Simulation ---
        if (gameMode === 'Club' && activeManagerReputation >= 50 && Math.random() < 0.08) {
            const allTeamList = Object.values(activeTeams).filter(t => t.name !== userTeamName && t.league !== 'International');
            const matchingTeams = allTeamList.filter(t => t.prestige <= activeManagerReputation + 10 && t.prestige >= activeManagerReputation - 15);
            if (matchingTeams.length > 0) {
                const targetClub = matchingTeams[Math.floor(Math.random() * matchingTeams.length)];
                
                setNews(prev => [
                    {
                        id: Date.now() + 999,
                        week: nextW,
                        title: `Job Offer: ${targetClub.name}`,
                        body: `The Board of Directors at ${targetClub.name} (Prestige: ${targetClub.prestige}) is extremely impressed by your performance. They want to offer you the manager position with a wage budget of $${Math.floor(targetClub.balance * 0.005).toLocaleString()}/wk. Will you accept their contract?`,
                        type: 'job-offer' as const,
                        jobOfferDecision: {
                            teamName: targetClub.name
                        }
                    },
                    ...prev
                ].slice(0, 1000));
            }
        }

        // --- Weekly Cash Flow News ---
        if (gameMode === 'Club' && userTeamName) {
            const userClub = activeTeams[userTeamName];
            if (userClub && userClub.league !== 'International') {
                const wageBill = userClub.weeklyWageBill || userClub.players.reduce((sum, p) => sum + (p.wage || 0), 0);
                const broadcast = userClub.weeklyBroadcastRevenue || getWeeklyBroadcastRevenue(userClub.league, userClub.prestige);
                
                const playedHome = currentFixture && currentFixture.homeTeam === userTeamName;
                const ticketRevenue = playedHome ? (userClub.matchDayRevenue || Math.round(userClub.prestige * 30000)) : 0;
                
                const netCash = broadcast + ticketRevenue - wageBill;
                const netSign = netCash >= 0 ? '+' : '-';
                
                setNews(prev => [
                    {
                        id: Date.now() + 888,
                        week: nextW,
                        title: `Weekly Financial Report: ${userTeamName}`,
                        body: `Broadcast: +$${broadcast.toLocaleString()} | Ticket Sales: +$${ticketRevenue.toLocaleString()} | Wages: -$${wageBill.toLocaleString()} | Net Cash: ${netSign}$${Math.abs(netCash).toLocaleString()}`,
                        type: 'finance' as const
                    },
                    ...prev
                ].slice(0, 1000));
            }
        }

        setWeeklyResults(results); 
        committedWeekRef.current = advanceKey;
        setCurrentWeek(nextW);
        setCurrentFixture(nextFixtures.find(f => !f.played && (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); 
        setGameState(GameState.PRE_MATCH); 
        setIsLoading(false);
        setAppScreen(AppScreen.GAMEPLAY);
        } catch (error) {
            setTeams(before.teams); setLeagueTable(before.leagueTable); setFixtures(before.fixtures); setNews(before.news); setWeeklyResults(before.weeklyResults);
            setCurrentYear(before.currentYear); setCurrentWeek(before.currentWeek); setIncomingBids(before.incomingBids); setTransferMarket(before.transferMarket);
            setCareerHistory(before.careerHistory); setInternationalTournament(before.internationalTournament); setRelationshipIncidents(before.relationshipIncidents);
            relationshipsRef.current = before.relationshipIncidents; setManagerReputation(before.reputation);
            if (committedWeekRef.current === advanceKey) committedWeekRef.current = null;
            setError(error instanceof Error ? error.message : 'Week advance failed.');
        } finally {
            advancingRef.current = false;
            setIsLoading(false);
            setAdvanceRevision(r => r + 1);
        }
    };

    const handleStartMatch = () => {
        if (!currentFixture || currentFixture.played || !userTeam) return;
        
        // Validation: prevent starting injured, suspended, or sent-off players
        const unavailableStarters = userTeam.players.filter(p => 
            p.isStarter && (p.status.type === 'Injured' || p.status.type === 'Suspended' || p.status.type === 'SentOff')
        );

        if (unavailableStarters.length > 0) {
            const names = unavailableStarters.map(p => `${p.name} (${p.status.type})`).join(', ');
            alert(`Selection Error: You have unavailable players in your starting lineup: ${names}. Replace them before kick-off!`);
            return;
        }

        const evidence = kickoffParticipants(teams[currentFixture.homeTeam], teams[currentFixture.awayTeam]);
        setFixtures(prev => prev.map(f => f.id === currentFixture.id ? { ...f, ...evidence } : f));
        setCurrentFixture(f => f ? { ...f, ...evidence } : f);
        setError(null);
        setMatchState({ currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: "Kick off.", simulationSeed: hashSeed(`${currentFixture.id}|${currentWeek}|${currentFixture.homeTeam}|${currentFixture.awayTeam}`), sessionId: `${currentFixture.id}-${Date.now()}` });
        setGameState(GameState.PLAYING); 
        setCurrentPlaybackMinute(0);
        setSimulationTargetMinute(0);
        setPendingEvents([]);
    };

    const handleResumeMatch = (shout?: TouchlineShout) => {
        setActiveShout(shout || 'resume');
        setError(null);
        setGameState(GameState.PLAYING);
    }

    const handleSimulateSegment = async (targetMinute: number, momentumShift: number = 0) => {
        if (!currentFixture || !matchState || !userTeam) return;
        if (momentumShift !== 0) {
            setMatchState(prev => prev ? { ...prev, momentum: Math.max(-10, Math.min(10, prev.momentum + momentumShift)) } : null);
        }
        if (targetMinute <= 0) {
            return;
        }
        // Target means generated queue end, not a desired clock. Never skip ungenerated minutes.
        setMatchSpeed('instant');
        setActiveShout('resume');
        setError(null);
        setGameState(GameState.PLAYING);
    };

    const finishMatch = (completedMatch: MatchState | null = matchState) => {
        if (!completedMatch || !userTeamName || !currentFixture || fixtures.find(f => f.id === currentFixture.id)?.played) return;
        const key = completedMatch.sessionId || currentFixture.id;
        if (finishedMatchRef.current === key) return;
        finishedMatchRef.current = key;
        const matchState = completedMatch;
        setMatchState({ ...completedMatch, isFinished: true });
        setGameState(GameState.POST_MATCH);
        if (gameMode === 'Club') advanceClubRelationships(currentYear, currentWeek, [{ fixture: fixtures.find(f => f.id === currentFixture.id) || currentFixture, events: completedMatch.events }]);
        setFixtures(prev => prev.map(f => f.id === currentFixture.id ? { ...f, played: true, score: `${completedMatch.homeScore}-${completedMatch.awayScore}`, penaltyWinner: completedMatch.penaltyWinner as 'home' | 'away' | undefined, penalties: completedMatch.penalties, events: completedMatch.events,
            participantNames: mergeMatchParticipants(f, completedMatch.events, teams[f.homeTeam], teams[f.awayTeam]),
            goalkeeperNames: { home: teams[f.homeTeam].players.find(p => p.isStarter && p.position === 'GK')?.name, away: teams[f.awayTeam].players.find(p => p.isStarter && p.position === 'GK')?.name } } : f));

        const isHome = currentFixture.homeTeam === userTeamName;
        const userGoals = isHome ? matchState.homeScore : matchState.awayScore;
        const oppGoals = isHome ? matchState.awayScore : matchState.homeScore;
        if (userGoals > oppGoals) setManagerReputation(r => Math.min(100, r + 2));
        else if (userGoals === oppGoals) setManagerReputation(r => Math.min(100, r + 1));
        else setManagerReputation(r => Math.max(0, r - 1));

        // No post-match flat condition deduction here since condition decays dynamically in real-time during match playback

        if (!currentFixture.isKnockout) {
            setLeagueTable(prev => {
                const newTable = [...prev];
                const updateTeam = (name: string, goalsFor: number, goalsAgainst: number) => {
                    const idx = newTable.findIndex(t => t.teamName === name && t.league === currentFixture.league);
                    if (idx !== -1) { 
                        const t = { ...newTable[idx] }; 
                        t.played++; 
                        t.goalsFor += goalsFor; 
                        t.goalsAgainst += goalsAgainst; 
                        t.goalDifference = t.goalsFor - t.goalsAgainst; 
                        if (goalsFor > goalsAgainst) { t.won++; t.points += 3; } 
                        else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; } 
                        else { t.lost++; } 
                        newTable[idx] = t;
                    }
                };
                updateTeam(currentFixture.homeTeam, matchState.homeScore, matchState.awayScore);
                updateTeam(currentFixture.awayTeam, matchState.awayScore, matchState.homeScore);
                return newTable;
            });
        }

        const playerGoals = new Map<string, number>();
        matchState.events.forEach(event => {
            if (event.type === 'goal' && event.teamName === userTeamName && event.player) {
                playerGoals.set(event.player, (playerGoals.get(event.player) || 0) + 1);
            }
        });

        const currentTeam = teams[userTeamName];
        if (!currentTeam) return;

        let bonusPayout = 0;
        for (const player of currentTeam.players) {
            const contractIncentives = player.contractIncentives;
            if (!contractIncentives || contractIncentives.performanceBonus <= 0) continue;

            if (contractIncentives.bonusType === 'goal') {
                const goals = playerGoals.get(player.name) || 0;
                bonusPayout += goals * contractIncentives.performanceBonus;
                continue;
            }

            if (contractIncentives.bonusType === 'cleanSheet') {
                const cleanSheetEarned = oppGoals === 0 && player.isStarter && CLEAN_SHEET_POSITIONS.has(player.position);
                if (cleanSheetEarned) bonusPayout += contractIncentives.performanceBonus;
                continue;
            }

            if (player.isStarter) {
                bonusPayout += contractIncentives.performanceBonus;
            }
        }

        if (bonusPayout > 0) {
            setTeams(prev => ({
                ...prev,
                [userTeamName]: {
                    ...prev[userTeamName],
                    balance: prev[userTeamName].balance - bonusPayout,
                },
            }));
            setNews(prev => ([
                {
                    id: Date.now(),
                    week: currentWeek,
                    title: 'Performance Bonuses Paid',
                    body: `${userTeamName} paid $${bonusPayout.toLocaleString()} in contractual incentives after the match.`,
                    type: 'finance',
                },
                ...prev,
            ]).slice(0, 1000));
        }
    };

    const handleSubstitute = (playerIn: Player, playerOut: Player) => {
        if (!userTeamName || !matchState) return;
        const isHome = currentFixture?.homeTeam === userTeamName;
        setTeams(prev => {
            const t = prev[userTeamName];
            const updatedPlayers = t.players.map(p => { if (p.name === playerIn.name) return { ...p, isStarter: true }; if (p.name === playerOut.name) return { ...p, isStarter: false }; return p; });
            return { ...prev, [userTeamName]: { ...t, players: updatedPlayers } };
        });
        setMatchState(prev => prev ? ({ ...prev, subsUsed: { home: isHome ? prev.subsUsed.home + 1 : prev.subsUsed.home, away: !isHome ? prev.subsUsed.away + 1 : prev.subsUsed.away }, events: [...prev.events, { id: Date.now(), minute: prev.currentMinute, type: 'sub', player: playerIn.name, playerIn: playerIn.name, playerOut: playerOut.name, description: `SUB: ${playerIn.name} ON, ${playerOut.name} OFF`, teamName: userTeamName }] }) : null);
    };

    const handleStartPlayerTalk = async (player: Player, context: 'transfer' | 'renewal') => {
        if (!userTeamName) return;
        if (context === 'transfer' && isFreeAgent(player)) {
            setTransferMarket(prev => mergeFreeAgentsIntoMarket(prev, [player]));
        }
        setIsLoading(true); setTalkResult(null); setPlayerTalk(null); setError(null); setPendingContractTerms(null);
        setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const questions = await getPlayerTalkQuestions(player, teams[userTeamName], context);
            setPlayerTalk({ player, questions, answers: [], currentQuestionIndex: 0, context, negotiationHistory: [] });
        } catch (e) { setError("Negotiations failed."); setAppScreen(AppScreen.GAMEPLAY); } finally { setIsLoading(false); }
    };

    const handlePlayerTalkAnswer = async (answer: string, offer?: ContractTerms) => {
        if (!playerTalk || !userTeamName) return;
        const newAnswers = [...playerTalk.answers, answer];
        
        if (offer) {
            setPendingContractTerms(offer);
            setIsLoading(true);
            try {
                const result = await evaluatePlayerTalk(playerTalk.player, playerTalk.questions, newAnswers, teams[userTeamName], playerTalk.context, offer);
                setTalkResult(result);
            } catch (e) { setError("Evaluation failed."); } finally { setIsLoading(false); }
        } else if (playerTalk.currentQuestionIndex < playerTalk.questions.length - 1) {
            setPlayerTalk({ ...playerTalk, answers: newAnswers, currentQuestionIndex: playerTalk.currentQuestionIndex + 1 });
        }
    };

    const handlePlayerTalkFinish = () => {
        if (!error && talkResult?.decision === 'accepted' && playerTalk && userTeamName && pendingContractTerms) {
            const team = teams[userTeamName];
            if (!team) return;
            const newPromises = (talkResult.extractedPromises || []).slice(0, 6).map((description, index) => ({
                id: `${currentYear}-${currentWeek}-${playerTalk.player.name}-${index}-${Date.now()}`,
                description, deadlineWeek: currentWeek + 10, status: 'pending' as const, playerInvolved: playerTalk.player.name,
            }));
            const free = playerTalk.context === 'transfer' && isFreeAgent(playerTalk.player);
            const key = `${currentYear}|${currentWeek}|${userTeamName}|${playerTalk.player.name.toLowerCase()}`;
            if (freeAgentSigningKeysRef.current.has(key)) return;
            if (free) {
                const transition = signFreeAgent({ team, market: transferMarket, player: playerTalk.player, terms: pendingContractTerms, negotiationAccepted: true });
                if (transition.ok === false) { setError(transition.message); return; }
                freeAgentSigningKeysRef.current.add(key);
                const nextTeam = { ...transition.team, activePromises: [...(transition.team.activePromises || []), ...newPromises] };
                setTeams(prev => ({ ...prev, [userTeamName]: nextTeam }));
                setTransferMarket(transition.market);
            } else {
                if (pendingContractTerms.signingBonus > team.balance || !Number.isFinite(pendingContractTerms.wage)) {
                    setError('The club cannot fund the accepted contract.'); return;
                }
                freeAgentSigningKeysRef.current.add(key);
                setTeams(prev => {
                    const club = prev[userTeamName];
                    const contract = pendingContractTerms;
                    const updatedPlayers = playerTalk.context === 'renewal'
                        ? club.players.map(p => p.name === playerTalk.player.name ? { ...p, wage: contract.wage, contractExpires: contract.length, contractIncentives: { performanceBonus: contract.performanceBonus, bonusType: contract.bonusType } } : p)
                        : [...club.players, { ...playerTalk.player, currentClub: userTeamName, isStarter: false, wage: contract.wage, contractExpires: contract.length, contractIncentives: { performanceBonus: contract.performanceBonus, bonusType: contract.bonusType }, status: { type: 'Available' as const }, effects: [] }];
                    return { ...prev, [userTeamName]: { ...club, players: updatedPlayers, activePromises: [...(club.activePromises || []), ...newPromises], balance: club.balance - contract.signingBonus, weeklyWageBill: updatedPlayers.reduce((sum, p) => sum + p.wage, 0) } };
                });
                if (playerTalk.context === 'transfer') setTransferMarket(prev => prev.filter(p => p.name !== playerTalk.player.name));
            }
            setNews(prev => ([{
                id: Date.now(), week: currentWeek, title: playerTalk.context === 'renewal' ? 'Contract Renewed' : free ? 'Free Agent Signed' : 'Signing Completed',
                body: `${playerTalk.player.name} agreed ${pendingContractTerms.length} years at €${pendingContractTerms.wage.toLocaleString()}/week, €${pendingContractTerms.signingBonus.toLocaleString()} sign-on and €${pendingContractTerms.performanceBonus.toLocaleString()} ${pendingContractTerms.bonusType} bonus.${free ? ` No club transfer fee. Role: ${pendingContractTerms.role || 'rotation'}.` : ''}`,
                type: 'finance',
            }, ...prev]).slice(0, 1000));
        }
        setPlayerTalk(null); setTalkResult(null); setPendingContractTerms(null); setError(null); setAppScreen(AppScreen.GAMEPLAY);
    };

    const handleRiftDecision = async (newsId: number, _playerAName: string, _playerBName: string, choice: 'bench-a' | 'bench-b' | 'risk-it' | 'mediate', managerAnswer?: string) => {
        const item = news.find(n => n.id === newsId);
        const id = item?.riftDecision?.relationshipId;
        const incident = relationshipsRef.current.find(i => i.id === id && i.clubName === userTeamName);
        if (!incident) throw new Error('This legacy rift has no grounded incident ledger. Its existing effects are preserved; no fabricated mediation was applied.');
        const clubName = userTeamName;
        const generation = careerGenerationRef.current;
        const alreadyMediated = incident.attempts.some(a => a.action === 'mediation' && a.year === currentYear && a.week === currentWeek);
        if (choice === 'mediate' && alreadyMediated) throw new Error('One mediation session per pair each week. Advance the career before another attempt.');
        let interpretation;
        let evidence = '';
        if (choice === 'mediate') {
            const result = await interpretRiftMediation(incident, managerAnswer || '');
            const supportive = result.tone === 'accountable' || result.tone === 'conciliatory';
            interpretation = { tone: result.tone === 'hostile' ? 'hostile' as const : supportive ? 'supportive' as const : 'balanced' as const, support: supportive ? 0.9 : 0.2, accountability: result.acknowledgesCause ? 1 : 0.1, specificity: result.acknowledgesCause ? 1 : 0, respect: result.tone === 'hostile' ? 0 : result.takesSides ? 0.3 : 0.9 };
            evidence = `AI ${result.provider}: ${result.tone}. Evidence: “${result.quote}”. `;
        }
        const latest = relationshipsRef.current.find(i => i.id === id);
        if (!latest || latest.clubName !== clubName || generation !== careerGenerationRef.current) throw new Error('Career changed while mediation was pending; no stale outcome applied.');
        const transition = interveneRelationship(latest, choice === 'mediate' ? 'mediation' : choice, { year: currentYear, week: currentWeek, attemptId: `${id}|${choice}|${currentYear}|${currentWeek}`, interpretation });
        const next = relationshipsRef.current.map(i => i.id === id ? transition.incident : i);
        relationshipsRef.current = next; setRelationshipIncidents(next);
        setTeams(prev => applyIncidentEffects(prev, transition.effects));
        const attempt = transition.incident.attempts.at(-1);
        const effect = `${evidence}${attempt?.outcome || 'No change'}. Impact ${latest.strength} → ${transition.incident.strength}/100. ${choice.startsWith('bench') ? 'Player separated; the grievance remains.' : choice === 'risk-it' ? 'Both may be selected; chemistry risk remains.' : 'Mediation is not guaranteed to resolve a severe rift.'}`;
        setNews(prev => prev.map(n => n.id === newsId && n.riftDecision ? { ...n, riftDecision: { ...n.riftDecision, choice, resultEffect: effect } } : n));
    };

    const handleJobOfferDecision = (newsId: number, teamName: string, choice: 'accept' | 'decline') => {
        setNews(prev => prev.map(item => {
            if (item.id === newsId) {
                return {
                    ...item,
                    jobOfferDecision: {
                        ...item.jobOfferDecision!,
                        choice
                    }
                };
            }
            return item;
        }));

        if (choice === 'accept') {
            const oldTeam = userTeamName;
            setUserTeamName(teamName);
            
            setNews(prev => [
                {
                    id: Date.now() + 1000,
                    week: currentWeek,
                    title: 'New Manager Appointed!',
                    body: `Manager signs contract with ${teamName}, leaving ${oldTeam} effective immediately!`,
                    type: 'call-up' as const
                },
                ...prev
            ].slice(0, 1000));

            const nextFixture = fixtures.find(f => (f.homeTeam === teamName || f.awayTeam === teamName) && f.week === currentWeek);
            setCurrentFixture(nextFixture);
            setMatchState(null);
            setGameState(GameState.PRE_MATCH);
        }
    };

    const handleAcceptBid = (bidId: string) => {
        const bid = incomingBids.find(b => b.id === bidId);
        if (!bid || !userTeamName) return;

        setTeams(prevTeams => {
            const nextTeams = { ...prevTeams };
            const club = nextTeams[userTeamName];
            if (club) {
                club.balance = (club.balance || 0) + bid.offeredFee;
                club.players = club.players.filter(p => p.name !== bid.player.name);
            }
            return nextTeams;
        });

        setIncomingBids(prev => prev.filter(b => b.id !== bidId));

        setNews(prevNews => [
            {
                id: Date.now(),
                week: currentWeek,
                title: `Player Sold: ${bid.player.name}`,
                body: `${bid.player.name} has completed a transfer from ${userTeamName} to ${bid.buyingClub} for €${bid.offeredFee.toLocaleString()}!`,
                type: 'player-departure'
            },
            ...prevNews
        ].slice(0, 1000));

        logger.success(`Deal finalized! Sold ${bid.player.name} to ${bid.buyingClub} for €${bid.offeredFee.toLocaleString()}`);
        alert(`Sale Finalized! ${bid.player.name} sold to ${bid.buyingClub} for €${bid.offeredFee.toLocaleString()}`);
    };

    const handleRejectBid = (bidId: string) => {
        const bid = incomingBids.find(b => b.id === bidId);
        if (!bid || !userTeamName) return;

        if (bid.player.transferRequested) {
            setTeams(prevTeams => {
                const nextTeams = { ...prevTeams };
                const club = nextTeams[userTeamName];
                if (club) {
                    club.players = club.players.map(p => {
                        if (p.name === bid.player.name) {
                            const nextForm = Math.max(0, p.form - 10);
                            const nextEffects = [...(p.effects || [])];
                            nextEffects.push({
                                type: 'PostTournamentMorale',
                                morale: 'Disappointed',
                                message: `Furious that transfer to ${bid.buyingClub} was blocked`,
                                until: currentWeek + 6
                            });
                            return { ...p, form: nextForm, effects: nextEffects };
                        }
                        return p;
                    });
                }
                return nextTeams;
            });
        }

        setIncomingBids(prev => prev.filter(b => b.id !== bidId));

        setNews(prevNews => [
            {
                id: Date.now(),
                week: currentWeek,
                title: `Bid Rejected for ${bid.player.name}`,
                body: `${userTeamName} rejected an offer of €${bid.offeredFee.toLocaleString()} from ${bid.buyingClub} for ${bid.player.name}.`,
                type: 'finance'
            },
            ...prevNews
        ].slice(0, 1000));

        logger.info(`Rejected €${bid.offeredFee.toLocaleString()} offer from ${bid.buyingClub} for ${bid.player.name}.`);
    };

    const handleUpdateBid = (updatedBid: TransferBid) => {
        setIncomingBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
    };

    const worldCupTeams = React.useMemo(() => Object.values(generateWorldCupStructure()), []);
    const clubTeams = Object.values(allTeams).filter(t => canEnterClub(t, tutorialCompletion, 'Career'));

    const workspaceTabs = [
        { id: 'match' as const, label: 'Match centre' },
        { id: 'tactics' as const, label: 'Squad & tactics' },
        { id: 'news' as const, label: 'Club inbox' },
        { id: 'scouting' as const, label: 'Scouting' },
        { id: 'scouting_market' as const, label: 'Free agency' },
        { id: 'transfers' as const, label: 'Negotiations' },
        { id: 'international' as const, label: 'Internationals' },
        { id: 'honors' as const, label: 'Trophy room' },
    ];
    const workspaceTitle = workspaceTabs.find(tab => tab.id === gameplayTab)?.label ?? 'Match centre';

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return (
                <StartScreen
                    tutorialSummary={careerGateLabel(tutorialCompletion)}
                    onSelectTeam={() => { setHasClubCareer(false); setAppScreen(AppScreen.TEAM_SELECTION); }}
                    onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)}
                    onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)}
                    onThemeSelect={(colors) => setActiveTheme(colors)}
                    onContinue={handleContinue}
                    hasSave={!!localStorage.getItem('gfm_save_v1')}
                    saveMetadata={(() => {
                        const raw = localStorage.getItem('gfm_save_v1');
                        if (!raw) return null;
                        try {
                            return readCareerSaveMetadata(raw);
                        } catch { return null; }
                    })()}
                />
            );
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={clubTeams} onTeamSelect={name => initializeGame(name, 'Career')} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={worldCupTeams} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen tutorialSummary={careerGateLabel(tutorialCompletion)} onCreate={handleCreateManager} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen careerSummary={hasClubCareer ? `Earned career reputation: ${managerReputation}` : careerGateLabel(tutorialCompletion)} jobs={availableJobs} onApply={handleApplyForJob} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={error} jobOffer={jobOffer} onAnswerSubmit={handleJobInterviewAnswer} onFinish={(acc) => { if(acc && interview) initializeGame(interview.teamName); else setAppScreen(AppScreen.JOB_CENTRE); }} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={transferMarket} squadPlayers={userTeam?.players ?? []} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} clubBudget={userTeam ? { balance: userTeam.balance, transferBudget: userTeam.transferBudget || Math.floor(userTeam.balance * 0.7), weeklyWageBill: userTeam.weeklyWageBill || userTeam.players.reduce((sum, p) => sum + p.wage, 0) } : undefined} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <div className="relative">
                        <main className="fm-workspace">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        {showMechanicsGuide && <MechanicsGuide onClose={() => setShowMechanicsGuide(false)} />}
                        <aside className="fm-workspace-aside">
                            <TeamDetails 
                                team={userTeam} 
                                gameState={gameState} 
                                managerReputation={managerReputation}
                                nextFixture={currentFixture}
                                activeTab={gameplayTab}
                                onNavigateToTab={setGameplayTab}
                                onResign={handleResign}
                            />
                        </aside>
                        
                        <div className="fm-workspace-content">
                            <div className="fm-workspace-heading">
                                <div><p className="fm-eyebrow">{gameMode === 'WorldCup' ? 'World Cup tutorial' : userTeam.league}</p><h2>{workspaceTitle}</h2></div>
                                <p className="fm-workspace-week">Year {currentYear}<br />Week {currentWeek}</p>
                            </div>
                            <nav className="fm-mobile-tabs" aria-label="Club workspace">
                                {workspaceTabs.map(tab => <button type="button" key={tab.id} onClick={() => setGameplayTab(tab.id)} aria-current={gameplayTab === tab.id ? 'page' : undefined}>{tab.label}</button>)}
                            </nav>

                            {gameplayTab === 'international' && <InternationalBreakScreen tournament={gameMode === 'WorldCup' ? { type: 'World Cup Tutorial', teams, fixtures } : internationalTournament} incidents={relationshipIncidents} clubName={userTeamName!} onOpenInbox={() => setAppScreen(AppScreen.NEWS_FEED)} />}
                            {/* Active Tab Panel */}
                            {gameplayTab === 'tactics' && (
                                <div className="fm-section-body">
                                    <TacticsManager 
                                        team={userTeam}
                                        onTacticChange={handleTacticChange}
                                        onStartContractTalk={(player) => handleStartPlayerTalk(player, 'renewal')}
                                        onToggleStarter={handleToggleStarter}
                                        onSwapPlayers={handleSwapPlayers}
                                        gameState={gameState}
                                        subsUsed={matchState?.subsUsed?.home || 0}
                                        onSubstitute={handleSubstitute}
                                        onReorderPlayers={handleReorderPlayers}
                                        isNationalTeam={gameMode === 'WorldCup'}
                                    />
                                </div>
                            )}

                            {gameplayTab === 'match' && (
                                <div className="fm-match-layout">
                                    <div className="min-w-0">
                                        <MatchView 
                                            fixture={currentFixture} 
                                            weeklyResults={weeklyResults} 
                                            matchState={matchState} 
                                            gameState={gameState} 
                                            onPlayFirstHalf={handleStartMatch} 
                                            onPlaySecondHalf={handleResumeMatch} 
                                            onPauseMatch={() => setGameState(GameState.PAUSED)}
                                            onSimulateSegment={handleSimulateSegment} 
                                            onNextMatch={handleAdvanceWeek} 
                                            error={error} 
                                            isSeasonOver={currentWeek > weeksInSeason} 
                                            userTeamName={userTeamName} 
                                            leagueTable={leagueTable} 
                                            isLoading={isLoading} 
                                            currentWeek={currentWeek} 
                                            teams={teams} 
                                            matchSpeed={matchSpeed}
                                            onMatchSpeedChange={setMatchSpeed}
                                        />
                                    </div>
                                    <div className="fm-match-sidebar">
                                        <LeagueTableView table={leagueTable} userTeamName={userTeamName} />
                                    </div>
                                </div>
                            )}

                            {gameplayTab === 'news' && <NewsScreen news={news} onRiftDecision={handleRiftDecision} onJobOfferDecision={handleJobOfferDecision} onBack={() => setGameplayTab('match')} />}

                            {gameplayTab === 'scouting' && (
                                <div className="fm-section-body">
                                    <ScoutingScreen isNationalTeam={gameMode === 'WorldCup'} onScout={async (r, useReal) => { setIsLoading(true); const res = await scoutPlayers(r, useReal); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setGameplayTab('match')} onGoToTransfers={() => setGameplayTab('scouting_market')} />
                                </div>
                            )}

                            {gameplayTab === 'scouting_market' && (
                                <div className="fm-section-body">
                                    <TransfersScreen targets={transferMarket} squadPlayers={userTeam?.players ?? []} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setGameplayTab('scouting')} />
                                </div>
                            )}

                            {gameplayTab === 'transfers' && (
                                <div className="fm-section-body">
                                    <TransferCenter
                                        bids={incomingBids}
                                        onAcceptBid={handleAcceptBid}
                                        onRejectBid={handleRejectBid}
                                        onDelegateBid={(bidId, summary) => {}}
                                        onUpdateBid={handleUpdateBid}
                                        onBack={() => setGameplayTab('match')}
                                        squadPlayers={userTeam ? userTeam.players : []}
                                    />
                                </div>
                            )}

                            {gameplayTab === 'honors' && (
                                <div className="fm-section-body">
                                    <div className="text-center mb-8">
                                        <h2 className="fm-screen-title mb-2"><Trophy aria-hidden="true" className="inline-block mr-2 align-middle" size={28} strokeWidth={1.75} />Trophy Room & Career Honors</h2>
                                        <p className="text-gray-400 text-sm">Your permanent historical record of managerial accomplishments.</p>
                                    </div>

                                    {/* Silverware Summary Counts */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                        {(() => {
                                            const allTrophies = careerHistory.flatMap(entry => entry.trophies || []);
                                            const counts = allTrophies.reduce((acc, t) => {
                                                acc[t] = (acc[t] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>);

                                            const trophyTypes = [
                                                { key: 'World Cup Champion', label: 'World Cups', icon: Globe2 },
                                                { key: 'Euro Champion', label: 'Euros', icon: Shield },
                                                { key: 'Premier League Champion', label: 'Premier Leagues', icon: Trophy },
                                                { key: 'La Liga Champion', label: 'La Liga Titles', icon: Trophy },
                                                { key: 'Serie A Champion', label: 'Serie A Titles', icon: Trophy },
                                                { key: 'Bundesliga Champion', label: 'Bundesligas', icon: Trophy },
                                                { key: 'Ligue 1 Champion', label: 'Ligue 1 Titles', icon: Trophy },
                                            ];

                                            return trophyTypes.map(t => {
                                                const count = counts[t.key] || 0;
                                                return (
                                                    <div key={t.key} className="bg-gray-800 border border-gray-700 p-4 rounded-lg text-center shadow-inner">
                                                        <div className="flex justify-center mb-2 text-amber-400"><t.icon aria-hidden="true" size={24} strokeWidth={1.75} /></div>
                                                        <div className="text-2xl font-mono font-black text-yellow-400">{count}</div>
                                                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{t.label}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Chronological Timeline */}
                                    <div className="bg-gray-950/40 rounded-lg border border-gray-800 p-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Managerial Timeline</h3>
                                        {careerHistory.length === 0 ? (
                                            <div className="text-center p-8 text-gray-500 text-xs italic">
                                                No completed campaigns on record yet. Complete your first season or tournament to build your legacy!
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {careerHistory.map((entry, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-800/40 rounded border border-gray-800 hover:bg-gray-800/80 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <span className="fm-trophy-year px-2 py-1 text-xs font-bold font-mono rounded">YEAR {entry.year}</span>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-white">{entry.teamName}</h4>
                                                                <p className="text-xs text-gray-400">{entry.league} &bull; Position: <span className="font-semibold text-gray-300">{entry.finalPosition}</span></p>
                                                            </div>
                                                        </div>
                                                        {entry.trophies && entry.trophies.length > 0 && (
                                                            <div className="mt-2 sm:mt-0 flex flex-wrap gap-1.5">
                                                                {entry.trophies.map((t, tIdx) => (
                                                                    <span key={tIdx} className="fm-trophy-tag px-2 py-1 text-xs font-semibold uppercase rounded flex items-center gap-1">
                                                                        <Trophy aria-hidden="true" size={12} strokeWidth={1.75} /> {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        </main>
                    </div>
                );
            case AppScreen.SCOUTING: return <ScoutingScreen isNationalTeam={gameMode === 'WorldCup'} onScout={async (r, useReal) => { setIsLoading(true); const res = await scoutPlayers(r, useReal); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} onGoToTransfers={() => setAppScreen(AppScreen.TRANSFERS)} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onRiftDecision={handleRiftDecision} onJobOfferDecision={handleJobOfferDecision} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.TRANSFER_CENTER:
                return (
                    <TransferCenter
                        bids={incomingBids}
                        onAcceptBid={handleAcceptBid}
                        onRejectBid={handleRejectBid}
                        onDelegateBid={(bidId, summary) => {}}
                        onUpdateBid={handleUpdateBid}
                        onBack={() => setAppScreen(AppScreen.GAMEPLAY)}
                        squadPlayers={userTeam ? userTeam.players : []}
                    />
                );
            case AppScreen.HONORS_BOARD:
                return (
                    <div className="mt-8 max-w-4xl mx-auto p-6 bg-gray-900/80 rounded-xl border border-gray-800 backdrop-blur shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="fm-screen-title mb-2"><Trophy aria-hidden="true" className="inline-block mr-2 align-middle" size={28} strokeWidth={1.75} />Trophy Room & Career Honors</h2>
                            <p className="text-gray-400 text-sm">Your permanent historical record of managerial accomplishments.</p>
                        </div>

                        {/* Silverware Summary Counts */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            {(() => {
                                const allTrophies = careerHistory.flatMap(entry => entry.trophies || []);
                                const counts = allTrophies.reduce((acc, t) => {
                                    acc[t] = (acc[t] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>);

                                const trophyTypes = [
                                    { key: 'World Cup Champion', label: 'World Cups', icon: Globe2 },
                                    { key: 'Euro Champion', label: 'Euros', icon: Shield },
                                    { key: 'Premier League Champion', label: 'Premier Leagues', icon: Trophy },
                                    { key: 'La Liga Champion', label: 'La Liga Titles', icon: Trophy },
                                    { key: 'Serie A Champion', label: 'Serie A Titles', icon: Trophy },
                                    { key: 'Bundesliga Champion', label: 'Bundesligas', icon: Trophy },
                                    { key: 'Ligue 1 Champion', label: 'Ligue 1 Titles', icon: Trophy },
                                ];

                                return trophyTypes.map(t => {
                                    const count = counts[t.key] || 0;
                                    return (
                                        <div key={t.key} className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-lg text-center backdrop-blur-sm">
                                            <div className="flex justify-center mb-2 text-amber-400"><t.icon aria-hidden="true" size={24} strokeWidth={1.75} /></div>
                                            <div className="text-2xl font-mono font-black text-yellow-400">{count}</div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{t.label}</div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Chronological Timeline */}
                        <div className="bg-gray-800/20 rounded-lg border border-gray-800 p-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Managerial Timeline</h3>
                            {careerHistory.length === 0 ? (
                                <div className="text-center p-8 text-gray-500 text-xs italic">
                                    No completed campaigns on record yet. Complete your first season or tournament to build your legacy!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {careerHistory.map((entry, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-800/30 rounded border border-gray-700/35 hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="fm-trophy-year px-2 py-1 text-xs font-bold font-mono rounded">YEAR {entry.year}</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">{entry.teamName}</h4>
                                                    <p className="text-xs text-gray-400">{entry.league} &bull; Position: <span className="font-semibold text-gray-300">{entry.finalPosition}</span></p>
                                                </div>
                                            </div>
                                            {entry.trophies && entry.trophies.length > 0 && (
                                                <div className="mt-2 sm:mt-0 flex flex-wrap gap-1.5">
                                                    {entry.trophies.map((t, tIdx) => (
                                                        <span key={tIdx} className="fm-trophy-tag px-2 py-1 text-xs font-semibold uppercase rounded flex items-center gap-1">
                                                            <Trophy aria-hidden="true" size={12} strokeWidth={1.75} /> {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="text-center mt-8">
                            <button onClick={() => setAppScreen(AppScreen.GAMEPLAY)} className="px-5 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold rounded uppercase tracking-wider transition-colors">
                                &larr; Return to Dashboard
                            </button>
                        </div>
                    </div>
                );
            case AppScreen.PRESS_CONFERENCE: return <PressConferenceScreen key={pressInput?.sessionId} questionResult={pressQuestionResult ?? undefined} initialProgress={pressProgress} onProgress={setPressProgress} onRetryQuestions={() => void requestPressQuestions()} onSkip={() => { setPressInput(null); setPressQuestionResult(null); setPressProgress(null);void proceedToNextWeek(); }} onFinish={handleFinishPressConference} />;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return (
        <div className="fm-app" style={{ '--fm-club-primary': activeTheme?.primary ?? '#1a4435', '--fm-club-secondary': activeTheme?.secondary ?? '#9b702f' } as React.CSSProperties}>
            <Header 
                onQuit={appScreen !== AppScreen.START_SCREEN ? handleQuit : undefined} 
                showQuit={appScreen !== AppScreen.START_SCREEN} 
                onSave={saveGame}
                onToggleGuide={() => setShowMechanicsGuide(true)} 
                onToggleTerminal={() => setShowTerminal(!showTerminal)}
                managerReputation={userTeamName ? managerReputation : undefined} 
            />
            
            <Terminal 
                logs={logs} 
                isOpen={showTerminal} 
                onClose={() => setShowTerminal(false)} 
            />

            {renderScreen()}
        </div>
    );
}
