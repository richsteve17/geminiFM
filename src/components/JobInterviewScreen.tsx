
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../services/geminiService';
import { FootballIcon } from './icons/FootballIcon';
import { UserIcon } from './icons/UserIcon';

interface JobInterviewScreenProps {
    teamName: string | null;
    chairmanPersonality: string | null;
    isLoading: boolean;
    error: string | null;
    jobOffer: { offer: boolean; reasoning: string } | null;
    chatHistory: ChatMessage[];
    onSendMessage: (message: string) => void;
    onFinish: (accepted: boolean) => void;
}

const JobInterviewScreen: React.FC<JobInterviewScreenProps> = ({
    teamName,
    chairmanPersonality,
    isLoading,
    error,
    jobOffer,
    chatHistory,
    onSendMessage,
    onFinish
}) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading, jobOffer]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    if (isLoading && chatHistory.length === 0) {
        return (
            <div className="text-center mt-20 flex flex-col items-center justify-center min-h-[200px]">
                <FootballIcon className="w-12 h-12 text-green-400 animate-spin mb-4" />
                <p className="text-xl font-semibold animate-pulse">Contacting the chairman...</p>
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

    return (
        <div className="mt-8 max-w-2xl mx-auto flex flex-col" style={{ minHeight: '70vh' }}>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-1">Job Interview</h2>
                {teamName && <p className="text-lg text-gray-400">{teamName} — <span className="text-blue-400">{chairmanPersonality}</span></p>}
            </div>

            <div className="flex-grow bg-gray-800/50 border border-gray-700 rounded-xl p-4 overflow-y-auto space-y-4 mb-4" style={{ maxHeight: '55vh' }}>
                {chatHistory.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 ${msg.role === 'manager' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'manager' ? 'bg-green-900' : 'bg-blue-900'}`}>
                            <UserIcon className={`w-5 h-5 ${msg.role === 'manager' ? 'text-green-300' : 'text-blue-300'}`} />
                        </div>
                        <div className={`max-w-[80%] ${msg.role === 'manager' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <span className={`text-xs font-bold mb-1 ${msg.role === 'manager' ? 'text-green-400 text-right' : 'text-blue-400'}`}>
                                {msg.role === 'manager' ? 'You' : 'Chairman'}
                            </span>
                            <div className={`rounded-xl px-4 py-2 text-sm leading-relaxed ${msg.role === 'manager' ? 'bg-green-800/60 text-white' : 'bg-gray-700 text-gray-100'}`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && chatHistory.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-900">
                            <UserIcon className="w-5 h-5 text-blue-300" />
                        </div>
                        <div className="bg-gray-700 rounded-xl px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {jobOffer && (
                    <div className={`rounded-xl p-6 text-center border ${jobOffer.offer ? 'bg-green-900/40 border-green-600' : 'bg-red-900/40 border-red-600'}`}>
                        <h3 className={`text-2xl font-bold mb-3 ${jobOffer.offer ? 'text-green-400' : 'text-red-400'}`}>
                            {jobOffer.offer ? "Job Offer!" : "Application Unsuccessful"}
                        </h3>
                        <p className="text-gray-200 italic mb-5">"{jobOffer.reasoning}"</p>
                        {jobOffer.offer ? (
                            <button
                                onClick={() => onFinish(true)}
                                className="py-2 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Accept Job
                            </button>
                        ) : (
                            <button
                                onClick={() => onFinish(false)}
                                className="py-2 px-8 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Return to Job Centre
                            </button>
                        )}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {!jobOffer && (
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                        placeholder={isLoading ? "Chairman is thinking..." : "Type your response..."}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="py-2 px-5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            )}
        </div>
    );
};

export default JobInterviewScreen;
