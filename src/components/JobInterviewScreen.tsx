import React, { useState } from 'react';
import type { Interview } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';
import { TEAMS } from '../constants';

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
            <div className="text-center mt-20 flex flex-col items-center justify-center min-h-[200px]">
                <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                <p className="text-xl font-semibold animate-pulse">{interview ? "Evaluating answers..." : "Contacting the chairman..."}</p>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Interview Cancelled</h2>
                <p className="text-white">{error}</p>
                <button onClick={() => onFinish(false)} className="mt-6 py-2 px-6 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">
                    Return to Job Centre
                </button>
             </div>
         );
    }

    if (jobOffer) {
        return (
             <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h2 className={`text-3xl font-bold mb-4 ${jobOffer.offer ? 'text-green-400' : 'text-red-400'}`}>
                    {jobOffer.offer ? "You're Hired!" : "Application Unsuccessful"}
                </h2>
                <div className="text-left bg-gray-900/50 p-6 rounded-md my-6 border border-gray-600">
                    <p className="italic text-gray-300 text-lg">" {jobOffer.reasoning} "</p>
                </div>
                {jobOffer.offer ? (
                    <button onClick={() => onFinish(true)} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/50">
                        Accept Job
                    </button>
                ) : (
                    <button onClick={() => onFinish(false)} className="py-3 px-8 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                        Return to Job Centre
                    </button>
                )}
            </div>
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
        <div className="max-w-6xl mx-auto px-4 mt-8 pb-12">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Job Interview: {interview.teamName}</h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">
                    Interview room &bull; Chairman Vacancy Panel
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left side: Conversation Area */}
                <div className="lg:col-span-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6 shadow-xl space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 border-2 border-blue-700">
                             <UserIcon className="w-6 h-6 text-blue-300" />
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg rounded-tl-none border border-gray-600 flex-grow">
                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Chairman</p>
                            <p className="text-white text-lg leading-relaxed font-serif">"{currentQuestion}"</p>
                        </div>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="flex items-start gap-4 pt-6 border-t border-gray-700/50">
                        <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0 border-2 border-green-700">
                             <UserIcon className="w-6 h-6 text-green-300" />
                        </div>
                        <div className="flex-grow space-y-4">
                            <textarea
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                className="w-full p-3 bg-gray-750 border border-gray-600 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 transition-colors focus:outline-none"
                                placeholder="State your philosophy and address the board..."
                                rows={4}
                                required
                                autoFocus
                            />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 italic">Question {interview.currentQuestionIndex + 1} of {interview.questions.length}</span>
                                <button type="submit" className="py-2.5 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                                    Submit Answer
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Right side: Important Details Sidebar */}
                {targetClub && (
                    <div className="lg:col-span-4 space-y-6">
                        {/* Club Identity Card */}
                        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5 shadow-lg backdrop-blur-md">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-700/50">Club Profile</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Prestige</span>
                                    <span className="text-sm font-black text-white">{targetClub.prestige}/100</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Transfer Budget</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono">${targetClub.transferBudget.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Club Objectives</span>
                                    <div className="space-y-1">
                                        {targetClub.objectives.map((obj, i) => (
                                            <div key={i} className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                                                <span>🎯</span> {obj}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chairman Personality card */}
                        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5 shadow-lg backdrop-blur-md">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-gray-700/50">Board Philosophy</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Chairman Type</span>
                                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-black text-blue-400">{interview.chairmanPersonality}</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                                    💡 <strong className="text-slate-300">Preference:</strong> {getChairmanGuidance(interview.chairmanPersonality)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobInterviewScreen;
