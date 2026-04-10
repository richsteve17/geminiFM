
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, GameMode, NegotiationResult, MatchEvent, ShoutEffect, PlayerEffect, WorldCupResult, WorldCupOutcome, NegotiationMessage } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import AtmosphereWidget from './components/AtmosphereWidget';
import { simulateMatchSegment, evaluateInterview, scoutPlayers, scoutFollowUp, getInternationalBreakSummary, getInterviewOpeningMessage, continueInterviewChat, generatePressConferenceOpener, continuePressConferenceChat, getTeammateTournamentRivalry, getPlayerPostTournamentMorale, continueNegotiationChat, evaluateNegotiationOffer, type ChatMessage, type InterviewContext, type PressConferenceContext } from './services/geminiService';
import type { ScoutArchetype, ScoutReport } from './services/geminiService';
import { generatePunkChant, type Chant } from './services/chantService';
import { generateFixtures, simulateQuickMatch, generateSwissFixtures, analyzeTactics, FORMATION_SLOTS } from './utils';
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
import { generateWorldCupStructure, NATIONAL_TEAMS, calculateWorldCupQualifiers, generateKnockoutFixtures } from './international';
import { getChampionsLeagueParticipants } from './europe';
import WorldCupResultScreen from './components/WorldCupResultScreen';

const INTERNATIONAL_BREAK_WEEKS = [10, 20, 30];
const SIMULATION_CHUNK_MINUTES = 10; 
const TICK_DELAY_MS = 1200; 
const TICK_DELAY_GOAL_MS = 6000;
const TICK_DELAY_EVENT_MS = 2500;

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
    const [showTutorial, setShowTutorial] = useState(false);
    const [showMechanicsGuide, setShowMechanicsGuide] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [weeksInSeason, setWeeksInSeason] = useState(38); 
    const [teams, setTeams] = useState<Record<string, Team>>(allTeams);
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
    const [jobOffer, setJobOffer] = useState<{ offer: boolean; reasoning: string } | null>(null);

    // --- CHAT-BASED INTERVIEW STATE ---
    const [interviewTeamName, setInterviewTeamName] = useState<string | null>(null);
    const [interviewPersonality, setInterviewPersonality] = useState<string | null>(null);
    const [interviewChatHistory, setInterviewChatHistory] = useState<ChatMessage[]>([]);
    const [interviewContext, setInterviewContext] = useState<InterviewContext | null>(null);

    // --- CHAT-BASED PRESS CONFERENCE STATE ---
    const [pressChatHistory, setPressChatHistory] = useState<ChatMessage[]>([]);
    const [pressConferenceContext, setPressConferenceContext] = useState<PressConferenceContext | null>(null);
    const [pressConferenceDone, setPressConferenceDone] = useState(false);
    
    // Negotiation States
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<NegotiationResult | null>(null);
    const [pendingContractTerms, setPendingContractTerms] = useState<{ wage: number, length: number } | null>(null);
    
    // Transfer Market State (Mutable!)
    const [transferMarket, setTransferMarket] = useState<Player[]>(TRANSFER_TARGETS);

    const [activeShout, setActiveShout] = useState<TouchlineShout | undefined>(undefined);
    const [activeShoutEffect, setActiveShoutEffect] = useState<ShoutEffect | undefined>(undefined);
    const [scoutResults, setScoutResults] = useState<Player[]>([]);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [managerReputation, setManagerReputation] = useState<number>(0);
    
    // --- CHANT STATE ---
    // Season-level melody tracker — persists across matches within a season
    const [seasonUsedMelodies, setSeasonUsedMelodies] = useState<string[]>([]);

    // --- WORLD CUP STATE ---
    const [wcKnockoutResults, setWcKnockoutResults] = useState<Fixture[]>([]);
    const [wcResult, setWcResult] = useState<WorldCupResult | null>(null);

    // --- THEMING STATE ---
    const [activeTheme, setActiveTheme] = useState<{ primary: string, secondary: string, text: string } | null>(null);

    const userTeam = userTeamName ? teams[userTeamName] : null;

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
    
    // Segment breakpoints where the game pauses for manager decisions
    const SEGMENT_BREAKPOINTS = [45, 60, 75, 90];

    // --- LIVE SIMULATION LOOP ---
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const runPlaybackTick = async () => {
            if (gameState === GameState.PLAYING && currentFixture && userTeam && matchState && !isLoading) {
                
                if (currentPlaybackMinute >= simulationTargetMinute) {
                    if (currentPlaybackMinute >= 90) {
                        finishMatch();
                        return;
                    }
                    // Pause at every segment breakpoint for manager decisions
                    if (SEGMENT_BREAKPOINTS.includes(currentPlaybackMinute) && currentPlaybackMinute > 0) {
                        setGameState(GameState.PAUSED);
                        return;
                    }

                    setIsLoading(true);

                    // Determine next target: advance to next breakpoint
                    const nextBreakpoint = SEGMENT_BREAKPOINTS.find(bp => bp > currentPlaybackMinute) || 90;
                    const nextTarget = Math.min(simulationTargetMinute + SIMULATION_CHUNK_MINUTES, nextBreakpoint);
                    
                    // --- CONSTRUCT TACTICAL CONTEXT with fatigue & position-fit ---
                    const starters = userTeam.players.filter(p => p.isStarter);
                    const analysis = analyzeTactics(starters, userTeam.tactic.formation);
                    const formationSlots = FORMATION_SLOTS[userTeam.tactic.formation];
                    
                    let tacticalContext = `User Team Efficiency: ${analysis.score}%.\nFormation: ${userTeam.tactic.formation}, Mentality: ${userTeam.tactic.mentality}\n`;
                    tacticalContext += `Lineup (with condition & position-fit flags):\n`;
                    starters.forEach((p, i) => {
                        const slotRole = formationSlots[i] || "Sub";
                        const isOOP = analysis.assignments[i]?.isOutOfPosition;
                        const isFatigued = p.condition < 70;
                        const flags = [];
                        if (isOOP) flags.push(`[MISPLACED — playing as ${slotRole}, 50% effectiveness]`);
                        if (isFatigued) flags.push(`[FATIGUED — ${p.condition}% condition, error-prone]`);
                        const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : ` (${slotRole}, ${p.condition}% fit)`;
                        tacticalContext += `- ${p.name} (${p.position}):${flagStr}\n`;
                    });
                    
                    if (analysis.score < 50) {
                        tacticalContext += `\nCRITICAL: The team is confused and disorganized. Players are misplaced. Expect frequent mistakes.`;
                    }

                    // Get opponent team data
                    const opponentName = currentFixture.homeTeam === userTeamName ? currentFixture.awayTeam : currentFixture.homeTeam;
                    const opponentTeam = teams[opponentName];
                    const opponentFormation = opponentTeam?.tactic?.formation;
                    const opponentMentality = opponentTeam?.tactic?.mentality;

                    // Build rift and bond pairs for chemistry injection
                    const riftPairs: { playerA: string; playerB: string; severity: string }[] = [];
                    const bondPairs: { playerA: string; playerB: string }[] = [];
                    if (userTeam) {
                        userTeam.players.forEach(p => {
                            p.effects.forEach(eff => {
                                if (eff.type === 'InternationalRift' && eff.severity !== 'none') {
                                    riftPairs.push({ playerA: p.name, playerB: eff.with, severity: eff.severity });
                                }
                                if (eff.type === 'TeammateBond') {
                                    bondPairs.push({ playerA: p.name, playerB: eff.with });
                                }
                            });
                        });
                    }

                    const result = await simulateMatchSegment(
                        teams[currentFixture.homeTeam], 
                        teams[currentFixture.awayTeam], 
                        matchState, 
                        nextTarget, 
                        { 
                            shout: activeShout, 
                            userTeamName, 
                            tacticalContext,
                            userFormation: userTeam.tactic.formation,
                            userMentality: userTeam.tactic.mentality,
                            opponentFormation,
                            opponentMentality,
                            shoutEffect: activeShoutEffect ? {
                                momentumDelta: activeShoutEffect.momentumDelta,
                                defensiveModifier: activeShoutEffect.defensiveModifier,
                                attackModifier: activeShoutEffect.attackModifier
                            } : undefined,
                            riftPairs,
                            bondPairs
                        }
                    );

                    setPendingEvents(prev => [...prev, ...result.events]);
                    
                    setMatchState(prev => prev ? ({
                        ...prev,
                        homeScore: prev.homeScore + result.homeScoreAdded,
                        awayScore: prev.awayScore + result.awayScoreAdded,
                        momentum: result.momentum,
                        tacticalAnalysis: result.tacticalAnalysis
                    }) : null);

                    setSimulationTargetMinute(nextTarget);
                    
                    if (activeShout) setActiveShout(undefined);
                    if (activeShoutEffect) setActiveShoutEffect(undefined);
                    setIsLoading(false);
                    return; 
                }

                // --- PLAYBACK ---
                const nextMinute = currentPlaybackMinute + 1;
                const eventsNow = pendingEvents.filter(e => e.minute === nextMinute);
                
                if (eventsNow.length > 0) {
                    const hasGoal = eventsNow.some(e => e.type === 'goal');
                    const hasCard = eventsNow.some(e => e.type === 'card');
                    setMatchState(prev => prev ? ({
                        ...prev,
                        events: [...prev.events, ...eventsNow],
                        currentMinute: nextMinute 
                    }) : null);
                    const delay = hasGoal ? TICK_DELAY_GOAL_MS : hasCard ? TICK_DELAY_EVENT_MS : TICK_DELAY_MS;
                    timeoutId = setTimeout(() => setCurrentPlaybackMinute(nextMinute), delay);
                } else {
                    setMatchState(prev => prev ? ({ ...prev, currentMinute: nextMinute }) : null);
                    timeoutId = setTimeout(() => setCurrentPlaybackMinute(nextMinute), TICK_DELAY_MS);
                }
            }
        };

        runPlaybackTick();

        return () => clearTimeout(timeoutId);
    }, [gameState, currentPlaybackMinute, simulationTargetMinute, isLoading]); 

    // --- SAVE / LOAD SYSTEM ---
    const saveGame = () => {
        if (userTeamName) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket
            };
            localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
            alert("Game Saved Successfully!");
        }
    };

    useEffect(() => {
        if (userTeamName && appScreen !== AppScreen.START_SCREEN) {
            const stateToSave = {
                userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason,
                teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
                managerReputation, transferMarket
            };
            localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
        }
    }, [currentWeek, gameState, managerReputation]);

    const handleQuit = () => {
        setAppScreen(AppScreen.START_SCREEN);
        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setUserTeamName(null);
        setTeams(allTeams); 
        setTransferMarket(TRANSFER_TARGETS); 
        setActiveTheme({ primary: '#1f2937', secondary: '#22c55e', text: '#FFFFFF' }); // Reset theme
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
                setTeams(parsed.teams);
                setLeagueTable(parsed.leagueTable);
                setFixtures(parsed.fixtures);
                setNews(parsed.news);
                setWeeklyResults(parsed.weeklyResults);
                setGameState(parsed.gameState);
                setManagerReputation(parsed.managerReputation || 50);
                if (parsed.transferMarket) setTransferMarket(parsed.transferMarket);
                
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

    const getWcResultForOutcome = (outcome: WorldCupOutcome, teamName: string): WorldCupResult => {
        const MAP: Record<WorldCupOutcome, { floor: number; ceiling: number; tier: string; description: string }> = {
            none: { floor: 0, ceiling: 20, tier: 'Grassroots', description: 'No World Cup experience on your record. Start at the very bottom.' },
            group_stage: { floor: 20, ceiling: 35, tier: 'Championship / Lower', description: 'You competed but fell at the group stage. MLS and the Championship await.' },
            round_of_16: { floor: 35, ceiling: 50, tier: 'Mid-Table European', description: 'A solid run. Serie A, Ligue 1, and Championship clubs will take your calls.' },
            quarter_final: { floor: 50, ceiling: 65, tier: 'Top Flight', description: 'Quarter-final quality. Bundesliga, La Liga mid-table, and lower PL clubs are open.' },
            semi_final: { floor: 65, ceiling: 80, tier: 'Elite', description: 'Semi-finalist. Most top-flight clubs will interview you. Some elite sides too.' },
            runner_up: { floor: 80, ceiling: 90, tier: 'Elite', description: 'Runner-up. You knocked on the door of history. Elite and top-tier clubs want you.' },
            winner: { floor: 90, ceiling: 100, tier: 'Legend', description: 'World Cup Winner. Legend status. Every club on the planet would take your call.' },
        };
        const data = MAP[outcome];
        return { outcome, teamName, reputationFloor: data.floor, reputationCeiling: data.ceiling, tier: data.tier, description: data.description };
    };

    const triggerWorldCupResult = (outcome: WorldCupOutcome) => {
        if (!userTeamName) return;
        const result = getWcResultForOutcome(outcome, userTeamName);
        localStorage.setItem('worldCupResult', JSON.stringify(result));
        setWcResult(result);

        const repFloor = result.reputationFloor;
        const repCeiling = result.reputationCeiling;
        const newRep = outcome === 'winner' ? 95 : Math.floor((repFloor + repCeiling) / 2);
        setManagerReputation(newRep);

        if (outcome === 'winner') {
            setNews(prev => [{
                id: Date.now(),
                week: currentWeek,
                title: '🏆 WORLD CUP WINNERS — LEGEND STATUS ACHIEVED',
                body: `${userTeamName} are WORLD CHAMPIONS! The manager has achieved Legend status and can now take charge of any club on the planet.`,
                type: 'tournament-result'
            }, ...prev]);
        }

        setAppScreen(AppScreen.WORLD_CUP_RESULT);
    };

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
        setSeasonUsedMelodies([]);
        setNews([{ id: Date.now(), week: 1, title: 'World Cup 2026 Begins', body: '48 teams. 12 Groups. 104 Matches. The road to glory starts now.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        const week1Fixtures = groupFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === actualTeamName || f.awayTeam === actualTeamName);
        setCurrentFixture(userMatch); setWeeklyResults([]); startTutorial();
    };

    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club'); setIsPrologue(false);
        const wcFloor = (() => {
            try {
                const saved = localStorage.getItem('worldCupResult');
                if (saved) { const r: WorldCupResult = JSON.parse(saved); return r.reputationFloor; }
            } catch {}
            return 0;
        })();
        setManagerReputation(Math.max(70, wcFloor)); 
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
        setSeasonUsedMelodies([]);
        setTeams(finalTeamsState); setUserTeamName(selectedTeamName); setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName) && f.week === 1));

        // --- CONTRACT CRISIS OPENING EVENTS ---
        const selectedTeam = finalTeamsState[selectedTeamName];
        if (selectedTeam) {
            const expiringPlayers = selectedTeam.players.filter(p => p.contractExpires <= 1 + 8);
            const contractNewsItems: NewsItem[] = expiringPlayers.map(p => {
                const wantsMap: Record<string, string> = {
                    'Ambitious': 'a significant wage increase and a starring role',
                    'Mercenary': 'top-of-market wages and likely has other offers',
                    'Loyal': 'fair terms and reassurance about their place in the squad',
                    'Young Prospect': 'game time guarantees and a clear development path',
                    'Leader': 'a leadership role and long-term commitment from the club',
                    'Professional': 'clarity on their future and a reasonable extension',
                    'Volatile': 'immediate answers — delays could turn ugly',
                };
                const wants = wantsMap[p.personality] || 'contract clarity';
                return {
                    id: Date.now() + Math.random(),
                    week: 1,
                    title: `Contract Alert: ${p.name}`,
                    body: `${p.name} (${p.position}, ${p.age}) has only ${p.contractExpires} week(s) left on their contract. As a ${p.personality.toLowerCase()} personality, they will want ${wants}. This needs addressing soon or you risk losing them on a free transfer.`,
                    type: 'contract-renewal' as const,
                };
            });
            if (contractNewsItems.length > 0) {
                setNews(contractNewsItems);
            }
        }

        startTutorial();
    }, []);

    const getWorldCupRepFloor = (): number => {
        try {
            const saved = localStorage.getItem('worldCupResult');
            if (saved) {
                const result: WorldCupResult = JSON.parse(saved);
                return result.reputationFloor;
            }
        } catch {}
        return 0;
    };

    const handleCreateManager = (name: string, exp: ExperienceLevel) => {
        let initialRep = 15;
        if (exp.id === 'semi-pro') initialRep = 40; if (exp.id === 'pro') initialRep = 60;
        if (exp.id === 'international') initialRep = 80; if (exp.id === 'legend') initialRep = 95;
        const wcFloor = getWorldCupRepFloor();
        if (wcFloor > initialRep) initialRep = wcFloor;
        setManagerReputation(initialRep); generateJobs(initialRep);
    };

    const generateJobs = (currentRep: number | ExperienceLevel) => {
        const rep = typeof currentRep === 'number' ? currentRep : managerReputation;
        const wcFloor = getWorldCupRepFloor();
        const effectiveRep = Math.max(rep, wcFloor);
        const allTeamList: Team[] = Object.values(allTeams);
        const shuffle = (array: Team[]) => array.sort(() => 0.5 - Math.random());
        let vacancies: Team[] = [];
        const feasible = allTeamList.filter(t => t.prestige >= effectiveRep - 20 && t.prestige <= effectiveRep + 10);
        const reach = allTeamList.filter(t => t.prestige > effectiveRep + 10 && t.prestige <= effectiveRep + 20);
        const safety = allTeamList.filter(t => t.prestige < effectiveRep - 20);
        vacancies = [...shuffle(feasible).slice(0, 4), ...shuffle(reach).slice(0, 2), ...shuffle(safety).slice(0, 1)];
        if (vacancies.length === 0) vacancies = shuffle(allTeamList.filter(t => t.prestige >= effectiveRep - 30)).slice(0, 3);
        const jobs: Job[] = vacancies.map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality }));
        setAvailableJobs(jobs); setAppScreen(AppScreen.JOB_CENTRE);
    }

    const handleApplyForJob = async (teamName: string) => {
        const team = allTeams[teamName];
        if (!team) { setError("Team not found."); return; }

        setAppScreen(AppScreen.JOB_INTERVIEW);
        setIsLoading(true);
        setJobOffer(null);
        setError(null);
        setInterviewChatHistory([]);
        setInterviewTeamName(teamName);
        setInterviewPersonality(team.chairmanPersonality);

        const ctx: InterviewContext = {
            teamName,
            league: team.league,
            chairmanPersonality: team.chairmanPersonality,
            boardObjectives: team.objectives || [],
            managerReputation,
        };
        setInterviewContext(ctx);

        try {
            const opening = await getInterviewOpeningMessage(ctx);
            setInterviewChatHistory([{ role: 'chairman', text: opening }]);
        } catch (e) {
            setError("The Chairman refused to meet.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJobInterviewAnswer = async (answer: string) => {
        if (!interviewContext || isLoading) return;
        const updatedHistory: ChatMessage[] = [...interviewChatHistory, { role: 'manager', text: answer }];
        setInterviewChatHistory(updatedHistory);
        setIsLoading(true);
        try {
            const result = await continueInterviewChat(interviewContext, updatedHistory);
            if (result.isDecision) {
                const finalHistory: ChatMessage[] = [...updatedHistory, { role: 'chairman', text: result.message }];
                setInterviewChatHistory(finalHistory);
                const evalResult = await evaluateInterview(
                    interviewContext.teamName,
                    finalHistory,
                    interviewContext.chairmanPersonality,
                    interviewContext.boardObjectives
                );
                setJobOffer(evalResult);
            } else {
                setInterviewChatHistory([...updatedHistory, { role: 'chairman', text: result.message }]);
            }
        } catch (e) {
            setError("An error occurred during the interview.");
        } finally {
            setIsLoading(false);
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
                const isHome = currentFixture.homeTeam === userTeamName;
                const opponentName = isHome ? currentFixture.awayTeam : currentFixture.homeTeam;
                const opponentTeam = teams[opponentName];
                const leaguePos = leagueTable.filter(e => e.league === (userTeam?.league || 'Premier League')).sort((a, b) => b.points - a.points).findIndex(e => e.teamName === userTeamName) + 1;
                const keyEvents = matchState.events.filter(e => e.type === 'goal' || e.type === 'card').map(e => e.description).slice(0, 5);

                const activeRifts = (userTeam?.players || [])
                    .flatMap(p => (p.effects || []).filter(e => e.type === 'BadChemistry' || e.type === 'PromiseBroken').map(e => `${p.name}: ${e.message}`));

                const ctx: PressConferenceContext = {
                    teamName: userTeamName,
                    opponentName,
                    homeScore: matchState.homeScore,
                    awayScore: matchState.awayScore,
                    isHome,
                    keyEvents,
                    leaguePosition: leaguePos || 1,
                    opponentPrestige: opponentTeam?.prestige || 50,
                    activePromises: (userTeam?.activePromises || []).filter(p => p.status === 'pending').map(p => p.description),
                    activeRifts,
                    currentWeek,
                };
                setPressConferenceContext(ctx);
                setPressChatHistory([]);
                setPressConferenceDone(false);

                const opener = await generatePressConferenceOpener(ctx);
                setPressChatHistory([{ role: 'journalist', text: opener }]);
                setAppScreen(AppScreen.PRESS_CONFERENCE);
                setIsLoading(false);
                return;
            } catch (e) {}
        }
        proceedToNextWeek();
    };

    const handlePressSendMessage = async (message: string) => {
        if (!pressConferenceContext || isLoading) return;
        const updated: ChatMessage[] = [...pressChatHistory, { role: 'manager', text: message }];
        setPressChatHistory(updated);
        setIsLoading(true);
        try {
            const result = await continuePressConferenceChat(pressConferenceContext, updated);
            setPressChatHistory([...updated, { role: 'journalist', text: result.message }]);
            if (result.isDone) {
                setPressConferenceDone(true);
                setManagerReputation(r => Math.max(0, Math.min(100, r + result.reputationDelta)));
            }
        } catch (e) {
            setPressConferenceDone(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePressConferenceFinish = () => {
        setPressChatHistory([]);
        setPressConferenceContext(null);
        setPressConferenceDone(false);
        proceedToNextWeek();
    };

    const proceedToNextWeek = async () => {
        const nextW = currentWeek + 1;
        const results: Fixture[] = [];
        fixtures.filter(f => f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName && !f.isKnockout).forEach(f => {
            const homeTeam = teams[f.homeTeam];
            const awayTeam = teams[f.awayTeam];
            if (homeTeam && awayTeam) {
                const res = simulateQuickMatch(homeTeam, awayTeam);
                results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
            }
        });

        const applyResultsToTable = (table: LeagueTableEntry[], simulatedFixtures: Fixture[]): LeagueTableEntry[] => {
            const updated = table.map(entry => ({ ...entry }));
            const updateEntry = (name: string, gf: number, ga: number) => {
                const idx = updated.findIndex(t => t.teamName === name);
                if (idx !== -1) {
                    const t = updated[idx];
                    t.played++; t.goalsFor += gf; t.goalsAgainst += ga;
                    t.goalDifference = t.goalsFor - t.goalsAgainst;
                    if (gf > ga) { t.won++; t.points += 3; }
                    else if (gf === ga) { t.drawn++; t.points += 1; }
                    else { t.lost++; }
                }
            };
            simulatedFixtures.forEach(f => {
                if (f.score) {
                    const [hg, ag] = f.score.split('-').map(Number);
                    if (!isNaN(hg) && !isNaN(ag)) {
                        updateEntry(f.homeTeam, hg, ag);
                        updateEntry(f.awayTeam, ag, hg);
                    }
                }
            });
            return updated;
        };

        if (gameMode === 'Club' && INTERNATIONAL_BREAK_WEEKS.includes(nextW)) {
            const summary = await getInternationalBreakSummary(nextW);
            setNews(prev => [{ id: Date.now(), week: nextW, title: summary.newsTitle, body: summary.newsBody, type: 'call-up' }, ...prev]);
        }

        if (gameMode === 'WorldCup') {
            const updatedTable = applyResultsToTable(leagueTable, results);

            if (currentWeek < 3) {
                setLeagueTable(updatedTable);
            }

            if (currentWeek === 3) {
                setLeagueTable(updatedTable);

                const { qualifiers } = calculateWorldCupQualifiers(updatedTable);
                const userQualified = userTeamName ? qualifiers.includes(userTeamName) : false;

                if (!userQualified && userTeamName) {
                    setWeeklyResults(results);
                    setCurrentWeek(nextW);
                    setMatchState(null);
                    setGameState(GameState.PRE_MATCH);
                    setIsLoading(false);
                    triggerWorldCupResult('group_stage');
                    return;
                }

                const r32Fixtures = generateKnockoutFixtures(qualifiers, 'Round of 32', 4);
                setFixtures(prev => [...prev, ...r32Fixtures]);
                setWcKnockoutResults([]);
                setNews(prev => [{ id: Date.now(), week: nextW, title: 'Round of 32 Draw', body: `${qualifiers.length} teams advance from the group stage. The knockout rounds begin!`, type: 'tournament-result' }, ...prev]);

                setWeeklyResults(results);
                setCurrentWeek(nextW);
                setCurrentFixture(r32Fixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                setMatchState(null);
                setGameState(GameState.PRE_MATCH);
                setIsLoading(false);
                return;
            }

            const knockoutStageMap: Record<number, { currentStage: import('./types').TournamentStage; nextStage: import('./types').TournamentStage; outcome: WorldCupOutcome }> = {
                4: { currentStage: 'Round of 32', nextStage: 'Round of 16', outcome: 'group_stage' },
                5: { currentStage: 'Round of 16', nextStage: 'Quarter Final', outcome: 'round_of_16' },
                6: { currentStage: 'Quarter Final', nextStage: 'Semi Final', outcome: 'quarter_final' },
                7: { currentStage: 'Semi Final', nextStage: 'Final', outcome: 'semi_final' },
            };

            const stageInfo = knockoutStageMap[currentWeek];
            if (stageInfo) {
                const thisRoundFixtures = fixtures.filter(f => f.week === currentWeek && f.isKnockout && f.stage === stageInfo.currentStage);
                const winners: string[] = [];
                const playedThisRound: Fixture[] = [...results];

                thisRoundFixtures.forEach(f => {
                    if (f.homeTeam === userTeamName || f.awayTeam === userTeamName) {
                        if (matchState) {
                            const isHome = f.homeTeam === userTeamName;
                            const userGoals = isHome ? matchState.homeScore : matchState.awayScore;
                            const oppGoals = isHome ? matchState.awayScore : matchState.homeScore;
                            let wcWinner: string;
                            if (userGoals > oppGoals) {
                                wcWinner = userTeamName!;
                            } else if (userGoals === oppGoals) {
                                wcWinner = Math.random() > 0.5 ? userTeamName! : (isHome ? f.awayTeam : f.homeTeam);
                            } else {
                                wcWinner = isHome ? f.awayTeam : f.homeTeam;
                            }
                            winners.push(wcWinner);
                            playedThisRound.push({ ...f, played: true, score: `${matchState.homeScore}-${matchState.awayScore}` });
                        }
                    } else {
                        const homeT = teams[f.homeTeam];
                        const awayT = teams[f.awayTeam];
                        if (homeT && awayT) {
                            let res = simulateQuickMatch(homeT, awayT);
                            while (res.homeGoals === res.awayGoals) {
                                res = simulateQuickMatch(homeT, awayT);
                            }
                            const winner = res.homeGoals > res.awayGoals ? f.homeTeam : f.awayTeam;
                            winners.push(winner);
                            playedThisRound.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
                        }
                    }
                });

                setWcKnockoutResults(prev => [...prev, ...playedThisRound]);

                const userEliminated = userTeamName && !winners.includes(userTeamName);
                if (userEliminated) {
                    setWeeklyResults(playedThisRound);
                    setCurrentWeek(nextW);
                    setMatchState(null);
                    setGameState(GameState.PRE_MATCH);
                    setIsLoading(false);
                    triggerWorldCupResult(stageInfo.outcome);
                    return;
                }

                if (stageInfo.currentStage === 'Semi Final') {
                    const finalFixtures = generateKnockoutFixtures(winners, 'Final', nextW);
                    setFixtures(prev => [...prev, ...finalFixtures]);
                    setWeeklyResults(playedThisRound);
                    setCurrentWeek(nextW);
                    setCurrentFixture(finalFixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                    setMatchState(null);
                    setGameState(GameState.PRE_MATCH);
                    setIsLoading(false);
                    return;
                }

                const nextFixtures = generateKnockoutFixtures(winners, stageInfo.nextStage, nextW);
                setFixtures(prev => [...prev, ...nextFixtures]);
                setWeeklyResults(playedThisRound);
                setCurrentWeek(nextW);
                setCurrentFixture(nextFixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName));
                setMatchState(null);
                setGameState(GameState.PRE_MATCH);
                setIsLoading(false);
                return;
            }

            if (currentWeek === 8) {
                const finalFixtures = fixtures.filter(f => f.week === 8 && f.stage === 'Final');
                if (finalFixtures.length > 0 && matchState && userTeamName) {
                    const f = finalFixtures[0];
                    if (f.homeTeam === userTeamName || f.awayTeam === userTeamName) {
                        const isHome = f.homeTeam === userTeamName;
                        const userGoals = isHome ? matchState.homeScore : matchState.awayScore;
                        const oppGoals = isHome ? matchState.awayScore : matchState.homeScore;
                        let userWon = userGoals > oppGoals;
                        if (userGoals === oppGoals) userWon = Math.random() > 0.5;
                        const finalResult = { ...f, played: true, score: `${matchState.homeScore}-${matchState.awayScore}` };
                        setWcKnockoutResults(prev => [...prev, finalResult]);
                        setWeeklyResults([...results, finalResult]);
                        setCurrentWeek(nextW);
                        setMatchState(null);
                        setGameState(GameState.PRE_MATCH);
                        setIsLoading(false);
                        triggerWorldCupResult(userWon ? 'winner' : 'runner_up');
                        return;
                    }
                }
            }
        }

        if (gameMode === 'Club' && INTERNATIONAL_BREAK_WEEKS.includes(nextW) && userTeamName) {
            await processInternationalBreak(nextW, userTeamName);
        }

        // Decay all player effects by 1 week and remove expired ones
        if (userTeamName) {
            setTeams(prev => {
                const team = prev[userTeamName];
                if (!team) return prev;
                const updatedPlayers = team.players.map(p => ({
                    ...p,
                    effects: p.effects
                        .map(eff => ({ ...eff, until: eff.until - 1 }))
                        .filter(eff => eff.until > 0)
                }));
                return { ...prev, [userTeamName]: { ...team, players: updatedPlayers } };
            });
        }

        setWeeklyResults(results); setCurrentWeek(nextW);
        setCurrentFixture(fixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); setGameState(GameState.PRE_MATCH); setIsLoading(false);
    };

    const processInternationalBreak = async (week: number, teamName: string) => {
        const userTeamData = teams[teamName];
        if (!userTeamData) return;

        const squad = userTeamData.players;
        const newNewsItems: NewsItem[] = [];

        // Simulate a random international tournament context for this break
        const ROUNDS = ['Final', 'Semi Final', 'Quarter Final', 'Round of 16', 'Group Stage'] as const;
        const INVOLVEMENTS = ['scorer', 'assist-or-save', 'full-match', 'minimal'] as const;
        type CompetitionType = 'World Cup' | 'Euros' | 'Copa America' | 'Qualifier' | 'Friendly';

        // Pick a competition based on the break index for realism
        const competitionOptions: CompetitionType[] = ['Qualifier', 'Euros', 'World Cup'];
        const competition: CompetitionType = competitionOptions[INTERNATIONAL_BREAK_WEEKS.indexOf(week)] ?? 'Qualifier';

        // Group squad players by nationality
        const byNationality: Record<string, Player[]> = {};
        squad.forEach(p => {
            if (!byNationality[p.nationality]) byNationality[p.nationality] = [];
            byNationality[p.nationality].push(p);
        });

        const nationalities = Object.keys(byNationality);
        if (nationalities.length < 2) {
            // Not enough different nationalities for rivalries; just add summary
            const summary = await getInternationalBreakSummary(week);
            newNewsItems.push({ id: Date.now(), week, title: summary.newsTitle, body: summary.newsBody, type: 'call-up' });
            setNews(prev => [...newNewsItems, ...prev]);
            return;
        }

        // --- TEAMMATE BONDS ---
        // Players of same nationality who "went on a deep run together"
        // Simulate: if competition is high-stakes (Euros/WC), pairs from same nation get bond
        const bondRound = competition === 'World Cup' ? 'Semi Final' : competition === 'Euros' ? 'Quarter Final' : null;
        if (bondRound) {
            for (const nat of nationalities) {
                const natPlayers = byNationality[nat];
                if (natPlayers.length >= 2) {
                    // Apply bond between all pairs of same-nation players
                    const bondDuration = competition === 'World Cup' ? 12 : 8;
                    for (let i = 0; i < natPlayers.length; i++) {
                        for (let j = i + 1; j < natPlayers.length; j++) {
                            const pA = natPlayers[i];
                            const pB = natPlayers[j];
                            const bondMsg = `Shared glory with ${pB.name} at the ${competition} — chemistry boosted.`;
                            const bondMsgB = `Shared glory with ${pA.name} at the ${competition} — chemistry boosted.`;
                            setTeams(prev => {
                                const t = prev[teamName];
                                const updated = t.players.map(p => {
                                    if (p.name === pA.name) {
                                        const hasBond = p.effects.some(e => e.type === 'TeammateBond' && e.with === pB.name);
                                        if (hasBond) return p;
                                        return { ...p, effects: [...p.effects, { type: 'TeammateBond' as const, with: pB.name, message: bondMsg, until: bondDuration }] };
                                    }
                                    if (p.name === pB.name) {
                                        const hasBond = p.effects.some(e => e.type === 'TeammateBond' && e.with === pA.name);
                                        if (hasBond) return p;
                                        return { ...p, effects: [...p.effects, { type: 'TeammateBond' as const, with: pA.name, message: bondMsgB, until: bondDuration }] };
                                    }
                                    return p;
                                });
                                return { ...prev, [teamName]: { ...t, players: updated } };
                            });
                        }
                    }
                    if (natPlayers.length >= 2) {
                        newNewsItems.push({
                            id: Date.now() + Math.random(),
                            week,
                            title: `${nat} Teammates Bond at ${competition}`,
                            body: `${natPlayers.map(p => p.name).join(' & ')} return from ${competition} ${bondRound} duty with a strengthened partnership. Expect sharper combination play at club level.`,
                            type: 'teammate-bond'
                        });
                    }
                }
            }
        }

        // --- RIVALRY RIFTS ---
        // Pick pairs of players from different nations who "faced each other"
        const processedPairs = new Set<string>();
        const riftPromises: Promise<void>[] = [];

        for (let i = 0; i < nationalities.length; i++) {
            for (let j = i + 1; j < nationalities.length; j++) {
                const natA = nationalities[i];
                const natB = nationalities[j];
                const playersA = byNationality[natA];
                const playersB = byNationality[natB];

                // Pick one representative pair per nation matchup
                const pA = playersA[Math.floor(Math.random() * playersA.length)];
                const pB = playersB[Math.floor(Math.random() * playersB.length)];
                const pairKey = [pA.name, pB.name].sort().join('|');
                if (processedPairs.has(pairKey)) continue;
                processedPairs.add(pairKey);

                const round = ROUNDS[Math.floor(Math.random() * ROUNDS.length)];
                const involvement = INVOLVEMENTS[Math.floor(Math.random() * INVOLVEMENTS.length)];
                // pA "lost" in our simulation
                const result = 'lost' as const;

                const riftTask = async () => {
                    try {
                        const riftResult = await getTeammateTournamentRivalry(
                            { name: pA.name, personality: pA.personality, nationality: natA },
                            { name: pB.name, personality: pB.personality, nationality: natB },
                            competition,
                            round,
                            result,
                            involvement
                        );

                        if (riftResult.riftSeverity === 'none') return;

                        // All rival-nationality squad members to rift against (for nation-wide scope)
                        const allNatBPlayers = byNationality[natB] || [];

                        setTeams(prev => {
                            const t = prev[teamName];
                            let updatedPlayers = t.players.map(p => {
                                if (p.name === pA.name) {
                                    // pA gets a rift effect for each natB player in the squad
                                    // On direct scope: only with pB. On nation-wide: with every natB player.
                                    const targetsForA = riftResult.affectedScope === 'nation-wide'
                                        ? allNatBPlayers
                                        : allNatBPlayers.filter(bp => bp.name === pB.name);

                                    let newEffects = p.effects.filter(e => {
                                        if (e.type !== 'InternationalRift') return true;
                                        // Remove old rifts against any natB player (will be replaced)
                                        return !targetsForA.some(bp => e.with === bp.name);
                                    });
                                    for (const target of targetsForA) {
                                        const riftEff: PlayerEffect = {
                                            type: 'InternationalRift',
                                            with: target.name,
                                            severity: riftResult.riftSeverity,
                                            scope: riftResult.affectedScope,
                                            rivalNationality: riftResult.affectedScope === 'nation-wide' ? natB : undefined,
                                            message: riftResult.reason,
                                            until: riftResult.duration
                                        };
                                        newEffects = [...newEffects, riftEff];
                                    }
                                    return { ...p, effects: newEffects };
                                }
                                return p;
                            });
                            return { ...prev, [teamName]: { ...t, players: updatedPlayers } };
                        });

                        // Add news for significant rifts
                        if (riftResult.riftSeverity === 'serious') {
                            newNewsItems.push({
                                id: Date.now() + Math.random(),
                                week,
                                title: `Serious Rift: ${pA.name} vs ${pB.name}`,
                                body: `${riftResult.reason} Manager decision required: bench ${pA.name}, bench ${pB.name}, or risk playing both together.`,
                                type: 'serious-rift',
                                riftDecision: { riftPlayerA: pA.name, riftPlayerB: pB.name }
                            });
                        } else if (riftResult.riftSeverity === 'moderate') {
                            newNewsItems.push({
                                id: Date.now() + Math.random(),
                                week,
                                title: `Chemistry Rift: ${pA.name} & ${pB.name}`,
                                body: `${riftResult.reason} (${riftResult.duration} weeks)`,
                                type: 'chemistry-rift'
                            });
                        }

                        // Post-tournament morale for pA (the loser)
                        const moraleResult = await getPlayerPostTournamentMorale(
                            { name: pA.name, personality: pA.personality },
                            'lost',
                            competition,
                            round
                        );
                        const moraleEffect: PlayerEffect = {
                            type: 'PostTournamentMorale',
                            morale: moraleResult.morale,
                            message: moraleResult.message,
                            until: moraleResult.durationWeeks
                        };
                        setTeams(prev => {
                            const t = prev[teamName];
                            const updated = t.players.map(p => {
                                if (p.name === pA.name) {
                                    const filtered = p.effects.filter(e => e.type !== 'PostTournamentMorale');
                                    return { ...p, effects: [...filtered, moraleEffect] };
                                }
                                return p;
                            });
                            return { ...prev, [teamName]: { ...t, players: updated } };
                        });
                    } catch (err) {
                        console.error('Rift processing error', err);
                    }
                };

                riftPromises.push(riftTask());
            }
        }

        // Wait for all rift calculations
        await Promise.allSettled(riftPromises);

        // Also apply morale for winners (pB side)
        for (let i = 0; i < nationalities.length; i++) {
            for (let j = i + 1; j < nationalities.length; j++) {
                const natB = nationalities[j];
                const playersB = byNationality[natB];
                const pB = playersB[0];
                if (!pB) continue;
                try {
                    const round = ROUNDS[Math.floor(Math.random() * ROUNDS.length)];
                    const moraleResult = await getPlayerPostTournamentMorale(
                        { name: pB.name, personality: pB.personality },
                        'won',
                        competition,
                        round
                    );
                    const moraleEffect: PlayerEffect = {
                        type: 'PostTournamentMorale',
                        morale: moraleResult.morale,
                        message: moraleResult.message,
                        until: moraleResult.durationWeeks
                    };
                    setTeams(prev => {
                        const t = prev[teamName];
                        const updated = t.players.map(p => {
                            if (p.name === pB.name) {
                                const filtered = p.effects.filter(e => e.type !== 'PostTournamentMorale');
                                return { ...p, effects: [...filtered, moraleEffect] };
                            }
                            return p;
                        });
                        return { ...prev, [teamName]: { ...t, players: updated } };
                    });
                } catch { /* ignore */ }
            }
        }

        // General summary
        const summary = await getInternationalBreakSummary(week);
        newNewsItems.unshift({ id: Date.now(), week, title: summary.newsTitle, body: summary.newsBody, type: 'call-up' });

        setNews(prev => [...newNewsItems, ...prev]);
    };

    const handleStartMatch = () => {
        if (!currentFixture || !userTeam) return;
        setMatchState({ currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: "Kick off." });
        setGameState(GameState.PLAYING); 
        setCurrentPlaybackMinute(0);
        setSimulationTargetMinute(0);
        setPendingEvents([]);
    };

    const handleResumeMatch = (shout?: TouchlineShout) => {
        if (shout) setActiveShout(shout);
        // Advance target by 1 past the current breakpoint minute so the simulation
        // loop does not immediately re-pause at the same minute we just resumed from
        setSimulationTargetMinute(prev => prev + 1);
        setGameState(GameState.PLAYING);
    }

    const handleSimulateSegment = async (targetMinute: number, momentumShift: number = 0) => {
        if (!currentFixture || !matchState || !userTeam) return;
        setSimulationTargetMinute(targetMinute);
        setGameState(GameState.PLAYING);
    };

    const handleShoutEffect = (effect: ShoutEffect) => {
        setActiveShoutEffect(effect);
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
        setLeagueTable(prev => {
            const newTable = [...prev];
            const updateTeam = (name: string, goalsFor: number, goalsAgainst: number) => {
                const idx = newTable.findIndex(t => t.teamName === name);
                if (idx !== -1) { const t = newTable[idx]; t.played++; t.goalsFor += goalsFor; t.goalsAgainst += goalsAgainst; t.goalDifference = t.goalsFor - t.goalsAgainst; if (goalsFor > goalsAgainst) { t.won++; t.points += 3; } else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; } else { t.lost++; } }
            };
            updateTeam(currentFixture.homeTeam, matchState.homeScore, matchState.awayScore);
            updateTeam(currentFixture.awayTeam, matchState.awayScore, matchState.homeScore);
            return newTable;
        });
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

    const getBondContext = (playerName: string, context: 'transfer' | 'renewal'): { squadMate: string; competition: string } | undefined => {
        if (context !== 'transfer' || !userTeamName) return undefined;
        const userSquad = teams[userTeamName]?.players || [];
        for (const squadMate of userSquad) {
            const bondEff = squadMate.effects.find(e => e.type === 'TeammateBond' && e.with === playerName);
            if (bondEff && bondEff.type === 'TeammateBond') {
                return { squadMate: squadMate.name, competition: 'international tournament' };
            }
        }
        return undefined;
    };

    const handleStartPlayerTalk = async (player: Player, context: 'transfer' | 'renewal') => {
        if (!userTeamName) return;
        setIsLoading(true); setTalkResult(null); setPlayerTalk(null); setError(null); setPendingContractTerms(null);
        setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const bondContext = getBondContext(player.name, context);
            const { reply, nextPhase } = await continueNegotiationChat(player, teams[userTeamName], context, [], bondContext);
            setPlayerTalk({
                player,
                context,
                messages: [{ role: 'agent', text: reply }],
                phase: nextPhase === 'offer' ? 'offer' : 'talking',
                bondContext,
            });
        } catch (e) {
            setError("The agent didn't show up. Try again.");
            setAppScreen(AppScreen.GAMEPLAY);
        } finally { setIsLoading(false); }
    };

    const handlePlayerTalkMessage = async (text: string, offer?: { wage: number; length: number }) => {
        if (!playerTalk || !userTeamName) return;

        // Don't add an empty manager message when submitting an offer with no text
        const messageText = text?.trim() || '';
        const messagesToUpdate: NegotiationMessage[] = messageText
            ? [...playerTalk.messages, { role: 'manager' as const, text: messageText }]
            : [...playerTalk.messages];
        if (messageText) setPlayerTalk({ ...playerTalk, messages: messagesToUpdate });
        setIsLoading(true);

        try {
            if (offer) {
                // Manager is submitting an offer — evaluate it
                setPendingContractTerms(offer);
                const result = await evaluateNegotiationOffer(
                    playerTalk.player, teams[userTeamName], playerTalk.context,
                    messagesToUpdate, offer, playerTalk.bondContext
                );
                const agentReply: NegotiationMessage = { role: 'agent', text: result.reasoning };
                if (result.decision === 'counter' && result.counterOffer) {
                    // Counter: store suggestion so sliders update, keep conversation going
                    setPendingContractTerms(result.counterOffer);
                    setPlayerTalk(prev => prev ? {
                        ...prev,
                        messages: [...messagesToUpdate, agentReply],
                        phase: 'offer',
                        counterSuggestion: result.counterOffer
                    } : prev);
                } else {
                    // Accepted or rejected: show final result
                    setPlayerTalk(prev => prev ? { ...prev, messages: [...messagesToUpdate, agentReply], phase: 'offer' } : prev);
                    setTalkResult(result);
                }
            } else {
                // Continuing conversation
                const { reply, nextPhase } = await continueNegotiationChat(
                    playerTalk.player, teams[userTeamName], playerTalk.context,
                    updatedMessages, playerTalk.bondContext
                );
                const agentMsg: NegotiationMessage = { role: 'agent', text: reply };

                // Hard minimum: agent cannot move to offer stage until manager has
                // replied at least twice. Prevents AI jumping straight to money talk.
                const managerTurnCount = updatedMessages.filter(m => m.role === 'manager').length;
                const allowOfferPhase = managerTurnCount >= 2;

                const resolvedPhase = nextPhase === 'walkout'
                    ? 'talking'
                    : (nextPhase === 'offer' && allowOfferPhase) ? 'offer' : 'talking';

                if (nextPhase === 'walkout') {
                    setPlayerTalk(prev => prev ? { ...prev, messages: [...updatedMessages, agentMsg] } : prev);
                    setTalkResult({ decision: 'rejected', reasoning: reply, extractedPromises: [] });
                } else {
                    setPlayerTalk(prev => prev ? { ...prev, messages: [...updatedMessages, agentMsg], phase: resolvedPhase } : prev);
                }
            }
        } catch (e) {
            setError("Something went wrong in negotiations.");
        } finally { setIsLoading(false); }
    };

    const handlePlayerTalkFinish = () => {
        if (talkResult?.decision === 'accepted' && playerTalk && userTeamName && pendingContractTerms) {
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
                        ? { ...p, wage: pendingContractTerms.wage, contractExpires: pendingContractTerms.length } 
                        : p
                    );
                } else {
                    const newPlayer = { 
                        ...playerTalk.player, 
                        isStarter: false, 
                        contractExpires: pendingContractTerms.length, 
                        wage: pendingContractTerms.wage,
                        status: { type: 'Available' as const }, 
                        effects: [] 
                    };
                    updatedPlayers = [...team.players, newPlayer];
                }
                
                return { 
                    ...prev, 
                    [userTeamName]: { ...team, players: updatedPlayers, activePromises } 
                };
            });

            if (playerTalk.context === 'transfer') {
                setTransferMarket(prev => prev.filter(p => p.name !== playerTalk.player.name));
            }
        }
        setPlayerTalk(null); setTalkResult(null); setPendingContractTerms(null); setAppScreen(AppScreen.GAMEPLAY);
    };

    const handleRiftDecision = (newsId: number, playerA: string, playerB: string, choice: 'bench-a' | 'bench-b' | 'risk-it') => {
        // Record the decision on the news item
        setNews(prev => prev.map(item =>
            item.id === newsId && item.riftDecision
                ? { ...item, riftDecision: { ...item.riftDecision, choice } }
                : item
        ));

        if (!userTeamName) return;

        // Apply the manager's decision
        if (choice === 'bench-a') {
            setTeams(prev => {
                const t = prev[userTeamName];
                const updated = t.players.map(p => p.name === playerA ? { ...p, isStarter: false } : p);
                return { ...prev, [userTeamName]: { ...t, players: updated } };
            });
        } else if (choice === 'bench-b') {
            setTeams(prev => {
                const t = prev[userTeamName];
                const updated = t.players.map(p => p.name === playerB ? { ...p, isStarter: false } : p);
                return { ...prev, [userTeamName]: { ...t, players: updated } };
            });
        }
        // 'risk-it' leaves both players in — rift effect stays active, increasing miscommunication in next match
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
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen teamName={interviewTeamName} chairmanPersonality={interviewPersonality} isLoading={isLoading} error={error} jobOffer={jobOffer} chatHistory={interviewChatHistory} onSendMessage={handleJobInterviewAnswer} onFinish={(acc) => { if (acc && interviewTeamName) initializeGame(interviewTeamName); else setAppScreen(AppScreen.JOB_CENTRE); }} />;
            case AppScreen.PRESS_CONFERENCE: return <PressConferenceScreen chatHistory={pressChatHistory} isLoading={isLoading} isDone={pressConferenceDone} onSendMessage={handlePressSendMessage} onFinish={handlePressConferenceFinish} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={transferMarket} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onSendMessage={handlePlayerTalkMessage} onFinish={handlePlayerTalkFinish} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <div className="relative">
                        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        {showMechanicsGuide && <MechanicsGuide onClose={() => setShowMechanicsGuide(false)} />}
                        <div className="lg:col-span-3">
                            <TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={() => setAppScreen(AppScreen.SCOUTING)} onNavigateToNews={()=>setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={(player) => handleStartPlayerTalk(player, 'renewal')} onToggleStarter={handleToggleStarter} onSwapPlayers={handleSwapPlayers} gameState={gameState} subsUsed={matchState?.subsUsed?.home || 0} onSubstitute={handleSubstitute} onReorderPlayers={handleReorderPlayers} />
                        </div>
                        <div className="lg:col-span-6">
                            <MatchView 
                                fixture={currentFixture} 
                                weeklyResults={weeklyResults} 
                                matchState={matchState} 
                                gameState={gameState} 
                                onPlayFirstHalf={handleStartMatch} 
                                onPlaySecondHalf={handleResumeMatch} 
                                onSimulateSegment={(target) => { 
                                    handleSimulateSegment(target);
                                }} 
                                onNextMatch={handleAdvanceWeek} 
                                onSubstitute={handleSubstitute}
                                onShoutEffect={handleShoutEffect}
                                error={null} 
                                isSeasonOver={false} 
                                userTeamName={userTeamName} 
                                leagueTable={leagueTable} 
                                isLoading={isLoading} 
                                currentWeek={currentWeek} 
                                teams={teams}
                                usedMelodies={seasonUsedMelodies}
                                onMelodyUsed={(id) => setSeasonUsedMelodies(prev => [...prev, id])}
                            />
                        </div>
                        <div className="lg:col-span-3"><LeagueTableView table={leagueTable} userTeamName={userTeamName} knockoutResults={gameMode === 'WorldCup' ? [...wcKnockoutResults, ...fixtures.filter(f => f.isKnockout && !wcKnockoutResults.find(r => r.id === f.id))] : []} /></div>
                        </main>
                    </div>
                );
            case AppScreen.SCOUTING: return <ScoutingScreen
                isNationalTeam={gameMode === 'WorldCup'}
                isFictionalMode={false}
                onScout={async (r: string, useReal: boolean, archetype?: ScoutArchetype, isFictional?: boolean): Promise<ScoutReport> => {
                    setIsLoading(true);
                    try {
                        const res = await scoutPlayers(r, useReal, archetype, isFictional);
                        return res;
                    } finally {
                        setIsLoading(false);
                    }
                }}
                onFollowUp={async (originalRequest: string, previousResponse: string, followUp: string, archetype: ScoutArchetype, useRealWorld: boolean): Promise<string> => {
                    return await scoutFollowUp(originalRequest, previousResponse, followUp, archetype, useRealWorld);
                }}
                isLoading={isLoading}
                onApproachPlayer={(p: Player) => handleStartPlayerTalk(p, 'transfer')}
                onBack={() => setAppScreen(AppScreen.GAMEPLAY)}
                onGoToTransfers={() => setAppScreen(AppScreen.TRANSFERS)}
            />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} onRiftDecision={handleRiftDecision} />;
            case AppScreen.WORLD_CUP_RESULT: return wcResult ? (
                <WorldCupResultScreen
                    result={wcResult}
                    onContinue={() => {
                        setAppScreen(AppScreen.START_SCREEN);
                        setUserTeamName(null);
                        setTeams(allTeams);
                        setGameMode('Club');
                    }}
                />
            ) : null;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-4" style={{ 
            backgroundImage: activeTheme ? `radial-gradient(circle at 50% 0%, ${activeTheme.primary}40 0%, #111827 60%)` : undefined 
        }}>
            <Header onQuit={appScreen !== AppScreen.START_SCREEN ? handleQuit : undefined} showQuit={appScreen !== AppScreen.START_SCREEN} onSave={saveGame} onToggleGuide={() => setShowMechanicsGuide(true)} managerReputation={userTeamName ? managerReputation : undefined} />
            {renderScreen()}
        </div>
    );
}
