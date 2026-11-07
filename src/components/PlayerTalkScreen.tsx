import { formatRosterAge } from '../engine/playerDataPresentation';
import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerTalk, NegotiationResult, ContractTerms, ContractBonusType, PlayerPosition } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import NationalityBadge from './NationalityBadge';

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
    const [squadRole, setSquadRole] = useState<NonNullable<ContractTerms['role']>>('rotation');
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
            setSquadRole('rotation');
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

    const formatMoney = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null) return '$0';
        return `$${amount.toLocaleString()}`;
    };

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
                    bonusType,
                    role: squadRole,
                }
            );
            setHasNegotiated(true);
            setCurrentAnswer('');
        }
    };

    if (isLoading && !talkResult) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8" role="status" aria-live="polite">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#A47837]">
                    <p className="fm-eyebrow">Office of Recruitment · Boardroom Session</p>
                    <div className="flex items-center gap-3 mt-3">
                        <FootballIcon className="w-6 h-6 text-[#18392F] animate-spin shrink-0" />
                        <h2 className="fm-screen-title">{hasNegotiated ? "Agent is reviewing numbers..." : "Discussing terms..."}</h2>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#8C3931]" role="alert">
                    <p className="fm-eyebrow">Boardroom Session</p>
                    <h2 className="fm-screen-title">Negotiations Collapsed</h2>
                    <p className="mt-4 leading-relaxed">{error}</p>
                    <footer className="mt-6 border-t border-[#172B24]/20 pt-5"><button onClick={onFinish} className="fm-button-secondary">Leave Room</button></footer>
                </div>
            </section>
        );
    }

    if (talkResult && talkResult.decision !== 'counter' && talk) {
        const isRenewal = talk.context === 'renewal';
        const accepted = talkResult.decision === 'accepted';
        return (
            <section className="fm-screen max-w-4xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8">
                    <header className="border-b border-[#172B24]/25 pb-5">
                        <p className="fm-eyebrow">{talk.player.name} · Boardroom Session</p>
                        <h2 className="fm-screen-title">{accepted ? "Deal Agreed!" : "Offer Rejected"}</h2>
                    </header>
                    <div className="fm-transcript py-6">
                        <p className="font-semibold text-sm mb-3">Agent ({talk.player.name})</p>
                        <blockquote className="text-lg leading-relaxed whitespace-pre-line">“{talkResult.reasoning}”</blockquote>
                    </div>
                    {accepted && (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-t border-[#172B24]/20 mb-6">
                            <div className="py-4 border-b border-[#172B24]/15"><dt className="text-sm">Weekly Wage</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(wageOffer)}</dd></div>
                            <div className="py-4 border-b border-[#172B24]/15"><dt className="text-sm">Duration</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{contractLength} Years</dd></div>
                            <div className="py-4 border-b border-[#172B24]/15"><dt className="text-sm">Signing Bonus</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(signingBonus)}</dd></div>
                            <div className="py-4 border-b border-[#172B24]/15"><dt className="text-sm">{bonusLabel}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(performanceBonus)}</dd></div>
                        </dl>
                    )}
                    <footer className="border-t border-[#172B24]/20 pt-5">
                        {accepted ? <button onClick={onFinish} className="fm-button">{isRenewal ? "Sign Contract" : "Confirm Transfer"}</button> : <button onClick={onFinish} className="fm-button-secondary">Walk Away</button>}
                    </footer>
                </div>
            </section>
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
        <section className="fm-screen max-w-6xl mx-auto px-4 py-8">
            <header className="mb-8 border-b border-[#172B24]/25 pb-6">
                <p className="fm-eyebrow">Office of Recruitment · Boardroom Session</p>
                <h2 className="fm-screen-title">{isRenewal ? `Contract Talks: ${talk.player.name}` : `Negotiations: ${talk.player.name}`}</h2>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                <aside className="lg:col-span-4 order-last lg:order-first border-t-2 border-[#A47837] pt-5">
                    <h3 className="text-2xl font-semibold mb-4">Player Profile</h3>
                    <dl className="divide-y divide-[#172B24]/15 border-y border-[#172B24]/20 text-sm">
                        <div className="flex justify-between items-start gap-4 py-3"><dt>Name</dt><dd className="font-semibold text-right">{talk.player.name}</dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Position</dt><dd className="font-semibold">{talk.player.position}</dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Nationality</dt><dd><NationalityBadge nationality={talk.player.nationality} /></dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Rating</dt><dd className="font-semibold tabular-nums">{talk.player.rating} OVR</dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Age</dt><dd className="font-semibold tabular-nums">{formatRosterAge(talk.player)} Years</dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Personality</dt><dd className="font-semibold text-right">{talk.player.personality}</dd></div>
                        <div className="flex justify-between items-center gap-4 py-3"><dt>Current Wage</dt><dd className="font-semibold tabular-nums">{formatMoney(talk.player.wage)}/wk</dd></div>
                    </dl>
                    {clubBudget && (
                        <section className="mt-6">
                            <h3 className="text-2xl font-semibold mb-4">Club Finances</h3>
                            <dl className="divide-y divide-[#172B24]/15 border-y border-[#172B24]/20 text-sm">
                                <div className="flex justify-between items-center gap-4 py-3"><dt>Total Balance</dt><dd className="font-semibold tabular-nums">{formatMoney(clubBudget.balance)}</dd></div>
                                <div className="flex justify-between items-center gap-4 py-3"><dt>Transfer Budget</dt><dd className="font-semibold tabular-nums">{formatMoney(clubBudget.transferBudget)}</dd></div>
                                <div className="flex justify-between items-center gap-4 py-3"><dt>Weekly Wage Bill</dt><dd className="font-semibold tabular-nums">{formatMoney(clubBudget.weeklyWageBill)}/wk</dd></div>
                            </dl>
                        </section>
                    )}
                </aside>
                <div className="lg:col-span-8 fm-panel p-5 sm:p-7">
                    <div className="fm-transcript pb-6">
                        <p className="fm-eyebrow mb-3">Agent ({talk.player.name})</p>
                        <blockquote className="text-xl sm:text-2xl leading-relaxed whitespace-pre-line">“{currentQuestion}”</blockquote>
                    </div>
                    <form onSubmit={handleSubmit} className="border-t border-[#172B24]/20 pt-6 space-y-6">
                        {(isFinalStage || talkResult?.decision === 'counter') && (
                            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5 pb-6 border-b border-[#172B24]/20">
                                <legend className="text-2xl font-semibold mb-5">{talkResult?.decision === 'counter' ? 'Submit Offer' : 'Contract Talks'}</legend>
                                <div className="md:col-span-2">
                                    <label htmlFor="offer-role" className="font-semibold text-sm block mb-2">Agreed squad role</label>
                                    <select id="offer-role" aria-label="Agreed squad role" value={squadRole} onChange={e => setSquadRole(e.target.value as NonNullable<ContractTerms['role']>)} className="fm-field w-full">
                                        <option value="key-player">Key player</option><option value="rotation">Rotation</option><option value="prospect">Development prospect</option>
                                    </select>
                                    <p className="text-sm leading-relaxed mt-2">Recorded in the contract; you still select the starting XI.</p>
                                </div>
                                <div>
                                    <label htmlFor="offer-wage" className="font-semibold text-sm block mb-2">Weekly Wage Offer</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" aria-label="Decrease weekly wage offer" onClick={() => setWageOffer(w => Math.max(0, w - 5000))} className="fm-button-secondary min-w-[44px] shrink-0">−</button>
                                        <input id="offer-wage" type="number" value={wageOffer} onChange={(e) => setWageOffer(parseInt(e.target.value) || 0)} className="fm-field w-full min-w-0 text-center tabular-nums" />
                                        <button type="button" aria-label="Increase weekly wage offer" onClick={() => setWageOffer(w => w + 5000)} className="fm-button-secondary min-w-[44px] shrink-0">+</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm mb-2">Contract Length</p>
                                    <div className="flex items-center gap-2">
                                        <button type="button" aria-label="Decrease contract length" onClick={() => setContractLength(l => Math.max(1, l - 1))} className="fm-button-secondary min-w-[44px] shrink-0">−</button>
                                        <span className="fm-field w-full min-w-0 text-center font-semibold tabular-nums">{contractLength} Years</span>
                                        <button type="button" aria-label="Increase contract length" onClick={() => setContractLength(l => Math.min(7, l + 1))} className="fm-button-secondary min-w-[44px] shrink-0">+</button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="offer-signing-bonus" className="font-semibold text-sm block mb-2">Signing Bonus</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" aria-label="Decrease signing bonus" onClick={() => setSigningBonus(b => Math.max(0, b - 10000))} className="fm-button-secondary min-w-[44px] shrink-0">−</button>
                                        <input id="offer-signing-bonus" type="number" value={signingBonus} onChange={(e) => setSigningBonus(parseInt(e.target.value, 10) || 0)} className="fm-field w-full min-w-0 text-center tabular-nums" />
                                        <button type="button" aria-label="Increase signing bonus" onClick={() => setSigningBonus(b => b + 10000)} className="fm-button-secondary min-w-[44px] shrink-0">+</button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="offer-incentive" className="font-semibold text-sm block mb-2">Incentive Type</label>
                                    <select id="offer-incentive" value={bonusType} onChange={(e) => {
                                        const nextBonusType = e.target.value as ContractBonusType;
                                        setBonusType(nextBonusType);
                                        setPerformanceBonus(getDefaultPerformanceBonus(wageOffer, nextBonusType));
                                    }} className="fm-field w-full">
                                        <option value="goal">Goal Bonus</option><option value="cleanSheet">Clean-Sheet Bonus</option><option value="appearance">Appearance Bonus</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="offer-performance-bonus" className="font-semibold text-sm block mb-2">{bonusLabel}</label>
                                    <div className="flex items-center gap-2">
                                        <button type="button" aria-label="Decrease performance bonus" onClick={() => setPerformanceBonus(b => Math.max(0, b - 1000))} className="fm-button-secondary min-w-[44px] shrink-0">−</button>
                                        <input id="offer-performance-bonus" type="number" value={performanceBonus} onChange={(e) => setPerformanceBonus(parseInt(e.target.value, 10) || 0)} className="fm-field w-full min-w-0 text-center tabular-nums" />
                                        <button type="button" aria-label="Increase performance bonus" onClick={() => setPerformanceBonus(b => b + 1000)} className="fm-button-secondary min-w-[44px] shrink-0">+</button>
                                    </div>
                                </div>
                            </fieldset>
                        )}
                        <div>
                            <label htmlFor="player-talk-answer" className="font-semibold block mb-2">Your Response {isFinalStage && "(Optional Reasoning)"}</label>
                            <textarea id="player-talk-answer" value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} className="fm-field w-full" placeholder={isFinalStage ? "E.g. 'We are building the team around you.'" : "Type your answer..."} rows={3} required={!isFinalStage} />
                        </div>
                        <footer className="flex justify-end">
                            <button type="submit" className="fm-button flex items-center gap-2">
                                {(isFinalStage || talkResult?.decision === 'counter') ? <><DocumentCheckIcon className="w-5 h-5" /> Submit Offer</> : "Reply"}
                            </button>
                        </footer>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default PlayerTalkScreen;
