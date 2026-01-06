import React from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed }) => {
    return (
        <div className="flex flex-col items-center justify-center mt-20">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-2">Welcome, Manager</h2>
                <p className="text-lg text-gray-400">Your legacy begins now. How will you start?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <button
                    onClick={onSelectTeam}
                    className="group flex flex-col items-center p-8 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 hover:bg-green-800/40 hover:border-green-600 transition-all duration-300"
                >
                    <FootballIcon className="w-16 h-16 text-green-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-2xl font-semibold text-white">Select a Team</h3>
                    <p className="text-gray-400 mt-2 text-center">Take control of your favorite club and lead them to glory.</p>
                </button>
                <button
                    onClick={onStartUnemployed}
                    className="group flex flex-col items-center p-8 bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 hover:bg-blue-800/40 hover:border-blue-600 transition-all duration-300"
                >
                    <BriefcaseIcon className="w-16 h-16 text-blue-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-2xl font-semibold text-white">Start Unemployed</h3>
                    <p className="text-gray-400 mt-2 text-center">Prove your worth and earn a contract from the ground up.</p>
                </button>
            </div>
        </div>
    );
};

export default StartScreen;
