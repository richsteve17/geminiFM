import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { Player } from '../types';
import { PLAYER_PERSONALITIES } from '../constants';
import {
    getFreeAgentEligibility,
    isFreeAgent,
    normalizePlayerStats,
} from '../engine/freeAgency';
import NationalityBadge from './NationalityBadge';

interface TransfersScreenProps {
    targets: Player[];
    onApproachPlayer: (player: Player) => void;
    onBack: () => void;
    /** Optional while App is migrated to the pure free-agency guard. */
    squadPlayers?: Player[];
    /** Ordinary transfers close with the window; eligible free agents remain approach-able. */
    transferWindowOpen?: boolean;
    maxSquadSize?: number;
}

const getPositionColor = (position: string) => {
    if (position === 'GK') return 'border-yellow-500';
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(position)) return 'border-blue-500';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'border-green-500';
    if (['LW', 'RW', 'ST', 'CF'].includes(position)) return 'border-red-500';
    return 'border-gray-500';
};

const TransfersScreen: React.FC<TransfersScreenProps> = ({
    targets,
    onApproachPlayer,
    onBack,
    squadPlayers = [],
    transferWindowOpen = true,
    maxSquadSize,
}) => {
    const [search, setSearch] = useState('');
    const [freeAgentsOnly, setFreeAgentsOnly] = useState(false);

    const freeAgentCount = useMemo(() => targets.filter(isFreeAgent).length, [targets]);
    const sortedTargets = useMemo(() => [...targets]
        .filter(player => {
            const query = search.trim().toLocaleLowerCase();
            const matchesSearch = !query || [player.name, player.position, player.nationality, player.currentClub]
                .filter(Boolean)
                .some(value => String(value).toLocaleLowerCase().includes(query));
            return matchesSearch && (!freeAgentsOnly || isFreeAgent(player));
        })
        .sort((a, b) => b.rating - a.rating), [freeAgentsOnly, search, targets]);

    return (
        <div className="mt-8 max-w-5xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">Transfer Market</h2>
                <p className="text-lg text-gray-400">
                    Search targets and unattached players. Eligible free agents can be approached even when the transfer window is closed.
                </p>
            </div>

            <div className="mb-5 rounded-lg border border-gray-700 bg-gray-900/60 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <label className="sr-only" htmlFor="transfer-market-search">Search the transfer market</label>
                <input
                    id="transfer-market-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, position, nationality, or club…"
                    className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
                />
                <button
                    type="button"
                    onClick={() => setFreeAgentsOnly(value => !value)}
                    className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                        freeAgentsOnly
                            ? 'border-emerald-500 bg-emerald-900/50 text-emerald-200'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                    }`}
                    aria-pressed={freeAgentsOnly}
                >
                    Free Agents ({freeAgentCount})
                </button>
                <span className={`text-xs font-semibold ${transferWindowOpen ? 'text-green-400' : 'text-amber-300'}`}>
                    {transferWindowOpen ? 'Transfer window open' : 'Window closed — free agents still available'}
                </span>
            </div>
            <p className="mb-4 text-xs text-amber-200">Inherited seeded game market — not a verified current-season player-contract feed. Eligibility shown here is in-game.</p>

            <div className="space-y-3">
                {sortedTargets.length === 0 ? (
                    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
                        <p className="font-semibold text-gray-200">No matching players found.</p>
                        <p className="mt-1 text-sm text-gray-400">Try a different search or show all market targets.</p>
                    </div>
                ) : sortedTargets.map(player => {
                    const freeAgent = isFreeAgent(player);
                    const eligibility = freeAgent
                        ? getFreeAgentEligibility({ player, squadPlayers, transferWindowOpen, maxSquadSize })
                        : null;
                    const canApproach = freeAgent ? eligibility!.eligible : transferWindowOpen;
                    const disabledReason = freeAgent
                        ? eligibility?.message
                        : 'The transfer window is closed for attached players.';
                    const stats = normalizePlayerStats(player.stats);

                    return (
                        <div key={player.name} className={`bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex flex-col sm:flex-row items-center justify-between border-l-4 ${getPositionColor(player.position)}`}>
                            <div className="flex-grow sm:flex items-center text-center sm:text-left">
                                <div className="flex items-center justify-center">
                                    <NationalityBadge nationality={player.nationality} className="mr-3 shrink-0" />
                                    <div>
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                            <h3 className="text-xl font-bold text-green-400">{player.name}</h3>
                                            {freeAgent && (
                                                <span className="rounded border border-emerald-600/60 bg-emerald-950/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                                                    Free Agent · €0 Club Fee
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-300">{player.age} y/o {player.position}</p>
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-0 sm:ml-8">
                                    <p className="text-sm text-gray-400" title={PLAYER_PERSONALITIES[player.personality]}>
                                        Personality: <span className="font-semibold text-gray-300">{player.personality}</span>
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Wage: <span className="font-semibold text-gray-300">${player.wage.toLocaleString()}/wk</span>
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {freeAgent ? 'Selling club: ' : 'Current club: '}
                                        <span className="font-semibold text-gray-300">{freeAgent ? 'None (unattached)' : player.currentClub || 'Unknown'}</span>
                                    </p>
                                    {stats.appearances > 0 && (
                                        <p
                                            className="text-xs text-blue-400 font-mono mt-1 cursor-help"
                                            title={player.history && player.history.length > 0
                                                ? `Career History:\n${player.history.map(h => `Year ${h.year} (${h.teamName}): ${h.appearances} Apps, ${h.goals} Goals, ${h.cleanSheets} CS, Rating ${h.averageRating}`).join('\n')}`
                                                : 'No past season history.'
                                            }
                                        >
                                            Apps: {stats.appearances} | Goals: {stats.goals} | CS: {stats.cleanSheets} | Rating: <Star size={12} strokeWidth={1.75} className="inline-block align-middle" aria-hidden="true" /> {stats.averageRating}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-center mt-4 sm:mt-0 sm:items-end gap-2">
                                <div className="flex items-center">
                                    <div className="text-center mr-6">
                                        <p className="text-xs text-gray-400">Rating</p>
                                        <p className="text-2xl font-bold text-white">{player.rating}</p>
                                    </div>
                                    <button
                                        onClick={() => onApproachPlayer(player)}
                                        disabled={!canApproach}
                                        title={canApproach ? undefined : disabledReason}
                                        className="py-2 px-5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400 transition-colors duration-200"
                                    >
                                        {freeAgent ? 'Approach Free Agent' : 'Approach'}
                                    </button>
                                </div>
                                {!canApproach && (
                                    <p className="max-w-[220px] text-center text-xs text-amber-300">{disabledReason}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-center mt-8">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Screen
                </button>
            </div>
        </div>
    );
};

export default TransfersScreen;
