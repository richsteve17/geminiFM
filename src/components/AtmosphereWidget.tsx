import React, { useEffect, useMemo, useState } from 'react';
import type { Chant } from '../services/chantService';
import { stadiumAudio } from '../services/audioDirector';

interface Props {
    chant: Chant | null;
    momentum: number;
    teamName: string;
}

export default function AtmosphereWidget({ chant, momentum, teamName }: Props) {
    const [phase, setPhase] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const interval = window.setInterval(() => setPhase(previous => previous + 1), 100);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        stadiumAudio.setCrowdIntensity(Math.min(1, 0.35 + Math.abs(momentum) / 13));
    }, [momentum]);

    const bars = useMemo(() => Array.from({ length: 5 }, (_, index) => {
        const wave = Math.sin((phase + index * 3) * 0.72) * 11;
        return Math.max(12, Math.min(92, 31 + Math.abs(momentum) * 4.5 + wave));
    }), [momentum, phase]);

    const handlePlayChant = () => {
        if (!chant) return;
        setIsPlaying(true);
        stadiumAudio.triggerChant(chant);
        window.setTimeout(() => setIsPlaying(false), Math.ceil((60 / chant.tempoBpm) * 8_000));
    };

    const getBarColor = () => momentum < -3 ? 'bg-red-600' : momentum > 3 ? 'bg-green-500' : 'bg-cyan-500';
    const getMoodText = () => momentum < -5 ? 'HOSTILE' : momentum < -2 ? 'TENSE' : momentum > 5 ? 'BOUNCING' : momentum > 2 ? 'ELECTRIC' : 'STEADY';

    if (!teamName) return null;

    return (
        <section className="bg-slate-950 border border-slate-700 p-2 sm:p-3 mb-4 shadow-lg relative overflow-hidden rounded-lg" aria-label="Stadium atmosphere">
            <div className={`absolute inset-0 opacity-10 ${getBarColor()} transition-colors duration-500`} />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Home End</span>
                    <div className="flex items-end space-x-1 h-8">
                        {bars.map((height, index) => <div key={index} className={`w-1.5 transition-all duration-75 rounded-t ${getBarColor()}`} style={{ height: `${height}%` }} />)}
                    </div>
                    <span className={`text-[10px] font-bold mt-1 ${momentum < -2 ? 'text-red-400' : momentum > 2 ? 'text-green-400' : 'text-slate-400'}`}>{getMoodText()}</span>
                </div>

                <div className="flex-1 bg-black/30 rounded border border-slate-700/50 p-2 min-h-[76px] sm:min-h-[80px] flex flex-col justify-center items-center text-center relative group">
                    <div className="sm:hidden mb-1 w-full flex items-center justify-between text-[10px] font-bold text-slate-300"><span>{getMoodText()}</span><span>{momentum > 0 ? '+' : ''}{momentum}</span></div>
                    {chant ? (
                        <button type="button" onClick={handlePlayChant} className="animate-in fade-in zoom-in duration-300 w-full text-center focus:outline-none relative" aria-label={`Play ${chant.tune} terrace rhythm`}>
                            <p className="text-[9px] sm:text-[10px] text-amber-400 font-mono mb-1 tracking-widest uppercase flex items-center justify-center gap-2">Songbook: {chant.tune}{isPlaying && <span className="animate-pulse text-emerald-400">LIVE</span>}</p>
                            <div className="space-y-0.5">{chant.lyrics.map((line, index) => <p key={index} className={`font-black italic text-slate-100 ${index === chant.lyrics.length - 1 ? 'text-amber-100 text-xs sm:text-sm' : 'text-[11px] sm:text-xs'}`}>“{line.toUpperCase()}”</p>)}</div>
                            <p className="mt-1 text-[9px] text-slate-500 uppercase tracking-wider">{chant.archetypeId.replaceAll('_', ' ')} · {chant.tempoBpm} BPM</p>
                        </button>
                    ) : <div className="py-2 opacity-50"><p className="text-xs text-slate-500 font-bold italic">Crowd bed armed — next match event selects a songbook archetype.</p></div>}
                </div>

                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Momentum</span>
                    <div className="h-8 w-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-600"><div className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${momentum > 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${((momentum + 10) / 20) * 100}%` }} /><div className="absolute top-1/2 w-full h-px bg-white/50" /></div>
                    <span className="text-[10px] font-bold mt-1 text-slate-300">{momentum > 0 ? '+' : ''}{momentum}</span>
                </div>
            </div>
        </section>
    );
}
