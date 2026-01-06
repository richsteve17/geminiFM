
import React, { useState, useCallback, useMemo } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, TournamentStage, GameMode } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import { simulateMatchSegment, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, scoutPlayers, generatePressConference } from './services/geminiService';
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
import { NATIONAL_TEAMS, generateWorldCupStructure } from './international';
import { getChampionsLeagueParticipants } from './europe';

export default function App() {
    const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.START_SCREEN);
    const [userTeamName, setUserTeamName] = useState<string | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>('Club');
    const [isPrologue, setIsPrologue] = useState(false);

    const [showTutorial, setShowTutorial] = useState(false);
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
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<{ convinced: boolean; reasoning: string } | null>(null);

    const [scoutResults, setScoutResults] = useState<Player[]>([]);
    const [pressQuestions, setPressQuestions] = useState<string[]>([]);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

    const userTeam = userTeamName ? teams[userTeamName] : null;

    const startTutorial = () => {
        setTutorialStep(0);
        setShowTutorial(true);
    };

    const addNewsItem = (title: string, body: string, type: NewsItem['type']) => {
        setNews(prevNews => [{ id: Date.now(), week: currentWeek, title, body, type }, ...prevNews]);
    };

    const handleEndPrologue = (context: 'WonFinal' | 'Eliminated' | 'GroupStageFail') => {
        let experience: ExperienceLevel;
        let summaryMsg = "";
        if (context === 'WonFinal') {
            experience = EXPERIENCE_LEVELS.find(e => e.id === 'legend')!;
            summaryMsg = "HISTORY! You won the World Cup. You are football royalty.";
        } else if (context === 'Eliminated') {
             experience = EXPERIENCE_LEVELS.find(e => e.id === 'pro')!;
             summaryMsg = "Knocked out. A respectable run, but the nation wanted more.";
        } else {
             experience = EXPERIENCE_LEVELS.find(e => e.id === 'semi-pro')!;
             summaryMsg = "Eliminated in the groups. A disaster.";
        }
        setIsPrologue(false);
        setGameMode('Club');
        generateJobs(experience);
        alert(summaryMsg);
    };

    const initializeWorldCup = (selectedNationalTeamName: string) => {
        setGameMode('WorldCup');
        setIsPrologue(true);
        setUserTeamName(selectedNationalTeamName);
        const wcTeamsRecord = generateWorldCupStructure();
        setTeams(wcTeamsRecord);

        const groupFixtures: Fixture[] = [];
        const groups: Record<string, string[]> = {};
        Object.values(wcTeamsRecord).forEach((t: Team) => {
            if (t.group) {
                if (!groups[t.group]) groups[t.group] = [];
                groups[t.group].push(t.name);
            }
        });

        Object.entries(groups).forEach(([groupName, teamNames]) => {
            groupFixtures.push({ id: `g-${groupName}-1-1`, week: 1, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[1], played: false, stage: 'Group Stage' });
            groupFixtures.push({ id: `g-${groupName}-1-2`, week: 1, league: 'International', homeTeam: teamNames[2], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
            groupFixtures.push({ id: `g-${groupName}-2-1`, week: 2, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
            groupFixtures.push({ id: `g-${groupName}-2-2`, week: 2, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
            groupFixtures.push({ id: `g-${groupName}-3-1`, week: 3, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
            groupFixtures.push({ id: `g-${groupName}-3-2`, week: 3, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
        });

        setWeeksInSeason(8); 
        setFixtures(groupFixtures);
        setLeagueTable(Object.values(wcTeamsRecord).map((t: Team) => ({
            teamName: t.name, league: 'International' as const, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, group: t.group
        })));

        setCurrentWeek(1);
        setGameState(GameState.PRE_MATCH);
        setNews([{ id: Date.now(), week: 1, title: 'World Cup 2026 Begins', body: 'The road to glory starts now.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(groupFixtures.find(f => (f.homeTeam === selectedNationalTeamName || f.awayTeam === selectedNationalTeamName) && f.week === 1));
        startTutorial();
    };

    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club');
        setIsPrologue(false);
        let finalTeamsState = { ...allTeams };
        
        const domesticFixtures = generateFixtures(Object.values(allTeams));
        const { participants, newTeams } = getChampionsLeagueParticipants(allTeams);
        finalTeamsState = { ...finalTeamsState, ...newTeams };
        
        const clFixturesRaw = generateSwissFixtures(participants.map(name => finalTeamsState[name]));
        const clLeagueWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
        
        const finalFixtures: Fixture[] = [];
        domesticFixtures.forEach(f => {
            let offset = 0;
            clLeagueWeeks.forEach(w => { if (f.week >= w) offset++; });
            finalFixtures.push({ ...f, week: f.week + offset });
        });

        clFixturesRaw.forEach(f => {
            const gameWeek = clLeagueWeeks[f.week - 1];
            if (gameWeek) finalFixtures.push({ ...f, week: gameWeek });
        });

        const initialTable: LeagueTableEntry[] = Object.values(allTeams).map((t: Team) => ({
            teamName: t.name, league: t.league, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        }));
        
        participants.forEach(name => {
            initialTable.push({
                teamName: name, league: 'Champions League', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            });
        });

        setWeeksInSeason(Math.max(...finalFixtures.map(f => f.week)) + 12);
        setLeagueTable(initialTable);
        setFixtures(finalFixtures);
        setCurrentWeek(1);
        setTeams(finalTeamsState);
        setUserTeamName(selectedTeamName);
        setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName) && f.week === 1));
        startTutorial();
    }, []);

    const generateJobs = (experience: ExperienceLevel) => {
        const vacancies = Object.values(allTeams)
            .filter(t => t.prestige <= experience.prestigeCap && t.prestige >= experience.prestigeMin)
            .sort(() => 0.5 - Math.random())
            .slice(0, 6);

        setAvailableJobs(vacancies.map(t => ({
            teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality
        })));
        setAppScreen(AppScreen.JOB_CENTRE);
    };

    const generateKnockoutFixtures = (week: number, stage: TournamentStage) => {
        let qualifiedTeams: string[] = [];
        const isUCL = gameMode === 'Club' && stage !== 'Group Stage';

        if (isUCL && stage === 'Play-offs') {
            const table = leagueTable.filter(t => t.league === 'Champions League')
                .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference);
            const playoffTeams = table.slice(8, 24).map(t => t.teamName);
            
            if (userTeamName && !playoffTeams.includes(userTeamName) && !table.slice(0, 8).some(t => t.teamName === userTeamName)) {
                addNewsItem("Champions League Exit", "We failed to reach the knockout stages.", "tournament-result");
                return null; 
            }
            qualifiedTeams = playoffTeams;
        } else if (gameMode === 'WorldCup' && week === 4) {
            qualifiedTeams = leagueTable.filter(t => t.league === 'International').sort((a,b) => b.points - a.points).slice(0, 32).map(t => t.name);
            if (!qualifiedTeams.includes(userTeamName!)) { handleEndPrologue('GroupStageFail'); return null; }
        } else {
            // General logic for next rounds: winners of last week
            const prevFixtures = fixtures.filter(f => f.week === week - 1 && f.played);
            prevFixtures.forEach(f => {
                const [h, a] = (f.score || "0-0").split('-').map(Number);
                qualifiedTeams.push(h > a ? f.homeTeam : f.awayTeam);
            });
        }

        const newFixtures: Fixture[] = [];
        for (let i = 0; i < qualifiedTeams.length; i += 2) {
            const team1 = qualifiedTeams[i];
            const team2 = qualifiedTeams[i+1];
            if (!team2) break;

            newFixtures.push({ id: `ko-${stage}-${i}`, week, league: isUCL ? 'Champions League' : 'International', homeTeam: team1, awayTeam: team2, played: false, stage, isKnockout: true });
            if (isUCL && stage !== 'Final') {
                newFixtures.push({ id: `ko-${stage}-L2-${i}`, week: week + 1, league: 'Champions League', homeTeam: team2, awayTeam: team1, played: false, stage, isKnockout: true });
            }
        }
        return newFixtures;
    };

    const handleManagerCreation = (name: string, experience: ExperienceLevel) => generateJobs(experience);

    const handleTacticChange = (newTactic: Partial<Tactic>) => {
        if (!userTeamName) return;
        setTeams(prev => ({ ...prev, [userTeamName]: { ...prev[userTeamName], tactic: { ...prev[userTeamName].tactic, ...newTactic } } }));
    };

    const handleToggleStarter = (playerName: string) => {
        if (!userTeamName) return;
        setTeams(prev => {
            const team = prev[userTeamName];
            return { ...prev, [userTeamName]: { ...team, players: team.players.map(p => p.name === playerName ? { ...p, isStarter: !p.isStarter } : p) } };
        });
    };

    const handleSubstitute = (playerIn: Player, playerOut: Player) => {
        if (!userTeamName) return;
        setTeams(prev => {
            const team = prev[userTeamName];
            return { ...prev, [userTeamName]: { ...team, players: team.players.map(p => p.name === playerIn.name ? { ...p, isStarter: true } : p.name === playerOut.name ? { ...p, isStarter: false } : p) } };
        });
        if (matchState) {
            setMatchState(prev => prev ? ({
                ...prev,
                subsUsed: { ...prev.subsUsed, [currentFixture?.homeTeam === userTeamName ? 'home' : 'away']: prev.subsUsed[currentFixture?.homeTeam === userTeamName ? 'home' : 'away'] + 1 },
                events: [...prev.events, { id: Date.now(), minute: prev.currentMinute, type: 'sub', description: `Sub: ${playerIn.name} ON, ${playerOut.name} OFF`, teamName: userTeamName }]
            }) : null);
        }
    };

    const handlePlayFirstHalf = useCallback(async () => {
        if (!currentFixture || !userTeam) return;
        if (userTeam.players.filter(p => p.isStarter).length !== 11) {
            setError("Select 11 players to start.");
            return;
        }
        setGameState(GameState.SIMULATING);
        setError(null);
        const initialState: MatchState = { currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: "Kick off!" };
        setMatchState(initialState);
        try {
            const result = await simulateMatchSegment(teams[currentFixture.homeTeam], teams[currentFixture.awayTeam], initialState, 45, { stage: currentFixture.stage, isKnockout: currentFixture.isKnockout });
            setMatchState(prev => prev ? ({ ...prev, currentMinute: 45, homeScore: result.homeScoreAdded, awayScore: result.awayScoreAdded, events: result.events.map(e => ({ ...e, id: Math.random() })), momentum: result.momentum, tacticalAnalysis: result.tacticalAnalysis }) : null);
            setGameState(GameState.PAUSED);
        } catch (e) { setGameState(GameState.PRE_MATCH); }
    }, [currentFixture, teams, userTeam]);

    const handlePlaySecondHalf = useCallback(async (shout: TouchlineShout) => {
        if (!currentFixture || !matchState) return;
        setGameState(GameState.SIMULATING);
        try {
            const result = await simulateMatchSegment(teams[currentFixture.homeTeam], teams[currentFixture.awayTeam], matchState, 60, { stage: currentFixture.stage, isKnockout: currentFixture.isKnockout, teamTalk: { teamName: userTeamName!, shout } });
            setMatchState(prev => prev ? ({ ...prev, currentMinute: 60, homeScore: prev.homeScore + result.homeScoreAdded, awayScore: prev.awayScore + result.awayScoreAdded, events: [...prev.events, ...result.events.map(e => ({ ...e, id: Math.random() }))], momentum: result.momentum, tacticalAnalysis: result.tacticalAnalysis }) : null);
            setGameState(GameState.PAUSED);
        } catch (e) { setGameState(GameState.PAUSED); }
    }, [currentFixture, teams, matchState, userTeamName]);

    const handleSimulateSegment = useCallback(async (target: number) => {
        if (!currentFixture || !matchState) return;
        setGameState(GameState.SIMULATING);
        try {
            const result = await simulateMatchSegment(teams[currentFixture.homeTeam], teams[currentFixture.awayTeam], matchState, target, { stage: currentFixture.stage, isKnockout: currentFixture.isKnockout });
            setMatchState(prev => {
                if (!prev) return null;
                const newState = { ...prev, currentMinute: target, homeScore: prev.homeScore + result.homeScoreAdded, awayScore: prev.awayScore + result.awayScoreAdded, events: [...prev.events, ...result.events.map(e => ({ ...e, id: Math.random() }))], momentum: result.momentum, tacticalAnalysis: result.tacticalAnalysis };
                if (target >= 90) {
                    newState.isFinished = true;
                    if (currentFixture.isKnockout && newState.homeScore === newState.awayScore) {
                        newState.penaltyWinner = Math.random() > 0.5 ? currentFixture.homeTeam : currentFixture.awayTeam;
                        newState.events.push({ id: Date.now(), minute: 120, type: 'commentary', description: `Penalty Shootout: ${newState.penaltyWinner} wins!`, teamName: newState.penaltyWinner });
                    }
                }
                return newState;
            });
            if (target >= 90) {
                updateLeagueTable(currentFixture.homeTeam, currentFixture.awayTeam, matchState.homeScore + result.homeScoreAdded, matchState.awayScore + result.awayScoreAdded, currentFixture.league);
                setGameState(GameState.POST_MATCH);
            } else { setGameState(GameState.PAUSED); }
        } catch (e) { setGameState(GameState.PAUSED); }
    }, [currentFixture, teams, matchState]);

    const updateLeagueTable = (hName: string, aName: string, hG: number, aG: number, league: string) => {
        setLeagueTable(prev => {
            const next = [...prev];
            const h = next.find(t => t.teamName === hName && t.league === league);
            const a = next.find(t => t.teamName === aName && t.league === league);
            if (!h || !a) return prev;
            h.played++; a.played++;
            h.goalsFor += hG; h.goalsAgainst += aG; a.goalsFor += aG; a.goalsAgainst += hG;
            h.goalDifference = h.goalsFor - h.goalsAgainst; h.goalDifference = a.goalsFor - a.goalsAgainst;
            if (hG > aG) { h.won++; h.points += 3; a.lost++; } else if (aG > hG) { a.won++; a.points += 3; h.lost++; } else { h.drawn++; a.drawn++; h.points++; a.points++; }
            return next.sort((x, y) => y.points - x.points || y.goalDifference - x.goalDifference);
        });
    };

    const handleAdvanceWeek = async () => {
        setIsLoading(true);
        if (gameState === GameState.POST_MATCH && matchState && userTeamName) {
            const isImportant = matchState.events.some(e => e.type === 'card' && e.cardType === 'red') || Math.abs(matchState.homeScore - matchState.awayScore) >= 3;
            if (isImportant || Math.random() > 0.6) {
                try {
                    const qs = await generatePressConference(`Result: ${matchState.homeScore}-${matchState.awayScore} v ${currentFixture?.homeTeam === userTeamName ? currentFixture?.awayTeam : currentFixture?.homeTeam}`);
                    setPressQuestions(qs);
                    setAppScreen(AppScreen.PRESS_CONFERENCE);
                    setIsLoading(false);
                    return;
                } catch(e) {}
            }
        }
        proceedToNextWeek();
    };

    const proceedToNextWeek = async () => {
        const nextW = currentWeek + 1;
        const weekFixtures = fixtures.filter(f => f.week === currentWeek);
        const userM = weekFixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName);
        const results: Fixture[] = [];

        weekFixtures.filter(f => f !== userM).forEach(f => {
            const res = simulateQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
            updateLeagueTable(f.homeTeam, f.awayTeam, res.homeGoals, res.awayGoals, f.league);
            results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
        });
        if (userM && matchState?.isFinished) results.push({ ...userM, played: true, score: `${matchState.homeScore}-${matchState.awayScore}` });
        setWeeklyResults(results);

        if (nextW > weeksInSeason) { addNewsItem("Season Over", "Check final rankings.", "tournament-result"); setIsLoading(false); return; }

        let nextF: Fixture[] = fixtures.filter(f => f.week === nextW);
        // Generation of next stages if necessary
        if (nextW === 35 && gameMode === 'Club') {
            const clNext = generateKnockoutFixtures(35, 'Play-offs');
            if (clNext) nextF = [...nextF, ...clNext];
        }

        if (nextF.length > 0 && !fixtures.find(f => f.id === nextF[0].id)) setFixtures(prev => [...prev, ...nextF]);
        setCurrentWeek(nextW);
        setCurrentFixture((nextF.length > 0 ? nextF : fixtures.filter(f => f.week === nextW)).find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName));
        setMatchState(null);
        setGameState(GameState.PRE_MATCH);
        setIsLoading(false);
    };

    const handleScoutRequest = async (req: string) => { setIsLoading(true); try { const res = await scoutPlayers(req); setScoutResults(res); } finally { setIsLoading(false); } };
    const handleStartInterview = async (tName: string) => {
        setIsLoading(true); setAppScreen(AppScreen.JOB_INTERVIEW);
        try {
            const qs = await getInterviewQuestions(tName, allTeams[tName].chairmanPersonality);
            setInterview({ teamName: tName, questions: qs, answers: [], currentQuestionIndex: 0, chairmanPersonality: allTeams[tName].chairmanPersonality });
        } finally { setIsLoading(false); }
    };
    const handleAnswerSubmit = async (ans: string) => {
        if (!interview) return;
        const newAns = [...interview.answers, ans];
        if (interview.currentQuestionIndex < interview.questions.length - 1) {
            setInterview({ ...interview, answers: newAns, currentQuestionIndex: interview.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            const res = await evaluateInterview(interview.teamName, interview.questions, newAns, interview.chairmanPersonality);
            setJobOffer(res); setIsLoading(false);
        }
    };

    const handleStartPlayerTalk = async (p: Player, ctx: 'transfer' | 'renewal') => {
        setIsLoading(true); setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const qs = await getPlayerTalkQuestions(p, teams[userTeamName!], ctx);
            setPlayerTalk({ player: p, questions: qs, answers: [], currentQuestionIndex: 0, context: ctx });
        } finally { setIsLoading(false); }
    };

    const handlePlayerTalkAnswer = async (ans: string) => {
        if (!playerTalk) return;
        const newAns = [...playerTalk.answers, ans];
        if (playerTalk.currentQuestionIndex < playerTalk.questions.length - 1) {
            setPlayerTalk({ ...playerTalk, answers: newAns, currentQuestionIndex: playerTalk.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            const res = await evaluatePlayerTalk(playerTalk.player, playerTalk.questions, newAns, teams[userTeamName!], playerTalk.context);
            setTalkResult(res); setIsLoading(false);
        }
    };

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={gameMode === 'WorldCup' ? NATIONAL_TEAMS : Object.values(allTeams)} onTeamSelect={gameMode === 'WorldCup' ? initializeWorldCup : initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={NATIONAL_TEAMS.slice(0, 5).map(nt => ({ ...nt, league: 'International' as const, chairmanPersonality: 'Traditionalist' as const }))} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen onCreate={handleManagerCreation} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={handleStartInterview} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={error} jobOffer={jobOffer} onAnswerSubmit={handleAnswerSubmit} onFinish={(acc) => { if(acc && jobOffer?.offer) initializeGame(interview!.teamName); setAppScreen(acc ? AppScreen.GAMEPLAY : AppScreen.JOB_CENTRE); }} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={TRANSFER_TARGETS} onApproachPlayer={p => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.SCOUTING: return <ScoutingScreen onScout={handleScoutRequest} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={p => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PRESS_CONFERENCE: return <PressConferenceScreen questions={pressQuestions} onFinish={() => { setAppScreen(AppScreen.GAMEPLAY); handleAdvanceWeek(); }} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={() => { if(talkResult?.convinced && playerTalk) { if(playerTalk.context === 'renewal') { setTeams(prev => { const t = prev[userTeamName!]; return { ...prev, [userTeamName!]: { ...t, players: t.players.map(pl => pl.name === playerTalk.player.name ? { ...pl, contractExpires: pl.contractExpires + 3 } : pl) }}; }); } else { setTeams(prev => { const t = prev[userTeamName!]; return { ...prev, [userTeamName!]: { ...t, players: [...t.players, { ...playerTalk.player, isStarter: false }] }}; }); } } setAppScreen(AppScreen.GAMEPLAY); }} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <main className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(prev => prev + 1)} onClose={() => setShowTutorial(false)} isNationalTeam={gameMode === 'WorldCup'} />}
                        <div className="lg:col-span-3 space-y-6"><TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={() => setAppScreen(AppScreen.SCOUTING)} onNavigateToNews={() => setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={p => handleStartPlayerTalk(p, 'renewal')} onToggleStarter={handleToggleStarter} gameState={gameState} subsUsed={(matchState?.subsUsed?.home ?? 0) + (matchState?.subsUsed?.away ?? 0)} onSubstitute={handleSubstitute} /></div>
                        <div className="lg:col-span-6"><MatchView fixture={currentFixture} weeklyResults={weeklyResults} matchState={matchState} gameState={gameState} onPlayFirstHalf={handlePlayFirstHalf} onPlaySecondHalf={handlePlaySecondHalf} onSimulateSegment={handleSimulateSegment} onNextMatch={handleAdvanceWeek} error={error} isSeasonOver={currentWeek >= weeksInSeason} userTeamName={userTeamName} leagueTable={leagueTable} isLoading={isLoading} currentWeek={currentWeek} teams={teams} /></div>
                        <div className="lg:col-span-3"><LeagueTableView table={leagueTable} userTeamName={userTeamName} /></div>
                    </main>
                );
            default: return <div>Error</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 p-4 sm:p-6 lg:p-8">
            <Header />
            {renderScreen()}
        </div>
    );
}
