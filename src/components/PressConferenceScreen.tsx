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

const impactClass = (value: number) => value > 0 ? 'text-green-700' : value < 0 ? 'text-red-700' : 'text-gray-700';
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
            <div className="mt-12 max-w-xl mx-auto px-4 text-center">
                <div className="bg-gray-900 border border-amber-600/60 rounded-xl p-7 shadow-2xl">
                    <NewspaperIcon className="w-10 h-10 text-amber-400 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">AI press desk unavailable</p>
                    <h2 className="text-2xl font-bold text-white mt-2">No editorial was fabricated</h2>
                    <p className="text-sm text-gray-300 mt-3">{failure.message}</p>
                    <p className="text-xs font-mono text-gray-500 mt-4">{failure.code}</p>
                    {failure.retryable && onRetryQuestions && (
                        <button
                            type="button"
                            onClick={onRetryQuestions}
                            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg"
                        >
                            Retry AI questions
                        </button>
                    )}
                    {onSkip && <button onClick={onSkip} className="block mx-auto mt-4 text-sm text-gray-400 underline">Continue without a press outcome</button>}
                </div>
            </div>
        );
    }

    if (isEvaluating) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-pulse">
                <div className="p-4 bg-gray-800 rounded-full mb-6">
                    <NewspaperIcon className="w-12 h-12 text-blue-400 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Editorial Desk Reviewing Quotes...</h3>
                <p className="text-gray-400 text-sm">The report will be based on the match snapshot and your exact answers.</p>
            </div>
        );
    }

    if (evaluation?.mode === 'unavailable') {
        return (
            <div className="mt-12 max-w-xl mx-auto px-4 text-center">
                <div className="bg-gray-900 border border-amber-600/60 rounded-xl p-7 shadow-2xl">
                    <NewspaperIcon className="w-10 h-10 text-amber-400 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">AI editorial unavailable</p>
                    <h2 className="text-2xl font-bold text-white mt-2">Your answers were saved; no outcome was applied</h2>
                    <p className="text-sm text-gray-300 mt-3">{evaluation.failure.message}</p>
                    <p className="text-xs font-mono text-gray-500 mt-4">{evaluation.failure.code}</p>
                    {evaluation.failure.retryable && (
                        <button
                            type="button"
                            onClick={() => void requestEditorial(answers)}
                            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg"
                        >
                            Retry AI editorial
                        </button>
                    )}
                    {onSkip && <button onClick={onSkip} className="block mx-auto mt-4 text-sm text-gray-400 underline">Continue without a press outcome</button>}
                </div>
            </div>
        );
    }

    if (evaluation?.mode === 'ai-editorial') {
        const report = evaluation.report;
        const assessmentByQuestion = new Map(report.answerAssessments.map(assessment => [assessment.questionId, assessment]));
        return (
            <div className="mt-8 max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-6">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">AI editorial published</span>
                    <h2 className="text-2xl font-bold text-white">Press Outlets Go To Print</h2>
                    <p className="text-xs text-gray-400 mt-2">Mode: AI editorial · {evaluation.provider} · transcript {report.evaluationId}</p>
                </div>

                <div className="bg-[#fcfaf2] border-[12px] border-double border-[#d2c9b4] text-gray-900 rounded-lg p-6 shadow-2xl overflow-hidden font-serif">
                    <div className="text-center border-b-4 border-double border-gray-900 pb-3">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter uppercase text-black">{report.newspaperName}</h1>
                        <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold text-gray-600 mt-2 px-1 border-t border-gray-300 pt-1">
                            <span>Football Late Edition</span>
                            <span>AI-checked transcript</span>
                            <span>Post-match</span>
                        </div>
                    </div>

                    <div className="py-4 text-center border-b border-gray-300">
                        <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight text-black uppercase">“{report.headline}”</h2>
                        <p className="text-[11px] font-sans font-bold uppercase text-red-700 tracking-wider mt-1.5">Tone: {report.mediaTone}</p>
                    </div>

                    <div className="py-4 text-sm leading-relaxed text-gray-800 text-justify border-b border-gray-300 font-serif md:columns-2 gap-5">
                        <span className="font-sans font-bold text-xs uppercase bg-black text-white px-1.5 py-0.5 mr-1.5 inline-block select-none">Staff Reporter</span>
                        {report.article}
                    </div>

                    <div className="py-4 border-b border-gray-300 font-sans">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">How the answers were read</h4>
                        <div className="space-y-2">
                            {activeSession.questions.map(question => {
                                const assessment = assessmentByQuestion.get(question.id);
                                if (!assessment) return null;
                                return (
                                    <div key={question.id} className="text-xs text-gray-700 bg-[#f0ece1] border border-[#d2c9b4] rounded p-2">
                                        <span className="font-black uppercase text-[9px]">{assessment.disposition}</span>
                                        <span className="mx-1">·</span>
                                        <span>{assessment.explanation}</span>
                                        <blockquote className="mt-1 italic text-gray-600">“{assessment.evidenceQuote}”</blockquote>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-600 mt-3"><span className="font-bold">Effect rationale:</span> {report.effectRationale}</p>
                    </div>

                    <div className="pt-4 font-sans">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Pending gameplay impact</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#f0ece1] p-3 rounded border border-[#d2c9b4]">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Manager reputation</p>
                                <p className={`text-sm font-black ${impactClass(report.reputationChange)}`}>{signed(report.reputationChange)} points</p>
                            </div>
                            <div className="bg-[#f0ece1] p-3 rounded border border-[#d2c9b4]">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Starting squad form</p>
                                <p className={`text-sm font-black ${impactClass(report.squadFormChange)}`}>{signed(report.squadFormChange)} points</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        disabled={isFinishing}
                        onClick={() => {
                            if (isFinishing) return;
                            setIsFinishing(true);
                            onFinish(report);
                        }}
                        className={`px-8 py-3 bg-blue-600 text-white font-extrabold text-sm rounded-lg uppercase tracking-wider shadow-lg ${isFinishing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    >
                        {isFinishing ? 'Applying outcome…' : 'Apply Outcome & Proceed'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-12 max-w-3xl mx-auto px-4 pb-12">
            <div className="text-center mb-8">
                <div className="inline-block p-3 bg-gray-800 rounded-full mb-4"><NewspaperIcon className="w-8 h-8 text-gray-200" /></div>
                <h2 className="text-3xl font-bold text-white mb-2">Post-Match Press Conference</h2>
                <p className="text-sm text-gray-400">Questions are grounded in this fixture. Your actual wording is sent to the editorial desk.</p>
            </div>

            <div className="space-y-6">
                {answers.map(answerItem => {
                    const question = activeSession.questions.find(candidate => candidate.id === answerItem.questionId);
                    if (!question) return null;
                    return (
                        <div key={answerItem.questionId} className="opacity-70">
                            <div className="bg-gray-800 border border-gray-700 p-3.5 rounded-t-lg border-b-0">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{question.outlet} · {question.journalist}</span>
                                <p className="text-gray-200 mt-1 font-semibold">“{question.question}”</p>
                            </div>
                            <div className="bg-gray-800/40 border border-gray-700 p-3.5 rounded-b-lg text-right">
                                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">You</span>
                                <p className="text-white mt-1 italic font-medium">“{answerItem.answer}”</p>
                            </div>
                        </div>
                    );
                })}

                {currentQuestion && (
                    <div className="bg-gray-800 border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-6 bg-gray-900 border-b border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{currentQuestion.outlet} · Question {currentQuestionIndex + 1} of {activeSession.questions.length}</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">“{currentQuestion.question}”</h3>
                        </div>
                        <div className="p-6 bg-gray-800">
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="answer" className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Your response</label>
                                <textarea
                                    id="answer"
                                    value={answer}
                                    onChange={(event) => setAnswer(event.target.value)}
                                    rows={4}
                                    maxLength={PRESS_LIMITS.maxAnswerChars}
                                    className="w-full bg-gray-750 border border-gray-600 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500 focus:border-transparent transition-all focus:outline-none"
                                    placeholder="Address the specific question in your own words…"
                                    autoFocus
                                />
                                <div className="mt-4 flex justify-between items-center gap-4">
                                    <span className="text-[10px] text-slate-500 italic">{answer.length}/{PRESS_LIMITS.maxAnswerChars} characters</span>
                                    <button
                                        type="submit"
                                        disabled={!answer.trim() || isEvaluating}
                                        className={`px-6 py-2.5 bg-green-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg ${!answer.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                    >
                                        {currentQuestionIndex === activeSession.questions.length - 1 ? 'Send to Editorial' : 'Next Question'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PressConferenceScreen;
