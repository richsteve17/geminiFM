import React from 'react';
import type { Team, LeagueTier } from '../types';
import ClubCrest from './ClubIdentity';

interface TeamSelectionScreenProps {
    teams: Team[];
    onTeamSelect: (teamName: string) => void;
    onBack: () => void;
}

const TeamSelectionScreen: React.FC<TeamSelectionScreenProps> = ({ teams, onTeamSelect, onBack }) => {
    const teamsByLeague = teams.reduce((acc, team) => {
        if (!acc[team.league]) acc[team.league] = [];
        acc[team.league].push(team);
        return acc;
    }, {} as Record<LeagueTier, Team[]>);

    const leagueOrder: LeagueTier[] = ['International', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Championship', 'MLS'];
    const sortedLeagues = Object.keys(teamsByLeague).sort((a, b) => (
        leagueOrder.indexOf(a as LeagueTier) - leagueOrder.indexOf(b as LeagueTier)
    )) as LeagueTier[];

    return (
        <div className="mx-auto mt-8 max-w-6xl px-4">
            <div className="mb-8 text-center">
                <h2 className="mb-2 text-3xl font-bold text-white">Choose Your Team</h2>
                <p className="text-lg text-gray-400">Select a team to begin.</p>
            </div>

            <div className="space-y-8">
                {sortedLeagues.map(league => (
                    <section key={league} className="rounded-xl border border-slate-700/50 bg-slate-900/35 p-6">
                        <h3 className="mb-4 border-b border-slate-700 pb-2 text-2xl font-bold text-emerald-400">{league}</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {teamsByLeague[league]
                                .sort((a, b) => b.prestige - a.prestige)
                                .map(team => (
                                    <article key={team.name} className="flex flex-col rounded-lg border border-slate-700 bg-slate-900/85 p-4 shadow-lg transition-colors hover:border-emerald-500">
                                        <div className="flex flex-grow gap-3">
                                            <ClubCrest name={team.name} size="h-11 w-11" />
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex items-start justify-between gap-2">
                                                    <h4 className="truncate text-lg font-bold text-white">{team.name}</h4>
                                                    <span className="shrink-0 rounded border border-emerald-900/70 bg-emerald-950/35 px-2 py-1 text-xs font-bold text-emerald-400">{team.prestige} Prestige</span>
                                                </div>
                                                <div className="space-y-1 text-sm text-slate-400">
                                                    <p><span className="text-slate-500">Formation:</span> {team.tactic.formation}</p>
                                                    <p><span className="text-slate-500">Style:</span> {team.tactic.mentality}</p>
                                                    <p><span className="text-slate-500">Chairman:</span> {team.chairmanPersonality === 'Traditionalist' ? 'Football Federation' : team.chairmanPersonality}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onTeamSelect(team.name)}
                                            className="mt-4 w-full rounded-lg border border-emerald-500/50 bg-emerald-600 py-2 px-4 font-bold text-white transition-colors duration-200 hover:bg-emerald-700"
                                        >
                                            Manage
                                        </button>
                                    </article>
                                ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="mb-8 mt-12 text-center">
                <button onClick={onBack} className="rounded-full border border-slate-700 bg-slate-900 px-6 py-2 text-slate-400 transition-colors hover:text-white">
                    &larr; Back to Main Menu
                </button>
            </div>
        </div>
    );
};

export default TeamSelectionScreen;
