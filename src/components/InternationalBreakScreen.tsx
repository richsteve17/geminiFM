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
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 md:p-6 space-y-5">
            <div className="flex gap-3 items-start">
                <Globe2 className="shrink-0 text-emerald-300" aria-hidden="true" />
                <div><h2 className="font-bold text-xl text-white">International Duty & Returns</h2><p className="text-sm text-slate-400">Watch resolved international matches and inspect what comes back to your club. These are game results, not live football.</p></div>
            </div>
            <button onClick={onOpenInbox} className="rounded bg-emerald-800 text-emerald-100 px-4 py-2 text-sm font-bold">Manage return incidents ({own.filter(i => !['resolved', 'expired'].includes(i.state) && i.kind !== 'bond').length})</button>
            {!tournament ? <p className="text-slate-400">The next international window is at weeks 10, 20 or 30. Friendlies run outside tournament years; Euros and World Cups retain their group and knockout results.</p> : (
                <>
                    <label className="block text-sm text-slate-300" htmlFor="international-fixture">{tournament.type} — recorded match</label>
                    <select id="international-fixture" value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded p-3 text-white text-sm">
                        {fixtures.map(f => <option key={f.id} value={f.id}>{f.stage || 'Friendly'}: {f.homeTeam} {f.score} {f.awayTeam}{f.penaltyWinner ? ` · ${f.penaltyWinner === 'home' ? f.homeTeam : f.awayTeam} won penalties` : ''}</option>)}
                    </select>
                    {selected && (
                        <>
                            {events.length ? (
                                <>
                                    <Suspense fallback={<p className="text-slate-400">Loading broadcast…</p>}><PitchView homeTeamName={selected.homeTeam} awayTeamName={selected.awayTeam} homeTeam={tournament.teams[selected.homeTeam]} awayTeam={tournament.teams[selected.awayTeam]} currentMinute={minute} homeScore={goalScore(selected.homeTeam)} awayScore={goalScore(selected.awayTeam)} momentum={last?.momentumAfter || 0} lastEvent={last} paused={!playing} /></Suspense>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button onClick={() => setPlaying(p => !p)} className="rounded bg-slate-700 px-3 py-2 flex gap-2 text-white text-sm">{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{playing ? 'Pause replay' : 'Play recorded highlights'}</button>
                                        <button onClick={() => { setMinute(0); setPlaying(false); }} className="rounded bg-slate-700 p-2 text-white" aria-label="Restart international replay"><RotateCcw size={16} aria-hidden="true" /></button>
                                        <span className="font-mono text-slate-300">{minute}′ / {end}′</span>
                                    </div>
                                    <ol className="max-h-48 overflow-auto space-y-2 text-sm text-slate-300">{revealed.slice(-8).map(e => <li key={e.id}><span className="font-mono text-emerald-300">{e.minute}′</span> {e.description}</li>)}</ol>
                                </>
                            ) : <p className="text-amber-300 text-sm">This older saved result has no event ledger. The score is preserved; player incidents and replay actions are not invented.</p>}
                            <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-300">
                                {(['home', 'away'] as const).map(side => <div key={side} className="rounded border border-slate-700 p-3"><h3 className="font-bold text-white mb-2">{side === 'home' ? selected.homeTeam : selected.awayTeam} — actual participants</h3><p>{selected.participantNames?.[side]?.join(', ') || 'Not recorded in this older save.'}</p></div>)}
                            </div>
                            {!!selected.penalties?.length && <div className="rounded border border-slate-700 p-3 text-sm text-slate-300"><h3 className="font-bold text-white mb-2">Recorded penalty sheet</h3><ol className="space-y-1">{selected.penalties.map(p => <li key={p.id}>{p.teamName} · {p.taker} vs {p.goalkeeper || 'keeper not recorded'} · {p.outcome}{p.shootout ? ' · shootout' : ''}{p.decisive ? ' · decisive kick' : ''}</li>)}</ol></div>}
                        </>
                    )}
                </>
            )}
            {!!own.length && <div className="border-t border-slate-700 pt-4 space-y-2"><h3 className="font-bold text-white">{clubName}: relationship memory</h3>{own.slice(-10).reverse().map(i => <p key={i.id} className="text-sm text-slate-300"><span className={i.kind === 'bond' ? 'text-emerald-300' : 'text-amber-300'}>{i.playerA.name} / {i.playerB.name}</span> · {i.kind} · {i.strength}/100 · {i.state} · {i.trigger.stage}</p>)}</div>}
        </section>
    );
};
export default InternationalBreakScreen;
