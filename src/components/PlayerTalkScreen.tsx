
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

    const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

    // Estimate market value if not present (approx 250x weekly wage for display)
    const getMarketValue = () => {
        if (!talk) return 0;
        return talk.player.marketValue || talk.player.wage * 250;
    }

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
    
    // Determine displayed question
    let currentQuestion = talk.questions[talk.currentQuestionIndex];
    if (talkResult?.decision === 'counter') {
        currentQuestion = talkResult.reasoning; // Show the agent's counter argument
    } else if (isFinalStage) {
        // OVERRIDE: Ensure the final question matches the UI context (Money)
        currentQuestion = "We are ready to discuss financial terms. What is your offer?";
    }

    return (
        <div className="mt-8 max-w-3xl mx-auto px-4">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isRenewal ? `Contract Talks: ${talk.player.name}` : `Negotiations: ${talk.player.name}`}
                </h2>
                <p className="text-lg text-gray-400">
                    Agent Status: <span className="text-blue-400 font-bold">{talk.player.personality}</span>
                </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 shadow-xl">
                {/* Agent Message Bubble */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 border-2 border-blue-700">
                         <UserIcon className="w-6 h-6 text-blue-300" />
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg rounded-tl-none border border-gray-600 flex-grow">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Agent</p>
                        <p className="text-white text-lg leading-relaxed">"{currentQuestion}"</p>
                    </div>
                </div>
                
                {/* User Response Area */}
                <form onSubmit={handleSubmit} className="border-t border-gray-700/50 pt-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0 border-2 border-green-700">
                             <UserIcon className="w-6 h-6 text-green-300" />
                        </div>
                        <div className="flex-grow space-y-4">
                            
                            {/* IF FINAL STAGE: Show Money Controls */}
                            {(isFinalStage || talkResult?.decision === 'counter') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-600 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Weekly Wage Offer</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setWageOffer(w => Math.max(0, w - 5000))} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50">-</button>
                                            <input 
                                                type="number" 
                                                value={wageOffer} 
                                                onChange={(e) => setWageOffer(parseInt(e.target.value) || 0)}
                                                className="w-full bg-gray-800 text-white font-mono text-center p-2 rounded border border-gray-600"
                                            />
                                            <button type="button" onClick={() => setWageOffer(w => w + 5000)} className="p-2 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50">+</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Contract Length</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setContractLength(l => Math.max(1, l - 1))} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50">-</button>
                                            <span className="w-full text-center font-bold text-white bg-gray-800 p-2 rounded border border-gray-600">{contractLength} Years</span>
                                            <button type="button" onClick={() => setContractLength(l => Math.min(7, l + 1))} className="p-2 bg-green-900/30 text-green-400 rounded hover:bg-green-900/50">+</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Response {isFinalStage && "(Optional Reasoning)"}</label>
                                <textarea
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500 transition-colors"
                                    placeholder={isFinalStage ? "E.g. 'We are building the team around you.'" : "Type your answer..."}
                                    rows={3}
                                    required={!isFinalStage}
                                />
                            </div>
                            
                            <div className="flex justify-end">
                                <button type="submit" className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2">
                                    {(isFinalStage || talkResult?.decision === 'counter') ? <><DocumentCheckIcon className="w-5 h-5"/> Submit Offer</> : "Reply"}
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
