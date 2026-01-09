import React, { useEffect, useState } from 'react';
import { Chant } from '../services/chantService';

interface Props {
    chant: Chant | null;
    momentum: number; // From matchState (-5 to 5)
    teamName: string;
}

export default function AtmosphereWidget({ chant, momentum, teamName }: Props) {
    const [bars, setBars] = useState<number[]>([20, 30, 25, 35, 20]);

    // Animate the decibel bars
    useEffect(() => {
        const interval = setInterval(() => {
            setBars(prev => prev.map(() =>
                Math.random() * (20 + (Math.abs(momentum) * 15)) + 10
            ));
        }, 150);
        return () => clearInterval(interval);
    }, [momentum]);

    // Calculate color based on momentum (Red = Hostile, Green = Party)
    const getBarColor = () => {
        if (momentum < -2) return 'bg-red-600'; // Toxic atmosphere
        if (momentum > 2) return 'bg-green-500'; // Party atmosphere
        return 'bg-blue-600'; // Standard
    };

    const getMoodText = () => {
        if (momentum < -3) return '😤 HOSTILE';
        if (momentum < -1) return '😠 TENSE';
        if (momentum > 3) return '🎉 BOUNCING';
        if (momentum > 1) return '🔥 ELECTRIC';
        return '👏 STEADY';
    };

    // The Decibel Bar Animation
    return (
        <div className="bg-gray-800 border-b-4 border-black p-4 mb-4 shadow-lg relative overflow-hidden rounded-lg">
            {/* BACKGROUND PULSE */}
            <div
                className={`absolute inset-0 opacity-20 ${getBarColor()} transition-all duration-500`}
                style={{ transform: `scale(${1 + Math.abs(momentum) * 0.05})` }}
            />

            <div className="relative z-10 flex justify-between items-center">
                {/* DECIBEL METER */}
                <div className="flex flex-col items-center mr-4">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                        {teamName.split(' ')[0]} End
                    </span>
                    <div className="flex items-end space-x-1 h-12 mt-1">
                        {bars.map((height, i) => (
                            <div
                                key={i}
                                className={`w-2 transition-all duration-100 rounded-t ${getBarColor()}`}
                                style={{ height: `${height}%` }}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-bold mt-1 text-gray-300">{getMoodText()}</span>
                </div>

                {/* LYRICS DISPLAY */}
                <div className="flex-1 text-center px-4">
                    {chant ? (
                        <div className="animate-pulse">
                            <p className="text-xs text-yellow-400 font-mono mb-2 tracking-widest">
                                🎵 TUNE: {chant.tune.toUpperCase()} 🎵
                            </p>
                            <div className="space-y-1">
                                {chant.lyrics.map((line, idx) => (
                                    <p
                                        key={idx}
                                        className={`text-lg md:text-xl font-black italic text-white transform -skew-x-6 ${
                                            idx === chant.lyrics.length - 1 ? 'text-yellow-300' : ''
                                        }`}
                                    >
                                        "{line.toUpperCase()}"
                                    </p>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-mono">
                                INTENSITY: {chant.intensity.toUpperCase()}
                            </p>
                        </div>
                    ) : (
                        <div className="py-2">
                            <p className="text-lg text-gray-600 font-bold italic">
                                (CROWD MURMURING...)
                            </p>
                            <p className="text-xs text-gray-700 mt-1">Waiting for something to sing about</p>
                        </div>
                    )}
                </div>

                {/* MOMENTUM INDICATOR */}
                <div className="flex flex-col items-center ml-4">
                    <span className="text-xs font-mono text-gray-400 uppercase">Momentum</span>
                    <div className="h-12 w-4 bg-gray-700 rounded-full overflow-hidden mt-1 relative">
                        <div
                            className={`absolute bottom-0 w-full transition-all duration-300 ${getBarColor()}`}
                            style={{ height: `${((momentum + 5) / 10) * 100}%` }}
                        />
                        <div className="absolute top-1/2 w-full h-0.5 bg-gray-500" />
                    </div>
                    <span className="text-xs font-bold mt-1 text-gray-300">
                        {momentum > 0 ? '+' : ''}{momentum}
                    </span>
                </div>
            </div>
        </div>
    );
}
