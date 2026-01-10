
import React, { useState, useMemo } from 'react';
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

const PlayerTalkScreen: React.FC<PlayerTalkScreenProps> = ({ talk, isLoading, error, talkResult, onAnswerSubmit, onFinish }) => {
    const [currentAnswer, setCurrentAnswer] = useState('');
    
    // Negotiation State
    const [wageOffer, setWageOffer] = useState<number>(0);
    const [contractLength, setContractLength] = useState<number>(3);
    const [hasNegotiated, setHasNegotiated] = useState(false);

    // Initialize defaults when talk loads
    useMemo(() => {
        if (talk && wageOffer === 0) {
            setWageOffer(talk.player.wage);
            setContractLength(talk.player.contractExpires || 3);
        }
    }, [talk]);

    // Update state if AI counters
    useMemo(() => {
        if (talkResult?.decision === 'counter' && talkResult.counterOffer) {
            setWageOffer(talkResult.counterOffer.wage);
            setContractLength(talkResult.counterOffer.length);
        }
    }, [talkResult]);

    const formatMoney = (amount: number) => `£${amount.toLocaleString()}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // If we haven't asked generic questions yet (index < length - 1), just send text
        // If it's the FINAL step, we send the Offer details
        if (talk && talk.currentQuestionIndex < talk.questions.length - 1) {
            if (currentAnswer.trim()) {
                onAnswerSubmit(currentAnswer);
                setCurrentAnswer('');
            }
        } else {
            // Final Step: Submit the Offer
            onAnswerSubmit(currentAnswer || "I believe this offer reflects your value.", { wage: wageOffer, length: contractLength });
            setHasNegotiated(true);
            setCurrentAnswer('');
        }
    };

    if (isLoading && !talkResult) {
        return (
            <div className="text-center mt-20 flex flex-col items-center justify-center min-h-[200px]">
                <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                <p className="text-xl font-semibold animate-pulse">{hasNegotiated ? "Agent is reviewing numbers..." : "Discussing terms..."}</p>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Negotiations Collapsed</h2>
                <p className="text-white">{error}</p>
                <button onClick={onFinish} className="mt-6 py-2 px-6 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">
                    Leave Room
                </button>
            </div>
         );
    }

    if (talkResult && talkResult.decision !== 'counter' && talk) {
        // Final Result (Accepted/Rejected)
        const isRenewal = talk.context === 'renewal';
        const accepted = talkResult.decision === 'accepted';
        return (
             <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h2 className={`text-3xl font-bold mb-4 ${accepted ? 'text-green-400' : 'text-red-400'}`}>
                    {accepted ? "Deal Agreed!" : "Offer Rejected"}
                </h2>
                <div className="text-left bg-gray-900/50 p-6 rounded-md my-6 border border-gray-600">
                    <p className="italic text-gray-300 text-lg">" {talkResult.reasoning} "</p>
                    {accepted && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-center gap-8">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Weekly Wage</p>
                                <p className="text-xl font-bold text-green-400">{formatMoney(wageOffer)}</p>
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
                    <button onClick={onFinish} className="py-3 px-8 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">
                         Walk Away
                    </button>
                )}
            </div>
        );
    }

    if (!talk) return null;
    
    const isRenewal = talk.context === 'renewal';
    const isFinalStage = talk.currentQuestionIndex === talk.questions.length - 1;
    const currentQuestion = talkResult?.decision === 'counter' ? talkResult.reasoning : talk.questions[talk.currentQuestionIndex];

    return (
        <div className="mt-8 max-w-3xl mx-auto px-4">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <DocumentCheckIcon className="w-6 h-6 text-green-400" />
                    {isRenewal ? `Contract Renewal: ${talk.player.name}` : `Negotiations: ${talk.player.name}`}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Panel: Agent Chat */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-3 mb-3 border-b border-gray-700 pb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-blue-300" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-400 text-sm">The Agent</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{talk.player.personality}</p>
                            </div>
                        </div>
                        <p className="text-white text-sm italic">"{currentQuestion}"</p>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Player Stats</p>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Rating</span>
                            <span className="font-bold text-green-400">{talk.player.rating}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">Age</span>
                            <span className="font-bold text-gray-200">{talk.player.age}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Current Wage</span>
                            <span className="font-bold text-gray-200">{formatMoney(talk.player.wage)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Negotiation Interface */}
                <div className="md:col-span-2 bg-gray-800/80 border border-gray-700 rounded-xl p-6 shadow-xl">
                    {!isFinalStage && !talkResult ? (
                        // Phase 1: Chatting
                        <div className="h-full flex flex-col justify-between">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white mb-2">Build a Relationship</h3>
                                <p className="text-sm text-gray-400">Before discussing numbers, reassure the agent about your vision.</p>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <textarea
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500 h-32 resize-none"
                                    placeholder="Type your response..."
                                    required
                                />
                                <button type="submit" className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                                    Send Response
                                </button>
                            </form>
                        </div>
                    ) : (
                        // Phase 2: The Contract Table (Includes Counter Offers)
                        <div className="space-y-6">
                            {talkResult?.decision === 'counter' && (
                                <div className="bg-orange-900/30 border border-orange-500 p-3 rounded-lg mb-4 text-sm text-orange-200 animate-pulse">
                                    <strong>Counter Offer:</strong> The agent has proposed new terms. Adjust your offer or argue your case.
                                </div>
                            )}

                            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                                <h3 className="text-lg font-bold text-white">Contract Offer</h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase">Total Value</p>
                                    <p className="text-sm font-mono text-gray-300">
                                        £{((wageOffer * 52) * contractLength).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Wage Slider */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-gray-300">Weekly Wage</label>
                                    <span className={`text-xl font-mono font-bold ${wageOffer > talk.player.wage * 1.2 ? 'text-green-400' : wageOffer < talk.player.wage ? 'text-red-400' : 'text-white'}`}>
                                        {formatMoney(wageOffer)}
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min={Math.floor(talk.player.wage * 0.5)} 
                                    max={Math.floor(talk.player.wage * 3)} 
                                    step={1000}
                                    value={wageOffer} 
                                    onChange={(e) => setWageOffer(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                    <span>{formatMoney(talk.player.wage * 0.5)}</span>
                                    <span>Current: {formatMoney(talk.player.wage)}</span>
                                    <span>{formatMoney(talk.player.wage * 3)}</span>
                                </div>
                            </div>

                            {/* Contract Length */}
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Contract Length</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(year => (
                                        <button
                                            key={year}
                                            type="button"
                                            onClick={() => setContractLength(year)}
                                            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                                                contractLength === year 
                                                ? 'bg-blue-600 text-white shadow-inner ring-2 ring-blue-400' 
                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                            }`}
                                        >
                                            {year} Yr
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Final Comment & Submit */}
                            <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-700">
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Negotiation Argument</label>
                                <input
                                    type="text"
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 text-sm focus:ring-green-500 focus:border-green-500"
                                    placeholder="E.g. 'This is fair because you will be our star player'..."
                                />
                                <button type="submit" className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg text-lg flex items-center justify-center gap-2">
                                    <DocumentCheckIcon className="w-5 h-5" />
                                    Submit Offer
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerTalkScreen;
