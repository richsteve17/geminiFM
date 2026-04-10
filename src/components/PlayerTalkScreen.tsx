
import React, { useState, useEffect, useRef } from 'react';
import type { PlayerTalk, NegotiationResult } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';

interface PlayerTalkScreenProps {
    talk: PlayerTalk | null;
    isLoading: boolean;
    error: string | null;
    talkResult: NegotiationResult | null;
    onSendMessage: (text: string, offer?: { wage: number; length: number }) => void;
    onFinish: () => void;
}

const PERSONALITY_NOTE: Record<string, string> = {
    Ambitious:    'Cares about trophies & competition',
    Volatile:     'Confrontational — chooses words carefully',
    Leader:       'Focused on squad role & hierarchy',
    Professional: 'Numbers-only — no charm will work',
    Eccentric:    'Unpredictable — expect the unexpected',
};

const PlayerTalkScreen: React.FC<PlayerTalkScreenProps> = ({
    talk, isLoading, error, talkResult, onSendMessage, onFinish
}) => {
    const [input, setInput] = useState('');
    const [wageOffer, setWageOffer] = useState(0);
    const [contractLength, setContractLength] = useState(3);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initialise offer sliders when talk starts
    useEffect(() => {
        if (talk) {
            setWageOffer(talk.player.wage || 10000);
            setContractLength(3);
        }
    }, [talk?.player?.name]);

    // Sync sliders to agent's counter suggestion when one arrives
    useEffect(() => {
        if (talk?.counterSuggestion) {
            setWageOffer(talk.counterSuggestion.wage);
            setContractLength(talk.counterSuggestion.length);
        }
    }, [talk?.counterSuggestion?.wage]);

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [talk?.messages?.length, isLoading]);

    const fmt = (n: number) => `$${n.toLocaleString()}`;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input.trim());
        setInput('');
    };

    const handleMakeOffer = () => {
        if (isLoading) return;
        onSendMessage(input.trim() || '', { wage: wageOffer, length: contractLength });
        setInput('');
    };

    // ── LOADING (initial — no messages yet) ─────────────────────────────────
    if (isLoading && !talk) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <FootballIcon className="w-12 h-12 text-green-400 animate-spin" />
                <p className="text-xl font-semibold animate-pulse text-white">Setting up the meeting...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Negotiations Collapsed</h2>
                <p className="text-white">{error}</p>
                <button onClick={onFinish} className="mt-6 py-2 px-6 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">Leave Room</button>
            </div>
        );
    }

    if (!talk) return null;

    const { player } = talk;
    const isRenewal = talk.context === 'renewal';
    const marketValue = player.marketValue || player.wage * 250;
    const fairMin = Math.round(player.wage * 1.05 / 1000) * 1000;
    const fairMax = Math.round(player.wage * 1.30 / 1000) * 1000;
    const wageVsCurrent = wageOffer - player.wage;
    const wagePct = player.wage > 0 ? Math.round((wageVsCurrent / player.wage) * 100) : 0;
    const wageFairness = wageOffer < fairMin ? 'below' : wageOffer > fairMax ? 'premium' : 'fair';

    // ── FINAL RESULT SCREEN ─────────────────────────────────────────────────
    if (talkResult && (talkResult.decision === 'accepted' || talkResult.decision === 'rejected')) {
        const accepted = talkResult.decision === 'accepted';
        return (
            <div className="mt-16 max-w-2xl mx-auto text-center p-8 bg-gray-800/50 border border-gray-700 rounded-xl">
                <h2 className={`text-3xl font-bold mb-2 ${accepted ? 'text-green-400' : 'text-red-400'}`}>
                    {accepted ? 'Deal Agreed!' : 'Offer Rejected'}
                </h2>
                <p className="text-gray-500 text-sm mb-6">{player.name} · {isRenewal ? 'Contract Renewal' : 'Transfer'}</p>
                <div className="bg-gray-900/60 p-5 rounded-lg border border-gray-700 text-left mb-6">
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-2">Agent</p>
                    <p className="text-white text-base italic">"{talkResult.reasoning}"</p>
                    {accepted && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-center gap-10">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Weekly Wage</p>
                                <p className="text-xl font-bold text-green-400">{fmt(wageOffer)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Duration</p>
                                <p className="text-xl font-bold text-blue-400">{contractLength} Years</p>
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={onFinish}
                    className={`py-3 px-8 font-bold rounded-lg transition-colors ${accepted ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/40' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                >
                    {accepted ? (isRenewal ? 'Sign Contract' : 'Confirm Transfer') : 'Walk Away'}
                </button>
            </div>
        );
    }

    // ── MAIN NEGOTIATION CHAT ────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>

            {/* Back button row */}
            <div className="flex items-center mb-2">
                <button
                    onClick={onFinish}
                    className="text-xs font-bold text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                    ← Leave Room
                </button>
            </div>

            {/* Header dossier bar */}
            <div className="flex items-center gap-3 bg-gray-800/70 border border-gray-600 rounded-xl px-4 py-3 mb-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 flex items-center justify-center font-black text-white text-base flex-shrink-0">
                    {player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white leading-tight truncate">{player.name}</p>
                    <p className="text-xs text-gray-400">{player.position} · Age {player.age} · <span className="text-yellow-400 font-semibold">{player.rating} OVR</span> · {PERSONALITY_NOTE[player.personality] || player.personality}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-0.5 text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">Current wage</p>
                    <p className="text-sm font-mono font-bold text-white">{fmt(player.wage)}<span className="text-gray-500">/wk</span></p>
                    {!isRenewal && <p className="text-xs text-gray-500 font-mono">MV: {fmt(marketValue)}</p>}
                </div>
                <div className="hidden sm:block h-10 w-px bg-gray-700 mx-1" />
                <div className="hidden sm:flex flex-col items-end gap-0.5 text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">Contract</p>
                    {player.contractExpires > 0
                        ? <p className={`text-xs font-bold ${player.contractExpires < 10 ? 'text-green-400' : player.contractExpires > 25 ? 'text-red-400' : 'text-yellow-400'}`}>{player.contractExpires}w left</p>
                        : <p className="text-xs font-bold text-green-400">Free agent</p>}
                    <p className="text-xs text-gray-500">Fair: {fmt(fairMin)}–{fmt(fairMax)}</p>
                </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
                {talk.messages.map((msg, i) => (
                    <div key={i} className={`flex items-end gap-2 ${msg.role === 'manager' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${msg.role === 'agent' ? 'bg-blue-900/60 border-blue-700' : 'bg-green-900/60 border-green-700'}`}>
                            <UserIcon className={`w-4 h-4 ${msg.role === 'agent' ? 'text-blue-300' : 'text-green-300'}`} />
                        </div>
                        <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'agent'
                                ? 'bg-gray-700/80 border border-gray-600 text-white rounded-bl-sm'
                                : 'bg-green-900/40 border border-green-800/50 text-green-100 rounded-br-sm'
                        }`}>
                            {msg.role === 'agent' && (
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Agent</p>
                            )}
                            <p>"{msg.text}"</p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                    <div className="flex items-end gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-900/60 border border-blue-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-4 h-4 text-blue-300" />
                        </div>
                        <div className="bg-gray-700/80 border border-gray-600 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Offer controls — appear when agent signals readiness for money talk */}
            {talk.phase === 'offer' && !talkResult && (
                <div className="bg-gray-900/70 border border-gray-600 rounded-xl p-3 mb-3 flex-shrink-0">
                    <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">💰 Offer on the Table</p>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Weekly Wage</label>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setWageOffer(w => Math.max(1000, w - 5000))} className="px-2 py-1 bg-red-900/40 text-red-400 rounded text-xs hover:bg-red-900/70">-</button>
                                <input
                                    type="number"
                                    value={wageOffer}
                                    onChange={e => setWageOffer(parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-800 text-white font-mono text-center py-1 px-1 rounded border border-gray-600 text-sm"
                                />
                                <button type="button" onClick={() => setWageOffer(w => w + 5000)} className="px-2 py-1 bg-green-900/40 text-green-400 rounded text-xs hover:bg-green-900/70">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Contract Length</label>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setContractLength(l => Math.max(1, l - 1))} className="px-2 py-1 bg-red-900/40 text-red-400 rounded text-xs hover:bg-red-900/70">-</button>
                                <span className="w-full text-center font-bold text-white bg-gray-800 py-1 rounded border border-gray-600 text-sm">{contractLength}y</span>
                                <button type="button" onClick={() => setContractLength(l => Math.min(7, l + 1))} className="px-2 py-1 bg-green-900/40 text-green-400 rounded text-xs hover:bg-green-900/70">+</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-gray-700 pt-2">
                        <span className="text-gray-500">vs current</span>
                        <span className={`font-mono font-bold ${wageVsCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {wageVsCurrent >= 0 ? '+' : ''}{fmt(wageVsCurrent)} ({wagePct > 0 ? '+' : ''}{wagePct}%)
                        </span>
                        <span className={`font-bold ${wageFairness === 'below' ? 'text-red-400' : wageFairness === 'premium' ? 'text-yellow-400' : 'text-green-400'}`}>
                            {wageFairness === 'below' ? '⚠ Below fair value' : wageFairness === 'premium' ? '↑ Premium' : '✓ Fair range'}
                        </span>
                    </div>
                </div>
            )}

            {/* Input bar */}
            {!talkResult && (
                <form onSubmit={handleSend} className="flex gap-2 flex-shrink-0">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder={talk.phase === 'offer' ? 'Optional: add a pitch alongside your offer...' : 'Type your response...'}
                        className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-green-500 focus:border-green-500 outline-none disabled:opacity-50"
                    />
                    {talk.phase === 'offer' && (
                        <button
                            type="button"
                            onClick={handleMakeOffer}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 py-2.5 px-4 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm flex-shrink-0"
                        >
                            <DocumentCheckIcon className="w-4 h-4" />
                            Make Offer
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="py-2.5 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-sm flex-shrink-0"
                    >
                        Send
                    </button>
                </form>
            )}
        </div>
    );
};

export default PlayerTalkScreen;
