
import React, { useState, useEffect, useRef } from 'react';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { UserIcon } from './icons/UserIcon';
import type { ChatMessage } from '../services/geminiService';

interface PressConferenceScreenProps {
    chatHistory: ChatMessage[];
    isLoading: boolean;
    isDone: boolean;
    onSendMessage: (message: string) => void;
    onFinish: () => void;
    onSkip: () => void;
}

const PressConferenceScreen: React.FC<PressConferenceScreenProps> = ({
    chatHistory,
    isLoading,
    isDone,
    onSendMessage,
    onFinish,
    onSkip
}) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading, isDone]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    if (isLoading && chatHistory.length === 0) {
        return (
            <div className="text-center mt-20 flex flex-col items-center justify-center min-h-[200px] gap-6">
                <NewspaperIcon className="w-12 h-12 text-gray-400 animate-pulse mb-4" />
                <p className="text-xl font-semibold animate-pulse">Journalists are gathering...</p>
                <button onClick={onSkip} className="text-xs font-bold text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded transition-colors">
                    Skip Press Conference
                </button>
            </div>
        );
    }

    return (
        <div className="mt-8 max-w-2xl mx-auto flex flex-col" style={{ minHeight: '70vh' }}>
            <div className="flex items-start justify-between mb-6">
                <div className="text-center flex-1">
                    <div className="inline-block p-3 bg-gray-800 rounded-full mb-3">
                        <NewspaperIcon className="w-7 h-7 text-gray-200" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-1">Post-Match Press Conference</h2>
                    <p className="text-gray-400 text-sm">
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Live
                        </span>
                    </p>
                </div>
                <button
                    onClick={onSkip}
                    className="flex-shrink-0 mt-1 text-xs font-bold text-gray-500 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 px-3 py-2 rounded transition-colors"
                    title="Leave press conference and continue to next week"
                >
                    Leave ✕
                </button>
            </div>

            <div className="flex-grow bg-gray-800/50 border border-gray-700 rounded-xl p-4 overflow-y-auto space-y-4 mb-4" style={{ maxHeight: '55vh' }}>
                {chatHistory.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 ${msg.role === 'manager' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'manager' ? 'bg-green-900' : 'bg-gray-700'}`}>
                            {msg.role === 'manager'
                                ? <UserIcon className="w-5 h-5 text-green-300" />
                                : <NewspaperIcon className="w-5 h-5 text-gray-300" />
                            }
                        </div>
                        <div className={`max-w-[80%] flex flex-col ${msg.role === 'manager' ? 'items-end' : 'items-start'}`}>
                            <span className={`text-xs font-bold mb-1 ${msg.role === 'manager' ? 'text-green-400 text-right' : 'text-blue-400'}`}>
                                {msg.role === 'manager' ? 'You' : 'Journalist'}
                            </span>
                            <div className={`rounded-xl px-4 py-2 text-sm leading-relaxed ${msg.role === 'manager' ? 'bg-green-800/60 text-white' : 'bg-gray-700 text-gray-100'}`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && chatHistory.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-700">
                            <NewspaperIcon className="w-5 h-5 text-gray-300" />
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

                {isDone && (
                    <div className="text-center py-4">
                        <p className="text-gray-400 text-sm mb-4">Press conference concluded.</p>
                        <button
                            onClick={onFinish}
                            className="py-2 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {!isDone && (
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                        placeholder={isLoading ? "Journalist is speaking..." : "Type your response..."}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="py-2 px-5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Respond
                    </button>
                </form>
            )}
        </div>
    );
};

export default PressConferenceScreen;
