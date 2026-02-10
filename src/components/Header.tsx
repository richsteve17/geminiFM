
import React from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { ArrowLeftStartOnRectangleIcon } from './icons/ArrowLeftStartOnRectangleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { StarIcon } from './icons/StarIcon'; 

const StarIconSVG = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

interface HeaderProps {
    onQuit?: () => void;
    onSave?: () => void;
    onToggleGuide?: () => void;
    showQuit?: boolean;
    managerReputation?: number;
}

const Header: React.FC<HeaderProps> = ({ onQuit, onSave, onToggleGuide, showQuit, managerReputation }) => {
    return (
        <header 
            className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-700 sticky top-0 z-40 transition-colors duration-500"
            style={{ 
                borderColor: 'var(--team-secondary, #374151)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px var(--team-primary, rgba(0,0,0,0.1))'
            }}
        >
            <div className="flex items-center justify-center sm:justify-start gap-4">
                <div className="flex items-center">
                    <FootballIcon className="w-8 h-8 text-[var(--team-secondary,rgb(74,222,128))]" />
                    <h1 className="ml-4 text-xl sm:text-2xl font-bold tracking-wider text-white hidden sm:block">
                        Gemini Football Manager '27
                    </h1>
                    <h1 className="ml-4 text-xl font-bold tracking-wider text-white sm:hidden">
                        GFM '27
                    </h1>
                </div>
                
                {managerReputation !== undefined && (
                    <div className="hidden md:flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-gray-600" title="Manager Reputation">
                        <StarIconSVG className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-100">{managerReputation} Rep</span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {showQuit && (
                    <>
                        <button 
                            onClick={onToggleGuide}
                            className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white bg-gray-700 px-3 py-2 rounded border border-gray-600 hover:border-gray-500 transition-colors"
                            title="Game Guide"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            <span className="hidden md:inline">GUIDE</span>
                        </button>

                        <button 
                            onClick={onSave}
                            className="flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-blue-100 bg-blue-900/30 px-3 py-2 rounded border border-blue-800 hover:border-blue-600 transition-colors"
                            title="Save Game"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span className="hidden md:inline">SAVE</span>
                        </button>

                        <button 
                            onClick={onQuit}
                            className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-900/20 px-3 py-2 rounded border border-red-900/50 hover:border-red-500 transition-colors"
                            title="Quit to Menu"
                        >
                            <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                            <span className="hidden md:inline">QUIT</span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
