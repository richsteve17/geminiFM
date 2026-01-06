
import React, { useState } from 'react';
import { NewspaperIcon } from './icons/NewspaperIcon';

interface PressConferenceScreenProps {
    questions: string[];
    onFinish: () => void;
}

const PressConferenceScreen: React.FC<PressConferenceScreenProps> = ({ questions, onFinish }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [history, setHistory] = useState<{q: string, a: string}[]>([]);

    const currentQuestion = questions[currentQuestionIndex];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;

        const newHistory = [...history, { q: currentQuestion, a: answer }];
        setHistory(newHistory);
        setAnswer('');

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // End of conference
            onFinish();
        }
    };

    return (
        <div className="mt-12 max-w-3xl mx-auto px-4">
            <div className="text-center mb-8">
                <div className="inline-block p-3 bg-gray-800 rounded-full mb-4">
                    <NewspaperIcon className="w-8 h-8 text-gray-200" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Post-Match Press Conference</h2>
                <p className="text-lg text-gray-400">The media is waiting for your comments.</p>
            </div>

            <div className="space-y-6">
                {/* History */}
                {history.map((item, idx) => (
                    <div key={idx} className="opacity-60">
                        <div className="bg-gray-800 p-3 rounded-t-lg border-b border-gray-700">
                            <span className="text-xs font-bold text-blue-400 uppercase">Journalist</span>
                            <p className="text-gray-300 mt-1">{item.q}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded-b-lg text-right">
                            <span className="text-xs font-bold text-green-400 uppercase">You</span>
                            <p className="text-white mt-1 italic">"{item.a}"</p>
                        </div>
                    </div>
                ))}

                {/* Current Question */}
                {currentQuestionIndex < questions.length && (
                    <div className="bg-gray-800 border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-6 bg-gray-900 border-b border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Live Question</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                                "{currentQuestion}"
                            </h3>
                        </div>
                        
                        <div className="p-6 bg-gray-800">
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="answer" className="block text-sm font-bold text-gray-400 mb-2">Your Response</label>
                                <textarea
                                    id="answer"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    placeholder="Type your answer here..."
                                    autoFocus
                                />
                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!answer.trim()}
                                        className={`px-6 py-2 bg-green-600 text-white font-bold rounded-lg transition-colors ${!answer.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                    >
                                        {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
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
