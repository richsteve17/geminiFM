import React, { useState } from 'react';
import type { NewsItem } from '../types';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { UserIcon } from './icons/UserIcon';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import { ArrowLeftStartOnRectangleIcon } from './icons/ArrowLeftStartOnRectangleIcon';

type RiftChoice = 'bench-a' | 'bench-b' | 'risk-it' | 'mediate';
interface NewsScreenProps {
    news: NewsItem[];
    onBack: () => void;
    onRiftDecision?: (newsId: number, playerA: string, playerB: string, choice: RiftChoice, managerAnswer?: string) => void | Promise<void>;
    onJobOfferDecision?: (newsId: number, teamName: string, choice: 'accept' | 'decline') => void;
}
const getIconForType = (type: string) => {
    switch (type) {
        case 'call-up': return <UserGroupIcon className="w-6 h-6 text-blue-400" />;
        case 'tournament-result': return <GlobeAltIcon className="w-6 h-6 text-yellow-400" />;
        case 'player-return': return <UserIcon className="w-6 h-6 text-green-400" />;
        case 'chemistry-rift': return <BrokenLinkIcon className="w-6 h-6 text-orange-400" />;
        case 'serious-rift': return <BrokenLinkIcon className="w-6 h-6 text-red-500" />;
        case 'teammate-bond': return <UserGroupIcon className="w-6 h-6 text-emerald-400" />;
        case 'contract-renewal': return <DocumentCheckIcon className="w-6 h-6 text-teal-400" />;
        case 'player-departure': return <ArrowLeftStartOnRectangleIcon className="w-6 h-6 text-red-400" />;
        default: return <NewspaperIcon className="w-6 h-6 text-gray-400" />;
    }
};
const getBorderForType = (type: string) => {
    switch (type) {
        case 'serious-rift': return 'border-red-700 bg-red-950/30';
        case 'chemistry-rift': return 'border-orange-800 bg-orange-950/20';
        case 'teammate-bond': return 'border-emerald-800 bg-emerald-950/20';
        case 'job-offer': return 'border-blue-800 bg-blue-950/25';
        default: return 'border-gray-700 bg-gray-800/50';
    }
};
const NewsScreen: React.FC<NewsScreenProps> = ({ news, onBack, onRiftDecision, onJobOfferDecision }) => {
    const [responses, setResponses] = useState<Record<number, string>>({});
    const [busyId, setBusyId] = useState<number | null>(null);
    const [failures, setFailures] = useState<Record<number, string>>({});
    const decide = async (item: NewsItem, choice: RiftChoice) => {
        if (!item.riftDecision || !onRiftDecision || busyId !== null) return;
        setBusyId(item.id); setFailures(prev => ({ ...prev, [item.id]: '' }));
        try {
            await onRiftDecision(item.id, item.riftDecision.riftPlayerA, item.riftDecision.riftPlayerB, choice, responses[item.id]);
        } catch (error) {
            setFailures(prev => ({ ...prev, [item.id]: error instanceof Error ? error.message : 'No relationship change applied. Retry the interaction.' }));
        } finally { setBusyId(null); }
    };
    return (
        <div className="mt-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">News & International Returns</h2>
                <p className="text-gray-400">Results, returning players and the relationships you have to manage.</p>
            </div>
            <div className="space-y-4">
                {!news.length && <p className="p-8 border border-gray-700 rounded-lg text-gray-400">No news yet. Advance the season to see results and international returns.</p>}
                {news.map(item => (
                    <article key={item.id} className={`rounded-lg shadow-lg border p-4 flex items-start gap-4 ${getBorderForType(item.type)}`}>
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center" aria-hidden="true">{getIconForType(item.type)}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-400">Week {item.week}</p>
                            <h3 className={`font-bold text-lg ${item.type === 'serious-rift' ? 'text-red-400' : item.type === 'teammate-bond' ? 'text-emerald-400' : 'text-green-400'}`}>{item.title}</h3>
                            <p className="text-gray-300 mt-1">{item.body}</p>
                            {item.riftDecision && onRiftDecision && (
                                <div className="mt-4 border-t border-gray-700 pt-3 space-y-3">
                                    {item.riftDecision.resultEffect && <p className="text-sm text-amber-200" role="status">{item.riftDecision.resultEffect}</p>}
                                    <p className="text-xs text-gray-400">Separation changes selection, not the grievance. Selecting both keeps the chemistry risk. Severe cases may resist repair and produce transfer requests.</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'bench-a')} className="text-xs font-bold border border-yellow-700 bg-yellow-900/50 text-yellow-200 px-3 py-2 rounded disabled:opacity-40">Separate {item.riftDecision.riftPlayerA}</button>
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'bench-b')} className="text-xs font-bold border border-yellow-700 bg-yellow-900/50 text-yellow-200 px-3 py-2 rounded disabled:opacity-40">Separate {item.riftDecision.riftPlayerB}</button>
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'risk-it')} className="text-xs font-bold border border-red-700 bg-red-900/50 text-red-200 px-3 py-2 rounded disabled:opacity-40">Risk selecting both</button>
                                    </div>
                                    {item.riftDecision.relationshipId ? (
                                        <form onSubmit={event => { event.preventDefault(); void decide(item, 'mediate'); }} className="space-y-2">
                                            <label className="text-sm font-bold text-gray-300" htmlFor={`mediation-${item.id}`}>Your mediation response</label>
                                            <textarea id={`mediation-${item.id}`} value={responses[item.id] || ''} onChange={event => setResponses(prev => ({ ...prev, [item.id]: event.target.value }))} maxLength={1200} rows={3} className="w-full rounded border border-gray-600 bg-slate-950 p-3 text-white text-sm" disabled={busyId !== null} />
                                            <button type="submit" disabled={busyId !== null || !responses[item.id]?.trim()} className="rounded px-4 py-2 bg-blue-700 text-white text-sm font-bold disabled:opacity-40">{busyId === item.id ? 'Evaluating…' : 'Attempt AI mediation'}</button>
                                            <p className="text-xs text-gray-500">One evaluated session per pair per week. AI quotes your actual response; game rules bound the outcome.</p>
                                        </form>
                                    ) : <p className="text-xs text-amber-300">Legacy rift: the original match evidence was not saved. Existing effects remain; no invented cause is supplied.</p>}
                                    {failures[item.id] && <p className="text-sm text-red-300" role="alert">{failures[item.id]}</p>}
                                </div>
                            )}
                            {item.type === 'job-offer' && item.jobOfferDecision && onJobOfferDecision && (
                                <div className="mt-3">
                                    {item.jobOfferDecision.choice ? <p className="text-xs text-gray-400">{item.jobOfferDecision.choice === 'accept' ? 'Contract accepted' : 'Contract declined'}</p> : (
                                        <div className="flex gap-2">
                                            <button onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'accept')} className="text-xs bg-green-900/60 text-green-200 border border-green-700 px-3 py-2 rounded">Accept contract</button>
                                            <button onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'decline')} className="text-xs bg-gray-700 text-gray-300 border border-gray-600 px-3 py-2 rounded">Decline</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </article>
                ))}
            </div>
            <div className="text-center mt-8"><button onClick={onBack} disabled={busyId !== null} className="text-gray-400 hover:text-white disabled:opacity-40">&larr; Back to main screen</button></div>
        </div>
    );
};
export default NewsScreen;
