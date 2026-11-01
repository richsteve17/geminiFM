import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ExternalLink, ImageOff } from 'lucide-react';
import { TEAMS } from '../constants';
import { getSeasonKitThemes, SOURCED_KIT_CLUBS, type SeasonKitTheme } from '../data/seasonThemes';
import ClubCrest from './ClubCrest';

type ThemeColors = { primary: string; secondary: string; text: string };
interface KitCatalogProps {
    initialTeam?: string;
    onThemeSelect?: (colors: ThemeColors) => void;
}

function KitPhoto({ kit, teamName }: { kit: SeasonKitTheme; teamName: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [kit.imageUrl]);
    return (
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f0f1f3] flex items-center justify-center">
            {failed ? (
                <div className="text-center text-slate-600 px-5" role="status">
                    <ImageOff size={26} strokeWidth={1.5} className="mx-auto mb-2" aria-hidden="true" />
                    <p className="text-xs">Kit image unavailable</p>
                    <p className="mt-1 text-[11px]">The source record is linked below.</p>
                </div>
            ) : (
                <img src={kit.imageUrl} alt={`${teamName} ${kit.label} reference`} loading="lazy" decoding="async"
                    onError={() => setFailed(true)} className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]" />
            )}
        </div>
    );
}

export default function KitCatalog({ initialTeam = 'Manchester City', onThemeSelect }: KitCatalogProps) {
    const [teamName, setTeamName] = useState(initialTeam);
    const [appliedTheme, setAppliedTheme] = useState<string | null>(null);
    const kits = getSeasonKitThemes(teamName);
    const clubNames = Object.keys(TEAMS).sort();
    const selectKit = (kit: SeasonKitTheme) => {
        if (!onThemeSelect) return;
        onThemeSelect({ primary: kit.bg, secondary: kit.accent, text: kit.text });
        setAppliedTheme(`${teamName}|${kit.id}`);
    };

    return (
        <section aria-label="Current-season kit catalog" className="w-full text-left mb-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 p-4 sm:p-5">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 mb-1">Club identity / Kit room</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-100">Current-Season Kit Catalog</h2>
                    <p className="text-xs text-slate-400 mt-1">{SOURCED_KIT_CLUBS.length} of {clubNames.length} playable clubs sourced · European 2026/27 / MLS 2026</p>
                </div>
                <div className="relative sm:w-64">
                    <label htmlFor="kit-club" className="sr-only">Kit club</label>
                    <select id="kit-club" value={teamName} onChange={event => setTeamName(event.target.value)}
                        className="appearance-none w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 pr-9 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60">
                        {clubNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                </div>
            </div>
            <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                    <ClubCrest teamName={teamName} className="h-9 w-9" />
                    <div>
                        <h3 className="text-base font-semibold text-slate-100">{teamName}</h3>
                        <p className="text-xs text-slate-400">Actual shirt references · choose a kit-derived UI palette</p>
                    </div>
                </div>
                {kits.length ? (
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {kits.map(kit => {
                            const selected = appliedTheme === `${teamName}|${kit.id}`;
                            return (
                                <article key={`${teamName}|${kit.id}`} className={`group min-w-0 rounded-lg border overflow-hidden bg-slate-950/70 ${selected ? 'border-emerald-500' : 'border-slate-800'}`}>
                                    <KitPhoto kit={kit} teamName={teamName} />
                                    <div className="p-3">
                                        <p className="text-xs font-mono font-semibold text-slate-100 tracking-wide">{kit.label}</p>
                                        {(kit.design || kit.brand) && <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{[kit.design, kit.brand].filter(Boolean).join(' · ')}</p>}
                                        <button type="button" onClick={() => selectKit(kit)} disabled={!onThemeSelect} aria-pressed={selected}
                                            className={`mt-3 w-full min-h-10 flex items-center justify-center gap-2 rounded-md border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-default ${selected ? 'border-emerald-700 bg-emerald-900/40 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-700 hover:text-emerald-300'}`}>
                                            {selected && <Check size={14} aria-hidden="true" />}{onThemeSelect ? selected ? 'Theme applied' : 'Apply UI Theme' : 'Reference Only'}
                                            <span className="flex gap-1" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: kit.bg }} /><span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: kit.accent }} /></span>
                                        </button>
                                    </div>
                                    <a href={kit.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border-t border-slate-800 px-3 py-3 text-[11px] text-slate-400 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400">
                                        Source: {kit.sourceName}<ExternalLink size={12} aria-hidden="true" />
                                    </a>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-5">
                        <p className="text-sm font-semibold text-slate-200">No sourced current-season kit record</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">This club's kit is still missing from the imported album. No old kit or guessed design is being passed off as a new kit.</p>
                    </div>
                )}
                <p className="text-[11px] leading-relaxed text-slate-500 mt-4">Shirt images retain their archive references. UI palette swatches are an approximation, not manufacturer colour specifications. Only sourced variants are shown; a missing third shirt is not invented.</p>
            </div>
        </section>
    );
}
