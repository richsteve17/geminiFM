import React, { useState } from 'react';
import type { Player, TransferBid } from '../types';
import { negotiateTransferBid } from '../services/geminiService';

interface TransferCenterProps {
    bids: TransferBid[];
    onAcceptBid: (bidId: string) => void;
    onRejectBid: (bidId: string) => void;
    onDelegateBid: (bidId: string, summary: string) => void;
    onUpdateBid: (updatedBid: TransferBid) => void;
    onBack: () => void;
    squadPlayers: Player[];
}

const TransferCenter: React.FC<TransferCenterProps> = ({
    bids,
    onAcceptBid,
    onRejectBid,
    onDelegateBid,
    onUpdateBid,
    onBack,
    squadPlayers
}) => {
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

        onUpdateBid({
            ...activeBid,
            history: nextHistory,
            status: 'negotiating'
        });

        try {
            const result = await negotiateTransferBid(
                activeBid.player,
                activeBid.buyingClub,
                activeBid.offeredFee,
                managerMsg,
                currentHistory
            );

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

            onUpdateBid({
                ...activeBid,
                offeredFee: updatedFee,
                history: [...nextHistory, { sender: 'director' as const, message: result.response }],
                status: updatedStatus
            });
        } catch (err) {
            console.error("Negotiation failed", err);
            const counterFee = Math.round(activeBid.offeredFee * 1.08);
            onUpdateBid({
                ...activeBid,
                offeredFee: counterFee,
                history: [...nextHistory, { sender: 'director' as const, message: "We can slightly improve our bid to match valuation. Take it or leave it." }],
                status: 'negotiating'
            });
        } finally {
            setIsNegotiatingLoading(false);
        }
    };

    return (
        <div className="mt-8 max-w-6xl mx-auto p-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Transfer Center</h2>
                <p className="text-lg text-gray-400">Manage incoming bids and strategic departures.</p>
            </div>

            {delegationSummary && (
                <div className="mb-6 p-4 bg-blue-950/60 border border-blue-800 rounded-lg text-blue-200 text-sm flex justify-between items-center animate-fade-in">
                    <span>📢 <strong>Assistant Manager Report:</strong> {delegationSummary}</span>
                    <button onClick={() => setDelegationSummary(null)} className="ml-4 font-bold hover:text-white">&times;</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Active Incoming Bids</h3>
                    {bids.length === 0 ? (
                        <div className="text-center p-8 bg-gray-800/40 rounded-lg border border-gray-700">
                            <p className="text-gray-400">No active incoming bids at the moment. Keep progressing the season.</p>
                        </div>
                    ) : (
                        bids.map(bid => {
                            const isPending = bid.status === 'pending' || bid.status === 'negotiating';
                            const isAccepted = bid.status === 'accepted';
                            const isRejected = bid.status === 'rejected';

                            return (
                                <div key={bid.id} className={`bg-gray-850/90 border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                                    activeBidId === bid.id ? 'border-green-500 bg-gray-800/60' : 'border-gray-700'
                                }`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{bid.player.nationality}</span>
                                            <h4 className="font-bold text-lg text-white">{bid.player.name}</h4>
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-semibold">{bid.player.position}</span>
                                            {bid.player.transferRequested && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-red-900/60 text-red-300 font-semibold border border-red-800">Transfer Requested</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-400 mt-1 grid grid-cols-2 gap-x-4 gap-y-1 max-w-sm">
                                            <span>Age/Rating: <strong className="text-gray-200">{bid.player.age} y/o ({bid.player.rating})</strong></span>
                                            <span>Market Value: <strong className="text-gray-200">€{bid.marketValue.toLocaleString()}</strong></span>
                                            <span>Buying Club: <strong className="text-gray-200">{bid.buyingClub}</strong></span>
                                            <span>Offered Fee: <strong className="text-green-400 font-bold">€{bid.offeredFee.toLocaleString()}</strong></span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                                        {isPending && (
                                            <>
                                                <button
                                                    onClick={() => setActiveBidId(bid.id)}
                                                    className="py-1.5 px-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded transition-colors"
                                                >
                                                    Negotiate
                                                </button>
                                                <button
                                                    onClick={() => handleDelegate(bid)}
                                                    className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded transition-colors"
                                                >
                                                    Delegate
                                                </button>
                                                <button
                                                    onClick={() => onAcceptBid(bid.id)}
                                                    className="py-1.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded transition-colors"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleReject(bid.id)}
                                                    className="py-1.5 px-3.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {isAccepted && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400 font-bold text-sm">Deal Agreed!</span>
                                                <button
                                                    onClick={() => onAcceptBid(bid.id)}
                                                    className="py-1.5 px-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded transition-colors"
                                                >
                                                    Finalize Sale
                                                </button>
                                            </div>
                                        )}
                                        {isRejected && (
                                            <span className="text-red-400 font-bold text-sm">Negotiations Terminated</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex flex-col h-[500px]">
                    <h3 className="text-xl font-bold text-white mb-3">AI Negotiator Terminal</h3>
                    
                    {activeBid ? (
                        <>
                            <div className="bg-gray-950 p-2.5 rounded mb-3 text-xs border border-gray-800 text-gray-400">
                                <span>Negotiating with <strong>{activeBid.buyingClub}</strong> for <strong>{activeBid.player.name}</strong>.</span>
                                <div className="mt-1 flex justify-between">
                                    <span>Current Valuation: €{activeBid.marketValue.toLocaleString()}</span>
                                    <span>Bid: <strong className="text-green-400">€{activeBid.offeredFee.toLocaleString()}</strong></span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 text-sm scrollbar-thin">
                                {activeBid.history.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8 italic">
                                        No messages. Type a proposal below to negotiate the fee.
                                    </div>
                                ) : (
                                    activeBid.history.map((chat, idx) => (
                                        <div key={idx} className={`p-2.5 rounded-lg max-w-[85%] ${
                                            chat.sender === 'manager' 
                                                ? 'bg-blue-900/60 text-blue-100 ml-auto border border-blue-800' 
                                                : 'bg-gray-800/80 text-gray-200 mr-auto border border-gray-700'
                                        }`}>
                                            <p className="text-[10px] font-bold opacity-60 uppercase mb-0.5">
                                                {chat.sender === 'manager' ? 'You' : `${activeBid.buyingClub} Rep`}
                                            </p>
                                            <p className="leading-relaxed">{chat.message}</p>
                                        </div>
                                    ))
                                )}

                                {isNegotiatingLoading && (
                                    <div className="p-2.5 bg-gray-850 text-gray-400 mr-auto rounded-lg max-w-[85%] border border-gray-800 animate-pulse text-xs italic">
                                        Director is typing a counter response...
                                    </div>
                                )}
                            </div>

                            {activeBid.status === 'negotiating' || activeBid.status === 'pending' ? (
                                <form onSubmit={handleSendMsg} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type your demand or fee..."
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        disabled={isNegotiatingLoading}
                                        className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isNegotiatingLoading || !messageText.trim()}
                                        className="px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 text-white font-bold rounded text-sm transition-colors"
                                    >
                                        Send
                                    </button>
                                </form>
                            ) : activeBid.status === 'accepted' ? (
                                <div className="text-center py-2 bg-emerald-950/40 border border-emerald-900 text-emerald-300 rounded font-semibold text-sm">
                                    ✓ Offer accepted! Finalize the sale above.
                                </div>
                            ) : (
                                <div className="text-center py-2 bg-red-950/40 border border-red-900 text-red-300 rounded font-semibold text-sm">
                                    ❌ Deal collapsed. Negotiations are dead.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-gray-500 p-4 text-sm italic">
                            Select 'Negotiate' on any bid to start direct chat negotiations.
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center mt-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Screen
                 </button>
            </div>
        </div>
    );
};

export default TransferCenter;
