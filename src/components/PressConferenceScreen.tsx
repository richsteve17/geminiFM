import React, { useState } from 'react';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { evaluatePressConference, PressConferenceReport } from '../services/geminiService';

interface PressConferenceScreenProps {
    questions: string[];
    resultContext: string;
    onFinish: (report: PressConferenceReport) => void;
}

const PressConferenceScreen: React.FC<PressConferenceScreenProps> = ({ questions = [], resultContext, onFinish }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [history, setHistory] = useState<{ q: string, a: string }[]>([]);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [report, setReport] = useState<PressConferenceReport | null>(null);

    const safeQuestions = questions.length > 0 ? questions : ["What are your thoughts on the match?", "How will you prepare for the next game?", "Any words for the fans?"];
    const currentQuestion = safeQuestions[currentQuestionIndex] || "No further questions.";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;

        const newHistory = [...history, { q: currentQuestion, a: answer }];
        setHistory(newHistory);
        setAnswer('');

        if (currentQuestionIndex < safeQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setIsLoadingReport(true);
            try {
                const res = await evaluatePressConference(newHistory, resultContext);
                setReport(res);
            } catch (err) {
                console.error(err);
                // Fallback report
                setReport({
                    headline: "Manager Addresses Match Performance",
                    article: "The manager faced the reporters at the post-match conference, answering queries on team tactics and upcoming fixtures.",
                    mediaTone: 'neutral',
                    reputationChange: 1,
                    squadFormChange: 1,
                    newspaperName: "The Daily Pitch"
                });
            } finally {
                setIsLoadingReport(false);
            }
        }
    };

    // Render loading state
    if (isLoadingReport) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-pulse">
                <div className="p-4 bg-gray-800 rounded-full mb-6">
                    <NewspaperIcon className="w-12 h-12 text-blue-400 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Printing Morning Edition...</h3>
                <p className="text-gray-400 text-sm">Sports editors are compiling your quotes and analyzing your tactical responses.</p>
            </div>
        );
    }

    // Render newspaper preview
    if (report) {
        return (
            <div className="mt-8 max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-6">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Newspaper Released</span>
                    <h2 className="text-2xl font-bold text-white">Press Outlets Go To Print</h2>
                </div>

                {/* Newspaper Mockup */}
                <div className="bg-[#fcfaf2] border-[12px] border-double border-[#d2c9b4] text-gray-900 rounded-lg p-6 shadow-2xl overflow-hidden font-serif">
                    {/* Header */}
                    <div className="text-center border-b-4 border-double border-gray-900 pb-3">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter uppercase font-serif select-none text-black">
                            {report.newspaperName}
                        </h1>
                        <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold text-gray-600 mt-2 px-1 border-t border-gray-300 pt-1">
                            <span>Football Late Edition</span>
                            <span>Issue Vol. CXXIV</span>
                            <span>Price $0.50</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="py-4 text-center border-b border-gray-300">
                        <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight text-black uppercase hover:underline cursor-default">
                            "{report.headline}"
                        </h2>
                        <p className="text-[11px] font-sans font-bold uppercase text-red-700 tracking-wider mt-1.5">
                            Tone: {report.mediaTone}
                        </p>
                    </div>

                    {/* Article Body */}
                    <div className="py-4 text-sm leading-relaxed text-gray-800 text-justify border-b border-gray-300 font-serif md:columns-2 gap-5">
                        <span className="font-sans font-bold text-xs uppercase bg-black text-white px-1.5 py-0.5 mr-1.5 inline-block select-none">Staff Reporter</span>
                        {report.article}
                    </div>

                    {/* Gameplay Impacts */}
                    <div className="pt-4 font-sans">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Locker Room & Standing Impact</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#f0ece1] p-3 rounded border border-[#d2c9b4] flex items-center gap-2">
                                <span className="text-xl">📈</span>
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Manager Reputation</p>
                                    <p className={`text-sm font-black ${report.reputationChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {report.reputationChange >= 0 ? '+' : ''}{report.reputationChange}%
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[#f0ece1] p-3 rounded border border-[#d2c9b4] flex items-center gap-2">
                                <span className="text-xl">✨</span>
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Squad Form Rating</p>
                                    <p className={`text-sm font-black ${report.squadFormChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {report.squadFormChange >= 0 ? '+' : ''}{report.squadFormChange} points
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => onFinish(report)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-lg uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.02]"
                    >
                        Proceed to Next Week &rarr;
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-12 max-w-3xl mx-auto px-4 pb-12">
            <div className="text-center mb-8">
                <div className="inline-block p-3 bg-gray-800 rounded-full mb-4">
                    <NewspaperIcon className="w-8 h-8 text-gray-205" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Post-Match Press Conference</h2>
                <p className="text-sm text-gray-400">The media is waiting for your comments. Be careful: your responses affect team form and board reputation.</p>
            </div>

            <div className="space-y-6">
                {/* History */}
                {history.map((item, idx) => (
                    <div key={idx} className="opacity-60 transition-opacity hover:opacity-90 duration-300">
                        <div className="bg-gray-805 border border-gray-700 p-3.5 rounded-t-lg border-b-0">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Journalist</span>
                            <p className="text-gray-205 mt-1 font-semibold">"{item.q}"</p>
                        </div>
                        <div className="bg-gray-800/40 border border-gray-700 p-3.5 rounded-b-lg text-right">
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">You</span>
                            <p className="text-white mt-1 italic font-medium">"{item.a}"</p>
                        </div>
                    </div>
                ))}

                {/* Current Question */}
                {currentQuestionIndex < safeQuestions.length && (
                    <div className="bg-gray-800 border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-6 bg-gray-900 border-b border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Live Question {currentQuestionIndex + 1} of {safeQuestions.length}</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                                "{currentQuestion}"
                            </h3>
                        </div>
                        
                        <div className="p-6 bg-gray-800">
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="answer" className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Your Response</label>
                                <textarea
                                    id="answer"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-750 border border-gray-600 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500 focus:border-transparent transition-all focus:outline-none"
                                    placeholder="Speak clearly and address the journalists..."
                                    autoFocus
                                />
                                <div className="mt-4 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 italic">Press Enter or click button</span>
                                    <button
                                        type="submit"
                                        disabled={!answer.trim()}
                                        className={`px-6 py-2.5 bg-green-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-colors ${!answer.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                    >
                                        {currentQuestionIndex === safeQuestions.length - 1 ? 'Go to Editorial' : 'Next Question'}
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
