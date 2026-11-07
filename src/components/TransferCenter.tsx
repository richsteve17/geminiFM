import { formatRosterAge } from '../engine/playerDataPresentation';
import React, { useState } from 'react';
import { CheckCircle2, Megaphone, XCircle } from 'lucide-react';
import type { Player, TransferBid } from '../types';
import { negotiateTransferBid } from '../services/geminiService';
import NationalityBadge from './NationalityBadge';

interface TransferCenterProps {
    bids: TransferBid[];
    onAcceptBid: (bidId: string) => void;
    onRejectBid: (bidId: string) => void;
    onDelegateBid: (bidId: string, summary: string) => void;
    onUpdateBid: (updatedBid: TransferBid) => void;
    onBack: () => void;
    squadPlayers: Player[];
}

const TransferCenter: React.FC<TransferCenterProps> = ({ bids, onAcceptBid, onRejectBid, onDelegateBid, onUpdateBid, onBack, squadPlayers }) => {
    const [activeBidId, setActiveBidId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isNegotiatingLoading, setIsNegotiatingLoading] = useState(false);
    const [delegationSummary, setDelegationSummary] = useState<string | null>(null);
    const activeBid = bids.find(b => b.id === activeBidId);

    const handleReject = (bidId: string) => {
        onRejectBid(bidId);
        if (activeBidId === bidId) setActiveBidId(null);
    };

    const handleDelegate = (bid: TransferBid) => {
        const player = bid.player;
        const position = player.position;
        const samePosCount = squadPlayers.filter(p => p.position === position && p.status.type !== 'SentOff').length;
        let summary = '';
        let shouldSell = false;
        if (position === 'GK' && samePosCount <= 1) {
            summary = `Declined offer from ${bid.buyingClub}: We only have one Goalkeeper in the squad. It would be tactical suicide to sell ${player.name} now!`;
        } else if (['CB', 'CM', 'ST'].includes(position) && samePosCount <= 2) {
            summary = `Declined offer from ${bid.buyingClub}: We are severely short on depth at ${position} (only ${samePosCount} players). We cannot afford to lose ${player.name}.`;
        } else {
            const isGoodFee = bid.offeredFee >= bid.marketValue * 0.95;
            if (isGoodFee) {
                shouldSell = true;
                summary = `Accepted offer from ${bid.buyingClub}: €${bid.offeredFee.toLocaleString()} is a strong valuation (${Math.round((bid.offeredFee / bid.marketValue) * 100)}% of market value) and we have sufficient depth to cover.`;
            } else {
                summary = `Declined offer from ${bid.buyingClub}: The offered fee of €${bid.offeredFee.toLocaleString()} is below market expectations for a player of ${player.name}'s calibre.`;
            }
        }
        if (shouldSell) {
            onAcceptBid(bid.id);
            if (activeBidId === bid.id) setActiveBidId(null);
        } else {
            onRejectBid(bid.id);
            if (activeBidId === bid.id) setActiveBidId(null);
        }
        setDelegationSummary(summary);
    };

    const handleSendMsg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !activeBid) return;
        const managerMsg = messageText.trim();
        setMessageText('');
        setIsNegotiatingLoading(true);
        const currentHistory = [...(activeBid.history || [])];
        const nextHistory = [...currentHistory, { sender: 'manager' as const, message: managerMsg }];
        onUpdateBid({ ...activeBid, history: nextHistory, status: 'negotiating' });
        try {
            const result = await negotiateTransferBid(activeBid.player, activeBid.buyingClub, activeBid.offeredFee, managerMsg, currentHistory);
            let updatedStatus = activeBid.status;
            let updatedFee = activeBid.offeredFee;
            if (result.decision === 'accepted') {
                updatedStatus = 'accepted';
            } else if (result.decision === 'rejected') {
                updatedStatus = 'rejected';
            } else if (result.decision === 'counter' && result.counterFee) {
                updatedStatus = 'negotiating';
                updatedFee = result.counterFee;
            }
            onUpdateBid({ ...activeBid, offeredFee: updatedFee, history: [...nextHistory, { sender: 'director' as const, message: result.response }], status: updatedStatus });
        } catch (err) {
            console.error('Negotiation failed', err);
            const counterFee = Math.round(activeBid.offeredFee * 1.08);
            onUpdateBid({ ...activeBid, offeredFee: counterFee, history: [...nextHistory, { sender: 'director' as const, message: 'We can slightly improve our bid to match valuation. Take it or leave it.' }], status: 'negotiating' });
        } finally {
            setIsNegotiatingLoading(false);
        }
    };

    return (
        <section className="fm-screen min-w-0 py-2">
            <header className="mb-6 border-b-2 border-[#18392F] pb-5">
                <h2 className="fm-screen-title">Transfer Center</h2>
                <p className="mt-2 text-[#637169]">Manage incoming bids and strategic departures.</p>
            </header>
            {delegationSummary && (
                <div role="status" className="fm-panel mb-6 flex items-start justify-between gap-4 border-l-2 border-l-[#A47837] p-4 text-sm">
                    <span className="flex items-start gap-3"><Megaphone className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" /><span className="leading-relaxed"><strong>Assistant Manager Report:</strong> {delegationSummary}</span></span>
                    <button type="button" onClick={() => setDelegationSummary(null)} className="fm-button-secondary flex min-h-11 min-w-11 shrink-0 items-center justify-center text-xl" aria-label="Dismiss Assistant Manager Report">&times;</button>
                </div>
            )}
            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <section className="min-w-0" aria-label="Incoming bids">
                    <div className="mb-4 flex items-baseline justify-between gap-3"><h3 className="text-2xl font-bold">Active Incoming Bids</h3><span className="text-sm text-[#637169] tabular-nums">{bids.length}</span></div>
                    <div className="fm-panel divide-y divide-[#172B24]/20">
                        {bids.length === 0 ? <p className="p-8 text-sm leading-relaxed text-[#637169]">No active incoming bids at the moment. Keep progressing the season.</p> : bids.map(bid => {
                            const isPending = bid.status === 'pending' || bid.status === 'negotiating';
                            const isAccepted = bid.status === 'accepted';
                            const isRejected = bid.status === 'rejected';
                            return (
                                <article key={bid.id} className={`border-l-2 p-5 ${activeBidId === bid.id ? 'border-l-[#A47837] bg-[#18392F]/5' : 'border-l-transparent'}`}>
                                    <div className="flex items-start gap-3">
                                        <NationalityBadge nationality={bid.player.nationality} className="mt-1 shrink-0" />
                                        <div className="min-w-0"><h4 className="break-words text-2xl font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>{bid.player.name}</h4><p className="mt-1 text-sm text-[#637169]">{bid.player.position} <span aria-hidden="true">/</span> Age/Rating: {formatRosterAge(bid.player)} y/o ({bid.player.rating})</p></div>
                                    </div>
                                    {bid.player.transferRequested && <p className="mt-3 text-sm font-medium text-[#8B554A]">Transfer Requested</p>}
                                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                        <div className="col-span-2"><dt className="text-xs text-[#637169]">Buying Club</dt><dd className="mt-1 font-semibold">{bid.buyingClub}</dd></div>
                                        <div><dt className="text-xs text-[#637169]">Market Value</dt><dd className="mt-1 font-semibold tabular-nums">€{bid.marketValue.toLocaleString()}</dd></div>
                                        <div><dt className="text-xs text-[#637169]">Offered Fee</dt><dd className="mt-1 font-bold tabular-nums">€{bid.offeredFee.toLocaleString()}</dd></div>
                                    </dl>
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#172B24]/15 pt-4">
                                        {isPending && <>
                                            <button type="button" onClick={() => setActiveBidId(bid.id)} aria-pressed={activeBidId === bid.id} aria-controls="bid-correspondence" className="fm-button min-h-11 px-3 text-sm">Negotiate</button>
                                            <button type="button" onClick={() => handleDelegate(bid)} className="fm-button-secondary min-h-11 px-3 text-sm">Delegate</button>
                                            <button type="button" onClick={() => onAcceptBid(bid.id)} className="fm-button-secondary min-h-11 px-3 text-sm">Accept</button>
                                            <button type="button" onClick={() => handleReject(bid.id)} className="fm-button-secondary min-h-11 px-3 text-sm">Reject</button>
                                        </>}
                                        {isAccepted && <><span className="text-sm font-semibold">Deal Agreed!</span><button type="button" onClick={() => onAcceptBid(bid.id)} className="fm-button min-h-11 px-3 text-sm">Finalize Sale</button></>}
                                        {isRejected && <span className="text-sm font-semibold text-[#8B554A]">Negotiations Terminated</span>}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
                <section id="bid-correspondence" className="fm-panel flex min-h-[480px] min-w-0 flex-col p-5 sm:p-6 xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:min-h-[560px] xl:self-start" aria-label="AI transfer negotiations">
                    <h3 className="border-b-2 border-[#18392F] pb-4 text-2xl font-bold">AI Negotiator Terminal</h3>
                    {activeBid ? <>
                        <div className="border-b border-[#172B24]/20 py-4 text-sm">
                            <p className="leading-relaxed">Negotiating with <strong>{activeBid.buyingClub}</strong> for <strong>{activeBid.player.name}</strong>.</p>
                            <dl className="mt-3 grid grid-cols-2 gap-4 tabular-nums"><div><dt className="text-xs text-[#637169]">Current Valuation</dt><dd className="mt-1 font-semibold">€{activeBid.marketValue.toLocaleString()}</dd></div><div><dt className="text-xs text-[#637169]">Bid</dt><dd className="mt-1 font-bold">€{activeBid.offeredFee.toLocaleString()}</dd></div></dl>
                        </div>
                        <div role="log" aria-label="Negotiation correspondence" aria-live="polite" aria-busy={isNegotiatingLoading} className="my-4 max-h-[420px] min-h-40 flex-1 overflow-y-auto text-sm xl:max-h-none">
                            {activeBid.history.length === 0 ? <p className="py-8 leading-relaxed text-[#637169]">No messages. Type a proposal below to negotiate the fee.</p> : activeBid.history.map((chat, idx) => (
                                <article key={idx} className={`border-b border-[#172B24]/15 py-4 ${chat.sender === 'manager' ? 'border-l-2 border-l-[#A47837] pl-4' : ''}`}>
                                    <p className="fm-eyebrow mb-2 text-[#637169]">{chat.sender === 'manager' ? 'You' : `${activeBid.buyingClub} Rep`}</p>
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{chat.message}</p>
                                </article>
                            ))}
                            {isNegotiatingLoading && <p role="status" className="py-4 text-sm text-[#637169]">Director is typing a counter response...</p>}
                        </div>
                        {activeBid.status === 'negotiating' || activeBid.status === 'pending' ? (
                            <form onSubmit={handleSendMsg} className="mt-auto border-t border-[#172B24]/20 pt-4">
                                <label htmlFor="negotiation-proposal" className="fm-eyebrow mb-2 block">Type your demand or fee</label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input id="negotiation-proposal" type="text" placeholder="Type your demand or fee..." value={messageText} onChange={e => setMessageText(e.target.value)} disabled={isNegotiatingLoading} className="fm-field min-h-11 min-w-0 flex-1 px-3 text-sm" />
                                    <button type="submit" disabled={isNegotiatingLoading || !messageText.trim()} className="fm-button min-h-11 px-5 text-sm">Send</button>
                                </div>
                            </form>
                        ) : activeBid.status === 'accepted' ? <div role="status" className="mt-auto flex items-start gap-2 border-t border-[#172B24]/20 pt-4 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />Offer accepted! Finalize the sale above.</div> : <div role="status" className="mt-auto flex items-start gap-2 border-t border-[#172B24]/20 pt-4 text-sm font-semibold text-[#8B554A]"><XCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />Deal collapsed. Negotiations are dead.</div>}
                    </> : <p className="my-auto py-10 text-sm leading-relaxed text-[#637169]">Select 'Negotiate' on any bid to start direct chat negotiations.</p>}
                </section>
            </div>
            <footer className="mt-6 border-t border-[#172B24]/15 pt-4"><button type="button" onClick={onBack} className="fm-button-secondary min-h-11 px-4 text-sm">&larr; Back to Main Screen</button></footer>
        </section>
    );
};

export default TransferCenter;
