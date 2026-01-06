
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
        <div className="flex flex-col items-center justify-center mt-6 md:mt-12 px-4">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-2">Welcome, Manager</h2>
                <p className="text-lg text-gray-400">Your legacy begins now. How will you start?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                {/* Option 1: World Cup Prologue */}
                 <button
                    onClick={onStartWorldCup}
                    className="group flex flex-col items-center p-6 bg-yellow-900/30 rounded-xl shadow-lg border border-yellow-600/50 hover:bg-yellow-800/40 hover:border-yellow-500 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-yellow-600 text-black text-[10px] font-bold px-2 py-1 rounded-bl">PROLOGUE</div>
                    <GlobeAltIcon className="w-12 h-12 text-yellow-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white">World Cup '26</h3>
                    <p className="text-xs text-gray-300 mt-2 text-center leading-relaxed">
                        Manage a national team this summer. Earn your reputation before the club season starts.
                    </p>
                </button>

                {/* Option 2: Select Team */}
                <button
                    onClick={onSelectTeam}
                    className="group flex flex-col items-center p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 hover:bg-green-900/40 hover:border-green-600 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-blue-600/80 text-white text-[10px] font-bold px-2 py-1 rounded-bl">INCL. UCL</div>
                    <FootballIcon className="w-12 h-12 text-green-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white">Club Career</h3>
                    <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                        Take control of a club. Qualify for the new 36-team Champions League format and dominate Europe.
                    </p>
                </button>

                {/* Option 3: Unemployed */}
                <button
                    onClick={onStartUnemployed}
                    className="group flex flex-col items-center p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 hover:bg-purple-900/40 hover:border-purple-600 transition-all duration-300"
                >
                    <BriefcaseIcon className="w-12 h-12 text-purple-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white">Start Unemployed</h3>
                    <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                        Create your manager persona manually and apply for jobs from the ground up.
                    </p>
                </button>
            </div>
        </div>
    );
};

export default StartScreen;
