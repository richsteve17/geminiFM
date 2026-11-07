import React, { useState } from 'react';
import { Lightbulb, Target } from 'lucide-react';
import type { Interview } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { TEAMS } from '../constants';
import ClubCrest from './ClubIdentity';

interface JobInterviewScreenProps {
    interview: Interview | null;
    isLoading: boolean;
    error: string | null;
    jobOffer: { offer: boolean; reasoning: string } | null;
    onAnswerSubmit: (answer: string) => void;
    onFinish: (accepted: boolean) => void;
}

const JobInterviewScreen: React.FC<JobInterviewScreenProps> = ({ interview, isLoading, error, jobOffer, onAnswerSubmit, onFinish }) => {
    const [currentAnswer, setCurrentAnswer] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentAnswer.trim()) {
            onAnswerSubmit(currentAnswer);
            setCurrentAnswer('');
        }
    };

    if (isLoading && !jobOffer) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8" role="status" aria-live="polite">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#A47837]">
                    <p className="fm-eyebrow">Chairman Vacancy Panel</p>
                    <div className="flex items-center gap-3 mt-3">
                        <FootballIcon className="w-6 h-6 text-[#18392F] animate-spin shrink-0" />
                        <h2 className="fm-screen-title">{interview ? "Evaluating answers..." : "Contacting the chairman..."}</h2>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#8C3931]" role="alert">
                    <p className="fm-eyebrow">Chairman Vacancy Panel</p>
                    <h2 className="fm-screen-title">Interview Cancelled</h2>
                    <p className="mt-4 leading-relaxed">{error}</p>
                    <footer className="mt-6 border-t border-[#172B24]/20 pt-5">
                        <button onClick={() => onFinish(false)} className="fm-button-secondary">Return to Job Centre</button>
                    </footer>
                </div>
            </section>
        );
    }

    if (jobOffer) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8">
                    <header className="border-b border-[#172B24]/25 pb-5">
                        <p className="fm-eyebrow">Chairman Vacancy Panel</p>
                        <h2 className="fm-screen-title">{jobOffer.offer ? "You're Hired!" : "Application Unsuccessful"}</h2>
                    </header>
                    <div className="fm-transcript py-6">
                        <p className="font-semibold text-sm mb-3">Chairman</p>
                        <blockquote className="text-lg leading-relaxed whitespace-pre-line">“{jobOffer.reasoning}”</blockquote>
                    </div>
                    <footer className="border-t border-[#172B24]/20 pt-5">
                        {jobOffer.offer ? (
                            <button onClick={() => onFinish(true)} className="fm-button">Accept Job</button>
                        ) : (
                            <button onClick={() => onFinish(false)} className="fm-button-secondary">Return to Job Centre</button>
                        )}
                    </footer>
                </div>
            </section>
        );
    }

    if (!interview) return null;

    const currentQuestion = interview.questions[interview.currentQuestionIndex];
    const targetClub = TEAMS[interview.teamName];

    // Helper for Chairman details
    const getChairmanGuidance = (personality: string) => {
        switch (personality) {
            case 'Moneyball Advocate':
                return 'Prefers high-potential young players, strict budget control, and tactical efficiency.';
            case 'Ambitious Tycoon':
                return 'Demands immediate trophies, superstar signings, and high reputation. Very impatient.';
            case 'Fan-Focused Owner':
                return 'Prioritizes attacking, entertaining football and crowd excitement over passive play.';
            case 'Traditionalist':
                return 'Favors long-term loyalty, defensive stability, and standard classic formations.';
            default:
                return 'Expects clean organization and meeting target league expectations.';
        }
    };

    return (
        <section className="fm-screen max-w-6xl mx-auto px-4 py-8">
            <header className="flex flex-wrap items-end justify-between gap-4 mb-8 border-b border-[#172B24]/25 pb-6">
                <div>
                    <p className="fm-eyebrow">Interview room · Chairman Vacancy Panel</p>
                    <h2 className="fm-screen-title">Job Interview: {interview.teamName}</h2>
                </div>
                <p className="text-sm tabular-nums">Question {interview.currentQuestionIndex + 1} of {interview.questions.length}</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                {targetClub && (
                    <aside className="lg:col-span-4 lg:order-first order-last border-t-2 border-[#A47837] pt-5">
                        <div className="flex items-center gap-3 mb-5">
                            <ClubCrest name={interview.teamName} size="h-10 w-10" />
                            <h3 className="text-2xl font-semibold">Club Profile</h3>
                        </div>
                        <dl className="divide-y divide-[#172B24]/15 border-y border-[#172B24]/20 text-sm">
                            <div className="flex flex-wrap justify-between gap-2 py-3"><dt>Prestige</dt><dd className="font-semibold tabular-nums">{targetClub.prestige}/100</dd></div>
                            <div className="flex flex-wrap justify-between gap-2 py-3"><dt>Transfer Budget</dt><dd className="font-semibold tabular-nums">${targetClub.transferBudget.toLocaleString()}</dd></div>
                        </dl>
                        <section className="py-5 border-b border-[#172B24]/20">
                            <h4 className="font-semibold mb-3">Club Objectives</h4>
                            <ul className="space-y-3">
                                {targetClub.objectives.map((obj, i) => (
                                    <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                                        <Target className="h-4 w-4 mt-0.5 shrink-0 text-[#A47837]" strokeWidth={1.75} aria-hidden="true" />{obj}
                                    </li>
                                ))}
                            </ul>
                        </section>
                        <section className="pt-5">
                            <h3 className="text-2xl font-semibold mb-3">Board Philosophy</h3>
                            <dl className="text-sm"><dt>Chairman Type</dt><dd className="font-semibold mt-1">{interview.chairmanPersonality}</dd></dl>
                            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed">
                                <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-[#A47837]" strokeWidth={1.75} aria-hidden="true" />
                                <span><strong>Preference:</strong> {getChairmanGuidance(interview.chairmanPersonality)}</span>
                            </p>
                        </section>
                    </aside>
                )}
                <div className={`${targetClub ? 'lg:col-span-8' : 'lg:col-span-12'} fm-panel p-5 sm:p-7`}>
                    <div className="fm-transcript pb-6">
                        <p className="fm-eyebrow mb-3">Chairman</p>
                        <blockquote className="text-xl sm:text-2xl leading-relaxed whitespace-pre-line">“{currentQuestion}”</blockquote>
                    </div>
                    <form onSubmit={handleSubmit} className="border-t border-[#172B24]/20 pt-6 space-y-4">
                        <label htmlFor="interview-answer" className="block font-semibold">Your Response</label>
                        <textarea id="interview-answer" value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} className="fm-field w-full" placeholder="State your philosophy and address the board..." rows={4} required autoFocus />
                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <span className="text-sm tabular-nums">Question {interview.currentQuestionIndex + 1} of {interview.questions.length}</span>
                            <button type="submit" className="fm-button">Submit Answer</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default JobInterviewScreen;
