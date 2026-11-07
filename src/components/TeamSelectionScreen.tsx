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
        <main className="fm-screen mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#172B24]/25 pb-6">
                <div>
                    <h2 className="fm-screen-title">Choose Your Team</h2>
                    <p className="mt-2 text-[#637169]">Select a team to begin.</p>
                </div>
                <button type="button" onClick={onBack} className="fm-button-secondary min-h-11 px-4 text-sm">&larr; Back to Main Menu</button>
            </header>
            <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
                <nav className="lg:sticky lg:top-28 lg:w-48 lg:shrink-0 lg:self-start" aria-label="Choose a league">
                    <p className="fm-eyebrow mb-3">League</p>
                    <div className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
                        {sortedLeagues.map((league, index) => (
                            <a key={league} href={`#team-league-${index}`} className="flex min-h-11 shrink-0 items-center justify-between gap-4 border-b border-[#172B24]/15 px-2 py-2 text-sm hover:bg-[#172B24]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A47837]">
                                {league}<span className="text-[#637169] tabular-nums">{teamsByLeague[league].length}</span>
                            </a>
                        ))}
                    </div>
                </nav>
                <div className="min-w-0 flex-1 space-y-10">
                    {sortedLeagues.map((league, index) => (
                        <section key={league} id={`team-league-${index}`} className="scroll-mt-32">
                            <h3 className="mb-4 border-b-2 border-[#18392F] pb-3 text-3xl font-bold leading-tight">{league}</h3>
                            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_5rem_6rem] gap-5 px-4 pb-2 md:grid">
                                <span className="fm-eyebrow">Team</span><span className="fm-eyebrow">Tactics / Chairman</span><span className="fm-eyebrow text-right">Prestige</span><span />
                            </div>
                            <div className="fm-panel divide-y divide-[#172B24]/15">
                                {[...teamsByLeague[league]].sort((a, b) => b.prestige - a.prestige).map(team => (
                                    <article key={team.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-5 transition-colors hover:bg-[#172B24]/[0.03] md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_5rem_6rem] md:gap-5">
                                        <div className="col-span-2 flex min-w-0 items-center gap-4 md:col-span-1">
                                            <ClubCrest name={team.name} size="h-12 w-12" />
                                            <h4 className="break-words text-2xl font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>{team.name}</h4>
                                        </div>
                                        <dl className="text-sm leading-relaxed text-[#637169]">
                                            <div><dt className="inline">Formation: </dt><dd className="inline font-medium text-[#172B24]">{team.tactic.formation}</dd></div>
                                            <div><dt className="inline">Style: </dt><dd className="inline">{team.tactic.mentality}</dd></div>
                                            <div><dt className="inline">Chairman: </dt><dd className="inline">{team.chairmanPersonality === 'Traditionalist' ? 'Football Federation' : team.chairmanPersonality}</dd></div>
                                        </dl>
                                        <p className="text-right text-2xl font-semibold tabular-nums"><span className="mb-1 block text-xs font-normal text-[#637169] md:hidden">Prestige</span>{team.prestige}</p>
                                        <button type="button" onClick={() => onTeamSelect(team.name)} className="fm-button col-span-2 min-h-11 px-4 text-sm md:col-span-1" aria-label={`Manage ${team.name}`}>Manage</button>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                    {teams.length === 0 && <div className="fm-panel p-8 text-[#637169]" role="status">No teams available.</div>}
                </div>
            </div>
        </main>
    );
};

export default TeamSelectionScreen;
