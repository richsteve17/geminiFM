import React from 'react';
import type { Fixture, MatchState, LeagueTableEntry, TouchlineShout } from '../types';
import { GameState } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { TOUCHLINE_SHOUTS } from '../constants';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface MatchViewProps {
    fixture: Fixture | undefined;
    matchState: MatchState | null;
    gameState: GameState;
    onPlayFirstHalf: () => void;
    onPlaySecondHalf: (shout: TouchlineShout) => void;
    onNextMatch: () => void;
    error: string | null;
    isSeasonOver: boolean;
    userTeamName: string | null;
    leagueTable: LeagueTableEntry[];
    isLoading: boolean;
    currentWeek: number;
}

const MatchView: React.FC<MatchViewProps> = ({ fixture, matchState, gameState, onPlayFirstHalf, onPlaySecondHalf, onNextMatch, error, isSeasonOver, userTeamName, leagueTable, isLoading, currentWeek }) => {

    const isInternationalBreak = !fixture && !isSeasonOver;

    const renderContent = () => {
        if (isSeasonOver) {
            const winner = leagueTable[0];
            return (
                <div className="text-center p-8">
                    <h2 className="text-3xl font-bold text-green-400 mb-4">Season Over!</h2>
                    {winner && <p className="text-lg mb-4"><span className="font-bold text-yellow-400">{winner.teamName}</span> are the champions!</p>}
                    {winner?.teamName === userTeamName && <p className="text-xl text-white animate-pulse">Congratulations, you've won the league!</p>}
                </div>
            );
        }
        
        if (isInternationalBreak) {
             return (
                <div className="text-center p-8 flex flex-col items-center justify-center min-h-[200px]">
                    <GlobeAltIcon className="w-12 h-12 text-blue-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">International Break</h2>
                    <p className="text-gray-400">Club football is on hold. Check the news for tournament updates.</p>
                </div>
            );
        }

        if (isLoading) {
             return (
                <div className="text-center p-8 flex flex-col items-center justify-center min-h-[200px]">
                    <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                    <p className="text-xl font-semibold animate-pulse">Processing Week...</p>
                </div>
            );
        }

        if (gameState === GameState.SIMULATING) {
            return (
                <div className="text-center p-8 flex flex-col items-center justify-center min-h-[200px]">
                    <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                    <p className="text-xl font-semibold animate-pulse">Simulating {matchState?.firstHalfResult ? 'Second' : 'First'} Half...</p>
                </div>
            );
        }

        if (gameState === GameState.POST_MATCH && matchState?.finalScore) {
            return (
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-gray-400">Full Time</p>
                        <div className="flex justify-center items-center my-2">
                            <h3 className="text-2xl font-bold w-2/5 text-right">{fixture?.homeTeam}</h3>
                            <div className="mx-4 px-4 py-2 bg-gray-900 rounded-md">
                                <span className="text-3xl font-bold tracking-widest">{matchState.finalScore}</span>
                            </div>
                            <h3 className="text-2xl font-bold w-2/5 text-left">{fixture?.awayTeam}</h3>
                        </div>
                    </div>
                    <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-md max-h-60 overflow-y-auto leading-relaxed">
                        <h4 className="font-bold text-green-400 mb-2">Match Report</h4>
                        <p className="whitespace-pre-line">{matchState.fullTimeCommentary}</p>
                    </div>
                </div>
            );
        }

        if (gameState === GameState.HALF_TIME && matchState?.firstHalfResult) {
            return (
                 <div className="p-4 sm:p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-yellow-400 font-bold">Half Time</p>
                        <div className="flex justify-center items-center my-2">
                            <h3 className="text-xl font-bold w-2/5 text-right">{fixture?.homeTeam}</h3>
                            <div className="mx-4 px-4 py-2 bg-gray-900 rounded-md">
                                <span className="text-2xl font-bold tracking-widest">{matchState.firstHalfResult.score}</span>
                            </div>
                            <h3 className="text-xl font-bold w-2/5 text-left">{fixture?.awayTeam}</h3>
                        </div>
                    </div>
                     <div className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-md max-h-40 overflow-y-auto leading-relaxed">
                        <h4 className="font-bold text-yellow-400 mb-2">First Half Summary</h4>
                        <p>{matchState.firstHalfResult.commentary}</p>
                    </div>
                </div>
            );
        }

        if (gameState === GameState.PRE_MATCH && fixture) {
            return (
                <div className="text-center p-8">
                    <h2 className="text-xl font-bold mb-2 text-green-400">Matchday {currentWeek}</h2>
                    <div className="flex justify-center items-center my-4">
                        <h3 className="text-2xl sm:text-3xl font-bold w-2/5 text-right">{fixture.homeTeam}</h3>
                        <span className="mx-4 text-gray-500 text-xl">vs</span>
                        <h3 className="text-2xl sm:text-3xl font-bold w-2/5 text-left">{fixture.awayTeam}</h3>
                    </div>
                    {error && <p className="text-red-500 my-4">{error}</p>}
                </div>
            );
        }

        return <div className="text-center p-8"><p>Loading...</p></div>;
    };

    const renderButton = () => {
        if (isSeasonOver || isLoading) return null;
        
        if (isInternationalBreak) {
            return ( <button onClick={onNextMatch} className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-b-lg hover:bg-blue-700 transition-colors duration-200"> Continue </button> );
        }

        if (gameState === GameState.PRE_MATCH) {
            return ( <button onClick={onPlayFirstHalf} className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-b-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"> <FootballIcon className="w-5 h-5 mr-2" /> Kick Off </button> );
        }

        if (gameState === GameState.HALF_TIME) {
            return (
                <div className="bg-gray-900/50 p-3 rounded-b-lg">
                    <h3 className="text-center font-bold text-white mb-2">Half-Time Team Talk</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(TOUCHLINE_SHOUTS) as TouchlineShout[]).map(shout => (
                            <button key={shout} onClick={() => onPlaySecondHalf(shout)} title={TOUCHLINE_SHOUTS[shout]} className="py-2 px-3 text-sm bg-gray-700 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">
                                {shout}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (gameState === GameState.POST_MATCH) {
            return ( <button onClick={onNextMatch} className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-b-lg hover:bg-blue-700 transition-colors duration-200"> Advance Week </button> );
        }
        
        return null;
    };

    return (
        <div className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-between min-h-[300px]">
            <div className="flex-grow">
                {renderContent()}
            </div>
            {renderButton()}
        </div>
    );
};

export default MatchView;
