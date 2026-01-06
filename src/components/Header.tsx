
import React from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { ArrowLeftStartOnRectangleIcon } from './icons/ArrowLeftStartOnRectangleIcon';

interface HeaderProps {
    onQuit?: () => void;
    showQuit?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onQuit, showQuit }) => {
    return (
        <header className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center justify-center sm:justify-start">
                <FootballIcon className="w-8 h-8 text-green-400" />
                <h1 className="ml-4 text-xl sm:text-2xl font-bold tracking-wider text-white">
                    Gemini Football Manager '27
                </h1>
            </div>
            {showQuit && onQuit && (
                <button 
                    onClick={onQuit}
                    className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-900/20 px-3 py-2 rounded border border-red-900/50 hover:border-red-500 transition-colors"
                >
                    <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                    <span>QUIT TO MENU</span>
                </button>
            )}
        </header>
    );
};

export default Header;
