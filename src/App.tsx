
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, GameMode, NegotiationResult, MatchEvent, ContractTerms } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import { simulateMatchSegment, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, scoutPlayers, generatePressConference, evaluatePressConference, PressConferenceReport, getInternationalBreakSummary, getTeammateTournamentRivalry } from './services/geminiService';
import { generateFixtures, simulateQuickMatch, generateSwissFixtures, analyzeTactics, FORMATION_SLOTS, calculatePlayerDevelopment } from './utils';
import StartScreen from './components/StartScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import JobCentreScreen from './components/JobCentreScreen';
import JobInterviewScreen from './components/JobInterviewScreen';
import TransfersScreen from './components/TransfersScreen';
import PlayerTalkScreen from './components/PlayerTalkScreen';
import NewsScreen from './components/NewsScreen';
import CreateManagerScreen from './components/CreateManagerScreen';
import TutorialOverlay from './components/TutorialOverlay';
import ScoutingScreen from './components/ScoutingScreen';
import PressConferenceScreen from './components/PressConferenceScreen';
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

import Terminal from './components/Terminal';
import { logger, LogEntry } from './utils/logger';

const INTERNATIONAL_BREAK_WEEKS = [10, 20, 30];
const SIMULATION_CHUNK_MINUTES = 10; 
const CLEAN_SHEET_POSITIONS = new Set(['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB']);

const convertNationalTeam = (nt: NationalTeam): Team => ({
    name: nt.name,
    league: 'International',
    players: nt.players,
    tactic: nt.tactic,
    prestige: nt.prestige,
    chairmanPersonality: 'Traditionalist',
    group: nt.group,
    balance: 0,
    objectives: nt.objectives || [],
    activePromises: []
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
        const hydrated = { ...allTeams };
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
    const [transferMarket, setTransferMarket] = useState<Player[]>(TRANSFER_TARGETS);
    const [incomingBids, setIncomingBids] = useState<TransferBid[]>([]);

    const [activeShout, setActiveShout] = useState<TouchlineShout | undefined>(undefined);
    const [scoutResults, setScoutResults] = useState<Player[]>([]);
    const [pressQuestions, setPressQuestions] = useState<string[]>([]);
    const [pressContext, setPressContext] = useState<string>('');
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [managerReputation, setManagerReputation] = useState<number>(0);
    const [careerHistory, setCareerHistory] = useState<CareerHistoryEntry[]>([]);
    
    const [matchSpeed, setMatchSpeed] = useState<'slow' | 'normal' | 'fast' | 'instant'>('normal');
    const [gameplayTab, setGameplayTab] = useState<'match' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors'>('match');

    // --- THEMING STATE ---
    const [activeTheme, setActiveTheme] = useState<{ primary: string, secondary: string, text: string } | null>(null);

    const userTeam = userTeamName ? teams[userTeamName] : null;

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
                    console.log("Playback tick: Reached target minute", { currentPlaybackMinute, simulationTargetMinute });
                    if (currentPlaybackMinute >= 90) {
                        if (currentFixture.isKnockout && matchState.homeScore === matchState.awayScore && currentPlaybackMinute === 90) {
                            const etEvent: MatchEvent = {
                                id: Date.now(),
                                minute: 90,
                                type: 'commentary',
                                description: 'The referee blows the whistle. The scores are level at 90 minutes. We are going to Extra Time!'
                            };
                            setPendingEvents(prev => [...prev, etEvent]);
                            setSimulationTargetMinute(120);
                            return;
                        }
                        if (currentFixture.isKnockout && currentPlaybackMinute >= 120) {
                            if (matchState.homeScore === matchState.awayScore) {
                                const homePenalties = Math.floor(Math.random() * 5) + 3;
                                const awayPenalties = Math.random() < 0.5 ? homePenalties + 1 : homePenalties - 1;
                                const penWinner = homePenalties > awayPenalties ? 'home' : 'away';
                                
                                const penaltyEvent: MatchEvent = {
                                    id: Date.now(),
                                    minute: 120,
                                    type: 'commentary',
                                    description: `The match is decided by a penalty shootout! Shootout ends: ${currentFixture.homeTeam} ${homePenalties}-${awayPenalties} ${currentFixture.awayTeam}.`
                                };
                                
                                setPendingEvents(prev => [...prev, penaltyEvent]);
                                setMatchState(prev => prev ? {
                                    ...prev,
                                    penaltyWinner: penWinner
                                } : null);
                            }
                            finishMatch();
                            return;
                        }
                        if (currentFixture.isKnockout && currentPlaybackMinute >= 90 && currentPlaybackMinute < 120) {
                            // Extra time is playing
                        } else {
                            finishMatch();
                            return;
                        }
                    }
                    if (currentPlaybackMinute === 45 && simulationTargetMinute === 45) {
                        console.log("Playback tick: Pausing at halftime");
                        setGameState(GameState.PAUSED);
                        return;
                    }

                    setIsLoading(true);
                    let maxTarget = 90;
                    if (currentFixture.isKnockout && simulationTargetMinute >= 90) {
                        maxTarget = 120;
                    }
                    const nextTarget = Math.min(simulationTargetMinute + SIMULATION_CHUNK_MINUTES, simulationTargetMinute < 45 ? 45 : maxTarget);
                    console.log("Playback tick: Next target", nextTarget);
                    
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
                            };
                        });

                        const safeHomeAdd = Number.isFinite(Number(result?.homeScoreAdded)) ? Number(result.homeScoreAdded) : 0;
                        const safeAwayAdd = Number.isFinite(Number(result?.awayScoreAdded)) ? Number(result.awayScoreAdded) : 0;
                        const parsedMomentum = Number(result?.momentum);
                        const safeMomentum = Number.isFinite(parsedMomentum) ? Math.max(-100, Math.min(100, parsedMomentum)) : 0;
                        const safeAnalysis = typeof result?.tacticalAnalysis === 'string' && result.tacticalAnalysis.trim()
                            ? result.tacticalAnalysis
                            : 'The match continues.';

                        setPendingEvents(prev => [...prev, ...safeEvents]);
                        setMatchState(prev => prev ? ({
                            ...prev,
                            homeScore: prev.homeScore + safeHomeAdd,
                            awayScore: prev.awayScore + safeAwayAdd,
                            momentum: safeMomentum,
                            tacticalAnalysis: safeAnalysis
                        }) : null);
                        setSimulationTargetMinute(nextTarget);
                        if (activeShout) setActiveShout(undefined);
                        setError(null);
                    } catch (simError) {
                        console.error("Live simulation tick failed", simError);
                        setError("Match simulation failed for this segment. Resume to continue.");
                        setGameState(GameState.PAUSED);
                    } finally {
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
                    
                    // Live in-match fatigue: starters lose condition dynamically based on their individual stamina rating
                    setTeams(prev => {
                        const newTeams = { ...prev };
                        Object.keys(newTeams).forEach(tName => {
                            newTeams[tName].players = newTeams[tName].players.map(p => {
                                if (p.isStarter) {
                                    const staminaVal = p.stamina ?? 75;
                                    const decayRate = (100 - staminaVal) * 0.005 + 0.12;
                                    return { ...p, condition: Math.max(30, Math.round((p.condition - decayRate) * 100) / 100) };
                                }
                                return p;
                            });
                        });
                        return newTeams;
                    });

                    if (eventsNow.length > 0) {
                        setMatchState(prev => prev ? ({
                            ...prev,
                            events: [...prev.events, ...eventsNow],
                            currentMinute: nextMinute 
                        }) : null);
                    } else {
                        setMatchState(prev => prev ? ({ ...prev, currentMinute: nextMinute }) : null);
                    }
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
        if (userTeamName) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket, internationalTournament, incomingBids, careerHistory
            };
            localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
            logger.success("Game Saved Successfully!");
            alert("Game Saved Successfully!");
        }
    };

    useEffect(() => {
        if (userTeamName && appScreen !== AppScreen.START_SCREEN) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket, internationalTournament, incomingBids, careerHistory
            };
            localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
        }
    }, [currentWeek, gameState, managerReputation, currentYear, internationalTournament, incomingBids, teams, news, careerHistory]);

    const handleQuit = () => {
        setAppScreen(AppScreen.START_SCREEN);
        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setUserTeamName(null);
        setCareerHistory([]);
        setTeams(allTeams); 
        setTransferMarket(TRANSFER_TARGETS); 
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
        const savedData = localStorage.getItem('gfm_save_v1');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
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
                setManagerReputation(parsed.managerReputation || 50);
                if (parsed.transferMarket) setTransferMarket(parsed.transferMarket);
                if (parsed.incomingBids) setIncomingBids(parsed.incomingBids);
                if (parsed.careerHistory) setCareerHistory(parsed.careerHistory);
                
                if (parsed.appScreen === AppScreen.GAMEPLAY || parsed.appScreen === AppScreen.JOB_CENTRE) {
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
                alert("Save file corrupted.");
            }
        }
    };

    const startTutorial = () => { setTutorialStep(0); setShowTutorial(true); };

    const initializeWorldCup = (selectedNationalTeamName: string) => {
        setGameMode('WorldCup');
        setIsPrologue(true);
        setManagerReputation(90); 
        
        const wcTeamsRecord = generateWorldCupStructure();
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
        setNews([{ id: Date.now(), week: 1, title: 'World Cup 2026 Begins', body: '48 teams. 12 Groups. 104 Matches. The road to glory starts now.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        const week1Fixtures = groupFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === actualTeamName || f.awayTeam === actualTeamName);
        setCurrentFixture(userMatch); setWeeklyResults([]); startTutorial();
    };

    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club');
        if (!isPrologue) {
            setManagerReputation(70);
        }
        setIsPrologue(false);
        let finalTeamsState = { ...allTeams };
        const domesticFixtures = generateFixtures(Object.values(allTeams));
        const { participants, newTeams } = getChampionsLeagueParticipants(allTeams);
        finalTeamsState = { ...finalTeamsState, ...newTeams };
        const clWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
        const clFixtures = generateSwissFixtures(participants.map(n => finalTeamsState[n]));
        const finalFixtures: Fixture[] = [];
        domesticFixtures.forEach(f => {
            let gameWeek = f.week;
            if (f.week >= 5) gameWeek++; if (f.week >= 9) gameWeek++; if (f.week >= 13) gameWeek++;
            if (f.week >= 17) gameWeek++; if (f.week >= 21) gameWeek++; if (f.week >= 25) gameWeek++;
            if (f.week >= 29) gameWeek++; if (f.week >= 33) gameWeek++;
            finalFixtures.push({ ...f, week: gameWeek });
        });
        clFixtures.forEach(f => { if (clWeeks[f.week - 1]) finalFixtures.push({ ...f, week: clWeeks[f.week - 1] }); });
        const initialTable: LeagueTableEntry[] = Object.values(finalTeamsState).map(t => ({ teamName: t.name, league: t.league, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, }));
        setWeeksInSeason(Math.max(...finalFixtures.map(f => f.week)) + 10);
        setLeagueTable(initialTable); setFixtures(finalFixtures); setCurrentWeek(1);
        setTeams(finalTeamsState); setUserTeamName(selectedTeamName); setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName) && f.week === 1));
        startTutorial();
    }, [isPrologue]);

    const handleCreateManager = (name: string, exp: ExperienceLevel) => {
        let initialRep = 15;
        if (exp.id === 'semi-pro') initialRep = 40; if (exp.id === 'pro') initialRep = 60;
        if (exp.id === 'international') initialRep = 80; if (exp.id === 'legend') initialRep = 95;
        setManagerReputation(initialRep); generateJobs(initialRep);
    };

    const generateJobs = (currentRep: number | ExperienceLevel) => {
        const rep = typeof currentRep === 'number' ? currentRep : managerReputation;
        const allTeamList: Team[] = Object.values(allTeams);
        const shuffle = (array: Team[]) => array.sort(() => 0.5 - Math.random());
        let vacancies: Team[] = [];
        const feasible = allTeamList.filter(t => t.prestige <= rep && t.prestige >= rep - 20);
        const reach = allTeamList.filter(t => t.prestige > rep && t.prestige <= rep + 10);
        const safety = allTeamList.filter(t => t.prestige < rep - 20);
        vacancies = [...shuffle(feasible).slice(0, 4), ...shuffle(reach).slice(0, 2), ...shuffle(safety).slice(0, 1)];
        if (vacancies.length === 0) vacancies = shuffle(allTeamList.filter(t => t.prestige < 60)).slice(0, 3);
        const jobs: Job[] = vacancies.map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality }));
        setAvailableJobs(jobs); setAppScreen(AppScreen.JOB_CENTRE);
    }

    const handleApplyForJob = async (teamName: string) => {
        setAppScreen(AppScreen.JOB_INTERVIEW); setIsLoading(true); setInterview(null); setJobOffer(null); setError(null);
        const team = allTeams[teamName];
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
        setIsLoading(true);
        if (gameState === GameState.POST_MATCH && matchState && userTeamName && currentFixture) {
            try { 
                const oppName = currentFixture.homeTeam === userTeamName ? currentFixture.awayTeam : currentFixture.homeTeam;
                const userGoals = currentFixture.homeTeam === userTeamName ? matchState.homeScore : matchState.awayScore;
                const oppGoals = currentFixture.homeTeam === userTeamName ? matchState.awayScore : matchState.homeScore;
                const result = userGoals > oppGoals ? 'won' : userGoals === oppGoals ? 'drew' : 'lost';
                const scoreLine = `${userGoals}-${oppGoals}`;

                const userClub = teams[userTeamName];
                const tactics = userClub.tactic;
                const standingIndex = leagueTable.findIndex(t => t.teamName === userTeamName);
                const positionStr = standingIndex !== -1 ? `currently ranked ${standingIndex + 1}th out of ${leagueTable.length}` : 'unranked';
                const activePromisesList = userClub.activePromises || [];
                const promisesStr = activePromisesList.length > 0 ? activePromisesList.map(p => p.description).join(', ') : 'None';

                const context = `You are journalists at a post-match press conference.
${userTeamName} just ${result} against ${oppName} with a score of ${scoreLine}.
Manager's Current Tactics: Formation: ${tactics.formation}, Mentality: ${tactics.mentality}.
Current League Standings: ${userTeamName} is ${positionStr}.
Manager's Active Promises to players/board: ${promisesStr}.

The manager is fielding questions. Generate exactly 3 realistic, specific questions about the tactical performance, the match result, our standings, and how this relates to outstanding promises. Do not mention real-world players who aren't in the game.`;

                const qs = await generatePressConference(context); 
                setPressQuestions(qs); 
                setPressContext(`${userTeamName} just ${result} against ${oppName} with a score of ${scoreLine}.`);
                setAppScreen(AppScreen.PRESS_CONFERENCE); 
                setIsLoading(false); 
                return; 
            } catch (e) {
                console.error(e);
            }
        }
        proceedToNextWeek();
    };

    const transitionToClubCareer = (finalReputation: number) => {
        setGameMode('Club');
        setIsPrologue(false);
        setManagerReputation(finalReputation);
        setCurrentYear(1);
        setCurrentWeek(1);
        generateJobs(finalReputation);
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

    const processTeammateRivalries = async (simulatedFixtures: Fixture[], week: number) => {
        if (!userTeamName || !teams[userTeamName]) return;
        const userPlayers = teams[userTeamName].players;
        const flagToCountryName: Record<string, string> = {
            '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'England',
            '🇫🇷': 'France',
            '🇪🇸': 'Spain',
            '🇩🇪': 'Germany',
            '🇵🇹': 'Portugal',
            '🇳🇱': 'Netherlands',
            '🇮🇹': 'Italy',
            '🇺🇸': 'USA',
            '🇯🇵': 'Japan',
            '🇲🇦': 'Morocco',
            '🇧🇪': 'Belgium',
            '🇭🇷': 'Croatia',
            '🇺🇾': 'Uruguay',
            '🇨🇴': 'Colombia',
            '🇩🇰': 'Denmark',
            '🇨🇭': 'Switzerland',
            '🇦🇹': 'Austria',
            '🇹🇷': 'Turkey',
            '🇵🇱': 'Poland',
            '🇭🇺': 'Hungary',
            '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'Scotland',
            '🇨🇿': 'Czechia',
            '🇷🇸': 'Serbia',
            '🇷🇴': 'Romania',
            '🇸🇰': 'Slovakia',
            '🇸🇮': 'Slovenia',
            '🇬🇪': 'Georgia',
            '🇧🇷': 'Brazil',
        };

        for (let i = 0; i < userPlayers.length; i++) {
            const playerA = userPlayers[i];
            const countryA = flagToCountryName[playerA.nationality];
            if (!countryA) continue;

            for (let j = i + 1; j < userPlayers.length; j++) {
                const playerB = userPlayers[j];
                const countryB = flagToCountryName[playerB.nationality];
                if (!countryB || countryA === countryB) continue;

                const match = simulatedFixtures.find(f => 
                    (f.homeTeam === countryA && f.awayTeam === countryB) ||
                    (f.homeTeam === countryB && f.awayTeam === countryA)
                );

                if (match && match.played && match.score) {
                    const homeGoals = parseInt(match.score.split('-')[0]) || 0;
                    const awayGoals = parseInt(match.score.split('-')[1]) || 0;
                    
                    let winnerCountry = '';
                    let loserCountry = '';
                    let matchResult: 'won' | 'lost' | 'draw' = 'draw';
                    if (homeGoals > awayGoals) {
                        winnerCountry = match.homeTeam;
                        loserCountry = match.awayTeam;
                        matchResult = 'won';
                    } else if (awayGoals > homeGoals) {
                        winnerCountry = match.awayTeam;
                        loserCountry = match.homeTeam;
                        matchResult = 'won';
                    }

                    let winnerPlayer = countryA === winnerCountry ? playerA : playerB;
                    let loserPlayer = countryA === loserCountry ? playerA : playerB;
                    
                    if (matchResult === 'draw') {
                        winnerPlayer = playerA;
                        loserPlayer = playerB;
                    }

                    const competitionName = (internationalTournament?.type === 'WorldCup' || match.id.includes('ucl') || (week === 10 && currentYear % 4 === 1 && currentYear > 1)) ? 'World Cup' : 'Euros';
                    const roundName = match.stage || 'Group Stage';
                    
                    try {
                        const rivalry = await getTeammateTournamentRivalry(
                            { name: loserPlayer.name, personality: loserPlayer.personality, nationality: loserPlayer.nationality },
                            { name: winnerPlayer.name, personality: winnerPlayer.personality, nationality: winnerPlayer.nationality },
                            competitionName as any,
                            roundName as any,
                            matchResult,
                            'full-match'
                        );

                        if (rivalry.riftSeverity !== 'none') {
                            setTeams(prevTeams => {
                                const nextTeams = { ...prevTeams };
                                const updatedPlayers = nextTeams[userTeamName].players.map(p => {
                                    if (p.name === playerA.name) {
                                        const effect: PlayerEffect = {
                                            type: 'InternationalRift',
                                            severity: rivalry.riftSeverity as 'minor' | 'moderate' | 'serious',
                                            with: playerB.name,
                                            message: rivalry.reason,
                                            until: week + (rivalry.duration || 6)
                                        };
                                        return { ...p, effects: [...(p.effects || []), effect] };
                                    }
                                    if (p.name === playerB.name) {
                                        const effect: PlayerEffect = {
                                            type: 'InternationalRift',
                                            severity: rivalry.riftSeverity as 'minor' | 'moderate' | 'serious',
                                            with: playerA.name,
                                            message: rivalry.reason,
                                            until: week + (rivalry.duration || 6)
                                        };
                                        return { ...p, effects: [...(p.effects || []), effect] };
                                    }
                                    return p;
                                });
                                nextTeams[userTeamName].players = updatedPlayers;
                                return nextTeams;
                            });

                            const newsId = Date.now() + Math.floor(Math.random() * 1000);
                            setNews(prevNews => [
                                {
                                    id: newsId,
                                    week: week,
                                    title: `Feud Alert: ${playerA.name} vs ${playerB.name}`,
                                    body: `Tension has erupted between ${userTeamName} teammates ${playerA.name} and ${playerB.name} following the match between ${countryA} and ${countryB}. Reason: ${rivalry.reason}`,
                                    type: 'serious-rift',
                                    riftDecision: {
                                        riftPlayerA: playerA.name,
                                        riftPlayerB: playerB.name
                                    }
                                },
                                ...prevNews
                            ].slice(0, 1000));
                        } else {
                            setTeams(prevTeams => {
                                const nextTeams = { ...prevTeams };
                                const updatedPlayers = nextTeams[userTeamName].players.map(p => {
                                    if (p.name === playerA.name) {
                                        const effect: PlayerEffect = {
                                            type: 'TeammateBond',
                                            with: playerB.name,
                                            message: `Strong bond developed on international duty: ${rivalry.reason}`,
                                            until: week + 8
                                        };
                                        return { ...p, effects: [...(p.effects || []), effect] };
                                    }
                                    if (p.name === playerB.name) {
                                        const effect: PlayerEffect = {
                                            type: 'TeammateBond',
                                            with: playerA.name,
                                            message: `Strong bond developed on international duty: ${rivalry.reason}`,
                                            until: week + 8
                                        };
                                        return { ...p, effects: [...(p.effects || []), effect] };
                                    }
                                    return p;
                                });
                                nextTeams[userTeamName].players = updatedPlayers;
                                return nextTeams;
                            });

                            const newsId = Date.now() + Math.floor(Math.random() * 1000);
                            setNews(prevNews => [
                                {
                                    id: newsId,
                                    week: week,
                                    title: `Teammate Bond: ${playerA.name} & ${playerB.name}`,
                                    body: `A strong mutual respect has blossomed between ${playerA.name} and ${playerB.name} after sharing the pitch internationally.`,
                                    type: 'teammate-bond'
                                },
                                ...prevNews
                            ].slice(0, 1000));
                        }
                    } catch (e) {
                        console.error("Failed to generate teammate rivalry", e);
                    }
                }
            }
        }
    };

    const simulateKnockoutRoundBackground = (
        koFixtures: Fixture[],
        teamsRecord: Record<string, Team>
    ): { simulated: Fixture[], winners: string[] } => {
        const simulated: Fixture[] = [];
        const winners: string[] = [];
        koFixtures.forEach(f => {
            const res = simulateKnockoutQuickMatch(teamsRecord[f.homeTeam], teamsRecord[f.awayTeam]);
            simulated.push({
                ...f,
                played: true,
                score: `${res.homeGoals}-${res.awayGoals}`,
                penaltyWinner: res.penaltyWinner
            });
            const isHomeWinner = res.penaltyWinner ? res.penaltyWinner === 'home' : res.homeGoals > res.awayGoals;
            winners.push(isHomeWinner ? f.homeTeam : f.awayTeam);
        });
        return { simulated, winners };
    };

    const runBackgroundTournamentWeek10 = async (tournamentType: 'Euros' | 'WorldCup') => {
        const intTeams = tournamentType === 'Euros' ? generateEurosStructure() : generateExpandedWorldCupStructure();
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
            const res = simulateQuickMatch(intTeams[f.homeTeam], intTeams[f.awayTeam]);
            updateIntTeam(intTable, f.homeTeam, res.homeGoals, res.awayGoals);
            updateIntTeam(intTable, f.awayTeam, res.awayGoals, res.homeGoals);
            return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` };
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

        await processTeammateRivalries(simulatedFixtures, 10);

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

            await processTeammateRivalries(simR16, 20);
            await processTeammateRivalries(simQF, 20);

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

            await processTeammateRivalries(simR32, 20);
            await processTeammateRivalries(simR16, 20);
            await processTeammateRivalries(simQF, 20);

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
        setInternationalTournament(null);

        await processTeammateRivalries(simSF, 30);
        await processTeammateRivalries(simFinal, 30);

        const champion = finalWinner[0];
        const newsBody = `The tournament is over! ${champion} are the champions of the ${currentTourney.type}! They defeated ${sfWinners.find(w => w !== champion)} in the Final.`;
        setNews(prev => [{
            id: Date.now(),
            week: 30,
            title: `${champion} Wins the ${currentTourney.type}!`,
            body: newsBody,
            type: 'tournament-result'
        }, ...prev]);
        
        setTeams(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(tName => {
                updated[tName].players = updated[tName].players.map(p => {
                    if (p.nationality === champion) {
                        const effect: PlayerEffect = {
                            type: 'PostTournamentMorale',
                            morale: 'Winner',
                            message: `Winner of ${currentTourney.type} with ${champion}!`,
                            until: currentWeek + 10
                        };
                        return {
                            ...p,
                            effects: [...p.effects, effect]
                        };
                    }
                    return p;
                });
            });
            return updated;
        });
    };

    const handleFinishPressConference = (report: PressConferenceReport) => {
        setManagerReputation(r => Math.max(0, Math.min(100, r + report.reputationChange)));

        if (userTeamName) {
            setTeams(prev => {
                const updated = { ...prev };
                const club = updated[userTeamName];
                if (club) {
                    club.players = club.players.map(p => {
                        if (p.isStarter) {
                            return { 
                                ...p, 
                                form: Math.max(0, Math.min(100, p.form + report.squadFormChange)) 
                            };
                        }
                        return p;
                    });
                }
                return updated;
            });
        }

        setNews(prev => [
            {
                id: Date.now(),
                week: currentWeek,
                title: `📰 ${report.newspaperName}: ${report.headline}`,
                body: `${report.article}\n\n📊 Impact: Reputation (${report.reputationChange >= 0 ? '+' : ''}${report.reputationChange}%), Squad Form (${report.squadFormChange >= 0 ? '+' : ''}${report.squadFormChange} pts)`,
                type: 'press'
            },
            ...prev
        ]);

        proceedToNextWeek();
    };

    const proceedToNextWeek = async () => {
        if (currentWeek >= weeksInSeason) {
            if (gameMode === 'Club') {
                const nextYear = currentYear + 1;
                setCurrentYear(nextYear);
                setCurrentWeek(1);

                const updatedTable: LeagueTableEntry[] = Object.values(teams).map(t => ({
                    teamName: t.name,
                    league: t.league,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
                    points: 0
                }));
                setLeagueTable(updatedTable);

                const domesticFixtures = generateFixtures(Object.values(teams));
                const { participants, newTeams } = getChampionsLeagueParticipants(teams);
                const finalTeamsState = { ...teams, ...newTeams };

                // --- End-of-season Board Evaluation & Sacking Checks ---
                const finalPosition = leagueTable.findIndex(t => t.teamName === userTeamName) + 1;
                const userClub = finalTeamsState[userTeamName];
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
                    const isTopTier = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(userClub.league);
                    const totalTeams = leagueTable.length;
                    const isRelegated = isTopTier && finalPosition > (totalTeams - 3);

                    if (isRelegated) {
                        isSacked = true;
                        sackMessage = `Relegation Disaster: ${userTeamName} has been relegated! The board has terminated your contract immediately.`;
                    } else {
                        const objective = userClub.objectives?.[0] || 'Mid-table Finish';
                        const targetPos = getTargetPosition(objective);
                        const gap = finalPosition - targetPos;

                        if (gap > 0) {
                            const sackingIndex = gap * 15 + (100 - managerReputation) * 0.5;
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

                if (isSacked) {
                    const nextRep = Math.max(10, Math.round(managerReputation * 0.8));
                    setManagerReputation(nextRep);
                    setUserTeamName(undefined);
                    
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
                        trophies: []
                    };
                    setCareerHistory(prev => [...prev, honorsEntry]);
                    
                    generateJobs(nextRep);
                    setIsLoading(false);
                    return;
                }

                if (userClub && userClub.league !== 'International') {
                    const finalPositionOrdinal = finalPosition === 1 ? '1st' : finalPosition === 2 ? '2nd' : finalPosition === 3 ? '3rd' : `${finalPosition}th`;
                    const trophiesWon: string[] = [];
                    if (finalPosition === 1) {
                        trophiesWon.push(`${userClub.league} Champion`);
                    }
                    const honorsEntry = {
                        year: currentYear,
                        teamName: userTeamName,
                        league: userClub.league,
                        finalPosition: finalPositionOrdinal,
                        trophies: trophiesWon
                    };
                    setCareerHistory(prev => [...prev, honorsEntry]);
                }

                const clWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
                const clFixtures = generateSwissFixtures(participants.map(n => nextYearTeams[n]));
                const finalFixtures: Fixture[] = [];
                domesticFixtures.forEach(f => {
                    let gameWeek = f.week;
                    if (f.week >= 5) gameWeek++; if (f.week >= 9) gameWeek++; if (f.week >= 13) gameWeek++;
                    if (f.week >= 17) gameWeek++; if (f.week >= 21) gameWeek++; if (f.week >= 25) gameWeek++;
                    if (f.week >= 29) gameWeek++; if (f.week >= 33) gameWeek++;
                    finalFixtures.push({ ...f, week: gameWeek });
                });
                clFixtures.forEach(f => { if (clWeeks[f.week - 1]) finalFixtures.push({ ...f, week: clWeeks[f.week - 1] }); });

                setFixtures(finalFixtures);
                setWeeksInSeason(Math.max(...finalFixtures.map(f => f.week)) + 10);
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
        const updateTeam = (table: any[], name: string, goalsFor: number, goalsAgainst: number) => {
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

        const nextFixtures = fixtures.map(f => {
            if (f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName) {
                if (f.isKnockout) {
                    const res = simulateKnockoutQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
                    results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, penaltyWinner: res.penaltyWinner });
                    return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}`, penaltyWinner: res.penaltyWinner };
                } else {
                    const res = simulateQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
                    results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
                    updateTeam(updatedTable, f.homeTeam, res.homeGoals, res.awayGoals);
                    updateTeam(updatedTable, f.awayTeam, res.awayGoals, res.homeGoals);
                    return { ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` };
                }
            }
            if (f.week === currentWeek && (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && matchState) {
                return { 
                    ...f, 
                    played: true, 
                    score: `${matchState.homeScore}-${matchState.awayScore}`,
                    penaltyWinner: matchState.penaltyWinner as 'home' | 'away' | undefined
                };
            }
            return f;
        });

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
                    transitionToClubCareer(finalRep);
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
                    transitionToClubCareer(finalRep);
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
                    transitionToClubCareer(finalRep);
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
                    transitionToClubCareer(finalRep);
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
                    transitionToClubCareer(finalRep);
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
                    transitionToClubCareer(finalRep);
                    setIsLoading(false);
                    return;
                }
            }
        }
        
        setFixtures(nextFixtures);
        setLeagueTable(updatedTable);

        // --- Rift/Unhappy check and Transfer Request generation ---
        let updatedBids = [...incomingBids];
        let riftTransferRequestedPlayers: string[] = [];

        if (gameMode === 'Club' && userTeamName && teams[userTeamName]) {
            setTeams(prevTeams => {
                const nextTeams = { ...prevTeams };
                const userClub = nextTeams[userTeamName];
                userClub.players = userClub.players.map(p => {
                    const hasSeriousRift = (p.effects || []).some(e => 
                        (e.type === 'InternationalRift' && e.severity === 'serious') || 
                        e.type === 'BadChemistry'
                    );

                    const unresolvedRiftFor4Weeks = (p.effects || []).some(e => 
                        (e.type === 'BadChemistry' && (e.until - currentWeek) <= 4) ||
                        (e.type === 'InternationalRift' && e.severity === 'serious' && (e.until - currentWeek) <= 2)
                    );

                    if (hasSeriousRift && unresolvedRiftFor4Weeks && !p.transferRequested) {
                        riftTransferRequestedPlayers.push(p.name);
                        return { ...p, transferRequested: true };
                    }
                    return p;
                });
                return nextTeams;
            });
        }

        // Post transfer request news cards
        riftTransferRequestedPlayers.forEach(pName => {
            setNews(prevNews => [
                {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    week: currentWeek,
                    title: `Transfer Request: ${pName}`,
                    body: `${pName} has formally requested a transfer from ${userTeamName} due to ongoing dressing room tension and unresolved feuds.`,
                    type: 'player-departure'
                },
                ...prevNews
            ].slice(0, 1000));
            logger.warning(`Transfer request submitted by ${pName} at ${userTeamName}.`);
        });

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
        if (gameMode === 'Club' && userTeamName && teams[userTeamName]) {
            const userClub = teams[userTeamName];
            userClub.players.forEach(p => {
                const bidChance = p.transferRequested ? 0.35 : 0.05;
                if (Math.random() < bidChance) {
                    const otherClubs = Object.keys(teams).filter(t => t !== userTeamName && teams[t].league !== 'International');
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

        if (gameMode === 'Club' && INTERNATIONAL_BREAK_WEEKS.includes(nextW)) {
            const summary = await getInternationalBreakSummary(nextW);
            setNews(prev => [{ id: Date.now(), week: nextW, title: summary.newsTitle, body: summary.newsBody, type: 'call-up' }, ...prev]);
        }
        
        setTeams(prev => {
            const newTeams = { ...prev };

            // 1. Process weekly wages and broadcast revenues for all club teams
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

            // 2. Process matchday revenues for home teams of matches played in currentWeek
            if (gameMode === 'Club') {
                nextFixtures.forEach(f => {
                    if (f.week === currentWeek && f.league !== 'International') {
                        const homeTeam = newTeams[f.homeTeam];
                        if (homeTeam) {
                            const matchDayRev = homeTeam.matchDayRevenue || Math.round(homeTeam.prestige * 30000 + (Math.random() * 50000 - 25000));
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
                            let rating = 6.0 + Math.random() * 2.0;
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
                            let rating = 6.0 + Math.random() * 2.0;
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
                                    const scorer = scorersPool.length ? scorersPool[Math.floor(Math.random() * scorersPool.length)] : homeStarters[Math.floor(Math.random() * homeStarters.length)];
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
                                    const scorer = scorersPool.length ? scorersPool[Math.floor(Math.random() * scorersPool.length)] : awayStarters[Math.floor(Math.random() * awayStarters.length)];
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
                        const performanceFactor = p.isStarter ? (Math.random() * 1.0 - 0.5) : 0;
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
                        logger.info(`Tension has cooled down between ${updatedPlayer.name} and ${r.with}.`);
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
        if (gameMode === 'Club' && managerReputation >= 50 && Math.random() < 0.08) {
            const allTeamList = Object.values(teams).filter(t => t.name !== userTeamName && t.league !== 'International');
            const matchingTeams = allTeamList.filter(t => t.prestige <= managerReputation + 10 && t.prestige >= managerReputation - 15);
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
            const userClub = teams[userTeamName];
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
        setCurrentWeek(nextW);
        setCurrentFixture(nextFixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); 
        setGameState(GameState.PRE_MATCH); 
        setIsLoading(false);
        setAppScreen(AppScreen.GAMEPLAY);
    };

    const handleStartMatch = () => {
        if (!currentFixture || !userTeam) return;
        
        // Validation: prevent starting injured, suspended, or sent-off players
        const unavailableStarters = userTeam.players.filter(p => 
            p.isStarter && (p.status.type === 'Injured' || p.status.type === 'Suspended' || p.status.type === 'SentOff')
        );

        if (unavailableStarters.length > 0) {
            const names = unavailableStarters.map(p => `${p.name} (${p.status.type})`).join(', ');
            alert(`Selection Error: You have unavailable players in your starting lineup: ${names}. Replace them before kick-off!`);
            return;
        }

        setError(null);
        setMatchState({ currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: "Kick off." });
        setGameState(GameState.PLAYING); 
        setCurrentPlaybackMinute(0);
        setSimulationTargetMinute(0);
        setPendingEvents([]);
    };

    const handleResumeMatch = (shout?: TouchlineShout) => {
        if (shout) setActiveShout(shout);
        setError(null);
        setGameState(GameState.PLAYING);
        // Fix: If at halftime (45'), force simulation to advance to 46' to break the pause loop
        if (currentPlaybackMinute === 45) {
            setSimulationTargetMinute(46);
        }
    }

    const handleSimulateSegment = async (targetMinute: number, momentumShift: number = 0) => {
        if (!currentFixture || !matchState || !userTeam) return;
        if (momentumShift !== 0) {
            setMatchState(prev => prev ? { ...prev, momentum: Math.max(-100, Math.min(100, prev.momentum + momentumShift)) } : null);
        }
        if (targetMinute <= 0) {
            setGameState(GameState.PAUSED);
            return;
        }
        setSimulationTargetMinute(targetMinute);
        setError(null);
        setGameState(GameState.PLAYING);
    };

    const finishMatch = () => {
        setGameState(GameState.POST_MATCH);
        if (!matchState || !userTeamName || !currentFixture) return;

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
                    const idx = newTable.findIndex(t => t.teamName === name);
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
        setMatchState(prev => prev ? ({ ...prev, subsUsed: { home: isHome ? prev.subsUsed.home + 1 : prev.subsUsed.home, away: !isHome ? prev.subsUsed.away + 1 : prev.subsUsed.away }, events: [...prev.events, { id: Date.now(), minute: prev.currentMinute, type: 'sub', description: `SUB: ${playerIn.name} ON, ${playerOut.name} OFF`, teamName: userTeamName }] }) : null);
    };

    const handleStartPlayerTalk = async (player: Player, context: 'transfer' | 'renewal') => {
        if (!userTeamName) return;
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
        if (talkResult?.decision === 'accepted' && playerTalk && userTeamName && pendingContractTerms) {
            const signingBonus = pendingContractTerms.signingBonus;
            setTeams(prev => {
                const team = prev[userTeamName];
                let updatedPlayers;

                const newPromises = (talkResult.extractedPromises || []).map(desc => ({
                    id: `${Date.now()}-${Math.random()}`,
                    description: desc,
                    deadlineWeek: currentWeek + 10,
                    status: 'pending' as const,
                    playerInvolved: playerTalk.player.name
                }));

                const activePromises = [...(team.activePromises || []), ...newPromises];

                if (playerTalk.context === 'renewal') {
                    updatedPlayers = team.players.map(p => 
                        p.name === playerTalk.player.name 
                        ? {
                            ...p,
                            wage: pendingContractTerms.wage,
                            contractExpires: pendingContractTerms.length,
                            contractIncentives: {
                                performanceBonus: pendingContractTerms.performanceBonus,
                                bonusType: pendingContractTerms.bonusType,
                            },
                        }
                        : p
                    );
                } else {
                    const newPlayer = { 
                        ...playerTalk.player, 
                        isStarter: false, 
                        contractExpires: pendingContractTerms.length, 
                        wage: pendingContractTerms.wage,
                        contractIncentives: {
                            performanceBonus: pendingContractTerms.performanceBonus,
                            bonusType: pendingContractTerms.bonusType,
                        },
                        status: { type: 'Available' as const }, 
                        effects: [] 
                    };
                    updatedPlayers = [...team.players, newPlayer];
                }
                
                return { 
                    ...prev, 
                    [userTeamName]: {
                        ...team,
                        players: updatedPlayers,
                        activePromises,
                        balance: team.balance - signingBonus,
                    } 
                };
            });

            setNews(prev => ([
                {
                    id: Date.now(),
                    week: currentWeek,
                    title: playerTalk.context === 'renewal' ? 'Contract Renewed' : 'Signing Completed',
                    body: `${playerTalk.player.name} agreed terms: $${pendingContractTerms.wage.toLocaleString()}/week, $${pendingContractTerms.signingBonus.toLocaleString()} signing bonus, and $${pendingContractTerms.performanceBonus.toLocaleString()} ${pendingContractTerms.bonusType === 'goal' ? 'goal bonus' : pendingContractTerms.bonusType === 'cleanSheet' ? 'clean-sheet bonus' : 'appearance bonus'}.`,
                    type: 'finance',
                },
                ...prev,
            ]).slice(0, 1000));

            if (playerTalk.context === 'transfer') {
                setTransferMarket(prev => prev.filter(p => p.name !== playerTalk.player.name));
            }
        }
        setPlayerTalk(null); setTalkResult(null); setPendingContractTerms(null); setAppScreen(AppScreen.GAMEPLAY);
    };

    const handleRiftDecision = (newsId: number, playerAName: string, playerBName: string, choice: 'bench-a' | 'bench-b' | 'risk-it') => {
        let finalTeams: any = null;
        let finalNews: any = null;

        setTeams(prevTeams => {
            if (!userTeamName || !prevTeams[userTeamName]) return prevTeams;
            const nextTeams = { ...prevTeams };
            const updatedPlayers = nextTeams[userTeamName].players.map(p => {
                if (p.name === playerAName) {
                    let nextEffects = (p.effects || []).filter(e => !(e.type === 'InternationalRift' && e.with === playerBName));
                    let nextForm = p.form;
                    if (choice === 'bench-a') {
                        nextEffects.push({
                            type: 'PostTournamentMorale',
                            morale: 'Disappointed',
                            message: `Benched due to rift with ${playerBName}`,
                            until: currentWeek + 4
                        });
                    } else if (choice === 'risk-it') {
                        nextEffects.push({
                            type: 'BadChemistry',
                            with: playerBName,
                            message: `Feud on the pitch with ${playerBName}`,
                            until: currentWeek + 8
                        });
                        nextForm = Math.max(0, nextForm - 20);
                    }
                    return { ...p, effects: nextEffects, form: nextForm };
                }
                if (p.name === playerBName) {
                    let nextEffects = (p.effects || []).filter(e => !(e.type === 'InternationalRift' && e.with === playerAName));
                    let nextForm = p.form;
                    if (choice === 'bench-b') {
                        nextEffects.push({
                            type: 'PostTournamentMorale',
                            morale: 'Disappointed',
                            message: `Benched due to rift with ${playerAName}`,
                            until: currentWeek + 4
                        });
                    } else if (choice === 'risk-it') {
                        nextEffects.push({
                            type: 'BadChemistry',
                            with: playerAName,
                            message: `Feud on the pitch with ${playerAName}`,
                            until: currentWeek + 8
                        });
                        nextForm = Math.max(0, nextForm - 20);
                    }
                    return { ...p, effects: nextEffects, form: nextForm };
                }
                return p;
            });
            nextTeams[userTeamName].players = updatedPlayers;
            finalTeams = nextTeams;
            return nextTeams;
        });

        setNews(prevNews => {
            const updatedNews = prevNews.map(item => {
                if (item.id === newsId && item.riftDecision) {
                    let effect = '';
                    if (choice === 'bench-a') {
                        effect = `${playerAName} was benched and is disappointed. ${playerBName} feels vindicated. The rift has cooled down.`;
                    } else if (choice === 'bench-b') {
                        effect = `${playerBName} was benched and is disappointed. ${playerAName} feels vindicated. The rift has cooled down.`;
                    } else {
                        effect = `Both players played. Tactical chemistry is severely penalized (-30) and their form has dropped due to high tension!`;
                    }
                    return {
                        ...item,
                        riftDecision: {
                            ...item.riftDecision,
                            choice,
                            resultEffect: effect
                        }
                    };
                }
                return item;
            });
            finalNews = updatedNews;
            return updatedNews;
        });

        setTimeout(() => {
            if (userTeamName && finalTeams && finalNews) {
                const stateToSave = {
                    userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
                    teams: finalTeams, leagueTable, fixtures, news: finalNews, weeklyResults, appScreen, gameState,
                    managerReputation, transferMarket, internationalTournament, incomingBids, careerHistory
                };
                localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
            }
        }, 100);
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

    const worldCupTeams = NATIONAL_TEAMS.map(convertNationalTeam);
    const clubTeams = Object.values(allTeams);

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return (
                <div>
                    <StartScreen 
                        onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} 
                        onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} 
                        onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} 
                        onThemeSelect={(colors) => setActiveTheme(colors)}
                    />
                    {localStorage.getItem('gfm_save_v1') && (
                        <div className="text-center pb-8 -mt-8">
                            <button onClick={handleContinue} className="text-sm font-bold text-blue-400 hover:text-blue-300 underline">Continue Saved Career</button>
                        </div>
                    )}
                </div>
            );
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={clubTeams} onTeamSelect={initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={worldCupTeams} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen onCreate={handleCreateManager} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={handleApplyForJob} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={error} jobOffer={jobOffer} onAnswerSubmit={handleJobInterviewAnswer} onFinish={(acc) => { if(acc && interview) initializeGame(interview.teamName); else setAppScreen(AppScreen.JOB_CENTRE); }} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={transferMarket} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} clubBudget={userTeam ? { balance: userTeam.balance, transferBudget: userTeam.transferBudget || Math.floor(userTeam.balance * 0.7), weeklyWageBill: userTeam.weeklyWageBill || userTeam.players.reduce((sum, p) => sum + p.wage, 0) } : undefined} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <div className="relative">
                        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        {showMechanicsGuide && <MechanicsGuide onClose={() => setShowMechanicsGuide(false)} />}
                        <div className="lg:col-span-3">
                            <TeamDetails 
                                team={userTeam} 
                                gameState={gameState} 
                                managerReputation={managerReputation}
                                nextFixture={currentFixture}
                                activeTab={gameplayTab}
                                onNavigateToTab={setGameplayTab}
                                onResign={handleResign}
                            />
                        </div>
                        
                        <div className="lg:col-span-9 flex flex-col gap-6">
                            {/* PC Glassmorphic Navigation Tabs */}
                            <div className="flex border-b border-gray-800 bg-gray-950/60 p-1.5 rounded-lg gap-2 shadow-inner border border-slate-800/40 backdrop-blur-md">
                                <button onClick={() => setGameplayTab('match')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'match' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>🎮</span> Match Center
                                </button>
                                <button onClick={() => setGameplayTab('tactics')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'tactics' ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>📋</span> Roster & Tactics
                                </button>
                                <button onClick={() => setGameplayTab('news')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'news' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>📰</span> Inbox Feed
                                </button>
                                <button onClick={() => setGameplayTab('scouting')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'scouting' || gameplayTab === 'scouting_market' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>🔍</span> Scout Network
                                </button>
                                <button onClick={() => setGameplayTab('transfers')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'transfers' ? 'bg-gradient-to-r from-green-700 to-emerald-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>🤝</span> Negotiations
                                </button>
                                <button onClick={() => setGameplayTab('honors')} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${gameplayTab === 'honors' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'}`}>
                                    <span>🏆</span> Trophy Room
                                </button>
                            </div>

                            {/* Active Tab Panel */}
                            {gameplayTab === 'tactics' && (
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
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
                                <div className="grid grid-cols-1 lg:grid-cols-9 gap-6">
                                    <div className="lg:col-span-6">
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
                                    <div className="lg:col-span-3">
                                        <LeagueTableView table={leagueTable} userTeamName={userTeamName} />
                                    </div>
                                </div>
                            )}

                            {gameplayTab === 'news' && (
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                                    <NewsScreen news={news} onRiftDecision={handleRiftDecision} onJobOfferDecision={handleJobOfferDecision} onBack={() => setGameplayTab('match')} />
                                </div>
                            )}

                            {gameplayTab === 'scouting' && (
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                                    <ScoutingScreen isNationalTeam={gameMode === 'WorldCup'} onScout={async (r, useReal) => { setIsLoading(true); const res = await scoutPlayers(r, useReal); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setGameplayTab('match')} onGoToTransfers={() => setGameplayTab('scouting_market')} />
                                </div>
                            )}

                            {gameplayTab === 'scouting_market' && (
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                                    <TransfersScreen targets={transferMarket} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setGameplayTab('scouting')} />
                                </div>
                            )}

                            {gameplayTab === 'transfers' && (
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
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
                                <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                                    <div className="text-center mb-8">
                                        <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-widest bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">🏆 Trophy Room & Career Honors</h2>
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
                                                { key: 'World Cup Champion', label: 'World Cups', icon: '🌎' },
                                                { key: 'Euro Champion', label: 'Euros', icon: '🇪🇺' },
                                                { key: 'Premier League Champion', label: 'Premier Leagues', icon: '🦁' },
                                                { key: 'La Liga Champion', label: 'La Liga Titles', icon: '🇪🇸' },
                                                { key: 'Serie A Champion', label: 'Serie A Titles', icon: '🇮🇹' },
                                                { key: 'Bundesliga Champion', label: 'Bundesligas', icon: '🇩🇪' },
                                                { key: 'Ligue 1 Champion', label: 'Ligue 1 Titles', icon: '🇫🇷' },
                                            ];

                                            return trophyTypes.map(t => {
                                                const count = counts[t.key] || 0;
                                                return (
                                                    <div key={t.key} className="bg-gray-800 border border-gray-700 p-4 rounded-lg text-center shadow-inner">
                                                        <div className="text-3xl mb-1">{t.icon}</div>
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
                                                            <span className="px-2 py-0.5 bg-yellow-950/80 border border-yellow-800/50 text-yellow-400 text-[10px] font-bold font-mono rounded">YEAR {entry.year}</span>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-white">{entry.teamName}</h4>
                                                                <p className="text-xs text-gray-400">{entry.league} &bull; Position: <span className="font-semibold text-gray-300">{entry.finalPosition}</span></p>
                                                            </div>
                                                        </div>
                                                        {entry.trophies && entry.trophies.length > 0 && (
                                                            <div className="mt-2 sm:mt-0 flex flex-wrap gap-1.5">
                                                                {entry.trophies.map((t, tIdx) => (
                                                                    <span key={tIdx} className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-[10px] font-black uppercase rounded flex items-center gap-1">
                                                                        🏆 {t}
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
                            <h2 className="text-3xl font-extrabold text-white mb-2 uppercase tracking-widest bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">🏆 Trophy Room & Career Honors</h2>
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
                                    { key: 'World Cup Champion', label: 'World Cups', icon: '🌎' },
                                    { key: 'Euro Champion', label: 'Euros', icon: '🇪🇺' },
                                    { key: 'Premier League Champion', label: 'Premier Leagues', icon: '🦁' },
                                    { key: 'La Liga Champion', label: 'La Liga Titles', icon: '🇪🇸' },
                                    { key: 'Serie A Champion', label: 'Serie A Titles', icon: '🇮🇹' },
                                    { key: 'Bundesliga Champion', label: 'Bundesligas', icon: '🇩🇪' },
                                    { key: 'Ligue 1 Champion', label: 'Ligue 1 Titles', icon: '🇫🇷' },
                                ];

                                return trophyTypes.map(t => {
                                    const count = counts[t.key] || 0;
                                    return (
                                        <div key={t.key} className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-lg text-center backdrop-blur-sm">
                                            <div className="text-3xl mb-1">{t.icon}</div>
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
                                                <span className="px-2 py-0.5 bg-yellow-950/80 border border-yellow-800/50 text-yellow-400 text-[10px] font-bold font-mono rounded">YEAR {entry.year}</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">{entry.teamName}</h4>
                                                    <p className="text-xs text-gray-400">{entry.league} &bull; Position: <span className="font-semibold text-gray-300">{entry.finalPosition}</span></p>
                                                </div>
                                            </div>
                                            {entry.trophies && entry.trophies.length > 0 && (
                                                <div className="mt-2 sm:mt-0 flex flex-wrap gap-1.5">
                                                    {entry.trophies.map((t, tIdx) => (
                                                        <span key={tIdx} className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-[10px] font-black uppercase rounded flex items-center gap-1">
                                                            🏆 {t}
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
            case AppScreen.PRESS_CONFERENCE: return <PressConferenceScreen questions={pressQuestions} resultContext={pressContext} onFinish={handleFinishPressConference} />;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-4" style={{ 
            backgroundImage: activeTheme ? `radial-gradient(circle at 50% 0%, ${activeTheme.primary}40 0%, #111827 60%)` : undefined 
        }}>
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
