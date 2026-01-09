
import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup }) => {
    const [showDevlog, setShowDevlog] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 max-w-7xl mx-auto relative">
            
            {/* Background Ambient Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]"></div>
            </div>

            {/* Hero Section */}
            <div className="text-center mb-16 z-10 relative">
                <div className="flex justify-center mb-6">
                    <div className="relative group">
                        <FootballIcon className="w-20 h-20 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-transform duration-700 group-hover:rotate-180" />
                        <div className="absolute inset-0 bg-green-400 blur-xl opacity-20 animate-pulse"></div>
                    </div>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-4 italic tracking-tighter drop-shadow-2xl">
                    GEMINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">FM '27</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                    The world's first <span className="text-gray-200 font-semibold">Multimedia AI Sports Simulation</span>. 
                    Where the match engine tells a story, not just a score.
                </p>
                
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <span className="px-3 py-1 bg-gray-800/80 border border-gray-700 rounded-full text-[10px] font-mono text-green-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        v2.4 ONLINE
                    </span>
                    <span className="px-3 py-1 bg-gray-800/80 border border-gray-700 rounded-full text-[10px] font-mono text-blue-400">
                        POWERED BY GEMINI 2.0
                    </span>
                </div>
            </div>
            
            {/* Game Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16 z-10 relative px-2 md:px-0">
                {/* Option 1: World Cup */}
                 <button
                    onClick={onStartWorldCup}
                    className="group relative flex flex-col items-center p-8 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 hover:border-yellow-500/50 shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-yellow-900/20 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-yellow-600/90 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg">PROLOGUE</div>
                    
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-700 group-hover:border-yellow-500">
                        <GlobeAltIcon className="w-8 h-8 text-yellow-400" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide group-hover:text-yellow-400 transition-colors">World Cup '26</h3>
                    <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
                        Lead a nation through the 48-team expansion. Earn your reputation on the world stage.
                    </p>
                </button>

                {/* Option 2: Club Career */}
                <button
                    onClick={onSelectTeam}
                    className="group relative flex flex-col items-center p-8 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 hover:border-green-500/50 shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-green-900/20 overflow-hidden ring-1 ring-white/5"
                >
                    <div className="absolute top-0 right-0 bg-green-600/90 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg">CAREER MODE</div>
                    
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-700 group-hover:border-green-500">
                        <FootballIcon className="w-8 h-8 text-green-400" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide group-hover:text-green-400 transition-colors">Club Manager</h3>
                    <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
                        The full experience. Domestic leagues, Swiss-Model Champions League, and infinite seasons.
                    </p>
                </button>

                {/* Option 3: Road to Glory */}
                <button
                    onClick={onStartUnemployed}
                    className="group relative flex flex-col items-center p-8 bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-purple-900/20 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-purple-600/90 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg">RPG MODE</div>
                    
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-700 group-hover:border-purple-500">
                        <BriefcaseIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide group-hover:text-purple-400 transition-colors">Road to Glory</h3>
                    <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
                        Start unemployed with no badges. Face job interviews and climb from the bottom.
                    </p>
                </button>
            </div>

            {/* Footer / Devlog Toggle */}
            <div className="w-full max-w-4xl z-10 flex flex-col items-center">
                <button 
                    onClick={() => setShowDevlog(!showDevlog)}
                    className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest mb-6 border-b border-transparent hover:border-white pb-0.5"
                >
                    <span>{showDevlog ? 'Hide System Logs' : 'View System Logs'}</span>
                </button>

                {showDevlog && (
                    <div className="w-full bg-black/40 backdrop-blur-md border border-gray-800 rounded-xl p-8 mb-8 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h5 className="text-xs font-black text-green-500 uppercase tracking-widest mb-2 border-b border-green-900/50 pb-2">Patch Notes v2.4</h5>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="mt-1.5 min-w-[4px] h-4 bg-green-500 rounded-full"></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-200">Generative Media Layer</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">Added support for <span className="text-white">Gemini TTS</span> (Audio Commentary) and <span className="text-white">Veo Video</span> (Instant Replays) directly in the match engine.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="mt-1.5 min-w-[4px] h-4 bg-blue-500 rounded-full"></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-200">Real World Scouting</p>
                                            <p className="text-xs text-gray-400 leading-relaxed">Use Google Search Grounding to find real-life players matching your descriptions.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">Engine Integrity</h5>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                    <div className="bg-gray-800/50 p-2 rounded flex items-center gap-2 border border-gray-700/50">
                                        <span className="text-green-500">●</span> Validated Match State
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded flex items-center gap-2 border border-gray-700/50">
                                        <span className="text-green-500">●</span> Deterministic Physics
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded flex items-center gap-2 border border-gray-700/50">
                                        <span className="text-green-500">●</span> Swiss-Model Logic
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded flex items-center gap-2 border border-gray-700/50">
                                        <span className="text-green-500">●</span> Strict Wage Budgets
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                    Experimental Build | MIT Licensed
                </p>
            </div>
        </div>
    );
};

export default StartScreen;
