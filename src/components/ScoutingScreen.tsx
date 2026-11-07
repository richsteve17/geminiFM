import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import type { Player } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import NationalityBadge from './NationalityBadge';

interface ScoutingScreenProps {
    onScout: (request: string, useRealWorld: boolean) => Promise<void>;
    scoutResults: Player[];
    isLoading: boolean;
    onSignPlayer: (player: Player) => void;
    onBack: () => void;
    onGoToTransfers?: () => void;
    isNationalTeam?: boolean;
}

const ScoutingScreen: React.FC<ScoutingScreenProps> = ({ onScout, scoutResults, isLoading, onSignPlayer, onBack, onGoToTransfers, isNationalTeam }) => {
    const [request, setRequest] = useState('');
    const [useRealWorld, setUseRealWorld] = useState(false);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (request.trim()) onScout(request, useRealWorld);
    };

    return (
        <section className="fm-screen min-w-0 py-2">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#18392F] pb-5">
                <div className="min-w-0">
                    <h2 className="fm-screen-title">{isNationalTeam ? 'National Pool Selection' : 'Global Scouting Network'}</h2>
                    <p className="mt-2 max-w-2xl text-[#637169]">{isNationalTeam ? 'Review the eligible player pool for your national squad.' : 'Tell your scout exactly what you are looking for.'}</p>
                </div>
                {onGoToTransfers && <button type="button" onClick={onGoToTransfers} className="fm-button-secondary min-h-11 px-4 text-sm">{isNationalTeam ? 'View All Eligible' : 'View Transfer List'}</button>}
            </header>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,2fr)]">
                <form onSubmit={handleSubmit} className="fm-panel flex flex-col gap-4 p-5 xl:sticky xl:top-28 xl:self-start">
                    <label htmlFor="scoutRequest" className="fm-eyebrow">Search Request</label>
                    <textarea id="scoutRequest" rows={4} value={request} onChange={e => setRequest(e.target.value)} placeholder={isNationalTeam ? "e.g. 'Find me fit strikers playing in Premier League'" : "e.g. 'A tall, aggressive centre back from Italy under 25'"} className="fm-field w-full resize-y px-3 py-3 text-sm leading-relaxed" />
                    {!isNationalTeam && (
                        <button type="button" role="switch" aria-label="Use Real World Network" aria-checked={useRealWorld} onClick={() => setUseRealWorld(value => !value)} className="flex min-h-11 items-start gap-3 border-y border-[#172B24]/15 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A47837]">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${useRealWorld ? 'border-[#18392F] bg-[#18392F] text-white' : 'border-[#637169]'}`} aria-hidden="true">{useRealWorld && <Check size={14} strokeWidth={1.75} />}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">Use Real World Network</span>
                                <span className="mt-1 block text-xs leading-relaxed text-[#637169]">Searches live football databases via Google (Powered by Gemini Grounding)</span>
                            </span>
                            <GlobeAltIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#637169]" aria-hidden="true" />
                        </button>
                    )}
                    <button type="submit" disabled={isLoading || !request.trim()} className="fm-button flex min-h-11 items-center justify-center gap-2 px-4 py-3 text-sm">
                        {isLoading ? <><FootballIcon className="h-4 w-4 animate-spin" aria-hidden="true" />{isNationalTeam ? 'Searching...' : 'Scouting...'}</> : isNationalTeam ? 'Filter Pool' : 'Send Scout'}
                    </button>
                    {isLoading && <p role="status" className="text-sm text-[#637169]">{isNationalTeam ? 'Searching...' : 'Scouting...'}</p>}
                </form>

                <div className="min-w-0" aria-busy={isLoading}>
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                        <h3 className="text-2xl font-bold">{isNationalTeam ? 'Eligible Players' : 'Scouting Reports'}</h3>
                        <span className="text-sm text-[#637169] tabular-nums">{scoutResults.length}</span>
                    </div>
                    <div className="fm-panel divide-y divide-[#172B24]/20">
                        {scoutResults.map((player, index) => (
                            <article key={index} className="p-5">
                                <header className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <NationalityBadge nationality={player.nationality} className="mt-1 shrink-0" />
                                        <div className="min-w-0">
                                            <h4 className="break-words text-2xl font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>{player.name}</h4>
                                            <p className="mt-1 text-sm text-[#637169]">{player.position} <span aria-hidden="true">/</span> Age: {player.age}{player.currentClub && <> <span aria-hidden="true">/</span> {player.currentClub}</>}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => onSignPlayer(player)} className="fm-button-secondary min-h-11 px-4 text-sm" aria-label={`${isNationalTeam ? 'Call up' : 'Approach'} ${player.name}`}>{isNationalTeam ? 'Call Up' : 'Approach'}</button>
                                </header>
                                <p className="my-4 border-l-2 border-[#A47837] pl-3 text-sm leading-relaxed">"{player.scoutingReport || 'Available for selection.'}"</p>
                                <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[#172B24]/15 pt-3 text-sm sm:grid-cols-3">
                                    <div><dt className="text-xs text-[#637169]">Rating</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{player.rating}</dd></div>
                                    {!isNationalTeam && <div><dt className="text-xs text-[#637169]">Wage</dt><dd className="mt-1 font-semibold tabular-nums">${player.wage.toLocaleString()}/wk</dd></div>}
                                    {!isNationalTeam && <div><dt className="text-xs text-[#637169]">Value</dt><dd className="mt-1 font-semibold tabular-nums">${(player.marketValue || player.wage * 100).toLocaleString()}</dd></div>}
                                </dl>
                                {player.stats && player.stats.appearances > 0 && (
                                    <p className="mt-4 border-t border-[#172B24]/15 pt-3 text-xs leading-relaxed text-[#637169] tabular-nums" title={player.history && player.history.length > 0 ? `Career History:\n` + player.history.map(h => `Year ${h.year} (${h.teamName || 'Club'}): ${h.appearances} Apps, ${h.goals} Goals, ${h.cleanSheets} CS, Rating ${h.averageRating}`).join('\n') : 'No past season history.'}>
                                        Apps: {player.stats.appearances} <span aria-hidden="true">/</span> Goals: {player.stats.goals} <span aria-hidden="true">/</span> CS: {player.stats.cleanSheets} <span aria-hidden="true">/</span> Rating: <Star size={12} strokeWidth={1.75} className="inline-block align-middle" aria-hidden="true" /> {player.stats.averageRating}
                                    </p>
                                )}
                            </article>
                        ))}
                        {!isLoading && scoutResults.length === 0 && <p className="p-8 text-sm leading-relaxed text-[#637169]">Enter a request above to find players.</p>}
                    </div>
                </div>
            </div>
            <footer className="mt-6 border-t border-[#172B24]/15 pt-4"><button type="button" onClick={onBack} className="fm-button-secondary min-h-11 px-4 text-sm">&larr; Back to Team</button></footer>
        </section>
    );
};

export default ScoutingScreen;
