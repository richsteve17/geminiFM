
import React, { useState, useCallback, useMemo } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import { simulateHalf, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, getTournamentResult, getPlayerPostTournamentMorale, getTeammateTournamentRivalry } from './services/geminiService';
import { generateFixtures } from './utils';
import StartScreen from './components/StartScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import JobCentreScreen from './components/JobCentreScreen';
import JobInterviewScreen from './components/JobInterviewScreen';
import TransfersScreen from './components/TransfersScreen';
import PlayerTalkScreen from './components/PlayerTalkScreen';
import NewsScreen from './components/NewsScreen';
import { TOURNAMENTS, NATIONAL_TEAMS } from './international';

const WEEKS_IN_SEASON = (Object.keys(allTeams).length - 1) * 2;
const INTERNATIONAL_BREAK_WEEKS = [8, 16]; // Example weeks for tournaments

export default function App() {
    // App-level state
    const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.START_SCREEN);
    const [userTeamName, setUserTeamName] = useState<string | null>(null);

    // Game-level state
    const [currentWeek, setCurrentWeek] = useState(1);
    const [teams, setTeams] = useState<Record<string, Team>>(allTeams);
    const [leagueTable, setLeagueTable] = useState<LeagueTableEntry[]>([]);
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [currentFixtureIndex, setCurrentFixtureIndex] = useState<number>(0);
    const [gameState, setGameState] = useState<GameState>(GameState.PRE_MATCH);
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);

    // Job & Player Talk state
    const [isLoading, setIsLoading] = useState(false);
    const [interview, setInterview] = useState<Interview | null>(null);
    const [jobOffer, setJobOffer] = useState<{ offer: boolean; reasoning: string } | null>(null);
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<{ convinced: boolean; reasoning: string } | null>(null);

    const userTeam = userTeamName ? teams[userTeamName] : null;
    const currentFixture = fixtures[currentFixtureIndex];

    const initializeGame = useCallback((selectedTeamName: string) => {
        const teamNames = Object.keys(allTeams);
        const initialTable = teamNames.map(name => ({
            teamName: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        }));
        const generatedFixtures = generateFixtures(teamNames);
        const initialNews: NewsItem[] = [];
        const startingTeam = allTeams[selectedTeamName];
        const expiringPlayers = startingTeam.players.filter(p => p.contractExpires === 0);
        if (expiringPlayers.length > 0) {
            initialNews.push({
                id: Date.now(),
                week: 1,
                title: "Pre-Season: Contract Alert",
                body: `The board expects you to resolve the contract situations for ${expiringPlayers.map(p => p.name).join(', ')}. Their contracts have expired!`,
                type: 'contract-renewal'
            });
        }


        setLeagueTable(initialTable);
        setFixtures(generatedFixtures);
        setCurrentFixtureIndex(0);
        setCurrentWeek(1);
        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setError(null);
        setTeams(allTeams);
        setNews(initialNews);
        setUserTeamName(selectedTeamName);
        setAppScreen(AppScreen.GAMEPLAY);
    }, []);

    const addNewsItem = (title: string, body: string, type: NewsItem['type']) => {
        setNews(prevNews => [{ id: Date.now(), week: currentWeek, title, body, type }, ...prevNews]);
    };

    const handleTacticChange = (newTactic: Partial<Tactic>) => {
        if (!userTeamName) return;
        setTeams(prevTeams => ({ ...prevTeams, [userTeamName]: { ...prevTeams[userTeamName], tactic: { ...prevTeams[userTeamName].tactic, ...newTactic } } }));
    };

    const handlePlayFirstHalf = useCallback(async () => {
        if (!currentFixture) return;
        setGameState(GameState.SIMULATING);
        setError(null);
        setMatchState(null);

        const homeTeam = teams[currentFixture.homeTeam];
        const awayTeam = teams[currentFixture.awayTeam];

        try {
            const firstHalfResult = await simulateHalf(homeTeam, awayTeam, { half: 'first' });
            setMatchState({ firstHalfResult, secondHalfResult: null, finalScore: null, fullTimeCommentary: null });
            setGameState(GameState.HALF_TIME);
        } catch (err) {
            console.error(err);
            setError('Failed to simulate first half. Please try again.');
            setGameState(GameState.PRE_MATCH);
        }
    }, [currentFixture, teams]);

    const handlePlaySecondHalf = useCallback(async (shout: TouchlineShout) => {
        if (!currentFixture || !matchState || !matchState.firstHalfResult || !userTeam) return;
        setGameState(GameState.SIMULATING);
        
        const homeTeam = teams[currentFixture.homeTeam];
        const awayTeam = teams[currentFixture.awayTeam];

        try {
            const secondHalfResult = await simulateHalf(homeTeam, awayTeam, {
                half: 'second',
                halfTimeScore: { home: matchState.firstHalfResult.homeGoals, away: matchState.firstHalfResult.awayGoals, },
                teamTalk: { teamName: userTeam.name, shout }
            });

            const finalHomeGoals = matchState.firstHalfResult.homeGoals + secondHalfResult.homeGoals;
            const finalAwayGoals = matchState.firstHalfResult.awayGoals + secondHalfResult.awayGoals;
            
            const finalState: MatchState = { ...matchState, secondHalfResult, finalScore: `${finalHomeGoals}-${finalAwayGoals}`, fullTimeCommentary: `${matchState.firstHalfResult.commentary}\n\n${secondHalfResult.commentary}` };

            setMatchState(finalState);
            updateLeagueTable(homeTeam.name, awayTeam.name, finalHomeGoals, finalAwayGoals);
            setGameState(GameState.POST_MATCH);

        } catch (err) {
            console.error(err);
            setError('Failed to simulate second half. Please try again.');
            setGameState(GameState.HALF_TIME);
        }

    }, [currentFixture, teams, matchState, userTeam]);

    const updateLeagueTable = (homeTeamName: string, awayTeamName: string, homeGoals: number, awayGoals: number) => {
        setLeagueTable(prevTable => {
            const newTable = [...prevTable];
            const home = newTable.find(t => t.teamName === homeTeamName);
            const away = newTable.find(t => t.teamName === awayTeamName);
            if (!home || !away) return prevTable;

            home.played++; away.played++;
            home.goalsFor += homeGoals; home.goalsAgainst += awayGoals;
            away.goalsFor += awayGoals; away.goalsAgainst += homeGoals;
            home.goalDifference = home.goalsFor - home.goalsAgainst;
            away.goalDifference = away.goalsFor - away.goalsAgainst;

            if (homeGoals > awayGoals) { home.won++; home.points += 3; away.lost++; } 
            else if (awayGoals > homeGoals) { away.won++; away.points += 3; home.lost++; } 
            else { home.drawn++; away.drawn++; home.points++; away.points++; }
            return newTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
        });
    };

    const handleAdvanceWeek = async () => {
        const nextWeek = currentWeek + 1;
        
        // Process effects expiring THIS week before moving to the next
        const updatedTeams = { ...teams };
        // FIX: Explicitly type 'team' as 'Team' to resolve TypeScript inference issue where it was considered 'unknown'.
        Object.values(updatedTeams).forEach((team: Team) => {
            team.players.forEach(player => {
                player.effects = player.effects.filter(effect => effect.until > currentWeek);
                if (player.status.type === 'On International Duty' && player.status.until <= currentWeek) {
                    player.status = { type: 'Available' };
                }
            });
        });
        setTeams(updatedTeams);
        
        // Handle international break logic
        if (INTERNATIONAL_BREAK_WEEKS.includes(currentWeek)) {
            setIsLoading(true);
            const tournament = TOURNAMENTS[0];
            addNewsItem('International Break', `Club football pauses for the ${tournament.name}.`, 'tournament-result');

            // 1. Call up players
            const clubPlayersOnDuty = userTeam ? userTeam.players.filter(p => NATIONAL_TEAMS.some(nt => nt.players.some(ntp => ntp.name === p.name)) && p.rating > 85) : [];
            const newTeams = { ...teams };
            clubPlayersOnDuty.forEach(player => {
                const teamPlayer = newTeams[userTeamName!].players.find(p => p.name === player.name);
                if (teamPlayer) {
                    teamPlayer.status = { type: 'On International Duty', until: nextWeek };
                    addNewsItem('International Call-Up', `${player.name} has been called up for his country.`, 'call-up');
                }
            });
            setTeams(newTeams);

            // 2. Simulate tournament and rivalries
            const result = await getTournamentResult(tournament, NATIONAL_TEAMS);
            addNewsItem(`${result.winner.name} win the ${tournament.name}!`, result.summary, 'tournament-result');

            const rivalry = await getTeammateTournamentRivalry(tournament, clubPlayersOnDuty);
            if (rivalry) {
                addNewsItem('Dressing Room Tension', rivalry.summary, 'chemistry-rift');
                const winnerPlayer = newTeams[userTeamName!].players.find(p => p.name === rivalry.winner.name)!;
                const loserPlayer = newTeams[userTeamName!].players.find(p => p.name === rivalry.loser.name)!;
                
                // Use dynamic duration calculated by Gemini based on match stakes
                const riftDuration = rivalry.duration;

                winnerPlayer.effects.push({ type: 'BadChemistry', with: loserPlayer.name, message: `Clashed with ${loserPlayer.name} at the ${tournament.name}.`, until: nextWeek + riftDuration });
                loserPlayer.effects.push({ type: 'BadChemistry', with: winnerPlayer.name, message: `Faced a tough loss against ${winnerPlayer.name}'s side.`, until: nextWeek + riftDuration });
            }

            // 3. Update player morale on return
            for (const player of clubPlayersOnDuty) {
                const nationalTeam = NATIONAL_TEAMS.find(nt => nt.players.some(p => p.name === player.name))!;
                const didWin = result.winner.name === nationalTeam.name;
                const moraleEffect = await getPlayerPostTournamentMorale(player, nationalTeam.name, didWin);
                if (moraleEffect) {
                    const teamPlayer = newTeams[userTeamName!].players.find(p => p.name === player.name)!;
                    teamPlayer.effects.push({ ...moraleEffect, until: nextWeek + 2 }); // Morale lasts 2 weeks
                    addNewsItem(`${player.name} Returns from Duty`, `"${moraleEffect.message}"`, 'player-return');
                }
            }

            setTeams(newTeams);
            setIsLoading(false);
            
        } else {
            setCurrentFixtureIndex(prevIndex => prevIndex + 1);
        }

        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setCurrentWeek(nextWeek);
    };


    // --- Interview Logic ---
    const handleStartInterview = async (teamName: string) => {
        setIsLoading(true);
        setJobOffer(null);
        setInterview(null);
        setError(null);
        setAppScreen(AppScreen.JOB_INTERVIEW);
        try {
            const team = allTeams[teamName];
            const questions = await getInterviewQuestions(team.name, team.chairmanPersonality);
            setInterview({
                teamName: team.name,
                questions,
                answers: [],
                currentQuestionIndex: 0,
                chairmanPersonality: team.chairmanPersonality
            });
        } catch (e) {
            console.error(e);
            setError("The chairman is currently unavailable. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };
    const handleAnswerSubmit = async (answer: string) => {
        if (!interview) return;

        const newAnswers = [...interview.answers, answer];
        const newInterviewState = { ...interview, answers: newAnswers };

        if (newInterviewState.currentQuestionIndex < newInterviewState.questions.length - 1) {
            setInterview({ ...newInterviewState, currentQuestionIndex: newInterviewState.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            setInterview(newInterviewState);
            try {
                const result = await evaluateInterview(interview.teamName, interview.questions, newAnswers, interview.chairmanPersonality);
                setJobOffer(result);
            } catch (e) {
                console.error(e);
                setError("There was a misunderstanding during the interview. It has been cancelled.");
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleInterviewFinish = (accepted: boolean) => {
        if (accepted && jobOffer?.offer && interview) {
            initializeGame(interview.teamName);
        }
        setInterview(null);
        setJobOffer(null);
        setAppScreen(AppScreen.JOB_CENTRE);
    };

    // --- Player Talk Logic ---
    const handleStartPlayerTalk = async (player: Player, context: PlayerTalk['context']) => {
        if (!userTeam) return;
        setIsLoading(true);
        setTalkResult(null);
        setPlayerTalk(null);
        setError(null);
        setAppScreen(AppScreen.PLAYER_TALK);
        try {
            const questions = await getPlayerTalkQuestions(player, userTeam, context);
            setPlayerTalk({ player, questions, answers: [], currentQuestionIndex: 0, context });
        } catch (e) {
            console.error(e);
            setError("The player's agent is not responding. Try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayerTalkAnswer = async (answer: string) => {
        if (!playerTalk || !userTeam) return;

        const newAnswers = [...playerTalk.answers, answer];
        const newPlayerTalkState = { ...playerTalk, answers: newAnswers };

        if (newPlayerTalkState.currentQuestionIndex < newPlayerTalkState.questions.length - 1) {
            setPlayerTalk({ ...newPlayerTalkState, currentQuestionIndex: newPlayerTalkState.currentQuestionIndex + 1 });
        } else {
            setIsLoading(true);
            setPlayerTalk(newPlayerTalkState);
            try {
                const result = await evaluatePlayerTalk(playerTalk.player, playerTalk.questions, newAnswers, userTeam, playerTalk.context);
                setTalkResult(result);
            } catch (e) {
                console.error(e);
                setError("The agent ended the conversation abruptly.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handlePlayerTalkFinish = () => {
        if (talkResult?.convinced && playerTalk?.context === 'renewal' && userTeamName) {
            // Handle contract renewal success
            setTeams(prevTeams => {
                const newTeams = { ...prevTeams };
                const playerIndex = newTeams[userTeamName].players.findIndex(p => p.name === playerTalk.player.name);
                if (playerIndex !== -1) {
                    newTeams[userTeamName].players[playerIndex].contractExpires = 3; // Renew for 3 years
                }
                return newTeams;
            });
            addNewsItem('Contract Signed!', `${playerTalk.player.name} has signed a new 3-year contract with the club.`, 'contract-renewal');
        } else if (!talkResult?.convinced && playerTalk?.context === 'renewal' && userTeamName) {
            // Handle contract renewal failure
            setTeams(prevTeams => {
                const newTeams = { ...prevTeams };
                newTeams[userTeamName].players = newTeams[userTeamName].players.filter(p => p.name !== playerTalk.player.name);
                return newTeams;
            });
             addNewsItem('Player Departs', `${playerTalk.player.name} has rejected a new contract and leaves the club on a free transfer.`, 'player-departure');
        }
        
        setPlayerTalk(null);
        setTalkResult(null);
        setError(null);
        // Navigate back based on context
        if (playerTalk?.context === 'transfer') {
             setAppScreen(AppScreen.TRANSFERS);
        } else {
             setAppScreen(AppScreen.GAMEPLAY);
        }
    };

    const availableJobs = useMemo<Job[]>(() => Object.values(allTeams).map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality })), []);

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.JOB_CENTRE)} />;
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={Object.values(allTeams)} onTeamSelect={initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={handleStartInterview} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={error} jobOffer={jobOffer} onAnswerSubmit={handleAnswerSubmit} onFinish={handleInterviewFinish} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={TRANSFER_TARGETS} onApproachPlayer={(player) => handleStartPlayerTalk(player, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <main className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            <TeamDetails team={userTeam} onTacticChange={handleTacticChange} onNavigateToTransfers={() => setAppScreen(AppScreen.TRANSFERS)} onNavigateToNews={() => setAppScreen(AppScreen.NEWS_FEED)} onStartContractTalk={(player) => handleStartPlayerTalk(player, 'renewal')} />
                        </div>
                        <div className="lg:col-span-6">
                            <MatchView fixture={currentFixture} matchState={matchState} gameState={gameState} onPlayFirstHalf={handlePlayFirstHalf} onPlaySecondHalf={handlePlaySecondHalf} onNextMatch={handleAdvanceWeek} error={error} isSeasonOver={currentWeek > WEEKS_IN_SEASON} userTeamName={userTeamName} leagueTable={leagueTable} isLoading={isLoading} currentWeek={currentWeek} />
                        </div>
                        <div className="lg:col-span-3">
                            <LeagueTableView table={leagueTable} userTeamName={userTeamName} />
                        </div>
                    </main>
                );
            default: return <div>Something went wrong</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 p-4 sm:p-6 lg:p-8">
            <Header />
            {renderScreen()}
        </div>
    );
}
