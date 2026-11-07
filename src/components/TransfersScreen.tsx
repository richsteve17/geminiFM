import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { Player } from '../types';
import { PLAYER_PERSONALITIES } from '../constants';
import { getFreeAgentEligibility, isFreeAgent, normalizePlayerStats } from '../engine/freeAgency';
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

const TransfersScreen: React.FC<TransfersScreenProps> = ({ targets, onApproachPlayer, onBack, squadPlayers = [], transferWindowOpen = true, maxSquadSize }) => {
    const [search, setSearch] = useState('');
    const [freeAgentsOnly, setFreeAgentsOnly] = useState(false);
    const freeAgentCount = useMemo(() => targets.filter(isFreeAgent).length, [targets]);
    const sortedTargets = useMemo(() => [...targets].filter(player => {
        const query = search.trim().toLocaleLowerCase();
        const matchesSearch = !query || [player.name, player.position, player.nationality, player.currentClub].filter(Boolean).some(value => String(value).toLocaleLowerCase().includes(query));
        return matchesSearch && (!freeAgentsOnly || isFreeAgent(player));
    }).sort((a, b) => b.rating - a.rating), [freeAgentsOnly, search, targets]);

    return (
        <section className="fm-screen min-w-0 py-2">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#18392F] pb-5">
                <div className="min-w-0 max-w-2xl">
                    <h2 className="fm-screen-title">Transfer Market</h2>
                    <p className="mt-2 text-[#637169]">Search targets and unattached players. Eligible free agents can be approached even when the transfer window is closed.</p>
                </div>
                <p role="status" className={`border-l-2 pl-3 text-sm font-medium ${transferWindowOpen ? 'border-[#18392F]' : 'border-[#A47837]'}`}>{transferWindowOpen ? 'Transfer window open' : 'Window closed — free agents still available'}</p>
            </header>
            <div className="fm-panel mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-5">
                <div className="min-w-0 flex-1">
                    <label className="fm-eyebrow mb-2 block" htmlFor="transfer-market-search">Search the transfer market</label>
                    <input id="transfer-market-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, position, nationality, or club…" className="fm-field min-h-11 w-full px-3 text-sm" />
                </div>
                <button type="button" onClick={() => setFreeAgentsOnly(value => !value)} className={`${freeAgentsOnly ? 'fm-button' : 'fm-button-secondary'} min-h-11 px-4 text-sm`} aria-pressed={freeAgentsOnly}>Free Agents ({freeAgentCount})</button>
            </div>
            <p className="mb-5 max-w-3xl border-l-2 border-[#A47837] pl-3 text-xs leading-relaxed text-[#637169]">Inherited seeded game market — not a verified current-season player-contract feed. Eligibility shown here is in-game.</p>
            <div className="mb-3 hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(10rem,0.9fr)] gap-5 px-5 lg:grid">
                <span className="fm-eyebrow">Player</span><span className="fm-eyebrow">Club / Contract</span><span className="fm-eyebrow text-right">Rating / Approach</span>
            </div>
            <div className="fm-panel divide-y divide-[#172B24]/20">
                {sortedTargets.length === 0 ? (
                    <div className="p-8" role="status"><p className="font-semibold">No matching players found.</p><p className="mt-1 text-sm text-[#637169]">Try a different search or show all market targets.</p></div>
                ) : sortedTargets.map(player => {
                    const freeAgent = isFreeAgent(player);
                    const eligibility = freeAgent ? getFreeAgentEligibility({ player, squadPlayers, transferWindowOpen, maxSquadSize }) : null;
                    const canApproach = freeAgent ? eligibility!.eligible : transferWindowOpen;
                    const disabledReason = freeAgent ? eligibility?.message : 'The transfer window is closed for attached players.';
                    const stats = normalizePlayerStats(player.stats);
                    return (
                        <article key={player.name} className="grid grid-cols-1 items-start gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(10rem,0.9fr)] lg:gap-5">
                            <div className="flex min-w-0 items-start gap-3">
                                <NationalityBadge nationality={player.nationality} className="mt-1 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="break-words text-2xl font-bold leading-tight">{player.name}</h3>
                                    <p className="mt-1 text-sm text-[#637169]">{player.age} y/o <span aria-hidden="true">/</span> {player.position}</p>
                                    {freeAgent && <p className="mt-2 text-xs font-semibold text-[#18392F]">Free Agent · €0 Club Fee</p>}
                                    <p className="mt-2 text-sm text-[#637169]" title={PLAYER_PERSONALITIES[player.personality]}>Personality: <span className="font-medium text-[#172B24]">{player.personality}</span></p>
                                </div>
                            </div>
                            <dl className="space-y-2 text-sm">
                                <div><dt className="text-xs text-[#637169]">{freeAgent ? 'Selling club' : 'Current club'}</dt><dd className="mt-1 font-medium">{freeAgent ? 'None (unattached)' : player.currentClub || 'Unknown'}</dd></div>
                                <div><dt className="text-xs text-[#637169]">Wage</dt><dd className="mt-1 font-semibold tabular-nums">${player.wage.toLocaleString()}/wk</dd></div>
                            </dl>
                            <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                                <div className="lg:text-right"><p className="text-xs text-[#637169]">Rating</p><p className="text-3xl font-bold leading-tight tabular-nums">{player.rating}</p></div>
                                <button type="button" onClick={() => onApproachPlayer(player)} disabled={!canApproach} title={canApproach ? undefined : disabledReason} aria-label={`${freeAgent ? 'Approach free agent' : 'Approach'} ${player.name}`} className="fm-button min-h-11 px-4 text-sm">{freeAgent ? 'Approach Free Agent' : 'Approach'}</button>
                                {!canApproach && <p className="w-full text-sm leading-relaxed text-[#8B554A] lg:text-right">{disabledReason}</p>}
                            </div>
                            {stats.appearances > 0 && <p className="border-t border-[#172B24]/10 pt-3 text-xs leading-relaxed text-[#637169] tabular-nums lg:col-span-3" title={player.history && player.history.length > 0 ? `Career History:\n${player.history.map(h => `Year ${h.year} (${h.teamName}): ${h.appearances} Apps, ${h.goals} Goals, ${h.cleanSheets} CS, Rating ${h.averageRating}`).join('\n')}` : 'No past season history.'}>Apps: {stats.appearances} <span aria-hidden="true">/</span> Goals: {stats.goals} <span aria-hidden="true">/</span> CS: {stats.cleanSheets} <span aria-hidden="true">/</span> Rating: <Star size={12} strokeWidth={1.75} className="inline-block align-middle" aria-hidden="true" /> {stats.averageRating}</p>}
                        </article>
                    );
                })}
            </div>
            <footer className="mt-6 border-t border-[#172B24]/15 pt-4"><button type="button" onClick={onBack} className="fm-button-secondary min-h-11 px-4 text-sm">&larr; Back to Main Screen</button></footer>
        </section>
    );
};

export default TransfersScreen;
