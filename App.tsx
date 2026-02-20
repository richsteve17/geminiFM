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
import { generateWorldCupStructure, NATIONAL_TEAMS } from './international';
import { getChampionsLeagueParticipants, generateKnockoutFixtures } from './europe';

const INTERNATIONAL_BREAK_WEEKS = [10, 20];

const CL_KNOCKOUT_WEEKS = {
    roundOf16: 35,
    quarterFinal: 37,
    semiFinal: 39,
    final: 41,
};

const CL_KNOCKOUT_STAGES: TournamentStage[] = [
    'Round of 16',
    'Quarter Final',
    'Semi Final',
    'Final',
];

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

    // --- PROLOGUE: World Cup Initialization ---
    const initializeWorldCup = (selectedNationalTeamName: string) => {
        setGameMode('WorldCup');
        setIsPrologue(true);
        setUserTeamName(selectedNationalTeamName);
        
        // Generate a 48-team World Cup Structure
        const wcTeamsRecord = generateWorldCupStructure();
        setTeams(wcTeamsRecord);

        // Generate Group Stage Fixtures (Weeks 1-3)
        const allWcTeams = Object.values(wcTeamsRecord);
        const groupFixtures: Fixture[] = [];
        const groups: Record<string, string[]> = {};
        
        allWcTeams.forEach((t: Team) => {
            if (t.group) {
                if (!groups[t.group]) groups[t.group] = [];
                groups[t.group].push(t.name);
            }
        });

        // 12 Groups * 3 Rounds * 2 Matches = 72 Group Matches
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

        setWeeksInSeason(8); 
        setFixtures(groupFixtures);
        
        const initialTable = allWcTeams.map((t: Team) => ({
            teamName: t.name, league: 'International' as const, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, group: t.group
        }));
        setLeagueTable(initialTable);

        setCurrentWeek(1);
        setGameState(GameState.PRE_MATCH);
        setNews([{ id: Date.now(), week: 1, title: 'World Cup 2026 Begins', body: '48 teams. 12 Groups. 104 Matches. The road to glory starts now.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        
        const week1Fixtures = groupFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === selectedNationalTeamName || f.awayTeam === selectedNationalTeamName);
        setCurrentFixture(userMatch);
        setWeeklyResults([]);
        
        startTutorial();
    };

    // --- STANDARD: Club Initialization ---
    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club'); setIsPrologue(false);
        let finalTeamsState = { ...allTeams };
        // Initialize financial values for all teams
        Object.keys(finalTeamsState).forEach(teamName => {
            const team = finalTeamsState[teamName];
            const totalWage = team.players.reduce((sum, p) => sum + p.wage, 0);
            finalTeamsState[teamName] = {
                ...team,
                balance: 10000000, // Starting balance
                weeklyWageBill: totalWage,
                matchDayRevenue: 200000 + (team.prestige * 5000), // Base + prestige bonus
                transferBudget: 5000000, // Starting transfer budget
                weeklyBroadcastRevenue: 100000 + (team.prestige * 2500)
            };
        });
        const domesticFixtures = generateFixtures(Object.values(allTeams));
        const { participants, newTeams } = getChampionsLeagueParticipants(allTeams);
        finalTeamsState = { ...finalTeamsState, ...newTeams };
        
        const clWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
        const clFixtures = generateSwissFixtures(participants.map(n => finalTeamsState[n]));

        const finalFixtures: Fixture[] = [];
        domesticFixtures.forEach(f => {
            let gameWeek = f.week;
            // Shift domestic games to accommodate CL weeks
            if (f.week >= 5) gameWeek++;
            if (f.week >= 9) gameWeek++;
            if (f.week >= 13) gameWeek++;
            if (f.week >= 17) gameWeek++;
            if (f.week >= 21) gameWeek++;
            if (f.week >= 25) gameWeek++;
            if (f.week >= 29) gameWeek++;
            if (f.week >= 33) gameWeek++;
            finalFixtures.push({ ...f, week: gameWeek });
        });

        clFixtures.forEach(f => {
            if (clWeeks[f.week - 1]) finalFixtures.push({ ...f, week: clWeeks[f.week - 1] });
        });

        const initialTable: LeagueTableEntry[] = Object.values(finalTeamsState).map(t => ({
            teamName: t.name, league: t.league, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        }));

        setWeeksInSeason(Math.max(...finalFixtures.map(f => f.week)) + 10);
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
        const allTeamList: Team[] = Object.values(allTeams);
        const shuffle = (array: Team[]) => array.sort(() => 0.5 - Math.random());
        let vacancies: Team[] = [];

        if (experience.id === 'legend') {
             vacancies = shuffle(allTeamList.filter(t => t.prestige >= 85)).slice(0, 8);
        } else {
            // STRICT filtering to prevent "London City" appearing for Semi-Pro
            const feasible = allTeamList.filter(t => t.prestige <= experience.prestigeCap && t.prestige >= experience.prestigeMin);
            // Reach is strictly capped at +5 over the cap, not unbounded
            const reach = allTeamList.filter(t => t.prestige > experience.prestigeCap && t.prestige <= experience.prestigeCap + 5);
            const safety = allTeamList.filter(t => t.prestige < experience.prestigeMin && t.prestige > experience.prestigeMin - 15);
            
            vacancies = [
                ...shuffle(feasible).slice(0, 4),
                ...shuffle(reach).slice(0, 2),
                ...shuffle(safety).slice(0, 2)
            ];
        }

        const jobs: Job[] = vacancies.map(t => ({
            teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality
        }));

        setAvailableJobs(jobs);
        setAppScreen(AppScreen.JOB_CENTRE);
    }

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

    const simulateCLKnockoutMatches = (week: number, currentFixtures: Fixture[], allTeams: Record<string, Team>): string[] => {
        const clKnockoutFixtures = currentFixtures.filter(f => f.week === week && f.league === 'Champions League' && f.isKnockout);
        const winners: string[] = [];

        clKnockoutFixtures.forEach(fixture => {
            const homeTeam = allTeams[fixture.homeTeam];
            const awayTeam = allTeams[fixture.awayTeam];
            if (!homeTeam || !awayTeam) return;

            const result = simulateQuickMatch(homeTeam, awayTeam);
            // For simplicity, assuming single-leg knockout. Need to extend for aggregate score if two legs.
            if (result.homeGoals > result.awayGoals) {
                winners.push(homeTeam.name);
            } else if (result.awayGoals > result.homeGoals) {
                winners.push(awayTeam.name);
            } else {
                // Handle draws - simple coin toss for now, could be extra time/penalties
                if (Math.random() > 0.5) {
                    winners.push(homeTeam.name);
                } else {
                    winners.push(awayTeam.name);
                }
            }
        });
        return winners;
    };

    const proceedToNextWeek = () => {
        const nextW = currentWeek + 1;

        if (gameMode === 'Club') {
            const newTeamsState = { ...teams };
            Object.keys(newTeamsState).forEach(teamName => {
                const team = newTeamsState[teamName];
                newTeamsState[teamName].balance -= team.weeklyWageBill;
                newTeamsState[teamName].balance += team.weeklyBroadcastRevenue;
            });
            setTeams(newTeamsState);
        }
        const results: Fixture[] = [];
        fixtures.filter(f => f.week === currentWeek && f.homeTeam !== userTeamName && f.awayTeam !== userTeamName).forEach(f => {
            const res = simulateQuickMatch(teams[f.homeTeam], teams[f.awayTeam]);
            results.push({ ...f, played: true, score: `${res.homeGoals}-${res.awayGoals}` });
        });
        setWeeklyResults(results);
        setCurrentWeek(nextW);

        // Player Development and Contract Expiry
        if (userTeamName) {
            setTeams(prevTeams => {
                const updatedTeams = { ...prevTeams };
                const userTeam = updatedTeams[userTeamName];
                userTeam.players = userTeam.players.map(player => {
                    // Simulate match performance for development (placeholder for now)
                    const matchPerformance = Math.random() * 2 - 1; // -1 to 1
                    const updatedPlayer = calculatePlayerDevelopment(player, matchPerformance);

                    // Check for contract expiry
                    if (updatedPlayer.contractExpires === nextW + 4 && updatedPlayer.contractExpires > 0) { // 4 weeks until expiry
                        setNews(prevNews => [...prevNews, { id: Date.now() + Math.random(), week: nextW, title: `Contract expiring soon!`, body: `${updatedPlayer.name}'s contract expires in 4 weeks.`, type: 'contract-renewal' }]);
                    }
                    updatedPlayer.contractExpires = Math.max(0, updatedPlayer.contractExpires - 1);
                    return updatedPlayer;
                });

                // Apply weekly financial updates
                const userTeam = updatedTeams[userTeamName];
                userTeam.balance -= userTeam.weeklyWageBill; // Deduct wage bill
                
                // Add match day revenue if user team played a home game
                const userMatch = weeklyResults.find(f => f.homeTeam === userTeamName && f.week === currentWeek);
                if (userMatch) {
                    userTeam.balance += userTeam.matchDayRevenue;
                }

                // Check for budget warnings
                if (userTeam.balance < -1000000) { // Example threshold for warning
                    setNews(prevNews => [...prevNews, { id: Date.now() + Math.random(), week: nextW, title: `Financial Crisis!`, body: `Your club's balance is critically low. Take action to avoid administration!`, type: 'finance' }]);
                }

                return updatedTeams;
            });
        }

        // Champions League Knockout Stage Progression
        if (gameMode === 'Club') {
            if (currentWeek === CL_KNOCKOUT_WEEKS.roundOf16 - 1) {
                const clTable = leagueTable.filter(t => t.league === 'Champions League').sort((a, b) => b.points - a.points);
                const qualifiedTeams = clTable.slice(0, 16).map(t => t.teamName);
                const knockoutFixtures = generateKnockoutFixtures(qualifiedTeams, 'Round of 16', CL_KNOCKOUT_WEEKS.roundOf16);
                setFixtures(prev => [...prev, ...knockoutFixtures]);
                setNews(prev => [...prev, { id: Date.now(), week: nextW, title: 'Champions League Knockouts Set', body: 'The Round of 16 draw has been made.', type: 'tournament-result' }]);
            } else if (CL_KNOCKOUT_STAGES.includes(currentFixture?.stage!) && currentFixture?.isKnockout) {
                const winners = simulateCLKnockoutMatches(currentWeek, fixtures, teams);
                const nextStageIndex = CL_KNOCKOUT_STAGES.indexOf(currentFixture.stage!) + 1;
                if (nextStageIndex < CL_KNOCKOUT_STAGES.length) {
                    const nextStage = CL_KNOCKOUT_STAGES[nextStageIndex];
                    const nextWeek = Object.values(CL_KNOCKOUT_WEEKS)[nextStageIndex];
                    const nextFixtures = generateKnockoutFixtures(winners, nextStage, nextWeek);
                    setFixtures(prev => [...prev, ...nextFixtures]);
                    setNews(prev => [...prev, { id: Date.now(), week: nextW, title: `Champions League ${nextStage} Draw`, body: `The draw for the ${nextStage} has been made.`, type: 'tournament-result' }]);
                }
            }
        }

        setCurrentFixture(fixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === nextW));
        setMatchState(null); setGameState(GameState.PRE_MATCH); setIsLoading(false);
    };

    const handleStartPlayerTalk = async (player: Player, context: 'transfer' | 'renewal', offer?: { wage: number; duration: number; }) => {
        if (!userTeamName) return;
        setIsLoading(true); setTalkResult(null); setPlayerTalk(null); setError(null);
        setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const questions = await getPlayerTalkQuestions(player, teams[userTeamName], context);
            setPlayerTalk({ player, questions, answers: [], currentQuestionIndex: 0, context, contractOffer: offer });
        } catch (e) { setError("Negotiations failed."); setAppScreen(AppScreen.GAMEPLAY); } finally { setIsLoading(false); }
    };

    const handlePlayerTalkAnswer = async (answer: string) => {
        if (!playerTalk || !userTeamName) return;
        const newAnswers = [...playerTalk.answers, answer];
        if (playerTalk.currentQuestionIndex < playerTalk.questions.length - 1) {
            setPlayerTalk({ ...playerTalk, answers: newAnswers, currentQuestionIndex: playerTalk.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            try {
                const result = await evaluatePlayerTalk(playerTalk.player, playerTalk.questions, newAnswers, teams[userTeamName], playerTalk.context, playerTalk.contractOffer);
                setTalkResult(result);
            } catch (e) { setError("Evaluation failed."); } finally { setIsLoading(false); }
        }
    };

    const handlePlayerTalkFinish = () => {
        if (talkResult?.convinced && playerTalk && userTeamName) {
            if (playerTalk.context === 'transfer') {
                const newPlayer = { ...playerTalk.player, isStarter: false, contractExpires: 3, status: { type: 'Available' as const }, effects: [] };
                setTeams(prev => ({ ...prev, [userTeamName]: { ...prev[userTeamName], players: [...prev[userTeamName].players, newPlayer] } }));
            } else if (playerTalk.context === 'renewal' && playerTalk.contractOffer) {
                setTeams(prev => {
                    const updatedPlayers = prev[userTeamName].players.map(p => 
                        p.name === playerTalk.player.name 
                            ? { ...p, wage: playerTalk.contractOffer!.wage, contractExpires: currentWeek + playerTalk.contractOffer!.duration * 4 } // Assuming duration is in years, 4 weeks per month
                            : p
                    );
                    return { ...prev, [userTeamName]: { ...prev[userTeamName], players: updatedPlayers } };
                });
                setNews(prevNews => [...prevNews, { id: Date.now(), week: currentWeek, title: `Contract Renewed!`, body: `${playerTalk.player.name} extends contract with ${userTeamName} for ${playerTalk.contractOffer.duration} years at £${playerTalk.contractOffer.wage/1000}k/week.`, type: 'contract-renewal' }]);
            }
        }
        setPlayerTalk(null); setTalkResult(null); setAppScreen(AppScreen.GAMEPLAY);
    };

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={gameMode === 'WorldCup' ? NATIONAL_TEAMS.map(convertNationalTeam) : Object.values(allTeams)} onTeamSelect={gameMode === 'WorldCup' ? initializeWorldCup : initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={NATIONAL_TEAMS.slice(0, 5).map(convertNationalTeam)} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen onCreate={(name, exp) => generateJobs(exp)} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={(n) => { setAppScreen(AppScreen.JOB_INTERVIEW); setInterview({ teamName: n, questions: ["Tactics?", "Chemistry?"], answers:[], currentQuestionIndex:0, chairmanPersonality: allTeams[n].chairmanPersonality }); }} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={null} jobOffer={jobOffer} onAnswerSubmit={() => setJobOffer({ offer: true, reasoning: "Welcome." })} onFinish={(acc) => { if(acc && interview) initializeGame(interview.teamName); else setAppScreen(AppScreen.JOB_CENTRE); }} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={TRANSFER_TARGETS} onApproachPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <main className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {showTutorial && <TutorialOverlay step={tutorialStep} onNext={()=>setTutorialStep(s=>s+1)} onClose={()=>setShowTutorial(false)} isNationalTeam={gameMode==='WorldCup'} />}
                        <div className="lg:col-span-3"><TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={() => setAppScreen(gameMode === 'WorldCup' ? AppScreen.SCOUTING : AppScreen.TRANSFERS)} onNavigateToNews={()=>setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={()=>{}} onToggleStarter={handleToggleStarter} gameState={gameState} subsUsed={0} onSubstitute={()=>{}} /></div>
                        <div className="lg:col-span-6"><MatchView fixture={currentFixture} weeklyResults={weeklyResults} matchState={matchState} gameState={gameState} onPlayFirstHalf={()=>{}} onPlaySecondHalf={()=>{}} onSimulateSegment={()=>{}} onNextMatch={handleAdvanceWeek} error={null} isSeasonOver={false} userTeamName={userTeamName} leagueTable={leagueTable} isLoading={isLoading} currentWeek={currentWeek} teams={teams} /></div>
                        <div className="lg:col-span-3"><LeagueTableView table={leagueTable} userTeamName={userTeamName} /></div>
                    </main>
                );
            case AppScreen.SCOUTING: return <ScoutingScreen onScout={async r=>{ setIsLoading(true); const res=await scoutPlayers(r); setScoutResults(res); setIsLoading(false); }} scoutResults={scoutResults} isLoading={isLoading} onSignPlayer={(p) => handleStartPlayerTalk(p, 'transfer')} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={()=>setAppScreen(AppScreen.GAMEPLAY)} />;
            default: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
        }
    };

    return <div className="min-h-screen bg-gray-900 text-gray-200 p-4"><Header />{renderScreen()}</div>;
}