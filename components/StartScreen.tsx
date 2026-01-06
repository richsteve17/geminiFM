
import React from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup }) => {
    return (
        <div className="flex flex-col items-center justify-center mt-10 md:mt-20 px-4">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-2">Welcome, Manager</h2>
                <p className="text-lg text-gray-400">Your legacy begins now. How will you start?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {/* Option 1: World Cup Prologue */}
                 <button
                    onClick={onStartWorldCup}
                    className="group flex flex-col items-center p-6 bg-yellow-900/30 rounded-xl shadow-lg border border-yellow-600/50 hover:bg-yellow-800/40 hover:border-yellow-500 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-yellow-600 text-black text-xs font-bold px-2 py-1 rounded-bl">RECOMMENDED</div>
                    <GlobeAltIcon className="w-14 h-14 text-yellow-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-bold text-white">World Cup '26 Prologue</h3>
                    <p className="text-sm text-gray-300 mt-2 text-center">
                        Manage a national team this summer. Your performance determines your starting reputation for the 26/27 club season.
                    </p>
                </button>

                {/* Option 2: Select Team */}
                <button
                    onClick={onSelectTeam}
                    className="group flex flex-col items-center p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 hover:bg-green-900/40 hover:border-green-600 transition-all duration-300"
                >
                    <FootballIcon className="w-14 h-14 text-green-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-bold text-white">Select a Team</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">
                        Take immediate control of your favorite club for the 26/27 season.
                    </p>
                </button>

                {/* Option 3: Unemployed */}
                <button
                    onClick={onStartUnemployed}
                    className="group flex flex-col items-center p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 hover:bg-blue-900/40 hover:border-blue-600 transition-all duration-300"
                >
                    <BriefcaseIcon className="w-14 h-14 text-blue-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-bold text-white">Start Unemployed</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">
                        Create your manager persona manually and apply for jobs from the ground up.
                    </p>
                </button>
            </div>
        </div>
    );
};

export default StartScreen;
