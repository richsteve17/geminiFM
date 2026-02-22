
import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { TEAMS } from '../constants';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
    onThemeSelect?: (colors: { primary: string, secondary: string, text: string }) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup, onThemeSelect }) => {
    const [showDevlog, setShowDevlog] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>('Manchester City'); // Default to a team so selector isn't empty

    const handleTeamChange = (teamName: string) => {
        setSelectedTeam(teamName);
    };

    const handleKitSelect = (colors: { primary: string, secondary: string, text: string }) => {
        if (onThemeSelect) onThemeSelect(colors);
    };

    // Helper to generate the 3 kit variations
    const getKits = (teamName: string) => {
        const team = TEAMS[teamName];
        if (!team || !team.colors) return [];

        const { primary, secondary, text, third: thirdColor } = team.colors;

        // Kit 1: Primary (Standard)
        const prim = {
            name: 'PRIMARY',
            bg: primary,
            border: secondary,
            text: text,
            accent: secondary
        };

        // Kit 2: Secondary (Flipped or Secondary based)
        const sec = {
            name: 'SECONDARY',
            bg: secondary,
            border: primary,
            text: primary === '#FFFFFF' ? '#000000' : '#FFFFFF', // Simple contrast logic or assume secondary bg needs contrast
            accent: primary
        };

        // Kit 3: Third (Explicit or Wild)
        const thirdBg = thirdColor || '#1F2937'; // Default dark grey if missing
        const thirdKit = {
            name: 'THIRD',
            bg: thirdBg,
            border: text,
            text: '#FFFFFF', // Usually third kits are dark/neon, white text safe
            accent: primary
        };

        return [prim, sec, thirdKit];
    };

    const currentKits = getKits(selectedTeam);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 w-full max-w-7xl mx-auto overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
            
            {/* --- ATMOSPHERE LAYER --- */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20" 
                 style={{ 
                     backgroundImage: 'linear-gradient(var(--team-secondary, rgba(0, 255, 127, 0.1)) 1px, transparent 1px), linear-gradient(90deg, var(--team-secondary, rgba(0, 255, 127, 0.1)) 1px, transparent 1px)', 
                     backgroundSize: '40px 40px',
                     transform: 'perspective(500px) rotateX(20deg) scale(1.5)'
                 }}>
            </div>
            
            <div className="absolute inset-0 pointer-events-none z-0" 
                 style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)' }}>
            </div>

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
                    <span>BUILD v2.7</span>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12 z-10 px-4">
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
                
                {/* 3-Card Kit Selector */}
                {onThemeSelect && (
                    <div className="mb-8 w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col items-center mb-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Select Team to Preview</label>
                            <div className="relative inline-block w-64 mb-4">
                                <select 
                                    onChange={(e) => handleTeamChange(e.target.value)}
                                    className="block appearance-none w-full bg-gray-800 border border-gray-600 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline text-gray-300 text-xs font-bold uppercase cursor-pointer"
                                    value={selectedTeam}
                                >
                                    {Object.keys(TEAMS).sort().map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Cards Container */}
                        <div className="flex flex-wrap justify-center gap-4">
                            {currentKits.map((kit, index) => (
                                <button
                                    key={kit.name}
                                    onClick={() => handleKitSelect({ primary: kit.bg, secondary: kit.accent, text: kit.text })}
                                    className="relative w-32 h-40 rounded-xl shadow-lg transition-transform hover:scale-105 hover:shadow-xl group overflow-hidden border-2 border-transparent hover:border-white"
                                    style={{ backgroundColor: kit.bg }}
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80" style={{ color: kit.text }}>
                                            {kit.name}
                                        </div>
                                        <FootballIcon 
                                            className="w-12 h-12 drop-shadow-md" 
                                            style={{ color: kit.accent }} 
                                        />
                                        <div className="mt-2 text-[8px] font-bold px-2 py-1 rounded bg-black/20 backdrop-blur-sm" style={{ color: kit.text }}>
                                            APPLY THEME
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-gray-500 mt-3 font-mono">Select a palette to update the Game UI Theme instantly.</p>
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
                        <p className="text-blue-400 mt-2">> PATCH NOTES v2.7:</p>
                        <ul className="list-disc list-inside text-gray-500 pl-2">
                            <li>Implemented 3-Way Kit Selector (Primary / Secondary / Unhinged Third).</li>
                            <li>Removed legacy striping artifacts for cleaner UI.</li>
                            <li>Updated Kit Palette keys for better accessibility.</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartScreen;
