
import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { TEAMS } from '../constants';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
    onThemeSelect?: (teamName: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup, onThemeSelect }) => {
    const [showDevlog, setShowDevlog] = useState(false);

    const popularTeams = ['Chelsea', 'Philadelphia Union', 'Liverpool', 'Manchester City', 'Real Madrid', 'Arsenal', 'Inter Miami'];

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 w-full max-w-7xl mx-auto overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
            
            {/* --- ATMOSPHERE LAYER --- */}
            {/* Animated Grid Background */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20" 
                 style={{ 
                     backgroundImage: 'linear-gradient(var(--team-secondary, rgba(0, 255, 127, 0.1)) 1px, transparent 1px), linear-gradient(90deg, var(--team-secondary, rgba(0, 255, 127, 0.1)) 1px, transparent 1px)', 
                     backgroundSize: '40px 40px',
                     transform: 'perspective(500px) rotateX(20deg) scale(1.5)'
                 }}>
            </div>
            
            {/* Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0" 
                 style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)' }}>
            </div>

            {/* Radial Vignette */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(17,24,39,0.8)_80%)]"></div>

            {/* --- CONTENT LAYER --- */}
            <div className="z-10 text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex justify-center mb-4 relative">
                    <div className="relative">
                        <FootballIcon className="w-24 h-24 text-[var(--team-secondary,rgb(34,197,94))] drop-shadow-[0_0_25px_var(--team-secondary,rgba(34,197,94,0.6))]" />
                        <div className="absolute inset-0 bg-[var(--team-secondary,rgb(74,222,128))] blur-2xl opacity-20 animate-pulse"></div>
                    </div>
                </div>
                
                <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl mb-2">
                    GEMINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--team-secondary,rgb(74,222,128))] via-[var(--team-primary,rgb(16,185,129))] to-[var(--team-secondary,rgb(21,128,61))]">FM '27</span>
                </h1>
                
                <div className="flex items-center justify-center gap-4 text-xs font-mono tracking-widest text-[var(--team-secondary,rgb(74,222,128))] opacity-80 mb-8">
                    <span>BUILD v2.6</span>
                    <span>•</span>
                    <span>CREATOR ECONOMY LIVE</span>
                    <span>•</span>
                    <span>AUDIO-VISUAL</span>
                </div>

                <p className="text-lg md:text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed border-t border-b border-gray-700/50 py-4 bg-black/20 backdrop-blur-sm rounded-lg">
                    The world's first <span className="text-white font-semibold">Deep Learning Sports Simulation</span>.<br/> 
                    Turn your managerial career into a profitable content studio.
                </p>
            </div>
            
            {/* Game Modes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12 z-10 px-4">
                
                {/* Mode 1 */}
                <button onClick={onStartWorldCup} className="group relative overflow-hidden bg-gray-800/60 backdrop-blur-sm border border-gray-600 rounded-xl p-6 text-left transition-all hover:bg-gray-700/80 hover:border-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:-translate-y-1">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <GlobeAltIcon className="w-24 h-24 text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1 block">Quick Start</span>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">WORLD CUP '26</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Skip the grind. Take charge of a nation in the expanded 48-team tournament.</p>
                    </div>
                </button>

                {/* Mode 2 */}
                <button onClick={onSelectTeam} className="group relative overflow-hidden bg-gray-800/60 backdrop-blur-sm border border-gray-600 rounded-xl p-6 text-left transition-all hover:bg-gray-700/80 hover:border-[var(--team-secondary,rgb(34,197,94))] hover:shadow-[0_0_20px_var(--team-secondary,rgba(34,197,94,0.2))] hover:-translate-y-1 ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FootballIcon className="w-24 h-24 text-[var(--team-secondary,rgb(34,197,94))]" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-[var(--team-secondary,rgb(34,197,94))] uppercase tracking-widest mb-1 block">Career Mode</span>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[var(--team-secondary,rgb(74,222,128))] transition-colors">CLUB MANAGER</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">The full experience. Domestic leagues, transfers, and the Swiss-Model Champions League.</p>
                    </div>
                </button>

                {/* Mode 3 */}
                <button onClick={onStartUnemployed} className="group relative overflow-hidden bg-gray-800/60 backdrop-blur-sm border border-gray-600 rounded-xl p-6 text-left transition-all hover:bg-gray-700/80 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:-translate-y-1">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BriefcaseIcon className="w-24 h-24 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1 block">Hardcore</span>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">ROAD TO GLORY</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">Start unemployed. No reputation. Face brutal interviews to get your first job.</p>
                    </div>
                </button>
            </div>

            {/* Footer */}
            <div className="z-10 w-full max-w-4xl text-center flex flex-col items-center">
                
                {/* Theme Selector */}
                {onThemeSelect && (
                    <div className="mb-6 flex flex-col items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Select Favorite Club</label>
                        <div className="flex flex-wrap justify-center gap-2">
                            {popularTeams.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => onThemeSelect(t)}
                                    className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => setShowDevlog(!showDevlog)}
                    className="text-[10px] font-bold text-gray-600 hover:text-[var(--team-secondary,rgb(74,222,128))] uppercase tracking-widest transition-colors"
                >
                    {showDevlog ? '[ Close System Logs ]' : '[ Open System Logs ]'}
                </button>

                {showDevlog && (
                    <div className="mt-6 bg-black/80 border border-gray-800 p-6 rounded-lg text-left max-h-48 overflow-y-auto font-mono text-xs w-full">
                        <p className="text-green-500 mb-2">> SYSTEM INITIALIZED</p>
                        <p className="text-gray-400 mb-1">> LOADING MODULE: GEMINI-2.0-FLASH-EXP... OK</p>
                        <p className="text-gray-400 mb-1">> LOADING MODULE: VEO-3.1... OK</p>
                        <p className="text-blue-400 mt-2">> ECONOMIC AUDIT COMPLETE:</p>
                        <ul className="list-disc list-inside text-gray-500 pl-2 mb-2">
                            <li>FIFA vs GFM Cost Crossover confirmed at Month 4.</li>
                            <li>Streamer Mode Profit Calculation enabled (Revenue - COGS).</li>
                            <li>Net Profit per Clip displayed in Viral Studio.</li>
                        </ul>
                        <p className="text-blue-400 mt-2">> PATCH NOTES v2.6:</p>
                        <ul className="list-disc list-inside text-gray-500 pl-2">
                            <li>Added <strong>Dynamic Club Theming</strong> engine.</li>
                            <li>Implemented Net Profit calculator for creator mode.</li>
                            <li>Fixed UI Pacing for live simulation ticks.</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartScreen;
