import React, { useState } from 'react';
import type { Interview } from '../types';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';

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
            </div>
         );
    }

    if (jobOffer) {
        return (
             <div className="mt-20 max-w-2xl mx-auto text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg">
                <h2 className={`text-3xl font-bold mb-4 ${jobOffer.offer ? 'text-green-400' : 'text-red-400'}`}>
                    {jobOffer.offer ? "You're Hired!" : "Application Unsuccessful"}
                </h2>
                <div className="text-left bg-gray-900/50 p-4 rounded-md my-6">
                    <p className="italic text-gray-300">" {jobOffer.reasoning} "</p>
                </div>
                {jobOffer.offer ? (
                    <button onClick={() => onFinish(true)} className="py-2 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                        Accept Job
                    </button>
                ) : (
                    <button onClick={() => onFinish(false)} className="py-2 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                        Return to Job Centre
                    </button>
                )}
            </div>
        );
    }

    if (!interview) return null;

    const currentQuestion = interview.questions[interview.currentQuestionIndex];

    return (
        <div className="mt-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Job Interview: {interview.teamName}</h2>
                <p className="text-lg text-gray-400">The chairman has some questions for you.</p>
            </div>

            <div className="space-y-4 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                         <UserIcon className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                        <p className="font-bold text-blue-400">Chairman</p>
                        <p className="text-white mt-1">{currentQuestion}</p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="flex items-start gap-4 pt-4 border-t border-gray-700/50">
                    <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center flex-shrink-0">
                         <UserIcon className="w-6 h-6 text-green-300" />
                    </div>
                    <div className="flex-grow">
                        <textarea
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500"
                            placeholder="Your answer..."
                            rows={4}
                            required
                        />
                         <button type="submit" className="mt-2 py-2 px-5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                            Submit Answer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobInterviewScreen;
