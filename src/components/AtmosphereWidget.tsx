
import React, { useEffect, useState } from 'react';
import type { Chant } from '../services/chantService';

interface Props {
    chant: Chant | null;
    momentum: number; // From matchState (-10 to 10)
    teamName: string;
}

export default function AtmosphereWidget({ chant, momentum, teamName }: Props) {
    const [bars, setBars] = useState<number[]>([20, 30, 25, 35, 20]);
    const [isPlaying, setIsPlaying] = useState(false);

    // Animate the decibel bars based on momentum intensity
    useEffect(() => {
        const interval = setInterval(() => {
            const intensityMultiplier = 1 + (Math.abs(momentum) * 0.2);
            setBars(prev => prev.map(() => 
                Math.random() * (30 * intensityMultiplier) + 10
            ));
        }, 100);
        return () => clearInterval(interval);
    }, [momentum]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speakChant = (chantData: Chant) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();
        const rate = chantData.intensity === 'high' ? 1.1 : chantData.intensity === 'low' ? 0.88 : 0.98;
        let idx = 0;
        setIsPlaying(true);

        const speakNext = () => {
            if (idx >= chantData.lyrics.length) {
                setIsPlaying(false);
                return;
            }
            const utterance = new SpeechSynthesisUtterance(chantData.lyrics[idx]);
            utterance.rate = rate;
            utterance.pitch = 0.85;
            utterance.volume = 0.55;
            utterance.onend = () => {
                idx += 1;
                setTimeout(speakNext, 120);
            };
            synth.speak(utterance);
        };

        setTimeout(speakNext, 50);
    };

    // Calculate color based on momentum (Red = Hostile/Pressure, Green = Dominance)
    const getBarColor = () => {
        if (momentum < -3) return 'bg-red-600'; // Toxic atmosphere
        if (momentum > 3) return 'bg-green-500'; // Party atmosphere
        return 'bg-blue-600'; // Standard
    };

    const getMoodText = () => {
        if (momentum < -5) return '🤬 TOXIC';
        if (momentum < -2) return '😤 TENSE';
        if (momentum > 5) return '🎉 BOUNCING';
        if (momentum > 2) return '🔥 ELECTRIC';
        return '👏 STEADY';
    };

    if (!teamName) return null;

    return (
        <div className="bg-gray-900 border-b-2 border-gray-700 p-2 sm:p-3 mb-4 shadow-lg relative overflow-hidden rounded-lg">
            {/* BACKGROUND PULSE EFFECT */}
            <div 
                className={`absolute inset-0 opacity-10 ${getBarColor()} transition-colors duration-500`}
                style={{ 
                    animation: Math.abs(momentum) > 4 ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' 
                }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                
                {/* DECIBEL METER (Left) */}
                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">
                        Home End
                    </span>
                    <div className="flex items-end space-x-1 h-8">
                        {bars.map((height, i) => (
                            <div
                                key={i}
                                className={`w-1.5 transition-all duration-75 rounded-t ${getBarColor()}`}
                                style={{ height: `${Math.min(height, 100)}%` }}
                            />
                        ))}
                    </div>
                    <span className={`text-[10px] font-bold mt-1 ${momentum < -2 ? 'text-red-400' : momentum > 2 ? 'text-green-400' : 'text-gray-400'}`}>
                        {getMoodText()}
                    </span>
                </div>

                {/* LYRICS DISPLAY (Center) */}
                <div className="flex-1 bg-black/30 rounded border border-gray-700/50 p-2 min-h-[76px] sm:min-h-[80px] flex flex-col justify-center items-center text-center relative group">
                    <div className="sm:hidden mb-1 w-full flex items-center justify-between text-[10px] font-bold text-gray-300">
                        <span>{getMoodText()}</span>
                        <span>{momentum > 0 ? '+' : ''}{momentum}</span>
                    </div>
                    {chant ? (
                        <button type="button" onClick={() => speakChant(chant)} className="animate-in fade-in zoom-in duration-300 w-full text-center focus:outline-none">
                            <p className="text-[9px] sm:text-[10px] text-yellow-500 font-mono mb-1 tracking-widest uppercase flex items-center justify-center gap-2">
                                🎵 Tune: {chant.tune}
                                {isPlaying && <span className="animate-pulse text-green-400">🔊</span>}
                            </p>
                            <div className="space-y-0.5">
                                {chant.lyrics.map((line, idx) => (
                                    <p
                                        key={idx}
                                        className={`font-black italic text-gray-100 ${
                                            idx === chant.lyrics.length - 1 ? 'text-yellow-200 text-xs sm:text-sm' : 'text-[11px] sm:text-xs'
                                        }`}
                                    >
                                        "{line.toUpperCase()}"
                                    </p>
                                ))}
                            </div>
                            <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35">
                                <span className="text-xs font-bold text-white border border-white/40 px-2 py-1 rounded">Click To Replay Chant</span>
                            </div>
                        </button>
                    ) : (
                        <div className="py-2 opacity-50">
                            <p className="text-xs text-gray-500 font-bold italic animate-pulse">
                                ( Crowd murmuring... )
                            </p>
                        </div>
                    )}
                </div>

                {/* MOMENTUM GAUGE (Right) */}
                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Momentum</span>
                    <div className="h-8 w-3 bg-gray-800 rounded-full overflow-hidden relative border border-gray-600">
                        <div 
                            className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${momentum > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ height: `${((momentum + 10) / 20) * 100}%` }}
                        />
                        <div className="absolute top-1/2 w-full h-px bg-white/50" />
                    </div>
                    <span className="text-[10px] font-bold mt-1 text-gray-300">
                        {momentum > 0 ? '+' : ''}{momentum}
                    </span>
                </div>
            </div>
        </div>
    );
}
