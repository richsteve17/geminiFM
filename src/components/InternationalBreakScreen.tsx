import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Globe2, Pause, Play, RotateCcw } from 'lucide-react';
import type { Fixture, Team } from '../types';
import type { RelationshipIncident } from '../engine/internationalRelationships';
const PitchView = React.lazy(() => import('./PitchView'));
interface InternationalBreakScreenProps {
    tournament: { type: string; teams: Record<string, Team>; fixtures: Fixture[] } | null;
    incidents: RelationshipIncident[];
    clubName: string;
    onOpenInbox: () => void;
}
const InternationalBreakScreen: React.FC<InternationalBreakScreenProps> = ({ tournament, incidents, clubName, onOpenInbox }) => {
    const fixtures = useMemo(() => tournament?.fixtures.filter(f => f.played) || [], [tournament]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = fixtures.find(f => f.id === selectedId) || fixtures[0];
    const [minute, setMinute] = useState(0);
    const [playing, setPlaying] = useState(false);
    const events = selected?.events || [];
    const end = Math.max(90, ...events.map(e => e.minute));
    useEffect(() => { setMinute(0); setPlaying(false); }, [selected?.id]);
    useEffect(() => {
        if (!playing) return;
        if (minute >= end) { setPlaying(false); return; }
        const timer = setTimeout(() => setMinute(m => m + 1), events.some(e => e.minute === minute + 1 && e.type === 'goal') ? 1800 : 120);
        return () => clearTimeout(timer);
    }, [playing, minute, end, events]);
    const revealed = events.filter(e => e.minute <= minute);
    const goalScore = (name: string) => revealed.filter(e => e.type === 'goal' && e.teamName === name).length;
    const own = incidents.filter(i => i.clubName === clubName);
    const last = revealed.at(-1) || null;
    return (
        <section className="fm-screen space-y-7">
            <header className="border-b border-[#172B24]/25 pb-6">
                <p className="fm-eyebrow flex items-center gap-2"><Globe2 className="w-5 h-5 shrink-0" aria-hidden="true" />International Duty</p>
                <h2 className="fm-screen-title">International Duty & Returns</h2>
                <div className="mt-3 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                    <p className="max-w-2xl text-sm leading-relaxed">Watch resolved international matches and inspect what comes back to your club. These are game results, not live football.</p>
                    <button onClick={onOpenInbox} className="fm-button shrink-0">Manage return incidents ({own.filter(i => !['resolved', 'expired'].includes(i.state) && i.kind !== 'bond').length})</button>
                </div>
            </header>
            {!tournament ? (
                <div className="fm-panel p-5 sm:p-7"><p className="leading-relaxed">The next international window is at weeks 10, 20 or 30. Friendlies run outside tournament years; Euros and World Cups retain their group and knockout results.</p></div>
            ) : (
                <section className="fm-panel p-4 sm:p-6 space-y-5">
                    <div>
                        <label className="block font-semibold mb-3" htmlFor="international-fixture">{tournament.type} — recorded match</label>
                        <select id="international-fixture" value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)} className="fm-field w-full">
                            {fixtures.map(f => <option key={f.id} value={f.id}>{f.stage || 'Friendly'}: {f.homeTeam} {f.score} {f.awayTeam}{f.penaltyWinner ? ` · ${f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam} won penalties` : ''}</option>)}
                        </select>
                    </div>
                    {selected && (
                        <>
                            {events.length ? (
                                <>
                                    <div className="fm-broadcast fm-inverse overflow-hidden bg-[#101E1B]">
                                        <Suspense fallback={<p className="p-5 text-[#F4F1E9]" role="status">Loading broadcast…</p>}>
                                            <PitchView homeTeamName={selected.homeTeam} awayTeamName={selected.awayTeam} homeTeam={tournament.teams[selected.homeTeam]} awayTeam={tournament.teams[selected.awayTeam]} currentMinute={minute} homeScore={goalScore(selected.homeTeam)} awayScore={goalScore(selected.awayTeam)} momentum={last?.momentumAfter || 0} lastEvent={last} paused={!playing} />
                                        </Suspense>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 border-b border-[#172B24]/20 pb-5">
                                        <button onClick={() => setPlaying(p => !p)} className="fm-button flex items-center gap-2">{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{playing ? 'Pause replay' : 'Play recorded highlights'}</button>
                                        <button onClick={() => { setMinute(0); setPlaying(false); }} className="fm-button-secondary min-w-[44px] flex items-center justify-center" aria-label="Restart international replay"><RotateCcw size={16} aria-hidden="true" /></button>
                                        <span className="font-semibold tabular-nums ml-auto">{minute}′ / {end}′</span>
                                    </div>
                                    <ol className="max-h-56 overflow-auto divide-y divide-[#172B24]/15 text-sm">{revealed.slice(-8).map(e => <li key={e.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 py-3"><span className="font-semibold tabular-nums">{e.minute}′</span><span className="leading-relaxed">{e.description}</span></li>)}</ol>
                                </>
                            ) : <p className="border-l-2 border-[#A47837] pl-4 text-sm leading-relaxed">This older saved result has no event ledger. The score is preserved; player incidents and replay actions are not invented.</p>}
                            <div className="grid md:grid-cols-2 gap-6 border-t border-[#172B24]/20 pt-5">
                                {(['home', 'away'] as const).map(side => (
                                    <section key={side}>
                                        <h3 className="text-xl font-semibold mb-3">{side === 'home' ? selected.homeTeam : selected.awayTeam} — actual participants</h3>
                                        <p className="text-sm leading-relaxed">{selected.participantNames?.[side]?.join(', ') || 'Not recorded in this older save.'}</p>
                                    </section>
                                ))}
                            </div>
                            {!!selected.penalties?.length && (
                                <section className="border-t border-[#172B24]/20 pt-5">
                                    <h3 className="text-2xl font-semibold mb-3">Recorded penalty sheet</h3>
                                    <ol className="divide-y divide-[#172B24]/15 text-sm">{selected.penalties.map(p => <li key={p.id} className="py-3 leading-relaxed">{p.teamName} · {p.taker} vs {p.goalkeeper || 'keeper not recorded'} · <strong>{p.outcome}</strong>{p.shootout ? ' · shootout' : ''}{p.decisive ? ' · decisive kick' : ''}</li>)}</ol>
                                </section>
                            )}
                        </>
                    )}
                </section>
            )}
            {!!own.length && (
                <section className="fm-panel p-5 sm:p-6">
                    <h3 className="text-2xl font-semibold border-b border-[#172B24]/20 pb-4">{clubName}: relationship memory</h3>
                    <div className="divide-y divide-[#172B24]/15">
                        {own.slice(-10).reverse().map(i => (
                            <div key={i.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] py-4 text-sm">
                                <p className="font-semibold">{i.playerA.name} / {i.playerB.name}</p>
                                <p className="leading-relaxed">{i.kind} · <span className="tabular-nums">{i.strength}/100</span> · {i.state} · {i.trigger.stage}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </section>
    );
};
export default InternationalBreakScreen;
