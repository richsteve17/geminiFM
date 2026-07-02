import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerTalk, NegotiationResult, ContractTerms, ContractBonusType, PlayerPosition } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';

interface PlayerTalkScreenProps {
    talk: PlayerTalk | null;
    isLoading: boolean;
    error: string | null;
    talkResult: NegotiationResult | null;
    onAnswerSubmit: (answer: string, offer?: ContractTerms) => void;
    onFinish: () => void;
    clubBudget?: {
        balance: number;
        transferBudget: number;
        weeklyWageBill: number;
    };
}

const ATTACKING_POSITIONS = new Set<PlayerPosition>(['ST', 'CF', 'LW', 'RW', 'AM']);
const DEFENSIVE_POSITIONS = new Set<PlayerPosition>(['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB']);

const getBonusTypeForPosition = (position: PlayerPosition): ContractBonusType => {
    if (ATTACKING_POSITIONS.has(position)) return 'goal';
    if (DEFENSIVE_POSITIONS.has(position)) return 'cleanSheet';
    return 'appearance';
};

const bonusTypeLabel = (bonusType: ContractBonusType) => {
    if (bonusType === 'goal') return 'Goal Bonus';
    if (bonusType === 'cleanSheet') return 'Clean-Sheet Bonus';
    return 'Appearance Bonus';
};

const getDefaultPerformanceBonus = (wage: number, bonusType: ContractBonusType) => {
    const multiplier = bonusType === 'goal' ? 0.2 : bonusType === 'cleanSheet' ? 0.12 : 0.08;
    return Math.round((wage * multiplier) / 500) * 500;
};

const PlayerTalkScreen: React.FC<PlayerTalkScreenProps> = ({ talk, isLoading, error, talkResult, onAnswerSubmit, onFinish, clubBudget }) => {
    const [currentAnswer, setCurrentAnswer] = useState('');
    
    // Negotiation State
    const [wageOffer, setWageOffer] = useState<number>(0);
    const [contractLength, setContractLength] = useState<number>(3);
    const [signingBonus, setSigningBonus] = useState<number>(0);
    const [performanceBonus, setPerformanceBonus] = useState<number>(0);
    const [bonusType, setBonusType] = useState<ContractBonusType>('appearance');
    const [hasNegotiated, setHasNegotiated] = useState(false);
    const talkSessionKey = talk ? `${talk.player.name}-${talk.context}` : '';

    // Initialize defaults when a new negotiation starts
    useEffect(() => {
        if (talk) {
            const defaultBonusType = getBonusTypeForPosition(talk.player.position);
            setWageOffer(talk.player.wage);
            setContractLength(talk.player.contractExpires || 3);
            setBonusType(defaultBonusType);
            setSigningBonus(Math.round((talk.player.wage * (talk.context === 'transfer' ? 8 : 4)) / 1000) * 1000);
            setPerformanceBonus(getDefaultPerformanceBonus(talk.player.wage, defaultBonusType));
            setCurrentAnswer('');
            setHasNegotiated(false);
        }
    }, [talkSessionKey]);

    // Update state if AI counters
    useEffect(() => {
        if (talkResult?.decision === 'counter' && talkResult.counterOffer) {
            setWageOffer(talkResult.counterOffer.wage);
            setContractLength(talkResult.counterOffer.length);
            setSigningBonus(talkResult.counterOffer.signingBonus);
            setPerformanceBonus(talkResult.counterOffer.performanceBonus);
            setBonusType(talkResult.counterOffer.bonusType);
        }
    }, [talkResult]);

    const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

    const bonusLabel = useMemo(() => bonusTypeLabel(bonusType), [bonusType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (talk && talk.currentQuestionIndex < talk.questions.length - 1) {
            if (currentAnswer.trim()) {
                onAnswerSubmit(currentAnswer);
                setCurrentAnswer('');
            }
        } else {
            onAnswerSubmit(
                currentAnswer || "I believe this package reflects your value and role in our project.",
                {
                    wage: wageOffer,
                    length: contractLength,
                    signingBonus,
                    performanceBonus,
                    bonusType
                }
            );
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
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Signing Bonus</p>
                                <p className="text-xl font-bold text-yellow-400">{formatMoney(signingBonus)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">{bonusLabel}</p>
                                <p className="text-xl font-bold text-purple-400">{formatMoney(performanceBonus)}</p>
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
    
    let currentQuestion = talk.questions[talk.currentQuestionIndex];
    if (talkResult?.decision === 'counter') {
        currentQuestion = talkResult.reasoning;
    } else if (isFinalStage) {
        currentQuestion = `We are ready to discuss financial terms: weekly wage, signing bonus, and ${bonusLabel.toLowerCase()}. What is your offer?`;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 mt-8 pb-12">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isRenewal ? `Contract Talks: ${talk.player.name}` : `Negotiations: ${talk.player.name}`}
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                    Office of Recruitment &bull; Boardroom Session
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Side: Conversation Area */}
                <div className="lg:col-span-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-xl space-y-6">
                    {/* Agent Message Bubble */}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 border-2 border-blue-700">
                             <UserIcon className="w-6 h-6 text-blue-300" />
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg rounded-tl-none border border-gray-600 flex-grow">
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Agent ({talk.player.name})</p>
                            <p className="text-white text-lg leading-relaxed font-serif">"{currentQuestion}"</p>
                        </div>
                    </div>
                    
                    {/* User Response Form */}
                    <form onSubmit={handleSubmit} className="border-t border-gray-700/50 pt-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0 border-2 border-green-700">
                                 <UserIcon className="w-6 h-6 text-green-300" />
                            </div>
                            <div className="flex-grow space-y-6">
                                
                                {/* Offer Controls */}
                                {(isFinalStage || talkResult?.decision === 'counter') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-950/40 p-4 rounded-lg border border-gray-800 mb-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Weekly Wage Offer</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setWageOffer(w => Math.max(0, w - 5000))} className="p-2.5 bg-red-950/40 text-red-400 rounded hover:bg-red-900/40 font-bold border border-red-900/30">-</button>
                                                <input 
                                                    type="number" 
                                                    value={wageOffer} 
                                                    onChange={(e) => setWageOffer(parseInt(e.target.value) || 0)}
                                                    className="w-full bg-gray-900 text-white font-mono text-center p-2 rounded border border-gray-700 text-sm"
                                                />
                                                <button type="button" onClick={() => setWageOffer(w => w + 5000)} className="p-2.5 bg-green-950/40 text-green-400 rounded hover:bg-green-900/40 font-bold border border-green-900/30">+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Contract Length</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setContractLength(l => Math.max(1, l - 1))} className="p-2.5 bg-red-950/40 text-red-400 rounded hover:bg-red-900/40 font-bold border border-red-900/30">-</button>
                                                <span className="w-full text-center font-bold text-white bg-gray-900 p-2 rounded border border-gray-700 text-sm">{contractLength} Years</span>
                                                <button type="button" onClick={() => setContractLength(l => Math.min(7, l + 1))} className="p-2.5 bg-green-950/40 text-green-400 rounded hover:bg-green-900/40 font-bold border border-green-900/30">+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Signing Bonus</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setSigningBonus(b => Math.max(0, b - 10000))} className="p-2.5 bg-red-950/40 text-red-400 rounded hover:bg-red-900/40 font-bold border border-red-900/30">-</button>
                                                <input
                                                    type="number"
                                                    value={signingBonus}
                                                    onChange={(e) => setSigningBonus(parseInt(e.target.value, 10) || 0)}
                                                    className="w-full bg-gray-900 text-white font-mono text-center p-2 rounded border border-gray-700 text-sm"
                                                />
                                                <button type="button" onClick={() => setSigningBonus(b => b + 10000)} className="p-2.5 bg-green-950/40 text-green-400 rounded hover:bg-green-900/40 font-bold border border-green-900/30">+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Incentive Type</label>
                                            <select
                                                value={bonusType}
                                                onChange={(e) => {
                                                    const nextBonusType = e.target.value as ContractBonusType;
                                                    setBonusType(nextBonusType);
                                                    setPerformanceBonus(getDefaultPerformanceBonus(wageOffer, nextBonusType));
                                                }}
                                                className="w-full bg-gray-900 text-white p-2.5 rounded border border-gray-700 text-sm focus:outline-none"
                                            >
                                                <option value="goal">Goal Bonus</option>
                                                <option value="cleanSheet">Clean-Sheet Bonus</option>
                                                <option value="appearance">Appearance Bonus</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">{bonusLabel}</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setPerformanceBonus(b => Math.max(0, b - 1000))} className="p-2.5 bg-red-950/40 text-red-400 rounded hover:bg-red-900/40 font-bold border border-red-900/30">-</button>
                                                <input
                                                    type="number"
                                                    value={performanceBonus}
                                                    onChange={(e) => setPerformanceBonus(parseInt(e.target.value, 10) || 0)}
                                                    className="w-full bg-gray-900 text-white font-mono text-center p-2 rounded border border-gray-700 text-sm"
                                                />
                                                <button type="button" onClick={() => setPerformanceBonus(b => b + 1000)} className="p-2.5 bg-green-950/40 text-green-400 rounded hover:bg-green-900/40 font-bold border border-green-900/30">+</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Response {isFinalStage && "(Optional Reasoning)"}</label>
                                    <textarea
                                        value={currentAnswer}
                                        onChange={(e) => setCurrentAnswer(e.target.value)}
                                        className="w-full p-3 bg-gray-750 border border-gray-600 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 transition-colors focus:outline-none"
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

                {/* Right Side: Important Details Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Player Profile Card */}
                    <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5 shadow-lg backdrop-blur-md">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-700/50">Player Profile</h3>
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Name</span>
                                <span className="text-sm font-black text-white">{talk.player.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Position</span>
                                <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-black text-green-400">{talk.player.position}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Rating</span>
                                <span className="text-sm font-black text-yellow-500 font-mono">{talk.player.rating} OVR</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Age</span>
                                <span className="text-sm font-bold text-white">{talk.player.age} Years</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Personality</span>
                                <span className="text-sm font-bold text-blue-400">{talk.player.personality}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Current Wage</span>
                                <span className="text-sm font-bold text-white font-mono">{formatMoney(talk.player.wage)}/wk</span>
                            </div>
                        </div>
                    </div>

                    {/* Club Budget Details */}
                    {clubBudget && (
                        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5 shadow-lg backdrop-blur-md">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-700/50">Club Finances</h3>
                            <div className="space-y-3.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Total Balance</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono">{formatMoney(clubBudget.balance)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Transfer Budget</span>
                                    <span className="text-sm font-black text-blue-400 font-mono">{formatMoney(clubBudget.transferBudget)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Weekly Wage Bill</span>
                                    <span className="text-sm font-bold text-white font-mono">{formatMoney(clubBudget.weeklyWageBill)}/wk</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerTalkScreen;
