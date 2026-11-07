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
    const iconClass = 'w-5 h-5 text-[#18392F]';
    switch (type) {
        case 'call-up': return <UserGroupIcon className={iconClass} />;
        case 'tournament-result': return <GlobeAltIcon className={iconClass} />;
        case 'player-return': return <UserIcon className={iconClass} />;
        case 'chemistry-rift': return <BrokenLinkIcon className={iconClass} />;
        case 'serious-rift': return <BrokenLinkIcon className="w-5 h-5 text-[#8C3931]" />;
        case 'teammate-bond': return <UserGroupIcon className={iconClass} />;
        case 'contract-renewal': return <DocumentCheckIcon className={iconClass} />;
        case 'player-departure': return <ArrowLeftStartOnRectangleIcon className={iconClass} />;
        default: return <NewspaperIcon className={iconClass} />;
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
        <section className="fm-screen max-w-6xl mx-auto px-4 py-8">
            <header className="mb-8 border-b border-[#172B24]/25 pb-6">
                <p className="fm-eyebrow">Decision Inbox</p>
                <h2 className="fm-screen-title">News & International Returns</h2>
                <p className="mt-3 leading-relaxed">Results, returning players and the relationships you have to manage.</p>
            </header>
            <div className="fm-panel divide-y divide-[#172B24]/20">
                {!news.length && <p className="p-6 leading-relaxed">No news yet. Advance the season to see results and international returns.</p>}
                {news.map(item => (
                    <article key={item.id} className="grid gap-4 p-5 sm:p-7 md:grid-cols-[8rem_minmax(0,1fr)]">
                        <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 md:border-r md:border-[#172B24]/15 md:pr-5">
                            <span aria-hidden="true">{getIconForType(item.type)}</span>
                            <p className="text-sm font-semibold tabular-nums">Week {item.week}</p>
                            <p className="text-sm break-words">{item.type.replace(/-/g, ' ')}</p>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl sm:text-3xl leading-tight font-semibold">{item.title}</h3>
                            <p className="mt-3 leading-relaxed whitespace-pre-line">{item.body}</p>
                            {item.riftDecision && onRiftDecision && (
                                <section className="mt-5 border-t border-[#172B24]/20 pt-5 space-y-4" aria-label="Relationship decision">
                                    {item.riftDecision.resultEffect && <p className="border-l-2 border-[#A47837] pl-4 text-sm leading-relaxed" role="status">{item.riftDecision.resultEffect}</p>}
                                    <p className="text-sm leading-relaxed">Separation changes selection, not the grievance. Selecting both keeps the chemistry risk. Severe cases may resist repair and produce transfer requests.</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'bench-a')} className="fm-button-secondary">Separate {item.riftDecision.riftPlayerA}</button>
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'bench-b')} className="fm-button-secondary">Separate {item.riftDecision.riftPlayerB}</button>
                                        <button disabled={busyId !== null} onClick={() => decide(item, 'risk-it')} className="fm-button-secondary">Risk selecting both</button>
                                    </div>
                                    {item.riftDecision.relationshipId ? (
                                        <form onSubmit={event => { event.preventDefault(); void decide(item, 'mediate'); }} className="border-t border-[#172B24]/15 pt-4 space-y-3">
                                            <label className="block font-semibold" htmlFor={`mediation-${item.id}`}>Your mediation response</label>
                                            <textarea id={`mediation-${item.id}`} value={responses[item.id] || ''} onChange={event => setResponses(prev => ({ ...prev, [item.id]: event.target.value }))} maxLength={1200} rows={3} className="fm-field w-full" disabled={busyId !== null} />
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                <button type="submit" disabled={busyId !== null || !responses[item.id]?.trim()} className="fm-button shrink-0">{busyId === item.id ? 'Evaluating…' : 'Attempt AI mediation'}</button>
                                                <p className="text-sm leading-relaxed">One evaluated session per pair per week. AI quotes your actual response; game rules bound the outcome.</p>
                                            </div>
                                        </form>
                                    ) : <p className="text-sm border-l-2 border-[#A47837] pl-4 leading-relaxed">Legacy rift: the original match evidence was not saved. Existing effects remain; no invented cause is supplied.</p>}
                                    {failures[item.id] && <p className="text-sm text-[#8C3931] leading-relaxed" role="alert">{failures[item.id]}</p>}
                                </section>
                            )}
                            {item.type === 'job-offer' && item.jobOfferDecision && onJobOfferDecision && (
                                <section className="mt-5 border-t border-[#172B24]/20 pt-4" aria-label="Contract decision">
                                    {item.jobOfferDecision.choice ? <p className="text-sm font-semibold">{item.jobOfferDecision.choice === 'accept' ? 'Contract accepted' : 'Contract declined'}</p> : (
                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'accept')} className="fm-button">Accept contract</button>
                                            <button onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'decline')} className="fm-button-secondary">Decline</button>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </article>
                ))}
            </div>
            <footer className="mt-6"><button onClick={onBack} disabled={busyId !== null} className="fm-button-secondary">&larr; Back to main screen</button></footer>
        </section>
    );
};
export default NewsScreen;
