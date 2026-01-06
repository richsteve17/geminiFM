
import React from 'react';
import { FootballIcon } from './icons/FootballIcon';

const Header: React.FC = () => {
    return (
        <header className="flex items-center justify-center sm:justify-start p-4 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700">
            <FootballIcon className="w-8 h-8 text-green-400" />
            <h1 className="ml-4 text-2xl sm:text-3xl font-bold tracking-wider text-white">
                Gemini Football Manager '27
            </h1>
        </header>
    );
};

export default Header;
