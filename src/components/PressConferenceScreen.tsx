import React, { useMemo, useState } from 'react';
import { NewspaperIcon } from './icons/NewspaperIcon';
import {
    evaluatePressConference,
    type PressConferenceReport,
    type PressConferenceSession,
    type PressQuestionGenerationResult,
} from '../services/geminiService';
import {
    createLegacyPressSession,
    PRESS_LIMITS,
    type PressAnswer,
    type PressConferenceEvaluationResult,
} from '../engine/pressConference';

export interface PressProgress { sessionId: string; answers: PressAnswer[]; evaluation: PressConferenceEvaluationResult | null }

interface PressConferenceScreenProps {
    /** Preferred parent handoff: includes the immutable match snapshot and AI-generated question ids. */
    session?: PressConferenceSession;
    /** Preferred generation result: allows provider/schema failure to be shown instead of replaced. */
    questionResult?: PressQuestionGenerationResult;
    /** Temporary compatibility with the pre-session App handoff. No default questions are manufactured. */
    questions?: string[];
    resultContext?: string;
    onFinish: (report: PressConferenceReport) => void;
    onRetryQuestions?: () => void;
    onSkip?: () => void;
    initialProgress?: PressProgress | null;
    onProgress?: (progress: PressProgress) => void;
}

const impactClass = (value: number) => value > 0 ? 'text-[#18392F]' : value < 0 ? 'text-[#8C3931]' : 'text-[#172B24]';
const signed = (value: number) => value > 0 ? `+${value}` : `${value}`;

const PressConferenceScreen: React.FC<PressConferenceScreenProps> = ({
    session,
    questionResult,
    questions,
    resultContext = '',
    onFinish,
    onRetryQuestions,
    onSkip,
    initialProgress,
    onProgress,
}) => {
    const legacySession = useMemo(
        () => session ? null : createLegacyPressSession(questions || [], resultContext),
        [session, questions, resultContext],
    );
    const activeSession = session || (questionResult?.mode === 'ai-questions' ? questionResult.session : null) || legacySession;
    const questionFailure = questionResult?.mode === 'unavailable' ? questionResult.failure : null;

    const saved = initialProgress?.sessionId === activeSession?.id ? initialProgress : null;
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(Math.min(2, saved?.answers.length || 0));
    const [answer, setAnswer] = useState('');
    const [answers, setAnswers] = useState<PressAnswer[]>(saved?.answers || []);
    const [evaluation, setEvaluation] = useState<PressConferenceEvaluationResult | null>(saved?.evaluation || null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);

    const currentQuestion = activeSession?.questions[currentQuestionIndex];

    const requestEditorial = async (nextAnswers: PressAnswer[]) => {
        if (!activeSession || isEvaluating) return;
        setIsEvaluating(true);
        const result = await evaluatePressConference({ session: activeSession, answers: nextAnswers });
        setEvaluation(result);
        onProgress?.({ sessionId: activeSession.id, answers: nextAnswers, evaluation: result });
        setIsEvaluating(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeSession || !currentQuestion || !answer.trim() || isEvaluating) return;

        const nextAnswers = [...answers.filter(item => item.questionId !== currentQuestion.id), { questionId: currentQuestion.id, answer: answer.trim() }];
        setAnswers(nextAnswers);
        onProgress?.({ sessionId: activeSession.id, answers: nextAnswers, evaluation: null });
        setAnswer('');

        if (currentQuestionIndex < activeSession.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            return;
        }
        await requestEditorial(nextAnswers);
    };

    if (questionFailure || !activeSession) {
        const failure = questionFailure || {
            code: 'PRESS_CONTEXT_INVALID' as const,
            message: 'No verified press-conference session is available. The game did not substitute generic questions.',
            retryable: false,
        };
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#A47837]" role="alert">
                    <p className="fm-eyebrow flex items-center gap-2"><NewspaperIcon className="w-5 h-5" />AI press desk unavailable</p>
                    <h2 className="fm-screen-title">No editorial was fabricated</h2>
                    <p className="mt-4 leading-relaxed">{failure.message}</p>
                    <p className="text-sm font-mono break-all mt-4">{failure.code}</p>
                    <footer className="mt-6 border-t border-[#172B24]/20 pt-5 flex flex-wrap gap-3">
                        {failure.retryable && onRetryQuestions && <button type="button" onClick={onRetryQuestions} className="fm-button">Retry AI questions</button>}
                        {onSkip && <button onClick={onSkip} className="fm-button-secondary">Continue without a press outcome</button>}
                    </footer>
                </div>
            </section>
        );
    }

    if (isEvaluating) {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8" role="status" aria-live="polite">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#A47837]">
                    <p className="fm-eyebrow flex items-center gap-2"><NewspaperIcon className="w-5 h-5" />AI Editorial Desk</p>
                    <h2 className="fm-screen-title">AI Editorial Desk Reviewing Quotes...</h2>
                    <p className="mt-4 leading-relaxed">The report will be based on the match snapshot and your exact answers.</p>
                </div>
            </section>
        );
    }

    if (evaluation?.mode === 'unavailable') {
        return (
            <section className="fm-screen max-w-3xl mx-auto px-4 py-8">
                <div className="fm-panel p-6 sm:p-8 border-t-4 border-[#A47837]" role="alert">
                    <p className="fm-eyebrow flex items-center gap-2"><NewspaperIcon className="w-5 h-5" />AI editorial unavailable</p>
                    <h2 className="fm-screen-title">Your answers were saved; no outcome was applied</h2>
                    <p className="mt-4 leading-relaxed">{evaluation.failure.message}</p>
                    <p className="text-sm font-mono break-all mt-4">{evaluation.failure.code}</p>
                    <footer className="mt-6 border-t border-[#172B24]/20 pt-5 flex flex-wrap gap-3">
                        {evaluation.failure.retryable && <button type="button" onClick={() => void requestEditorial(answers)} className="fm-button">Retry AI editorial</button>}
                        {onSkip && <button onClick={onSkip} className="fm-button-secondary">Continue without a press outcome</button>}
                    </footer>
                </div>
            </section>
        );
    }

    if (evaluation?.mode === 'ai-editorial') {
        const report = evaluation.report;
        const assessmentByQuestion = new Map(report.answerAssessments.map(assessment => [assessment.questionId, assessment]));
        return (
            <section className="fm-screen max-w-6xl mx-auto px-4 py-8">
                <header className="mb-8 border-b border-[#172B24]/25 pb-6">
                    <p className="fm-eyebrow">AI editorial published</p>
                    <h2 className="fm-screen-title">Press Outlets Go To Print</h2>
                    <p className="text-sm mt-3 break-words">Mode: AI editorial · {evaluation.provider} · transcript {report.evaluationId}</p>
                </header>
                <div className="grid gap-7 lg:grid-cols-[minmax(0,3fr)_minmax(15rem,1fr)] items-start">
                    <article className="fm-panel p-5 sm:p-8">
                        <header className="border-y-2 border-[#172B24] py-4">
                            <h3 className="text-3xl sm:text-4xl font-semibold leading-none">{report.newspaperName}</h3>
                            <div className="flex flex-wrap justify-between gap-2 text-sm mt-3">
                                <span>Football Late Edition</span><span>AI-checked transcript</span><span>Post-match</span>
                            </div>
                        </header>
                        <div className="py-6 border-b border-[#172B24]/20">
                            <h4 className="text-3xl sm:text-4xl font-semibold leading-tight" style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>“{report.headline}”</h4>
                            <p className="text-sm mt-3">Tone: <strong>{report.mediaTone}</strong></p>
                        </div>
                        <div className="py-6 border-b border-[#172B24]/20">
                            <p className="fm-eyebrow mb-3">Staff Reporter</p>
                            <p className="text-base leading-relaxed whitespace-pre-line">{report.article}</p>
                        </div>
                        <section className="pt-6">
                            <h4 className="text-2xl font-semibold mb-4">How the answers were read</h4>
                            <div className="divide-y divide-[#172B24]/15">
                                {activeSession.questions.map(question => {
                                    const assessment = assessmentByQuestion.get(question.id);
                                    if (!assessment) return null;
                                    return (
                                        <div key={question.id} className="fm-transcript py-4">
                                            <p className="font-semibold text-sm">{question.outlet} · {question.journalist}</p>
                                            <p className="text-sm leading-relaxed mt-2"><strong>{assessment.disposition}</strong> · {assessment.explanation}</p>
                                            <blockquote className="mt-3 border-l-2 border-[#A47837] pl-4 leading-relaxed whitespace-pre-line">“{assessment.evidenceQuote}”</blockquote>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-sm leading-relaxed mt-4 border-t border-[#172B24]/20 pt-4"><strong>Effect rationale:</strong> {report.effectRationale}</p>
                        </section>
                    </article>
                    <aside className="border-t-2 border-[#A47837] pt-5 lg:sticky lg:top-6">
                        <h3 className="text-2xl font-semibold mb-4">Pending gameplay impact</h3>
                        <dl className="border-y border-[#172B24]/20 divide-y divide-[#172B24]/15">
                            <div className="py-4"><dt className="text-sm">Manager reputation</dt><dd className={`text-2xl font-semibold tabular-nums mt-1 ${impactClass(report.reputationChange)}`}>{signed(report.reputationChange)} points</dd></div>
                            <div className="py-4"><dt className="text-sm">Starting squad form</dt><dd className={`text-2xl font-semibold tabular-nums mt-1 ${impactClass(report.squadFormChange)}`}>{signed(report.squadFormChange)} points</dd></div>
                        </dl>
                        <button type="button" disabled={isFinishing} onClick={() => {
                            if (isFinishing) return;
                            setIsFinishing(true);
                            onFinish(report);
                        }} className="fm-button w-full mt-5">{isFinishing ? 'Applying outcome…' : 'Apply Outcome & Proceed'}</button>
                    </aside>
                </div>
            </section>
        );
    }

    return (
        <section className="fm-screen max-w-6xl mx-auto px-4 py-8">
            <header className="flex flex-wrap items-end justify-between gap-4 mb-8 border-b border-[#172B24]/25 pb-6">
                <div>
                    <p className="fm-eyebrow">Post-match · Press desk</p>
                    <h2 className="fm-screen-title">Post-Match Press Conference</h2>
                    <p className="mt-3 max-w-2xl leading-relaxed">Questions are grounded in this fixture. Your actual wording is sent to the editorial desk.</p>
                </div>
                <p className="text-sm tabular-nums">Question {currentQuestionIndex + 1} of {activeSession.questions.length}</p>
            </header>
            {!!answers.length && (
                <div className="fm-panel mb-7 p-5 sm:p-7">
                    <h3 className="text-2xl font-semibold border-b border-[#172B24]/20 pb-4">Transcript</h3>
                    <div className="divide-y divide-[#172B24]/15">
                        {answers.map(answerItem => {
                            const question = activeSession.questions.find(candidate => candidate.id === answerItem.questionId);
                            if (!question) return null;
                            return (
                                <div key={answerItem.questionId} className="fm-transcript py-5 grid gap-4 md:grid-cols-2 md:gap-7">
                                    <div>
                                        <p className="text-sm font-semibold mb-2">{question.outlet} · {question.journalist}</p>
                                        <blockquote className="leading-relaxed whitespace-pre-line">“{question.question}”</blockquote>
                                    </div>
                                    <div className="border-l-2 border-[#A47837] pl-4">
                                        <p className="text-sm font-semibold mb-2">You</p>
                                        <blockquote className="leading-relaxed whitespace-pre-line">“{answerItem.answer}”</blockquote>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {currentQuestion && (
                <div className="fm-panel grid gap-0 lg:grid-cols-2 overflow-hidden">
                    <div className="fm-transcript p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#172B24]/20">
                        <p className="fm-eyebrow mb-3">{currentQuestion.outlet} · Question {currentQuestionIndex + 1} of {activeSession.questions.length}</p>
                        <p className="text-sm font-semibold mb-4">{currentQuestion.journalist}</p>
                        <h3 className="text-2xl sm:text-3xl leading-relaxed font-semibold">“{currentQuestion.question}”</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="p-5 sm:p-7">
                        <label htmlFor="answer" className="block font-semibold mb-3">Your response</label>
                        <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} maxLength={PRESS_LIMITS.maxAnswerChars} className="fm-field w-full" placeholder="Address the specific question in your own words…" autoFocus />
                        <div className="mt-4 flex flex-wrap justify-between items-center gap-4">
                            <span className="text-sm tabular-nums">{answer.length}/{PRESS_LIMITS.maxAnswerChars} characters</span>
                            <button type="submit" disabled={!answer.trim() || isEvaluating} className="fm-button">{currentQuestionIndex === activeSession.questions.length - 1 ? 'Send to Editorial' : 'Next Question'}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default PressConferenceScreen;
