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
}

const getIconForType = (type: NewsItem['type']) => {
    switch(type) {
        case 'call-up': return <UserGroupIcon className="w-6 h-6 text-blue-400" />;
        case 'tournament-result': return <GlobeAltIcon className="w-6 h-6 text-yellow-400" />;
        case 'player-return': return <UserIcon className="w-6 h-6 text-green-400" />;
        case 'chemistry-rift': return <BrokenLinkIcon className="w-6 h-6 text-orange-400" />;
        case 'contract-renewal': return <DocumentCheckIcon className="w-6 h-6 text-teal-400" />;
        case 'player-departure': return <ArrowLeftStartOnRectangleIcon className="w-6 h-6 text-red-400" />;
        default: return <NewspaperIcon className="w-6 h-6 text-gray-400" />;
    }
}


const NewsScreen: React.FC<NewsScreenProps> = ({ news, onBack }) => {
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
                        <div key={item.id} className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center">
                                {getIconForType(item.type)}
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Week {item.week}</p>
                                <h3 className="font-bold text-lg text-green-400">{item.title}</h3>
                                <p className="text-gray-300 mt-1">{item.body}</p>
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