
import React, { useState, useEffect } from 'react';
import type { PlayerTalk, NegotiationResult } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';

interface PlayerTalkScreenProps {
    talk: PlayerTalk | null;
    isLoading: boolean;
    error: string | null;
    talkResult: NegotiationResult | null;
    onAnswerSubmit: (answer: string, offer?: { wage: number, length: number }) => void;
    onFinish: () => void;
}

const PERSONALITY_META: Record<string, { label: string; color: string; note: string }> = {
    Ambitious:    { label: 'Ambitious',    color: 'text-yellow-400 border-yellow-700 bg-yellow-900/30',   note: 'Wants trophies, Champions League ambitions, questions the club\'s project' },
    Volatile:     { label: 'Volatile',     color: 'text-red-400 border-red-700 bg-red-900/30',             note: 'Confrontational, holds grudges, will use grievances as leverage' },
    Leader:       { label: 'Leader',       color: 'text-blue-400 border-blue-700 bg-blue-900/30',          note: 'Asks about captaincy, squad hierarchy, and influence in the dressing room' },
    Professional: { label: 'Professional', color: 'text-green-400 border-green-700 bg-green-900/30',       note: 'Businesslike, terms-focused, doesn\'t get emotional — but won\'t settle for less than fair' },
    Eccentric:    { label: 'Eccentric',    color: 'text-purple-400 border-purple-700 bg-purple-900/30',    note: 'Unpredictable demands, unexpected concerns, may surprise you' },
};

const PlayerTalkScreen: React.FC<PlayerTalkScreenProps> = ({ talk, isLoading, error, talkResult, onAnswerSubmit, onFinish }) => {
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [wageOffer, setWageOffer] = useState<number>(0);
    const [contractLength, setContractLength] = useState<number>(3);
    const [hasNegotiated, setHasNegotiated] = useState(false);

    useEffect(() => {
        if (talk) {
            setWageOffer(talk.player.wage || 10000);
            setContractLength(3);
            setHasNegotiated(false);
            setCurrentAnswer('');
        }
    }, [talk?.player?.name]);

    useEffect(() => {
        if (talkResult?.decision === 'counter' && talkResult.counterOffer) {
            setWageOffer(talkResult.counterOffer.wage);
            setContractLength(talkResult.counterOffer.length);
        }
    }, [talkResult]);

    const fmt = (n: number) => `$${n.toLocaleString()}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (talk && talk.currentQuestionIndex < talk.questions.length - 1) {
            if (currentAnswer.trim()) {
                onAnswerSubmit(currentAnswer);
                setCurrentAnswer('');
            }
        } else {
            onAnswerSubmit(currentAnswer || "I believe this offer reflects your value.", { wage: wageOffer, length: contractLength });
            setHasNegotiated(true);
            setCurrentAnswer('');
        }
    };

    if (isLoading && !talkResult) {
        return (
            <div className="text-center mt-20 flex flex-col items-center justify-center min-h-[200px]">
                <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                <p className="text-xl font-semibold animate-pulse">{hasNegotiated ? "Agent is reviewing the numbers..." : "Setting up the meeting..."}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Negotiations Collapsed</h2>
                <p className="text-white">{error}</p>
                <button onClick={onFinish} className="mt-6 py-2 px-6 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Leave Room</button>
            </div>
        );
    }

    if (talkResult && talkResult.decision !== 'counter' && talk) {
        const isRenewal = talk.context === 'renewal';
        const accepted = talkResult.decision === 'accepted';
        return (
            <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h2 className={`text-3xl font-bold mb-4 ${accepted ? 'text-green-400' : 'text-red-400'}`}>
                    {accepted ? "Deal Agreed!" : "Offer Rejected"}
                </h2>
                <div className="text-left bg-gray-900/50 p-6 rounded-md my-6 border border-gray-600">
                    <p className="italic text-gray-300 text-lg">"{talkResult.reasoning}"</p>
                    {accepted && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-center gap-8">
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
                {accepted ? (
                    <button onClick={onFinish} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/50">
                        {isRenewal ? "Sign Contract" : "Confirm Transfer"}
                    </button>
                ) : (
                    <button onClick={onFinish} className="py-3 px-8 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">Walk Away</button>
                )}
            </div>
        );
    }

    if (!talk) return null;

    const { player } = talk;
    const isRenewal = talk.context === 'renewal';
    const isFinalStage = talk.currentQuestionIndex === talk.questions.length - 1;
    const personalityMeta = PERSONALITY_META[player.personality] || { label: player.personality, color: 'text-gray-400 border-gray-600 bg-gray-800/30', note: '' };
    const marketValue = player.marketValue || player.wage * 250;
    const suggestedWageMin = Math.round(player.wage * 1.05 / 1000) * 1000;
    const suggestedWageMax = Math.round(player.wage * 1.25 / 1000) * 1000;
    const wageVsCurrent = wageOffer - player.wage;
    const wageChangePercent = player.wage > 0 ? Math.round((wageVsCurrent / player.wage) * 100) : 0;
    const contractWeeksLeft = player.contractExpires > 0 ? player.contractExpires : null;
    const leverage = contractWeeksLeft !== null && contractWeeksLeft < 10
        ? { label: 'EXPIRING — You have leverage', color: 'text-green-400' }
        : contractWeeksLeft !== null && contractWeeksLeft > 25
        ? { label: 'Long contract — Club has leverage', color: 'text-red-400' }
        : { label: 'Entering final year', color: 'text-yellow-400' };

    let currentQuestion = talk.questions[talk.currentQuestionIndex];
    if (talkResult?.decision === 'counter') {
        currentQuestion = talkResult.reasoning;
    } else if (isFinalStage) {
        currentQuestion = "We're ready to talk numbers. What's on the table?";
    }

    return (
        <div className="mt-4 max-w-4xl mx-auto px-4 pb-8">

            {/* --- PLAYER DOSSIER PANEL --- */}
            <div className="mb-4 bg-gray-800/70 border border-gray-600 rounded-xl p-4 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-start gap-4">

                    {/* Left: Player Identity */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-500 flex items-center justify-center text-xl font-black text-white">
                                {player.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-tight">{player.name}</h2>
                                <p className="text-sm text-gray-400">{player.position} · Age {player.age} · <span className="text-yellow-400 font-bold">{player.rating} OVR</span></p>
                            </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border ${personalityMeta.color}`}>
                            {personalityMeta.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-1 italic">{personalityMeta.note}</p>
                    </div>

                    {/* Right: Contract & Financial Reference */}
                    <div className="md:w-64 space-y-2 text-sm">
                        <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Contract Status</p>
                            {contractWeeksLeft !== null ? (
                                <>
                                    <p className="text-white font-semibold">{contractWeeksLeft} weeks remaining</p>
                                    <p className={`text-xs font-bold mt-0.5 ${leverage.color}`}>{leverage.label}</p>
                                </>
                            ) : (
                                <p className="text-green-400 font-semibold">Free Agent</p>
                            )}
                        </div>
                        <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Financial Reference</p>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Current wage</span>
                                    <span className="text-white font-mono">{fmt(player.wage)}<span className="text-gray-500">/wk</span></span>
                                </div>
                                {!isRenewal && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Market value</span>
                                        <span className="text-white font-mono">{fmt(marketValue)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-gray-400">Likely range</span>
                                    <span className="text-yellow-400 font-mono text-xs">{fmt(suggestedWageMin)} – {fmt(suggestedWageMax)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- NEGOTIATION PANEL --- */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 shadow-xl">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    {isRenewal ? 'Contract Renewal' : 'Transfer Negotiation'} · {talk.currentQuestionIndex + 1} / {talk.questions.length + 1}
                </p>

                {/* Agent bubble */}
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-blue-900/60 flex items-center justify-center flex-shrink-0 border border-blue-700">
                        <UserIcon className="w-5 h-5 text-blue-300" />
                    </div>
                    <div className="bg-gray-700/60 p-4 rounded-lg rounded-tl-none border border-gray-600 flex-grow">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Agent · {player.name}</p>
                        <p className="text-white text-base leading-relaxed">"{currentQuestion}"</p>
                    </div>
                </div>

                {/* Manager response */}
                <form onSubmit={handleSubmit} className="border-t border-gray-700/50 pt-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-900/60 flex items-center justify-center flex-shrink-0 border border-green-700">
                            <UserIcon className="w-5 h-5 text-green-300" />
                        </div>
                        <div className="flex-grow space-y-3">

                            {/* Offer controls on final stage */}
                            {(isFinalStage || talkResult?.decision === 'counter') && (
                                <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-600">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Weekly Wage</label>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => setWageOffer(w => Math.max(1000, w - 5000))} className="px-2 py-1.5 bg-red-900/40 text-red-400 rounded text-sm hover:bg-red-900/70">-</button>
                                                <input
                                                    type="number"
                                                    value={wageOffer}
                                                    onChange={(e) => setWageOffer(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-gray-800 text-white font-mono text-center py-1.5 px-2 rounded border border-gray-600 text-sm"
                                                />
                                                <button type="button" onClick={() => setWageOffer(w => w + 5000)} className="px-2 py-1.5 bg-green-900/40 text-green-400 rounded text-sm hover:bg-green-900/70">+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Length</label>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => setContractLength(l => Math.max(1, l - 1))} className="px-2 py-1.5 bg-red-900/40 text-red-400 rounded text-sm hover:bg-red-900/70">-</button>
                                                <span className="w-full text-center font-bold text-white bg-gray-800 py-1.5 rounded border border-gray-600 text-sm">{contractLength}y</span>
                                                <button type="button" onClick={() => setContractLength(l => Math.min(7, l + 1))} className="px-2 py-1.5 bg-green-900/40 text-green-400 rounded text-sm hover:bg-green-900/70">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Live offer feedback */}
                                    <div className="flex items-center justify-between text-xs border-t border-gray-700 pt-2">
                                        <span className="text-gray-500">vs current wage</span>
                                        <span className={`font-bold font-mono ${wageVsCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {wageVsCurrent >= 0 ? '+' : ''}{fmt(wageVsCurrent)} ({wageChangePercent > 0 ? '+' : ''}{wageChangePercent}%)
                                        </span>
                                        <span className={`font-bold text-xs ${
                                            wageOffer < suggestedWageMin ? 'text-red-400' :
                                            wageOffer > suggestedWageMax ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                            {wageOffer < suggestedWageMin ? '⚠ Below fair value' :
                                             wageOffer > suggestedWageMax ? '↑ Premium offer' : '✓ Fair range'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">
                                    Your Response {isFinalStage ? '(Optional pitch)' : ''}
                                </label>
                                <textarea
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500 transition-colors text-sm"
                                    placeholder={isFinalStage
                                        ? "E.g. 'You'll be starting every game. This club is building around you.'"
                                        : "Type your answer..."}
                                    rows={3}
                                    required={!isFinalStage}
                                />
                            </div>

                            <div className="flex justify-end">
                                <button type="submit" className="py-2.5 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2">
                                    {(isFinalStage || talkResult?.decision === 'counter')
                                        ? <><DocumentCheckIcon className="w-5 h-5" /> Submit Offer</>
                                        : 'Reply →'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlayerTalkScreen;
