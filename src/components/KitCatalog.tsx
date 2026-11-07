import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, ExternalLink, ImageOff } from 'lucide-react';
import { TEAMS } from '../constants';
import { getSeasonKitThemes, SOURCED_KIT_CLUBS, type SeasonKitTheme } from '../data/seasonThemes';
import ClubCrest from './ClubCrest';

type ThemeColors = { primary: string; secondary: string; text: string };
interface KitCatalogProps { initialTeam?: string; onThemeSelect?: (colors: ThemeColors) => void; }
function KitPhoto({ kit, teamName }: { kit: SeasonKitTheme; teamName: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [kit.imageUrl]);
    return <div className="fm-kit-photo relative overflow-hidden flex items-center justify-center">{failed ? <div className="text-center px-5" role="status"><ImageOff size={26} strokeWidth={1.5} className="mx-auto mb-2" aria-hidden="true" /><p className="text-xs">Kit image unavailable</p><p className="mt-1 text-xs">The source record is linked below.</p></div> : <img src={kit.imageUrl} alt={`${teamName} ${kit.label} reference`} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain" />}</div>;
}
export default function KitCatalog({ initialTeam = 'Manchester City', onThemeSelect }: KitCatalogProps) {
    const [teamName, setTeamName] = useState(initialTeam);
    const [appliedTheme, setAppliedTheme] = useState<string | null>(null);
    const kits = getSeasonKitThemes(teamName);
    const clubNames = Object.keys(TEAMS).sort();
    const selectKit = (kit: SeasonKitTheme) => { if (!onThemeSelect) return; onThemeSelect({ primary: kit.bg, secondary: kit.accent, text: kit.text }); setAppliedTheme(`${teamName}|${kit.id}`); };
    return (
        <section aria-label="Current-season kit catalog" className="fm-kit-archive">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                <div><p className="fm-eyebrow mb-2">Club identity / Kit room</p><h2>Current-Season Kit Catalog</h2><p className="text-xs text-gray-500 mt-2">{SOURCED_KIT_CLUBS.length} of {clubNames.length} playable clubs sourced · European 2026/27 / MLS 2026</p></div>
                <div className="relative sm:w-64"><label htmlFor="kit-club" className="sr-only">Kit club</label><select id="kit-club" value={teamName} onChange={event => setTeamName(event.target.value)} className="fm-field appearance-none w-full pr-9">{clubNames.map(name => <option key={name} value={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} aria-hidden="true" /></div>
            </div>
            <div className="flex items-center gap-3 mb-5"><ClubCrest teamName={teamName} className="h-9 w-9" /><div><h3 className="text-xl font-semibold">{teamName}</h3><p className="text-xs text-gray-500">Actual shirt references · choose a kit-derived UI palette</p></div></div>
            {kits.length ? <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-4">{kits.map(kit => {
                const selected = appliedTheme === `${teamName}|${kit.id}`;
                return <article key={`${teamName}|${kit.id}`} className="fm-kit-card min-w-0 overflow-hidden" aria-current={selected ? 'true' : undefined}>
                    <KitPhoto kit={kit} teamName={teamName} />
                    <div className="p-4"><p className="text-sm font-semibold">{kit.label}</p>{(kit.design || kit.brand) && <p className="mt-1 text-xs text-gray-500">{[kit.design, kit.brand].filter(Boolean).join(' · ')}</p>}
                        <button type="button" onClick={() => selectKit(kit)} disabled={!onThemeSelect} aria-pressed={selected} className="fm-button-secondary mt-4 w-full">{selected && <Check size={14} aria-hidden="true" />}{onThemeSelect ? selected ? 'Theme applied' : 'Apply UI Theme' : 'Reference Only'}<span className="flex gap-1" aria-hidden="true"><span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: kit.bg }} /><span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: kit.accent }} /></span></button>
                    </div>
                    <a href={kit.sourceUrl} target="_blank" rel="noopener noreferrer" className="fm-kit-card-footer flex items-center justify-between gap-2">Source: {kit.sourceName}<ExternalLink size={12} aria-hidden="true" /></a>
                </article>;
            })}</div> : <div className="fm-panel px-4 py-5"><p className="text-sm font-semibold">No sourced current-season kit record</p><p className="mt-1 text-xs text-gray-500">This club's kit is still missing from the imported album. No old kit or guessed design is being passed off as a new kit.</p></div>}
            <p className="text-xs text-gray-500 mt-4">Shirt images retain their archive references. UI palette swatches are an approximation, not manufacturer colour specifications. Only sourced variants are shown; a missing third shirt is not invented.</p>
        </section>
    );
}
