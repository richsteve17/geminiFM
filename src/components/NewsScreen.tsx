
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
}

const getIconForType = (type: NewsItem['type']) => {
    switch(type) {
        case 'call-up': return <UserGroupIcon className="w-6 h-6 text-blue-400" />;
        case 'tournament-result': return <GlobeAltIcon className="w-6 h-6 text-yellow-400" />;
        case 'match-report': return <NewspaperIcon className="w-6 h-6 text-blue-300" />;
        case 'board-message': return <UserIcon className="w-6 h-6 text-purple-400" />;
        case 'player-return': return <UserIcon className="w-6 h-6 text-green-400" />;
        case 'chemistry-rift': return <BrokenLinkIcon className="w-6 h-6 text-orange-400" />;
        case 'serious-rift': return <BrokenLinkIcon className="w-6 h-6 text-red-500" />;
        case 'teammate-bond': return <UserGroupIcon className="w-6 h-6 text-emerald-400" />;
        case 'contract-renewal': return <DocumentCheckIcon className="w-6 h-6 text-teal-400" />;
        case 'player-departure': return <ArrowLeftStartOnRectangleIcon className="w-6 h-6 text-red-400" />;
        default: return <NewspaperIcon className="w-6 h-6 text-gray-400" />;
    }
}

const getBorderForType = (type: NewsItem['type']) => {
    switch (type) {
        case 'serious-rift': return 'border-red-700 bg-red-950/30';
        case 'board-message': return 'border-purple-800 bg-purple-950/20';
        case 'chemistry-rift': return 'border-orange-800 bg-orange-950/20';
        case 'teammate-bond': return 'border-emerald-800 bg-emerald-950/20';
        case 'match-report': return 'border-blue-900 bg-blue-950/20';
        default: return 'border-gray-700 bg-gray-800/50';
    }
};

const getTitleColorForType = (type: NewsItem['type']) => {
    switch (type) {
        case 'serious-rift': return 'text-red-400';
        case 'board-message': return 'text-purple-300';
        case 'chemistry-rift': return 'text-orange-400';
        case 'teammate-bond': return 'text-emerald-400';
        case 'match-report': return 'text-blue-300';
        default: return 'text-green-400';
    }
};

const NewsScreen: React.FC<NewsScreenProps> = ({ news, onBack, onRiftDecision }) => {
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
                                <h3 className={`font-bold text-lg ${getTitleColorForType(item.type)}`}>
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
