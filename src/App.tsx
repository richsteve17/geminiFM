
import React, { useState, useCallback, useEffect } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, GameMode, NegotiationResult } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import AtmosphereWidget from './components/AtmosphereWidget';
import { simulateMatchSegment, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, scoutPlayers, generatePressConference, getInternationalBreakSummary } from './services/geminiService';
import { generatePunkChant, type Chant } from './services/chantService';
import { generateFixtures, simulateQuickMatch, generateSwissFixtures } from './utils';
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
import { generateWorldCupStructure, NATIONAL_TEAMS } from './international';
import { getChampionsLeagueParticipants } from './europe';

const INTERNATIONAL_BREAK_WEEKS = [10, 20, 30];

const convertNationalTeam = (nt: NationalTeam): Team => ({
    name: nt.name,
    league: 'International',
    players: nt.players,
    tactic: nt.tactic,
    prestige: nt.prestige,
    chairmanPersonality: 'Traditionalist',
    group: nt.group,
    balance: 0,
    objectives: nt.objectives || []
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
    const [gameState, setGameState] = useState<GameState>(GameState.PRE_MATCH);
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [weeklyResults, setWeeklyResults] = useState<Fixture[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [interview, setInterview] = useState<Interview | null>(null);
    const [jobOffer, setJobOffer] = useState<{ offer: boolean; reasoning: string } | null>(null);
    
    // Negotiation States
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<NegotiationResult | null>(null);
    const [pendingContractTerms, setPendingContractTerms] = useState<{ wage: number, length: number } | null>(null);
    
    // Transfer Market State (Mutable!)
    const [transferMarket, setTransferMarket] = useState<Player[]>(TRANSFER_TARGETS);

    const [activeShout, setActiveShout] = useState<TouchlineShout | undefined>(undefined);
    const [scoutResults, setScoutResults] = useState<Player[]>([]);
    const [pressQuestions, setPressQuestions] = useState<string[]>([]);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [managerReputation, setManagerReputation] = useState<number>(0);
    
    // --- CHANT STATE ---
    const [currentChant, setCurrentChant] = useState<Chant | null>(null);

    const userTeam = userTeamName ? teams[userTeamName] : null;

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
        setTransferMarket(TRANSFER_TARGETS); // Reset transfers
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

    // ... (World Cup and Club Initialization code omitted for brevity, essentially same as before but ensure clean state) ...
    // Re-pasting Initialization for safety
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
        setGameMode('Club'); setIsPrologue(false);
        setManagerReputation(70); 
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
    }, []);

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

    const handleReorderPlayers = (newPlayerOrder: Player[]) => {
        if (!userTeamName) return;
        setTeams(prev => ({ ...prev, [userTeamName]: { ...prev[userTeamName], players: newPlayerOrder } }));
    };

    // ... Match Handling Logic (same as before) ...
    const handleAdvanceWeek = async () => {
        setIsLoading(true);
        if (gameState === GameState.POST_MATCH && matchState && userTeamName) {
            try { const qs = await generatePressConference("Match finished."); setPressQuestions(qs); setAppScreen(AppScreen.PRESS_CONFERENCE); setIsLoading(false); return; } catch (e) {}
        }
        proceedToNextWeek();
    };

    const proceedToNextWeek = async () => {
        const nextW = currentWeek + 1;
        const results: Fixture[] = [];
        fixtures.filter(f => f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName).forEach(f => {
            const res = simulateQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
            results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
        });
        if (gameMode === 'Club' && INTERNATIONAL_BREAK_WEEKS.includes(nextW)) {
            const summary = await getInternationalBreakSummary(nextW);
            setNews(prev => [{ id: Date.now(), week: nextW, title: summary.newsTitle, body: summary.newsBody, type: 'call-up' }, ...prev]);
        }
        setWeeklyResults(results); setCurrentWeek(nextW);
        setCurrentFixture(fixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); setGameState(GameState.PRE_MATCH); setIsLoading(false);
    };

    const handlePlayFirstHalf = async () => {
        if (!currentFixture || !userTeam) return;
        setGameState(GameState.SIMULATING); setIsLoading(true); setActiveShout(undefined); 
        const home = teams[currentFixture.homeTeam]; const away = teams[currentFixture.awayTeam];
        const startState = matchState || { currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: "Kick off." };
        const result = await simulateMatchSegment(home, away, startState, 45, { userTeamName });
        setMatchState(prev => ({ ...startState, currentMinute: 45, homeScore: (prev?.homeScore || 0) + result.homeScoreAdded, awayScore: (prev?.awayScore || 0) + result.awayScoreAdded, events: [...(prev?.events || []), ...result.events], momentum: result.momentum, tacticalAnalysis: result.tacticalAnalysis }));
        setGameState(GameState.PAUSED); setIsLoading(false);
    };

    const handlePlaySecondHalf = async (shout: TouchlineShout) => { setActiveShout(shout); handleSimulateSegment(60); };

    const handleSimulateSegment = async (targetMinute: number) => {
        if (!currentFixture || !matchState || !userTeam) return;
        setGameState(GameState.SIMULATING); setIsLoading(true);
        const home = teams[currentFixture.homeTeam]; const away = teams[currentFixture.awayTeam];
        const result = await simulateMatchSegment(home, away, matchState, targetMinute, { shout: activeShout, userTeamName });
        const newState = { ...matchState, currentMinute: targetMinute, homeScore: matchState.homeScore + result.homeScoreAdded, awayScore: matchState.awayScore + result.awayScoreAdded, events: [...matchState.events, ...result.events], momentum: result.momentum, tacticalAnalysis: result.tacticalAnalysis, isFinished: targetMinute >= 90 };
        setMatchState(newState);
        if (targetMinute >= 90) {
            setGameState(GameState.POST_MATCH);
            const isHome = currentFixture.homeTeam === userTeamName;
            const userGoals = isHome ? newState.homeScore : newState.awayScore;
            const oppGoals = isHome ? newState.awayScore : newState.homeScore;
            if (userGoals > oppGoals) setManagerReputation(r => Math.min(100, r + 2));
            else if (userGoals === oppGoals) setManagerReputation(r => Math.min(100, r + 1));
            else setManagerReputation(r => Math.max(0, r - 1));
            setLeagueTable(prev => {
                const newTable = [...prev];
                const updateTeam = (name: string, goalsFor: number, goalsAgainst: number) => {
                    const idx = newTable.findIndex(t => t.teamName === name);
                    if (idx !== -1) { const t = newTable[idx]; t.played++; t.goalsFor += goalsFor; t.goalsAgainst += goalsAgainst; t.goalDifference = t.goalsFor - t.goalsAgainst; if (goalsFor > goalsAgainst) { t.won++; t.points += 3; } else if (goalsFor === goalsAgainst) { t.drawn++; t.points += 1; } else { t.lost++; } }
                };
                updateTeam(currentFixture.homeTeam, newState.homeScore, newState.awayScore);
                updateTeam(currentFixture.awayTeam, newState.awayScore, newState.homeScore);
                return newTable;
            });
        } else { setGameState(GameState.PAUSED); }
        setIsLoading(false);
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

    // --- PLAYER NEGOTIATION HANDLERS ---

    const handleStartPlayerTalk = async (player: Player, context: 'transfer' | 'renewal') => {
        if (!userTeamName) return;
        setIsLoading(true); setTalkResult(null); setPlayerTalk(null); setError(null); setPendingContractTerms(null);
        setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const questions = await getPlayerTalkQuestions(player, teams[userTeamName], context);
            setPlayerTalk({ player, questions, answers: [], currentQuestionIndex: 0, context, negotiationHistory: [] });
        } catch (e) { setError("Negotiations failed."); setAppScreen(AppScreen.GAMEPLAY); } finally { setIsLoading(false); }
    };

    const handlePlayerTalkAnswer = async (answer: string, offer?: { wage: number, length: number }) => {
        if (!playerTalk || !userTeamName) return;
        const newAnswers = [...playerTalk.answers, answer];
        
        if (offer) {
            setPendingContractTerms(offer);
            setIsLoading(true);
            try {
                // Determine if this is a counter offer scenario by checking if we have existing history
                const result = await evaluatePlayerTalk(playerTalk.player, playerTalk.questions, newAnswers, teams[userTeamName], playerTalk.context, offer);
                setTalkResult(result);
                
                // If countered, we don't finish yet. User stays on screen.
                if (result.decision === 'counter') {
                    // Optionally record history here if needed for more context depth
                }
            } catch (e) { setError("Evaluation failed."); } finally { setIsLoading(false); }
        } else if (playerTalk.currentQuestionIndex < playerTalk.questions.length - 1) {
            setPlayerTalk({ ...playerTalk, answers: newAnswers, currentQuestionIndex: playerTalk.currentQuestionIndex + 1 });
        }
    };

    const handlePlayerTalkFinish = () => {
        if (talkResult?.decision === 'accepted' && playerTalk && userTeamName && pendingContractTerms) {
            setTeams(prev => {
                const team = prev[userTeamName];
                let updatedPlayers;

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
                    [userTeamName]: { ...team, players: updatedPlayers } 
                };
            });

            // CRITICAL FIX: Remove from Transfer Market if bought
            if (playerTalk.context === 'transfer') {
                setTransferMarket(prev => prev.filter(p => p.name !== playerTalk.player.name));
            }
        }
        setPlayerTalk(null); setTalkResult(null); setPendingContractTerms(null); setAppScreen(AppScreen.GAMEPLAY);
    };

    const worldCupTeams = NATIONAL_TEAMS.map(convertNationalTeam);
    const clubTeams = Object.values(allTeams).filter(t => {
        if (['Manchester City', 'Arsenal', 'Liverpool', 'Chelsea', 'Real Madrid', 'FC Barcelona', 'Bayern Munich', 'Juventus', 'AC Milan', 'Inter Milan', 'PSG', 'Inter Miami'].includes(t.name)) return true;
        if (t.league === 'MLS' || t.league === 'Championship') return true;
        return t.prestige >= 80; 
    });

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return (
                <div>
                    <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />
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
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <div className="relative">
                        {gameState !== GameState.PRE_MATCH && matchState && userTeamName && (
                            <div className="mb-4">
                                <AtmosphereWidget chant={currentChant} momentum={matchState.momentum || 0} teamName={userTeamName} />
                            </div>
                        )}
                        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        {showMechanicsGuide && <MechanicsGuide onClose={() => setShowMechanicsGuide(false)} />}
                        <div className="lg:col-span-3">
                            <TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={() => setAppScreen(AppScreen.SCOUTING)} onNavigateToNews={()=>setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={(player) => handleStartPlayerTalk(player, 'renewal')} onToggleStarter={handleToggleStarter} gameState={gameState} subsUsed={matchState?.subsUsed?.home || 0} onSubstitute={handleSubstitute} onReorderPlayers={handleReorderPlayers} />
                        </div>
                        <div className="lg:col-span-6"><MatchView fixture={currentFixture} weeklyResults={weeklyResults} matchState={matchState} gameState={gameState} onPlayFirstHalf={handlePlayFirstHalf} onPlaySecondHalf={handlePlaySecondHalf} onSimulateSegment={handleSimulateSegment} onNextMatch={handleAdvanceWeek} error={null} isSeasonOver={false} userTeamName={userTeamName} leagueTable={leagueTable} isLoading={isLoading} currentWeek={currentWeek} teams={teams} /></div>
                        <div className="lg:col-span-3"><LeagueTableView table={leagueTable} userTeamName={userTeamName} /></div>
                        </main>
                    </div>
                );
            case AppScreen.SCOUTING: return <ScoutingScreen isNationalTeam={gameMode === 'WorldCup'} onScout={async (r, useReal) => { setIsLoading(true); const res = await scoutPlayers(r, useReal); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} onGoToTransfers={() => setAppScreen(AppScreen.TRANSFERS)} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-4">
            <Header onQuit={appScreen !== AppScreen.START_SCREEN ? handleQuit : undefined} showQuit={appScreen !== AppScreen.START_SCREEN} onSave={saveGame} onToggleGuide={() => setShowMechanicsGuide(true)} managerReputation={userTeamName ? managerReputation : undefined} />
            {renderScreen()}
        </div>
    );
}
