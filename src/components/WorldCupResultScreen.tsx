
import React from 'react';
import type { WorldCupResult } from '../types';

interface WorldCupResultScreenProps {
    result: WorldCupResult;
    onContinue: () => void;
}

const TIER_COLORS: Record<string, string> = {
    'Legend': 'from-yellow-400 to-amber-500',
    'Elite': 'from-purple-400 to-purple-600',
    'Top Flight': 'from-blue-400 to-blue-600',
    'Mid-Table European': 'from-green-400 to-green-600',
    'Championship / Lower': 'from-gray-400 to-gray-500',
    'Grassroots': 'from-red-700 to-red-900',
};

const STAGE_LABELS: Record<string, string> = {
    none: 'Did Not Play',
    group_stage: 'Group Stage',
    round_of_16: 'Round of 16',
    quarter_final: 'Quarter-Final',
    semi_final: 'Semi-Final',
    runner_up: 'Runner-Up',
    winner: 'World Cup Winner',
};

const STAGE_ICONS: Record<string, string> = {
    none: '🏚️',
    group_stage: '🏟️',
    round_of_16: '⚔️',
    quarter_final: '🛡️',
    semi_final: '🌟',
    runner_up: '🥈',
    winner: '🏆',
};

const WorldCupResultScreen: React.FC<WorldCupResultScreenProps> = ({ result, onContinue }) => {
    const isWinner = result.outcome === 'winner';
    const gradientClass = TIER_COLORS[result.tier] || 'from-gray-400 to-gray-600';

    const CLUBS_BY_TIER: Record<string, string[]> = {
        'Legend': ['Real Madrid', 'Chelsea', 'Liverpool', 'Manchester City', 'Barcelona', 'PSG'],
        'Elite': ['Arsenal', 'Tottenham', 'Juventus', 'AC Milan', 'Atletico Madrid', 'Bayern Munich'],
        'Top Flight': ['West Ham', 'Borussia Dortmund', 'Inter Milan', 'Valencia', 'Lyon', 'Napoli'],
        'Mid-Table European': ['Southampton', 'Freiburg', 'Torino', 'Celta Vigo', 'Stade de Reims'],
        'Championship / Lower': ['Leeds United', 'Middlesbrough', 'Sunderland', 'LA Galaxy', 'Atlanta United'],
        'Grassroots': ['Hartlepool', 'Stockport County', 'Salford City'],
    };

    const exampleClubs = CLUBS_BY_TIER[result.tier] || [];

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-2xl w-full">
                {isWinner && (
                    <div className="text-8xl mb-6 animate-bounce">🏆</div>
                )}

                <div className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${gradientClass} mb-2`}>
                    {STAGE_ICONS[result.outcome]} {STAGE_LABELS[result.outcome]}
                </div>

                <p className="text-xl text-gray-300 mb-2">
                    {result.teamName}'s World Cup Run
                </p>

                {isWinner && (
                    <p className="text-yellow-400 font-bold text-lg mb-4 animate-pulse">
                        ⭐ LEGEND STATUS ACHIEVED ⭐
                    </p>
                )}

                <div className={`bg-gradient-to-r ${gradientClass} p-px rounded-xl mb-6 mt-4`}>
                    <div className="bg-gray-900 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-white mb-1">Reputation Unlocked</h2>
                        <p className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}`}>
                            {result.tier}
                        </p>
                        <p className="text-gray-400 mt-2 text-sm">
                            Starting Reputation: <span className="text-white font-bold">{result.reputationFloor}–{result.reputationCeiling}</span>
                        </p>

                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <p className="text-gray-400 text-sm mb-2">Clubs now available to you:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {exampleClubs.map(club => (
                                    <span key={club} className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300 font-semibold border border-gray-600">
                                        {club}
                                    </span>
                                ))}
                                {exampleClubs.length > 0 && (
                                    <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-500 border border-gray-700">
                                        + more
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-500 text-xs mt-4 italic">
                            {result.description}
                        </p>
                    </div>
                </div>

                <div className="bg-gray-800/60 rounded-lg p-4 mb-6 text-left border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Reputation Gate System</h3>
                    <div className="space-y-1 text-xs">
                        {[
                            { stage: 'Winner', rep: '90–100', tier: 'Legend — Any club', highlight: result.outcome === 'winner' },
                            { stage: 'Runner-Up', rep: '80–90', tier: 'Elite clubs, top PL/La Liga', highlight: result.outcome === 'runner_up' },
                            { stage: 'Semi-Final', rep: '65–80', tier: 'Most top-flight clubs', highlight: result.outcome === 'semi_final' },
                            { stage: 'Quarter-Final', rep: '50–65', tier: 'Bundesliga, La Liga, lower PL', highlight: result.outcome === 'quarter_final' },
                            { stage: 'Round of 16', rep: '35–50', tier: 'Serie A, Ligue 1, mid-tier Europe', highlight: result.outcome === 'round_of_16' },
                            { stage: 'Group Stage', rep: '20–35', tier: 'MLS, Championship', highlight: result.outcome === 'group_stage' },
                            { stage: 'Did not play', rep: '0–20', tier: 'MLS, lower Championship', highlight: result.outcome === 'none' },
                        ].map(row => (
                            <div key={row.stage} className={`flex justify-between items-center px-2 py-1 rounded ${row.highlight ? 'bg-green-900/50 border border-green-700' : ''}`}>
                                <span className={row.highlight ? 'text-green-300 font-bold' : 'text-gray-500'}>{row.stage}</span>
                                <span className={row.highlight ? 'text-green-400 font-bold' : 'text-gray-600'}>{row.rep}</span>
                                <span className={row.highlight ? 'text-green-300' : 'text-gray-600 text-right max-w-[140px]'}>{row.tier}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onContinue}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-xl rounded-xl transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:-translate-y-1"
                >
                    {isWinner ? '🏆 Start Your Legend Career' : 'Start Club Career'}
                </button>

                <p className="text-xs text-gray-600 mt-3">
                    Your World Cup result is saved. It will apply automatically when you begin a Club Career or Road to Glory.
                </p>
            </div>
        </div>
    );
};

export default WorldCupResultScreen;
