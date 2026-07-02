import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { TEAMS } from '../constants';
import { isPaidAudioEnabled, setPaidAudioEnabled, isPaidVideoEnabled, setPaidVideoEnabled, getPaidVoiceName, setPaidVoiceName } from '../services/geminiService';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
    onThemeSelect?: (colors: { primary: string, secondary: string, text: string }) => void;
    onContinue?: () => void;
    hasSave?: boolean;
    saveMetadata?: { teamName: string; week: number; year: number; } | null;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup, onThemeSelect, onContinue, hasSave, saveMetadata }) => {
    const [showDevlog, setShowDevlog] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>('Manchester City');
    const [paidAudio, setPaidAudio] = useState(isPaidAudioEnabled());
    const [paidVideo, setPaidVideo] = useState(isPaidVideoEnabled());
    const [paidVoice, setPaidVoice] = useState(getPaidVoiceName());

    const handleVoiceChange = (voiceName: string) => {
        setPaidVoice(voiceName);
        setPaidVoiceName(voiceName);
    };

    const togglePaidAudio = () => {
        const newVal = !paidAudio;
        setPaidAudio(newVal);
        setPaidAudioEnabled(newVal);
    };

    const togglePaidVideo = () => {
        const newVal = !paidVideo;
        setPaidVideo(newVal);
        setPaidVideoEnabled(newVal);
    };

    const handleTeamChange = (teamName: string) => {
        setSelectedTeam(teamName);
    };

    const handleKitSelect = (colors: { primary: string, secondary: string, text: string }) => {
        if (onThemeSelect) onThemeSelect(colors);
    };

    const getKits = (teamName: string) => {
        const team = TEAMS[teamName];
        if (!team || !team.colors) return [];

        const { primary, secondary, text, third: thirdColor } = team.colors;

        return [
            {
                name: 'PRIMARY KIT',
                bg: primary,
                text: text,
                accent: secondary
            },
            {
                name: 'SECONDARY KIT',
                bg: secondary,
                text: primary === '#FFFFFF' ? '#000000' : '#FFFFFF',
                accent: primary
            },
            {
                name: 'THIRD KIT',
                bg: thirdColor || '#1F2937',
                text: '#FFFFFF',
                accent: primary
            }
        ];
    };

    const currentKits = getKits(selectedTeam);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[88vh] px-4 py-8 w-full max-w-7xl mx-auto overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl">
            
            {/* --- FUTURISTIC GLOWING STADIUM PITCH BACKDROP --- */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-15" 
                 style={{ 
                     backgroundImage: 'linear-gradient(rgba(34, 197, 94, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.15) 1px, transparent 1px)', 
                     backgroundSize: '50px 50px',
                     transform: 'perspective(400px) rotateX(40deg) scale(1.6) translateY(-40px)'
                 }}>
            </div>
            
            {/* Pitch Center Circle Line Visual */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] border-t-2 border-dashed border-emerald-500/20 rounded-t-full pointer-events-none z-0"></div>
            
            {/* Glowing Grass Aura */}
            <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-emerald-950/20 via-transparent to-transparent pointer-events-none z-0 blur-3xl"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-950/10 rounded-full blur-3xl pointer-events-none z-0"></div>

            {/* --- HEADER TITLE SECTION --- */}
            <div className="z-10 text-center mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex justify-center mb-3">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl scale-125 opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <FootballIcon className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-spin-slow" />
                    </div>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg mb-1">
                    GEMINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">FM '27</span>
                </h1>
                
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-mono tracking-widest text-emerald-400 uppercase opacity-90 mb-6">
                    <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/80 rounded">v3.0 Engine</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-blue-950/80 border border-blue-800/80 rounded text-blue-400">Gemini 2.5 Flash</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-800/80 rounded text-amber-400">Trophy Cabinet Live</span>
                </div>

                <p className="text-sm md:text-base text-slate-300 font-light max-w-xl mx-auto leading-relaxed border-t border-b border-slate-800/80 py-3 bg-slate-900/30 backdrop-blur-md rounded-lg shadow-inner">
                    Experience deep-learning football management. Develop tactics, negotiate contracts, satisfy the board, and write your legend across infinite campaigns.
                </p>
            </div>
            
            {/* --- CARDS GRID NAVIGATION --- */}
            <div className={`grid grid-cols-1 gap-5 w-full max-w-5xl mb-10 z-10 px-4 ${hasSave ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>

                {/* Load Career Card — only shown when a save exists */}
                {hasSave && onContinue && (
                    <button
                        onClick={onContinue}
                        className="group relative overflow-hidden bg-slate-900/70 hover:bg-slate-900/90 border-2 border-cyan-600/60 hover:border-cyan-400 rounded-xl p-5 text-left transition-all hover:shadow-[0_0_35px_rgba(6,182,212,0.25)] hover:-translate-y-1 duration-300 md:col-span-2"
                    >
                        {/* Pulsing glow dot */}
                        <span className="absolute top-3 right-3 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="text-4xl shrink-0">💾</div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1 block">Saved Career</span>
                                <h3 className="text-xl font-extrabold text-white mb-1 group-hover:text-cyan-300 transition-colors">LOAD CAREER</h3>
                                {saveMetadata ? (
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        <span className="font-bold text-white">{saveMetadata.teamName}</span>
                                        {' · '}Year {saveMetadata.year}, Week {saveMetadata.week}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 leading-relaxed">Continue your last saved manager career.</p>
                                )}
                            </div>
                            <div className="text-cyan-500 group-hover:translate-x-1 transition-transform text-2xl font-black">→</div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    </button>
                )}

                {/* World Cup Card */}
                <button 
                    onClick={onStartWorldCup} 
                    className="group relative overflow-hidden bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 text-left transition-all hover:shadow-[0_0_25px_rgba(52,211,153,0.15)] hover:-translate-y-1 duration-300"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:scale-110 transition-all duration-300">
                        <GlobeAltIcon className="w-20 h-20 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 block">Tournament Mode</span>
                        <h3 className="text-xl font-extrabold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">WORLD CUP</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">Fast-paced international campaign. Take charge of a nation in the ultimate tournament.</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>

                {/* Club Manager Card */}
                <button 
                    onClick={onSelectTeam} 
                    className="group relative overflow-hidden bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 text-left transition-all hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:-translate-y-1 duration-300"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:scale-110 transition-all duration-300">
                        <FootballIcon className="w-20 h-20 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5 block">Career Mode</span>
                        <h3 className="text-xl font-extrabold text-white mb-1.5 group-hover:text-amber-300 transition-colors">CLUB CAREER</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">Select a club. Manage finances, scout wonderkids, and win league & European silverware.</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>

                {/* Unemployed / RTG Card */}
                <button 
                    onClick={onStartUnemployed} 
                    className="group relative overflow-hidden bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 text-left transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] hover:-translate-y-1 duration-300"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 group-hover:scale-110 transition-all duration-300">
                        <BriefcaseIcon className="w-20 h-20 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1.5 block">Hardcore Mode</span>
                        <h3 className="text-xl font-extrabold text-white mb-1.5 group-hover:text-purple-300 transition-colors">ROAD TO GLORY</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">Start unemployed with zero reputation. Apply for job vacancies and sit in tough interviews.</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>
            </div>

            {/* --- GRANULAR MEDIA API CONFIG SWITCHES --- */}
            <div className="z-10 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl shadow-lg mb-8 backdrop-blur-md max-w-xl w-full mx-4 flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-b border-slate-800 pb-2">AI API Cost & Settings Control</h4>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    {/* Audio Toggle */}
                    <div className="flex items-center justify-between gap-4 flex-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">🎙️ Paid AI Commentary</span>
                            <span className="text-[8px] text-slate-500 uppercase mt-0.5">
                                {paidAudio ? 'Gemini API Voices' : 'Local Browser TTS (Free)'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={togglePaidAudio}
                            className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                paidAudio ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    paidAudio ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Video Toggle */}
                    <div className="flex items-center justify-between gap-4 flex-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">🎥 Paid 3D Replay Video</span>
                            <span className="text-[8px] text-slate-500 uppercase mt-0.5">
                                {paidVideo ? 'Google Veo 3D Gen' : '2D Pitch Sim Only (Free)'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={togglePaidVideo}
                            className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                paidVideo ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    paidVideo ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>
                
                {/* Voice Selection Selector (Only relevant when Paid AI Commentary is Enabled) */}
                {paidAudio && (
                    <div className="flex items-center justify-between gap-4 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 mt-2">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">🗣️ Commentator Voice</span>
                            <span className="text-[8px] text-slate-500 uppercase mt-0.5">Select Gemini native voice personality</span>
                        </div>
                        <select
                            value={paidVoice}
                            onChange={(e) => handleVoiceChange(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-white rounded text-[10px] font-black uppercase px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                        >
                            <option value="Puck">Puck (Energetic Male)</option>
                            <option value="Charon">Charon (Deep Male)</option>
                            <option value="Fenrir">Fenrir (Powerful Male)</option>
                            <option value="Aoede">Aoede (Clear Female)</option>
                            <option value="Kore">Kore (Crisp Female)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* --- TEAM KIT THEME SELECTOR & JERSEYS --- */}
            <div className="z-10 w-full max-w-4xl text-center flex flex-col items-center">
                {onThemeSelect && (
                    <div className="mb-6 w-full animate-in fade-in slide-in-from-bottom-4">
                        
                        <div className="flex flex-col items-center mb-4">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Team UI Color Theme Previewer</label>
                            <div className="relative inline-block w-64">
                                <select 
                                    onChange={(e) => handleTeamChange(e.target.value)}
                                    className="block appearance-none w-full bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 pr-8 rounded shadow text-slate-300 text-xs font-bold uppercase cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    value={selectedTeam}
                                >
                                    {Object.keys(TEAMS).sort().map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Jersey kit Cards Container */}
                        <div className="flex flex-wrap justify-center gap-4">
                            {currentKits.map((kit) => (
                                <button
                                    key={kit.name}
                                    type="button"
                                    onClick={() => handleKitSelect({ primary: kit.bg, secondary: kit.accent, text: kit.text })}
                                    className="relative w-36 h-48 bg-slate-900/50 border border-slate-800 rounded-xl shadow-lg transition-all hover:scale-105 hover:border-slate-600 group overflow-hidden flex flex-col items-center p-3"
                                >
                                    {/* Small badge label */}
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3 block">{kit.name}</span>
                                    
                                    {/* Miniature Football Shirt Vector Silhouette */}
                                    <div className="relative mb-3 flex-grow flex items-center justify-center">
                                        <svg 
                                            className="w-20 h-20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 duration-300" 
                                            viewBox="0 0 100 100" 
                                            style={{ color: kit.bg }}
                                        >
                                            {/* jersey body */}
                                            <path 
                                                d="M 30,20 L 40,10 L 60,10 L 70,20 L 85,25 L 80,40 L 71,36 L 71,85 L 29,85 L 29,36 L 20,40 L 15,25 Z" 
                                                fill="currentColor" 
                                                stroke="#1e293b" 
                                                strokeWidth="1.5"
                                            />
                                            {/* Sleeves stripe accent */}
                                            <path d="M 15,25 L 20,40" stroke={kit.accent} strokeWidth="4" />
                                            <path d="M 85,25 L 80,40" stroke={kit.accent} strokeWidth="4" />
                                            {/* Collar collar outline */}
                                            <path d="M 40,10 Q 50,22 60,10" fill="none" stroke={kit.accent} strokeWidth="4.5" />
                                            {/* Center chest stripe or panel */}
                                            <line x1="50" y1="22" x2="50" y2="85" stroke={kit.accent} strokeWidth="8" opacity="0.8" />
                                        </svg>
                                    </div>

                                    <div className="w-full text-center text-[9px] font-bold py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-colors uppercase tracking-wider">
                                        Apply Theme
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Developer / System Logs Console panel */}
                <button 
                    type="button"
                    onClick={() => setShowDevlog(!showDevlog)}
                    className="text-[9px] font-bold text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors mt-2"
                >
                    {showDevlog ? '[ Hide Server Logs ]' : '[ Show Server Logs ]'}
                </button>

                {showDevlog && (
                    <div className="mt-4 bg-slate-950 border border-slate-900 p-5 rounded-lg text-left max-h-40 overflow-y-auto font-mono text-[10px] w-full text-slate-400 shadow-inner">
                        <p className="text-emerald-500 mb-1.5">&gt; SYSTEM INITIALIZED</p>
                        <p className="text-slate-500 mb-1">&gt; LOADING MODULE: GEMINI-2.5-FLASH... OK</p>
                        <p className="text-slate-500 mb-1">&gt; LOADING MODULE: VEO-3.1... OK</p>
                        <p className="text-blue-400 mt-2">&gt; ECONOMIC AUDIT COMPLETE:</p>
                        <ul className="list-disc list-inside text-slate-500 pl-1 mb-1.5">
                            <li>FIFA vs GFM Cost Crossover confirmed at Month 4.</li>
                            <li>Streamer Mode Profit Calculation enabled (Revenue - COGS).</li>
                            <li>Net Profit per Clip displayed in Viral Studio.</li>
                        </ul>
                        <p className="text-blue-400 mt-2">&gt; PATCH NOTES v3.0:</p>
                        <ul className="list-disc list-inside text-slate-500 pl-1">
                            <li>Implemented permanent Trophy Room & Career Honors timeline dashboard.</li>
                            <li>Added dynamic Board Objectives, Sacking Index pressure checks, and Resignations.</li>
                            <li>Integrated weekly job poaching offers inside the News Feed.</li>
                            <li>Added starting partner chemistry growth boosts (5% potential growth rate bonus).</li>
                            <li>Migrated core text generation engines to low-overhead Gemini 2.5 Flash.</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartScreen;
