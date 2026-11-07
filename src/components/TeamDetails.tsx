import React, { useState } from 'react';
import { Gamepad2, ClipboardList, Newspaper, Search, Handshake, Trophy, House, Plane, CircleDollarSign, ChevronDown, type LucideIcon } from 'lucide-react';
import { GameState } from '../types';
import type { Team, Fixture } from '../types';
import ClubCrest from './ClubIdentity';
import { getClubRosterSource } from '../engine/clubRosters';

interface TeamDetailsProps {
    team: Team;
    gameState: GameState;
    managerReputation: number;
    nextFixture: Fixture | null;
    activeTab: 'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors' | 'international';
    onNavigateToTab: (tab: 'match' | 'tactics' | 'news' | 'scouting' | 'scouting_market' | 'transfers' | 'honors' | 'international') => void;
    onResign?: () => void;
}

type GameplayTab = TeamDetailsProps['activeTab'];

const navigationItems: Array<{ tab: GameplayTab; label: string; Icon: LucideIcon }> = [
    { tab: 'match', label: 'Match Center', Icon: Gamepad2 },
    { tab: 'tactics', label: 'Roster & Tactics', Icon: ClipboardList },
    { tab: 'news', label: 'Inbox Feed', Icon: Newspaper },
    { tab: 'scouting', label: 'Scout Network', Icon: Search },
    { tab: 'scouting_market', label: 'Free Agency', Icon: CircleDollarSign },
    { tab: 'transfers', label: 'Negotiations', Icon: Handshake },
    { tab: 'honors', label: 'Trophy Room', Icon: Trophy },
    { tab: 'international', label: 'International Returns', Icon: Plane },
];

const TeamDetails: React.FC<TeamDetailsProps> = ({ team, gameState, managerReputation, nextFixture, activeTab, onNavigateToTab, onResign }) => {
    const [dossierExpanded, setDossierExpanded] = useState(false);
    const isNationalTeam = team.league === 'International';
    const managerName = typeof window === 'undefined' ? 'Manager' : window.localStorage.getItem('gfm_manager_name') || 'Manager';
    const totalWageBill = team.players.reduce((sum, player) => sum + player.wage, 0);
    const isHome = nextFixture ? nextFixture.homeTeam === team.name : true;
    const opponentName = nextFixture ? (isHome ? nextFixture.awayTeam : nextFixture.homeTeam) : 'No Match';
    const rosterSource = getClubRosterSource(team);

    return (
        <aside className="fm-club-rail fm-inverse flex flex-col px-4 py-4 md:max-h-[calc(100vh-68px)] md:overflow-y-auto md:px-5 md:py-6" aria-label="Club workspace">
            <div className="flex items-center gap-3 border-b border-white/20 pb-4 md:flex-col md:items-start md:gap-4">
                <ClubCrest name={team.name} size="h-12 w-12 md:h-16 md:w-16" />
                <div className="min-w-0 flex-1">
                    <p className="fm-eyebrow mb-1 text-white/65">{team.league}</p>
                    <h2 className="break-words text-2xl font-bold leading-tight md:text-3xl">{team.name}</h2>
                </div>
                <button type="button" className="flex min-h-11! items-center gap-1 text-sm md:hidden" aria-expanded={dossierExpanded} aria-controls="club-dossier" onClick={() => setDossierExpanded(value => !value)}>
                    Dossier <ChevronDown className={`h-4 w-4 transition-transform ${dossierExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
            </div>

            <nav className="order-2 mt-4 md:order-1 md:my-5" aria-label="Team console navigation">
                <p className="fm-eyebrow mb-2 hidden text-white/55 md:block">Console Navigation</p>
                <div className="flex gap-0 overflow-x-auto md:flex-col">
                    {navigationItems.map(({ tab, label, Icon }) => {
                        const isActive = activeTab === tab;
                        return (
                            <button key={tab} type="button" onClick={() => onNavigateToTab(tab)} aria-current={isActive ? 'page' : undefined}
                                className={`flex min-h-11! shrink-0 items-center gap-2.5 border-b-2 px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A46D] md:w-full md:border-b-0 md:border-l-2 ${isActive ? 'border-[#C6A46D] bg-white/10 text-white' : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'}`}>
                                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div id="club-dossier" className={`order-1 pt-4 md:order-2 md:border-t md:border-white/20 ${dossierExpanded ? 'block' : 'hidden md:block'}`}>
                <dl className="space-y-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-white/65">Manager</dt>
                        <dd className="break-words font-semibold">{managerName}</dd>
                    </div>
                    <div>
                        <div className="mb-2 flex justify-between gap-3">
                            <dt className="text-white/65">Reputation</dt>
                            <dd className="font-semibold tabular-nums">{managerReputation}%</dd>
                        </div>
                        <div className="h-1 bg-white/15" role="meter" aria-label="Manager reputation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={managerReputation}>
                            <div className="h-full bg-[#C6A46D] transition-all" style={{ width: `${managerReputation}%` }} />
                        </div>
                    </div>
                    {!isNationalTeam && (
                        <>
                            <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-3">
                                <dt className="text-white/65">Roster baseline</dt>
                                <dd className="tabular-nums">{rosterSource?.snapshotDate || 'Preserved career'}</dd>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2 border-t border-white/15 pt-3">
                                <dt className="text-white/65">Balance</dt>
                                <dd className="font-semibold tabular-nums">${team.balance.toLocaleString()}</dd>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                                <dt className="text-white/65">Wage Bill</dt>
                                <dd className="tabular-nums">${totalWageBill.toLocaleString()}/wk</dd>
                            </div>
                        </>
                    )}
                </dl>
                {nextFixture && (
                    <section className="mt-5 border-t border-white/20 pt-4" aria-label="Next match">
                        <div className="mb-2 flex justify-between gap-3 text-xs text-white/65">
                            <span className="fm-eyebrow">Next Match</span>
                            <span className="tabular-nums">Week {nextFixture.week}</span>
                        </div>
                        <p className="text-lg font-semibold leading-snug">vs {opponentName}</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-white/70">
                            {isHome ? <House className="h-4 w-4" aria-hidden="true" /> : <Plane className="h-4 w-4" aria-hidden="true" />}
                            {isHome ? 'Home' : 'Away'}
                        </p>
                    </section>
                )}
                {onResign && (
                    <button type="button" onClick={() => {
                        if (confirm('Are you sure you want to resign? Your manager reputation will suffer!')) onResign();
                    }} className="mt-5 min-h-11! w-full border-t border-white/20 pt-3 text-left text-sm text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A46D]">
                        Resign position
                    </button>
                )}
            </div>
        </aside>
    );
};

export default TeamDetails;
