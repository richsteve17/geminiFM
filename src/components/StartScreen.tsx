import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { NewspaperIcon } from './icons/NewspaperIcon';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup }) => {
    const [showDevlog, setShowDevlog] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center mt-6 md:mt-12 px-4 max-w-6xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-2 italic tracking-tighter">GEMINI FOOTBALL MANAGER <span className="text-green-500">'27</span></h2>
                <p className="text-lg text-gray-400">The world's first LLM-driven sports simulation.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-12">
                {/* Option 1: World Cup Prologue */}
                 <button
                    onClick={onStartWorldCup}
                    className="group flex flex-col items-center p-6 bg-yellow-900/20 rounded-xl shadow-lg border border-yellow-600/30 hover:bg-yellow-800/40 hover:border-yellow-500 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-yellow-600 text-black text-[10px] font-bold px-2 py-1 rounded-bl">PROLOGUE</div>
                    <GlobeAltIcon className="w-12 h-12 text-yellow-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">World Cup '26</h3>
                    <p className="text-xs text-gray-300 mt-2 text-center leading-relaxed">
                        Lead a nation through the 48-team expansion. Earn your reputation before the club season kicks off.
                    </p>
                </button>

                {/* Option 2: Select Team */}
                <button
                    onClick={onSelectTeam}
                    className="group flex flex-col items-center p-6 bg-gray-800/40 rounded-xl shadow-lg border border-gray-700 hover:bg-green-900/30 hover:border-green-600 transition-all duration-300 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-blue-600/80 text-white text-[10px] font-bold px-2 py-1 rounded-bl">UCL INTEGRATED</div>
                    <FootballIcon className="w-12 h-12 text-green-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Club Career</h3>
                    <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                        Dominate your domestic league and navigate the new 36-team Swiss Model Champions League.
                    </p>
                </button>

                {/* Option 3: Unemployed */}
                <button
                    onClick={onStartUnemployed}
                    className="group flex flex-col items-center p-6 bg-gray-800/40 rounded-xl shadow-lg border border-gray-700 hover:bg-purple-900/30 hover:border-purple-600 transition-all duration-300"
                >
                    <BriefcaseIcon className="w-12 h-12 text-purple-400 mb-4 transition-transform group-hover:scale-110" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Road to Glory</h3>
                    <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                        Start as a Sunday League amateur. Face board interviews and climb the world rankings.
                    </p>
                </button>
            </div>

            {/* Build Status & Devlog Section */}
            <div className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <h4 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Build Status: v2.2 (Tactical Intelligence)</h4>
                    </div>
                    <button 
                        onClick={() => setShowDevlog(!showDevlog)}
                        className="text-xs font-bold text-green-400 hover:text-green-300 underline underline-offset-4"
                    >
                        {showDevlog ? 'Hide Devlog' : 'View Devlog'}
                    </button>
                </div>

                {showDevlog ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1">New in v2.2</h5>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    <span className="text-green-500 font-bold">Tactical Logic:</span> The "Salah at GK" protocol is live. The AI now detects critical lineup errors and warns you before kickoff.
                                </p>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    <span className="text-green-500 font-bold">Role Penalties:</span> Playing strikers in defense now incurs massive efficiency penalties in the match engine.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1">Core Systems</h5>
                                <ul className="text-sm text-gray-400 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span> <span>Atmosphere Engine & Chants</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span> <span>Interactive Agent Negotiations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span> <span>Swiss-Model UCL Integration</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">
                        "The goal of GFM '27 is to prove that AI can handle the narrative weight of football management, turning spreadsheet data into tangible story arcs."
                    </p>
                )}
            </div>

            <div className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest">
                MIT Licensed | Experimental RPG Sim | Not affiliated with official leagues
            </div>
        </div>
    );
};

export default StartScreen;