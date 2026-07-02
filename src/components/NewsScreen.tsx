import React from 'react';
import type { NewsItem } from '../types';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { UserIcon } from './icons/UserIcon';
import { BrokenLinkIcon } from './icons/BrokenLinkIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import { ArrowLeftStartOnRectangleIcon } from './icons/ArrowLeftStartOnRectangleIcon';

interface NewsScreenProps {
    news: NewsItem[];
    onBack: () => void;
    onRiftDecision?: (newsId: number, playerA: string, playerB: string, choice: 'bench-a' | 'bench-b' | 'risk-it') => void;
    onJobOfferDecision?: (newsId: number, teamName: string, choice: 'accept' | 'decline') => void;
}

const getIconForType = (type: NewsItem['type']) => {
    switch(type) {
        case 'call-up': return <UserGroupIcon className="w-6 h-6 text-blue-400" />;
        case 'tournament-result': return <GlobeAltIcon className="w-6 h-6 text-yellow-400" />;
        case 'player-return': return <UserIcon className="w-6 h-6 text-green-400" />;
        case 'chemistry-rift': return <BrokenLinkIcon className="w-6 h-6 text-orange-400" />;
        case 'serious-rift': return <BrokenLinkIcon className="w-6 h-6 text-red-500" />;
        case 'teammate-bond': return <UserGroupIcon className="w-6 h-6 text-emerald-400" />;
        case 'contract-renewal': return <DocumentCheckIcon className="w-6 h-6 text-teal-400" />;
        case 'player-departure': return <ArrowLeftStartOnRectangleIcon className="w-6 h-6 text-red-400" />;
        case 'job-offer': return <NewspaperIcon className="w-6 h-6 text-blue-400" />;
        default: return <NewspaperIcon className="w-6 h-6 text-gray-400" />;
    }
}

const getBorderForType = (type: NewsItem['type']) => {
    switch (type) {
        case 'serious-rift': return 'border-red-700 bg-red-950/30';
        case 'chemistry-rift': return 'border-orange-800 bg-orange-950/20';
        case 'teammate-bond': return 'border-emerald-800 bg-emerald-950/20';
        case 'job-offer': return 'border-blue-800 bg-blue-950/25';
        default: return 'border-gray-700 bg-gray-800/50';
    }
};

const NewsScreen: React.FC<NewsScreenProps> = ({ news, onBack, onRiftDecision, onJobOfferDecision }) => {
    return (
        <div className="mt-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">News Feed</h2>
                <p className="text-lg text-gray-400">The latest headlines from the footballing world.</p>
            </div>
            <div className="space-y-4">
                {news.length === 0 ? (
                    <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-gray-400">No news to report yet. Advance the season to see what happens.</p>
                    </div>
                ) : (
                    news.map(item => (
                        <div key={item.id} className={`rounded-lg shadow-lg border p-4 flex items-start gap-4 ${getBorderForType(item.type)}`}>
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center">
                                {getIconForType(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-400">Week {item.week}</p>
                                <h3 className={`font-bold text-lg ${item.type === 'serious-rift' ? 'text-red-400' : item.type === 'teammate-bond' ? 'text-emerald-400' : 'text-green-400'}`}>
                                    {item.title}
                                </h3>
                                <p className="text-gray-300 mt-1">{item.body}</p>

                                {item.type === 'serious-rift' && item.riftDecision && onRiftDecision && (
                                    <div className="mt-3">
                                        {item.riftDecision.choice ? (
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Decision: {item.riftDecision.choice === 'bench-a' ? `Bench ${item.riftDecision.riftPlayerA}` : item.riftDecision.choice === 'bench-b' ? `Bench ${item.riftDecision.riftPlayerB}` : 'Risk it — both play'}
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-red-300 mb-2 uppercase tracking-wider">Manager Decision Required:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => onRiftDecision(item.id, item.riftDecision!.riftPlayerA, item.riftDecision!.riftPlayerB, 'bench-a')}
                                                        className="text-xs font-bold bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-3 py-1.5 rounded hover:bg-yellow-800 transition-colors"
                                                    >
                                                        Bench {item.riftDecision.riftPlayerA}
                                                    </button>
                                                    <button
                                                        onClick={() => onRiftDecision(item.id, item.riftDecision!.riftPlayerA, item.riftDecision!.riftPlayerB, 'bench-b')}
                                                        className="text-xs font-bold bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-3 py-1.5 rounded hover:bg-yellow-800 transition-colors"
                                                    >
                                                        Bench {item.riftDecision.riftPlayerB}
                                                    </button>
                                                    <button
                                                        onClick={() => onRiftDecision(item.id, item.riftDecision!.riftPlayerA, item.riftDecision!.riftPlayerB, 'risk-it')}
                                                        className="text-xs font-bold bg-red-900/60 border border-red-700 text-red-200 px-3 py-1.5 rounded hover:bg-red-800 transition-colors"
                                                    >
                                                        Risk it — both play
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {item.type === 'job-offer' && item.jobOfferDecision && onJobOfferDecision && (
                                    <div className="mt-3">
                                        {item.jobOfferDecision.choice ? (
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Decision: {item.jobOfferDecision.choice === 'accept' ? 'Contract Accepted' : 'Contract Declined'}
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-blue-300 mb-2 uppercase tracking-wider">Board Offer Received:</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'accept')}
                                                        className="text-xs font-bold bg-green-900/60 border border-green-700 text-green-200 px-3 py-1.5 rounded hover:bg-green-800 transition-colors"
                                                    >
                                                        Accept Contract
                                                    </button>
                                                    <button
                                                        onClick={() => onJobOfferDecision(item.id, item.jobOfferDecision!.teamName, 'decline')}
                                                        className="text-xs font-bold bg-gray-700 border border-gray-600 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-650 transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="text-center mt-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Screen
                 </button>
            </div>
        </div>
    );
};

export default NewsScreen;
