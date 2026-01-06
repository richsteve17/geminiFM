
import React, { useState, useCallback, useMemo } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, TournamentStage, GameMode } from './types';
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
import { generateWorldCupStructure, NATIONAL_TEAMS } from './international';
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

    const startTutorial = () => { setTutorialStep(0); setShowTutorial(true); };

    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club'); setIsPrologue(false);
        let finalTeamsState = { ...allTeams };
        const domesticFixtures = generateFixtures(Object.values(allTeams));
        const { participants, newTeams } = getChampionsLeagueParticipants(allTeams);
        finalTeamsState = { ...finalTeamsState, ...newTeams };
        
        const clWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
        const clFixtures = generateSwissFixtures(participants.map(n => finalTeamsState[n]));

        const finalFixtures: Fixture[] = domesticFixtures.map(f => {
            let week = f.week; clWeeks.forEach(cw => { if(f.week >= cw) week++; });
            return { ...f, week };
        });
        clFixtures.forEach(f => { if(clWeeks[f.week-1]) finalFixtures.push({...f, week: clWeeks[f.week-1]}); });

        const initialTable: LeagueTableEntry[] = Object.values(finalTeamsState).map(t => ({
            teamName: t.name, league: t.league, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        }));

        setLeagueTable(initialTable);
        setFixtures(finalFixtures);
        setCurrentWeek(1);
        setTeams(finalTeamsState);
        setUserTeamName(selectedTeamName);
        setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName) && f.week === 1));
        startTutorial();
    }, []);

    const initializeWorldCup = (ntName: string) => {
        setGameMode('WorldCup'); setIsPrologue(true); setUserTeamName(ntName);
        const wcTeams = generateWorldCupStructure(); setTeams(wcTeams);
        const fixtures: Fixture[] = [];
        const groups: Record<string, string[]> = {};
        
        Object.values(wcTeams).forEach(t => { 
            if(t.group) { 
                if(!groups[t.group]) groups[t.group]=[]; 
                groups[t.group].push(t.name); 
            } 
        });

        Object.entries(groups).forEach(([g, tms]) => {
            // Group Stage Round Robin
            fixtures.push({ id:`g-${g}-r1-1`, week:1, league:'International', homeTeam:tms[0], awayTeam:tms[1], played:false, stage:'Group Stage' });
            fixtures.push({ id:`g-${g}-r1-2`, week:1, league:'International', homeTeam:tms[2], awayTeam:tms[3], played:false, stage:'Group Stage' });
            fixtures.push({ id:`g-${g}-r2-1`, week:2, league:'International', homeTeam:tms[0], awayTeam:tms[2], played:false, stage:'Group Stage' });
            fixtures.push({ id:`g-${g}-r2-2`, week:2, league:'International', homeTeam:tms[1], awayTeam:tms[3], played:false, stage:'Group Stage' });
            fixtures.push({ id:`g-${g}-r3-1`, week:3, league:'International', homeTeam:tms[0], awayTeam:tms[3], played:false, stage:'Group Stage' });
            fixtures.push({ id:`g-${g}-r3-2`, week:3, league:'International', homeTeam:tms[1], awayTeam:tms[2], played:false, stage:'Group Stage' });
        });

        setFixtures(fixtures);
        setWeeksInSeason(8);
        setLeagueTable(Object.values(wcTeams).map(t => ({ 
            teamName:t.name, league:'International', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, goalDifference:0, points:0, group:t.group 
        })));
        setCurrentWeek(1); setAppScreen(AppScreen.GAMEPLAY);
        setCurrentFixture(fixtures.find(f => (f.homeTeam===ntName || f.awayTeam===ntName) && f.week===1));
        startTutorial();
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

    const handleAdvanceWeek = async () => {
        setIsLoading(true);
        if (gameState === GameState.POST_MATCH && matchState && userTeamName) {
            try {
                const qs = await generatePressConference("Match finished.");
                setPressQuestions(qs); setAppScreen(AppScreen.PRESS_CONFERENCE); setIsLoading(false);
                return;
            } catch (e) {}
        }
        proceedToNextWeek();
    };

    const proceedToNextWeek = () => {
        const nextW = currentWeek + 1;
        const results: Fixture[] = [];
        fixtures.filter(f => f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName).forEach(f => {
            const res = simulateQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
            results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
        });
        setWeeklyResults(results);
        setCurrentWeek(nextW);
        setCurrentFixture(fixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); setGameState(GameState.PRE_MATCH); setIsLoading(false);
    };

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={Object.values(allTeams)} onTeamSelect={initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={NATIONAL_TEAMS.map(nt=>({...nt, league:'International', chairmanPersonality:'Football Federation', balance:0})) as any} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen onCreate={(n, e) => { const jobs = Object.values(allTeams).slice(0, 5).map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality })); setAvailableJobs(jobs); setAppScreen(AppScreen.JOB_CENTRE); }} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={(n) => { setAppScreen(AppScreen.JOB_INTERVIEW); setInterview({ teamName: n, questions: ["Vision?", "Tactics?"], answers:[], currentQuestionIndex:0, chairmanPersonality: allTeams[n].chairmanPersonality }); }} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={null} jobOffer={jobOffer} onAnswerSubmit={() => setJobOffer({ offer: true, reasoning: "Welcome aboard." })} onFinish={(acc) => { if(acc && interview) initializeGame(interview.teamName); else setAppScreen(AppScreen.JOB_CENTRE); }} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <main className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        <div className="lg:col-span-3"><TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={()=>setAppScreen(AppScreen.SCOUTING)} onNavigateToNews={()=>setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={()=>{}} onToggleStarter={handleToggleStarter} gameState={gameState} subsUsed={0} onSubstitute={()=>{}} /></div>
                        <div className="lg:col-span-6"><MatchView fixture={currentFixture} weeklyResults={weeklyResults} matchState={matchState} gameState={gameState} onPlayFirstHalf={()=>{}} onPlaySecondHalf={()=>{}} onSimulateSegment={()=>{}} onNextMatch={handleAdvanceWeek} error={null} isSeasonOver={false} userTeamName={userTeamName} leagueTable={leagueTable} isLoading={isLoading} currentWeek={currentWeek} teams={teams} /></div>
                        <div className="lg:col-span-3"><LeagueTableView table={leagueTable} userTeamName={userTeamName} /></div>
                    </main>
                );
            case AppScreen.SCOUTING: return <ScoutingScreen onScout={async r=>{ setIsLoading(true); const res=await scoutPlayers(r); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={()=>{}} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return <div className="min-h-screen bg-gray-900 text-gray-200 p-4"><Header />{renderScreen()}</div>;
}
