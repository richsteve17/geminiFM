
import React, { useState, useCallback, useMemo } from 'react';
import { TEAMS as allTeams, TRANSFER_TARGETS, EXPERIENCE_LEVELS } from './constants';
import type { Team, LeagueTableEntry, Fixture, Tactic, MatchState, Interview, Job, PlayerTalk, Player, TouchlineShout, NewsItem, ExperienceLevel, NationalTeam, TournamentStage } from './types';
import { AppScreen, GameState } from './types';
import Header from './components/Header';
import LeagueTableView from './components/LeagueTableView';
import TeamDetails from './components/TeamDetails';
import MatchView from './components/MatchView';
import { simulateMatchSegment, getInterviewQuestions, evaluateInterview, getPlayerTalkQuestions, evaluatePlayerTalk, getTournamentResult, getPlayerPostTournamentMorale, getTeammateTournamentRivalry } from './services/geminiService';
import { generateFixtures, simulateQuickMatch } from './utils';
import StartScreen from './components/StartScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import JobCentreScreen from './components/JobCentreScreen';
import JobInterviewScreen from './components/JobInterviewScreen';
import TransfersScreen from './components/TransfersScreen';
import PlayerTalkScreen from './components/PlayerTalkScreen';
import NewsScreen from './components/NewsScreen';
import CreateManagerScreen from './components/CreateManagerScreen';
import TutorialOverlay from './components/TutorialOverlay';
import { TOURNAMENTS, NATIONAL_TEAMS, generateWorldCupStructure } from './international';

const INTERNATIONAL_BREAK_WEEKS = [8, 16]; 

export default function App() {
    // App-level state
    const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.START_SCREEN);
    const [userTeamName, setUserTeamName] = useState<string | null>(null);
    const [isPrologue, setIsPrologue] = useState(false); // New state for World Cup Mode

    // Tutorial State
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);

    // Game-level state
    const [currentWeek, setCurrentWeek] = useState(1);
    const [weeksInSeason, setWeeksInSeason] = useState(18); // Default, updated on init
    const [teams, setTeams] = useState<Record<string, Team>>(allTeams);
    const [leagueTable, setLeagueTable] = useState<LeagueTableEntry[]>([]);
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [currentFixture, setCurrentFixture] = useState<Fixture | undefined>(undefined);
    
    const [gameState, setGameState] = useState<GameState>(GameState.PRE_MATCH);
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    
    // Store weekly results for UI
    const [weeklyResults, setWeeklyResults] = useState<Fixture[]>([]);

    // Job & Player Talk state
    const [isLoading, setIsLoading] = useState(false);
    const [interview, setInterview] = useState<Interview | null>(null);
    const [jobOffer, setJobOffer] = useState<{ offer: boolean; reasoning: string } | null>(null);
    const [playerTalk, setPlayerTalk] = useState<PlayerTalk | null>(null);
    const [talkResult, setTalkResult] = useState<{ convinced: boolean; reasoning: string } | null>(null);

    // Unemployed Mode State
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

    const userTeam = userTeamName ? teams[userTeamName] : null;

    const startTutorial = () => {
        setTutorialStep(0);
        setShowTutorial(true);
    };

    // --- PROLOGUE: World Cup Initialization ---
    const initializeWorldCup = (selectedNationalTeamName: string) => {
        setIsPrologue(true);
        setUserTeamName(selectedNationalTeamName);
        
        // Generate a 48-team World Cup Structure
        const wcTeamsRecord = generateWorldCupStructure();
        setTeams(wcTeamsRecord);

        // Generate Group Stage Fixtures (Weeks 1-3)
        const allWcTeams = Object.values(wcTeamsRecord);
        const groupFixtures: Fixture[] = [];
        
        // Group teams by their group 'A' -> 'L'
        const groups: Record<string, string[]> = {};
        allWcTeams.forEach((t: Team) => {
            if (t.group) {
                if (!groups[t.group]) groups[t.group] = [];
                groups[t.group].push(t.name);
            }
        });

        // Create round robin for each group (3 rounds)
        Object.entries(groups).forEach(([groupName, teamNames]) => {
            if (teamNames.length === 4) {
                 // Round 1
                 groupFixtures.push({ id: `g-${groupName}-1-1`, week: 1, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[1], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-1-2`, week: 1, league: 'International', homeTeam: teamNames[2], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 // Round 2
                 groupFixtures.push({ id: `g-${groupName}-2-1`, week: 2, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-2-2`, week: 2, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 // Round 3
                 groupFixtures.push({ id: `g-${groupName}-3-1`, week: 3, league: 'International', homeTeam: teamNames[0], awayTeam: teamNames[3], played: false, stage: 'Group Stage' });
                 groupFixtures.push({ id: `g-${groupName}-3-2`, week: 3, league: 'International', homeTeam: teamNames[1], awayTeam: teamNames[2], played: false, stage: 'Group Stage' });
            }
        });

        setWeeksInSeason(8); // 3 Group + R32 + R16 + QF + SF + Final
        setFixtures(groupFixtures);
        
        // Init Tables for all groups
        const initialTable = allWcTeams.map((t: Team) => ({
            teamName: t.name, league: 'International' as const, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, group: t.group
        }));
        setLeagueTable(initialTable);

        // UI Setup
        setCurrentWeek(1);
        setGameState(GameState.PRE_MATCH);
        setNews([{ id: Date.now(), week: 1, title: 'World Cup 2026 Begins', body: '48 teams. 12 Groups. 104 Matches. The road to glory starts now.', type: 'tournament-result' }]);
        setAppScreen(AppScreen.GAMEPLAY);
        
        // Setup Week 1 fixture
        const week1Fixtures = groupFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === selectedNationalTeamName || f.awayTeam === selectedNationalTeamName);
        setCurrentFixture(userMatch);
        setWeeklyResults([]);
        
        startTutorial(); // Trigger Tutorial
    };

    // --- STANDARD: Club Initialization ---
    const initializeGame = useCallback((selectedTeamName: string) => {
        setIsPrologue(false);
        const teamArray = Object.values(allTeams);
        const initialTable = teamArray.map((t: Team) => ({
            teamName: t.name, league: t.league, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        }));
        
        const generatedFixtures = generateFixtures(teamArray);
        const maxWeek = generatedFixtures.length > 0 ? Math.max(...generatedFixtures.map(f => f.week)) : 18;
        setWeeksInSeason(maxWeek);

        const initialNews: NewsItem[] = [];
        const startingTeam = allTeams[selectedTeamName];
        
        // If starting directly without prologue, add contract news
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
        setCurrentWeek(1);
        setGameState(GameState.PRE_MATCH);
        setMatchState(null);
        setError(null);
        setTeams(allTeams);
        setNews(initialNews);
        setUserTeamName(selectedTeamName);
        setAppScreen(AppScreen.GAMEPLAY);
        
        // Setup Week 1 fixture for user
        const week1Fixtures = generatedFixtures.filter(f => f.week === 1);
        const userMatch = week1Fixtures.find(f => f.homeTeam === selectedTeamName || f.awayTeam === selectedTeamName);
        setCurrentFixture(userMatch);
        setWeeklyResults([]);
        
        startTutorial(); // Trigger Tutorial

    }, []);

    // Logic to generate job openings based on experience
    const generateJobs = (experience: ExperienceLevel) => {
        const allTeamList: Team[] = Object.values(allTeams);
        let vacancies: Team[] = [];

        const feasibleTeams = allTeamList.filter(t => t.prestige <= experience.prestigeCap && t.prestige >= experience.prestigeMin);
        const reachTeams = allTeamList.filter(t => t.prestige > experience.prestigeCap && t.prestige <= experience.prestigeCap + 10);
        const safetyTeams = allTeamList.filter(t => t.prestige < experience.prestigeMin);

        const shuffle = (array: Team[]) => array.sort(() => 0.5 - Math.random());
        const pickedFeasible = shuffle(feasibleTeams).slice(0, Math.floor(Math.random() * 3) + 3);
        let pickedReach: Team[] = [];
        if (experience.prestigeCap >= 80) {
             pickedReach = shuffle(reachTeams).slice(0, Math.floor(Math.random() * 2)); 
        }
        const pickedSafety = shuffle(safetyTeams).slice(0, Math.floor(Math.random() * 2) + 2);

        if (experience.id === 'legend') {
            vacancies = shuffle(allTeamList.filter(t => t.prestige > 85)).slice(0, 6);
        } else {
            vacancies = [...pickedFeasible, ...pickedReach, ...pickedSafety];
        }

        const jobs: Job[] = vacancies.map(t => ({
            teamName: t.name,
            prestige: t.prestige,
            chairmanPersonality: t.chairmanPersonality
        }));

        setAvailableJobs(jobs);
        setAppScreen(AppScreen.JOB_CENTRE);
    }

    const handleManagerCreation = (name: string, experience: ExperienceLevel) => {
        generateJobs(experience);
    };


    const addNewsItem = (title: string, body: string, type: NewsItem['type']) => {
        setNews(prevNews => [{ id: Date.now(), week: currentWeek, title, body, type }, ...prevNews]);
    };

    const handleTacticChange = (newTactic: Partial<Tactic>) => {
        if (!userTeamName) return;
        setTeams(prevTeams => ({ ...prevTeams, [userTeamName]: { ...prevTeams[userTeamName], tactic: { ...prevTeams[userTeamName].tactic, ...newTactic } } }));
    };

    const handleToggleStarter = (playerName: string) => {
        if (!userTeamName) return;
        setTeams(prevTeams => {
            const team = prevTeams[userTeamName];
            const updatedPlayers = team.players.map(p => {
                if (p.name === playerName) {
                    return { ...p, isStarter: !p.isStarter };
                }
                return p;
            });
            return { ...prevTeams, [userTeamName]: { ...team, players: updatedPlayers } };
        });
    }

    const handleSubstitute = (playerIn: Player, playerOut: Player) => {
        if (!userTeamName) return;
        setTeams(prevTeams => {
            const team = prevTeams[userTeamName];
            const updatedPlayers = team.players.map(p => {
                if (p.name === playerIn.name) return { ...p, isStarter: true };
                if (p.name === playerOut.name) return { ...p, isStarter: false };
                return p;
            });
            return { ...prevTeams, [userTeamName]: { ...team, players: updatedPlayers } };
        });

        // Add event if match is live
        if (matchState) {
            const isHome = currentFixture?.homeTeam === userTeamName;
            setMatchState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    subsUsed: { 
                        home: isHome ? prev.subsUsed.home + 1 : prev.subsUsed.home,
                        away: !isHome ? prev.subsUsed.away + 1 : prev.subsUsed.away
                    },
                    events: [
                        ...prev.events, 
                        { 
                            id: Date.now(), 
                            minute: prev.currentMinute, 
                            type: 'sub', 
                            description: `Substitution: ${playerIn.name} replaces ${playerOut.name}`, 
                            teamName: userTeamName 
                        }
                    ]
                };
            });
        }
    };

    const handlePlayFirstHalf = useCallback(async () => {
        if (!currentFixture || !userTeam) return;

        // Check Starters Count
        const starters = userTeam.players.filter(p => p.isStarter);
        if (starters.length !== 11) {
            setError(`You must select exactly 11 players to start. Currently selected: ${starters.length}`);
            return;
        }

        setGameState(GameState.SIMULATING);
        setError(null);

        const initialMatchState: MatchState = {
            currentMinute: 0,
            homeScore: 0,
            awayScore: 0,
            events: [],
            isFinished: false,
            subsUsed: { home: 0, away: 0 },
            momentum: 0,
            tacticalAnalysis: "Kick off!"
        };
        setMatchState(initialMatchState);

        const homeTeam = teams[currentFixture.homeTeam];
        const awayTeam = teams[currentFixture.awayTeam];

        try {
            const result = await simulateMatchSegment(homeTeam, awayTeam, initialMatchState, 45, { 
                stage: currentFixture.stage,
                isKnockout: currentFixture.isKnockout
            });
            
            const newEvents = result.events.map(e => ({ ...e, id: Date.now() + Math.random() }));

            setMatchState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentMinute: 45,
                    homeScore: prev.homeScore + result.homeScoreAdded,
                    awayScore: prev.awayScore + result.awayScoreAdded,
                    events: [...prev.events, ...newEvents],
                    momentum: result.momentum,
                    tacticalAnalysis: result.tacticalAnalysis
                };
            });
            setGameState(GameState.PAUSED);
        } catch (err) {
            console.error(err);
            setError('Failed to simulate first half. Please try again.');
            setGameState(GameState.PRE_MATCH);
            setMatchState(null);
        }
    }, [currentFixture, teams, userTeam]);

    const handlePlaySecondHalf = useCallback(async (shout: TouchlineShout) => {
        if (!currentFixture || !matchState || !userTeam) return;
        setGameState(GameState.SIMULATING);
        
        const homeTeam = teams[currentFixture.homeTeam];
        const awayTeam = teams[currentFixture.awayTeam];

        try {
            const result = await simulateMatchSegment(homeTeam, awayTeam, matchState, 60, {
                stage: currentFixture.stage,
                isKnockout: currentFixture.isKnockout,
                teamTalk: { teamName: userTeam.name, shout }
            });

            const newEvents = result.events.map(e => ({ ...e, id: Date.now() + Math.random() }));

            setMatchState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentMinute: 60,
                    homeScore: prev.homeScore + result.homeScoreAdded,
                    awayScore: prev.awayScore + result.awayScoreAdded,
                    events: [...prev.events, ...newEvents],
                    momentum: result.momentum,
                    tacticalAnalysis: result.tacticalAnalysis
                };
            });
            setGameState(GameState.PAUSED);

        } catch (err) {
            console.error(err);
            setError('Failed to simulate second half. Please try again.');
            setGameState(GameState.PAUSED);
        }

    }, [currentFixture, teams, matchState, userTeam]);

    const handleSimulateSegment = useCallback(async (targetMinute: number) => {
        if (!currentFixture || !matchState || !userTeam) return;
        setGameState(GameState.SIMULATING);

        const homeTeam = teams[currentFixture.homeTeam];
        const awayTeam = teams[currentFixture.awayTeam];

        try {
             const result = await simulateMatchSegment(homeTeam, awayTeam, matchState, targetMinute, {
                stage: currentFixture.stage,
                isKnockout: currentFixture.isKnockout
            });

            const newEvents = result.events.map(e => ({ ...e, id: Date.now() + Math.random() }));
            
            setMatchState(prev => {
                if (!prev) return null;
                const newHomeScore = prev.homeScore + result.homeScoreAdded;
                const newAwayScore = prev.awayScore + result.awayScoreAdded;
                
                let isFinished = false;
                let penaltyWinner = undefined;
                
                if (targetMinute >= 90) {
                     isFinished = true;
                     // Penalties logic if draw in knockout
                     if (currentFixture.isKnockout && newHomeScore === newAwayScore) {
                         penaltyWinner = Math.random() > 0.5 ? homeTeam.name : awayTeam.name;
                         newEvents.push({ 
                             id: Date.now(), 
                             minute: 120, 
                             type: 'commentary', 
                             description: `Penalty Shootout decided! ${penaltyWinner} wins!`, 
                             teamName: penaltyWinner 
                         });
                     }
                }

                return {
                    ...prev,
                    currentMinute: targetMinute,
                    homeScore: newHomeScore,
                    awayScore: newAwayScore,
                    events: [...prev.events, ...newEvents],
                    isFinished,
                    penaltyWinner,
                    momentum: result.momentum,
                    tacticalAnalysis: result.tacticalAnalysis
                };
            });

            if (targetMinute >= 90) {
                 const finalHomeScore = matchState.homeScore + result.homeScoreAdded;
                 const finalAwayScore = matchState.awayScore + result.awayScoreAdded;
                 updateLeagueTable(homeTeam.name, awayTeam.name, finalHomeScore, finalAwayScore);
                 setGameState(GameState.POST_MATCH);
            } else {
                 setGameState(GameState.PAUSED);
            }

        } catch (err) {
            console.error(err);
            setError('Failed to simulate segment.');
            setGameState(GameState.PAUSED);
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

    const handleEndPrologue = (context: 'WonFinal' | 'Eliminated' | 'GroupStageFail') => {
        let experience: ExperienceLevel;
        let summaryMsg = "";

        if (context === 'WonFinal') {
            experience = EXPERIENCE_LEVELS.find(e => e.id === 'legend')!;
            summaryMsg = "HISTORY! You have won the World Cup! The world is at your feet.";
        } else if (context === 'Eliminated') {
             // Depending on round, give better prestige
             if (currentWeek >= 7) { // Semi or Final
                experience = EXPERIENCE_LEVELS.find(e => e.id === 'international')!;
                summaryMsg = "Heartbreak in the final stages, but you showed you are an elite manager.";
             } else {
                experience = EXPERIENCE_LEVELS.find(e => e.id === 'pro')!;
                summaryMsg = "A respectable run in the knockouts.";
             }
        } else {
             experience = EXPERIENCE_LEVELS.find(e => e.id === 'semi-pro')!;
             summaryMsg = "Eliminated early. A national embarrassment.";
        }

        setIsPrologue(false);
        setUserTeamName(null);
        setTeams(allTeams); 
        generateJobs(experience);
        alert(summaryMsg); 
    }

    const generateKnockoutFixtures = (week: number, stage: TournamentStage) => {
        let qualifiedTeams: string[] = [];
        const prevFixtures = fixtures.filter(f => f.week === week - 1);

        if (week === 4) {
            // --- ROUND OF 32 LOGIC ---
            // 12 Groups (A-L). Top 2 from each = 24.
            // Best 8 3rd Place Teams = 8.
            // Total = 32.

            const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
            const thirds: LeagueTableEntry[] = [];

            groupNames.forEach(group => {
                const groupTeams = leagueTable.filter(t => t.group === group)
                    .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                
                // Add Top 2
                qualifiedTeams.push(groupTeams[0].teamName);
                qualifiedTeams.push(groupTeams[1].teamName);

                // Track 3rd place
                if (groupTeams[2]) thirds.push(groupTeams[2]);
            });

            // Sort 3rd place teams to find Top 8
            const bestThirds = thirds.sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
                                     .slice(0, 8);
            
            bestThirds.forEach(t => qualifiedTeams.push(t.teamName));

            // If user isn't in qualified teams, end prologue
            if (userTeamName && !qualifiedTeams.includes(userTeamName)) {
                handleEndPrologue('GroupStageFail');
                return null;
            }
            // Shuffle for random pairings (simulating seeding is too complex for this demo)
            qualifiedTeams.sort(() => 0.5 - Math.random());

        } else {
            // --- STANDARD KNOCKOUT PROGRESSION (R16, QF, SF, F) ---
            prevFixtures.forEach(f => {
                // Determine winner based on score
                if (!f.score) return;
                const parts = f.score.split('-');
                const homeG = parseInt(parts[0]);
                const awayG = parseInt(parts[1]);
                if (homeG > awayG) qualifiedTeams.push(f.homeTeam);
                else if (awayG > homeG) qualifiedTeams.push(f.awayTeam);
                else {
                    // Draw -> Penalties (simulated in match view, but we need decision here)
                     qualifiedTeams.push(Math.random() > 0.5 ? f.homeTeam : f.awayTeam);
                }
            });

             // If user was playing last week and NOT in qualified list (meaning they lost), end prologue
            if (userTeamName && fixtures.some(f => f.week === week - 1 && (f.homeTeam === userTeamName || f.awayTeam === userTeamName)) && !qualifiedTeams.includes(userTeamName)) {
                 handleEndPrologue('Eliminated');
                 return null;
            }
        }
        
        // Generate Pairings
        const newFixtures: Fixture[] = [];
        for (let i = 0; i < qualifiedTeams.length; i += 2) {
            newFixtures.push({
                id: `ko-${stage}-${i}`,
                week: week,
                league: 'International',
                homeTeam: qualifiedTeams[i],
                awayTeam: qualifiedTeams[i+1],
                played: false,
                stage: stage,
                isKnockout: true
            });
        }
        return newFixtures;
    };


    const handleAdvanceWeek = async () => {
        setIsLoading(true);
        const nextWeek = currentWeek + 1;

        // --- 1. PERSISTENCE LOGIC (Injuries & Suspensions) ---
        // Apply effects from the JUST FINISHED match to user's team
        if (matchState && userTeamName) {
            const userEvents = matchState.events;
            setTeams(prevTeams => {
                const newTeams = { ...prevTeams };
                const userTeam = newTeams[userTeamName];
                
                // Identify players involved in events
                userEvents.forEach(event => {
                    if (event.teamName === userTeamName && event.player) {
                        const playerIndex = userTeam.players.findIndex(p => p.name === event.player);
                        if (playerIndex !== -1) {
                            const player = userTeam.players[playerIndex];
                            
                            // Red Cards -> Suspension (1 Match)
                            if (event.type === 'card' && event.cardType === 'red') {
                                player.status = { type: 'Suspended', until: nextWeek + 1 };
                                player.isStarter = false; // Force bench
                                addNewsItem('Suspension Confirmed', `${player.name} has been handed a 1-match ban following his red card.`, 'suspension');
                            }
                            
                            // Injuries -> Injury (Random 1-6 Matches)
                            if (event.type === 'injury') {
                                const duration = Math.floor(Math.random() * 5) + 1; // 1 to 6 weeks
                                player.status = { type: 'Injured', weeks: duration };
                                player.isStarter = false; // Force bench
                                addNewsItem('Injury Update', `${player.name} is ruled out for ${duration} weeks.`, 'injury');
                            }
                        }
                    }
                });
                
                // --- 2. GLOBAL CLEANUP (Recovery) ---
                (Object.values(newTeams) as Team[]).forEach((team) => {
                    team.players.forEach(player => {
                        // Clear In-Match Flags
                        player.matchCard = null;
                        if (player.status.type === 'SentOff') player.status = { type: 'Suspended', until: nextWeek + 1 }; // Fallback if event missed, but mainly handled above for user

                        // Decrement Suspensions
                        if (player.status.type === 'Suspended') {
                            if (player.status.until <= nextWeek) {
                                player.status = { type: 'Available' };
                            }
                        }

                        // Decrement Injuries
                        if (player.status.type === 'Injured') {
                            player.status.weeks -= 1;
                            if (player.status.weeks <= 0) {
                                player.status = { type: 'Available' };
                                if (team.name === userTeamName) addNewsItem('Player Returns', `${player.name} has returned to full training.`, 'player-return');
                            }
                        }
                        
                        // Decrement International Duty
                        if (player.status.type === 'On International Duty' && player.status.until <= nextWeek) {
                            player.status = { type: 'Available' };
                        }
                        
                        // Clean expired effects
                        player.effects = player.effects.filter(effect => effect.until > nextWeek);
                    });
                });

                return newTeams;
            });
        }


        // --- PROLOGUE LOGIC ---
        if (isPrologue) {
            // 1. Finish Current Week Matches
            const weekFixtures = fixtures.filter(f => f.week === currentWeek);
            const userMatch = weekFixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName);
            const otherMatches = weekFixtures.filter(f => f !== userMatch);
            const finishedMatches: Fixture[] = [];

            // Sim others
            otherMatches.forEach(match => {
                const home = teams[match.homeTeam];
                const away = teams[match.awayTeam];
                const result = simulateQuickMatch(home, away);
                
                // If knockout, force winner
                if (match.isKnockout && result.homeGoals === result.awayGoals) {
                    if (Math.random() > 0.5) result.homeGoals++; else result.awayGoals++;
                }

                updateLeagueTable(match.homeTeam, match.awayTeam, result.homeGoals, result.awayGoals);
                finishedMatches.push({ ...match, played: true, score: `${result.homeGoals}-${result.awayGoals}` });
            });
            
            // Add user match (already simulated in game loop)
            if (userMatch && matchState?.isFinished) {
                 const score = `${matchState.homeScore}-${matchState.awayScore}`;
                 finishedMatches.push({ ...userMatch, played: true, score: score });
            }

            setWeeklyResults(finishedMatches);

            // Check if User Won Final (Week 8)
            if (currentWeek === 8 && userMatch && matchState?.isFinished) {
                const h = matchState.homeScore; 
                const a = matchState.awayScore;
                let won = false;
                if (userMatch.homeTeam === userTeamName && h > a) won = true;
                if (userMatch.awayTeam === userTeamName && a > h) won = true;
                if (matchState.penaltyWinner === userTeamName) won = true;

                if (won) {
                    handleEndPrologue('WonFinal');
                    setIsLoading(false);
                    return;
                } else {
                    handleEndPrologue('Eliminated');
                    setIsLoading(false);
                    return;
                }
            }

            // 2. Generate Next Round?
            let nextFixtures: Fixture[] | null = [];
            
            if (nextWeek === 4) {
                 nextFixtures = generateKnockoutFixtures(4, 'Round of 32');
            } else if (nextWeek === 5) {
                 nextFixtures = generateKnockoutFixtures(5, 'Round of 16');
            } else if (nextWeek === 6) {
                 nextFixtures = generateKnockoutFixtures(6, 'Quarter Final');
            } else if (nextWeek === 7) {
                 nextFixtures = generateKnockoutFixtures(7, 'Semi Final');
            } else if (nextWeek === 8) {
                 nextFixtures = generateKnockoutFixtures(8, 'Final');
            } else if (nextWeek > 8) {
                 handleEndPrologue('Eliminated'); // Fallback
                 return;
            } else {
                 // Still Group Stage (Weeks 2, 3) - fixtures already exist
                 nextFixtures = fixtures.filter(f => f.week === nextWeek);
            }

            if (!nextFixtures) {
                // Prologue ended inside generation (user eliminated)
                setIsLoading(false);
                return;
            }

            setFixtures(prev => [...prev, ...nextFixtures!]);
            
            // Setup UI for next week
            setCurrentWeek(nextWeek);
            const nextUserMatch = nextFixtures!.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName);
            setCurrentFixture(nextUserMatch);
            setMatchState(null);
            setGameState(GameState.PRE_MATCH);
            setIsLoading(false);
            
            // Add News
            if (nextWeek === 4) addNewsItem('Knockouts Begin', 'The Round of 32 is set. 48 teams started, only 32 remain.', 'tournament-result');
            return;
        }

        
        // --- STANDARD GAME LOGIC ---
        // Process effects expiring (Shared logic)
        const updatedTeams = { ...teams };
        (Object.values(updatedTeams) as Team[]).forEach((team: Team) => {
            team.players.forEach(player => {
                player.effects = player.effects.filter(effect => effect.until > currentWeek);
                if (player.status.type === 'On International Duty' && player.status.until <= currentWeek) {
                    player.status = { type: 'Available' };
                }
            });
        });
        setTeams(updatedTeams);
        
        // --- International Break Logic (ONLY IN MAIN GAME) ---
        if (!isPrologue && INTERNATIONAL_BREAK_WEEKS.includes(currentWeek)) {
             const tournament = TOURNAMENTS[0];
            addNewsItem('International Break', `Club football pauses for the ${tournament.name}.`, 'tournament-result');

            // 1. Call up players
            const clubPlayersOnDuty = userTeam ? userTeam.players.filter(p => NATIONAL_TEAMS.some((nt: NationalTeam) => nt.players.some((ntp: Player) => ntp.name === p.name)) && p.rating > 85) : [];
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
                const riftDuration = rivalry.duration;
                winnerPlayer.effects.push({ type: 'BadChemistry', with: loserPlayer.name, message: `Clashed with ${loserPlayer.name} at the ${tournament.name}.`, until: nextWeek + riftDuration });
                loserPlayer.effects.push({ type: 'BadChemistry', with: winnerPlayer.name, message: `Faced a tough loss against ${winnerPlayer.name}'s side.`, until: nextWeek + riftDuration });
            }

             // 3. Update player morale
             for (const player of clubPlayersOnDuty) {
                const nationalTeam = NATIONAL_TEAMS.find(nt => nt.players.some(p => p.name === player.name))!;
                const didWin = result.winner.name === nationalTeam.name;
                const moraleEffect = await getPlayerPostTournamentMorale(player, nationalTeam.name, didWin);
                if (moraleEffect) {
                    const teamPlayer = newTeams[userTeamName!].players.find(p => p.name === player.name)!;
                    teamPlayer.effects.push({ ...moraleEffect, until: nextWeek + 2 });
                    addNewsItem(`${player.name} Returns from Duty`, `"${moraleEffect.message}"`, 'player-return');
                }
            }
            setTeams(newTeams);
            setCurrentWeek(nextWeek);
            // No fixtures this week, set null
            setCurrentFixture(undefined);
            setWeeklyResults([]);
            setIsLoading(false);
            setGameState(GameState.PRE_MATCH);
            setMatchState(null);
            return;
        }

        // --- Standard League Week Logic ---
        
        // 1. Identify fixtures for the NEW week
        const weekFixtures = fixtures.filter(f => f.week === nextWeek);
        
        if (weekFixtures.length === 0 && nextWeek > weeksInSeason) {
             setCurrentWeek(nextWeek);
             setCurrentFixture(undefined);
             setIsLoading(false);
             setGameState(GameState.PRE_MATCH);
             setMatchState(null);
             return;
        }

        const userMatch = weekFixtures.find(f => f.homeTeam === userTeamName || f.awayTeam === userTeamName);
        const otherMatches = weekFixtures.filter(f => f !== userMatch);
        const finishedMatches: Fixture[] = [];

        // 2. Simulate Background Matches IMMEDIATELY
        otherMatches.forEach(match => {
            const home = teams[match.homeTeam];
            const away = teams[match.awayTeam];
            const result = simulateQuickMatch(home, away);
            
            updateLeagueTable(match.homeTeam, match.awayTeam, result.homeGoals, result.awayGoals);
            finishedMatches.push({
                ...match,
                played: true,
                score: `${result.homeGoals}-${result.awayGoals}`
            });
        });

        // 3. Update State
        setWeeklyResults(finishedMatches);
        setCurrentWeek(nextWeek);
        setCurrentFixture(userMatch); // Can be undefined if user has a bye
        setMatchState(null);
        setGameState(GameState.PRE_MATCH);
        setIsLoading(false);
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

    const renderScreen = () => {
        switch (appScreen) {
            case AppScreen.START_SCREEN: return <StartScreen onSelectTeam={() => setAppScreen(AppScreen.TEAM_SELECTION)} onStartUnemployed={() => setAppScreen(AppScreen.CREATE_MANAGER)} onStartWorldCup={() => setAppScreen(AppScreen.NATIONAL_TEAM_SELECTION)} />;
            case AppScreen.TEAM_SELECTION: return <TeamSelectionScreen teams={Object.values(allTeams)} onTeamSelect={initializeGame} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.NATIONAL_TEAM_SELECTION: return <TeamSelectionScreen teams={NATIONAL_TEAMS.slice(0, 5).map(nt => ({ ...nt, league: 'International' as const, chairmanPersonality: 'Traditionalist' as const }))} onTeamSelect={initializeWorldCup} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.CREATE_MANAGER: return <CreateManagerScreen onCreate={handleManagerCreation} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_CENTRE: return <JobCentreScreen jobs={availableJobs} onApply={handleStartInterview} onBack={() => setAppScreen(AppScreen.START_SCREEN)} />;
            case AppScreen.JOB_INTERVIEW: return <JobInterviewScreen interview={interview} isLoading={isLoading} error={error} jobOffer={jobOffer} onAnswerSubmit={handleAnswerSubmit} onFinish={handleInterviewFinish} />;
            case AppScreen.TRANSFERS: return <TransfersScreen targets={TRANSFER_TARGETS} onApproachPlayer={(player) => handleStartPlayerTalk(player, 'transfer')} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.PLAYER_TALK: return <PlayerTalkScreen talk={playerTalk} isLoading={isLoading} error={error} talkResult={talkResult} onAnswerSubmit={handlePlayerTalkAnswer} onFinish={handlePlayerTalkFinish} />;
            case AppScreen.NEWS_FEED: return <NewsScreen news={news} onBack={() => setAppScreen(AppScreen.GAMEPLAY)} />;
            case AppScreen.GAMEPLAY:
                if (!userTeam) return <div>Loading...</div>;
                return (
                    <main className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                        {showTutorial && (
                            <TutorialOverlay 
                                step={tutorialStep} 
                                onNext={() => setTutorialStep(prev => prev + 1)} 
                                onClose={() => setShowTutorial(false)}
                                isNationalTeam={isPrologue} 
                            />
                        )}
                        <div className="lg:col-span-3 space-y-6">
                            <TeamDetails 
                                team={userTeam} 
                                onTacticChange={handleTacticChange} 
                                onNavigateToTransfers={() => setAppScreen(AppScreen.TRANSFERS)} 
                                onNavigateToNews={() => setAppScreen(AppScreen.NEWS_FEED)} 
                                onStartContractTalk={(player) => handleStartPlayerTalk(player, 'renewal')} 
                                onToggleStarter={handleToggleStarter}
                                gameState={gameState}
                                subsUsed={(matchState?.subsUsed?.home ?? 0) + (matchState?.subsUsed?.away ?? 0)} // Simplified count or detailed needed in component
                                onSubstitute={handleSubstitute}
                            />
                        </div>
                        <div className="lg:col-span-6">
                            <MatchView 
                                fixture={currentFixture} 
                                weeklyResults={weeklyResults}
                                matchState={matchState} 
                                gameState={gameState} 
                                onPlayFirstHalf={handlePlayFirstHalf} 
                                onPlaySecondHalf={handlePlaySecondHalf} 
                                onSimulateSegment={handleSimulateSegment}
                                onNextMatch={handleAdvanceWeek} 
                                error={error} 
                                isSeasonOver={false} // Managed manually by advance week for WC
                                userTeamName={userTeamName} 
                                leagueTable={leagueTable} 
                                isLoading={isLoading} 
                                currentWeek={currentWeek} 
                            />
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
