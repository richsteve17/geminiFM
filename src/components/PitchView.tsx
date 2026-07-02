import React, { useEffect, useMemo, useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import type { MatchEvent } from '../types';

interface PitchViewProps {
    momentum: number; // -10 to +10
    homeTeamName: string;
    awayTeamName: string;
    lastEvent: MatchEvent | null;
}

type Dot = { x: number; y: number };

const HOME_SHAPE: Dot[] = [
    { x: 10, y: 50 }, // GK
    { x: 23, y: 18 }, { x: 24, y: 37 }, { x: 24, y: 63 }, { x: 23, y: 82 },
    { x: 40, y: 24 }, { x: 43, y: 50 }, { x: 40, y: 76 },
    { x: 57, y: 33 }, { x: 57, y: 67 },
    { x: 72, y: 50 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const shortName = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

const renderDot = (
    key: string,
    x: number,
    y: number,
    colorClass: string,
    glowColor: string
) => (
    <div
        key={key}
        className={`absolute w-5 h-5 rounded-full border border-white/90 ${colorClass} flex items-center justify-center`}
        style={{ 
            left: `${x}%`, 
            top: `${y}%`, 
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 3px 5px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.45), 0 0 8px ${glowColor}`
        }}
    >
        {/* Glossy top-left highlight reflect */}
        <div className="absolute top-[2px] left-[2px] w-[6px] h-[3px] bg-white/60 pointer-events-none" style={{ borderRadius: '50% 50% 40% 40%' }} />
    </div>
);

const PitchView: React.FC<PitchViewProps> = ({ momentum, homeTeamName, awayTeamName, lastEvent }) => {
    const [phase, setPhase] = useState(0);
    const [isGoalAnim, setIsGoalAnim] = useState(false);
    const [animTeam, setAnimTeam] = useState<'home' | 'away' | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setPhase((prev) => prev + 1);
        }, 800);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (lastEvent?.type === 'goal') {
            setIsGoalAnim(true);
            setAnimTeam(lastEvent.teamName === homeTeamName ? 'home' : 'away');
            const timer = setTimeout(() => {
                setIsGoalAnim(false);
                setAnimTeam(null);
            }, 2800);
            return () => clearTimeout(timer);
        }
    }, [lastEvent, homeTeamName]);

    const homeDots = useMemo(() => {
        return HOME_SHAPE.map((dot, idx) => {
            const swayX = Math.sin((phase + idx) * 0.7) * 1.2;
            const swayY = Math.cos((phase + idx) * 0.9) * 1.4;
            const pressShift = (momentum / 10) * 2.8;
            return {
                x: clamp(dot.x + swayX + pressShift, 6, 94),
                y: clamp(dot.y + swayY, 10, 90),
            };
        });
    }, [phase, momentum]);

    const awayDots = useMemo(() => {
        return HOME_SHAPE.map((dot, idx) => {
            const mirroredX = 100 - dot.x;
            const swayX = Math.sin((phase + idx + 3) * 0.75) * 1.2;
            const swayY = Math.cos((phase + idx + 4) * 0.9) * 1.4;
            const pressShift = (-momentum / 10) * 2.8;
            return {
                x: clamp(mirroredX + swayX + pressShift, 6, 94),
                y: clamp(dot.y + swayY, 10, 90),
            };
        });
    }, [phase, momentum]);

    const ball = useMemo(() => {
        const driftX = Math.sin(phase * 0.6) * 3.2;
        const driftY = Math.cos(phase * 0.8) * 6.2;
        const momentumPush = momentum * 1.85;
        return {
            x: clamp(50 + driftX + momentumPush, 8, 92),
            y: clamp(50 + driftY, 12, 88),
        };
    }, [phase, momentum]);

    return (
        <div className="relative w-full aspect-[16/9] max-h-[300px] rounded-lg overflow-hidden border-2 border-emerald-900 shadow-inner bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 select-none mx-auto">
            <div className="absolute inset-0 opacity-35 pointer-events-none bg-[linear-gradient(0deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_10%,transparent_10%,transparent_20%,rgba(255,255,255,0.06)_20%,rgba(255,255,255,0.06)_30%,transparent_30%,transparent_40%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.06)_50%,transparent_50%,transparent_60%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.06)_70%,transparent_70%,transparent_80%,rgba(255,255,255,0.06)_80%,rgba(255,255,255,0.06)_90%,transparent_90%,transparent_100%)]" />
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/75" />
                <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/70 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-[34%] bottom-[34%] left-0 w-[16%] border-r-2 border-y-2 border-white/70" />
                <div className="absolute top-[34%] bottom-[34%] right-0 w-[16%] border-l-2 border-y-2 border-white/70" />
            </div>

            {isGoalAnim && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="text-center">
                        <FootballIcon className="w-16 h-16 text-white mx-auto mb-2 animate-bounce" />
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight">GOAL</h2>
                        <p className="text-xl text-emerald-300 font-bold">{animTeam === 'home' ? homeTeamName : awayTeamName}</p>
                    </div>
                </div>
            )}

            <div className="absolute inset-0">
                {homeDots.map((dot, idx) => renderDot(`h-${idx}`, dot.x, dot.y, 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700', 'rgba(244,63,94,0.4)'))}
                {awayDots.map((dot, idx) => renderDot(`a-${idx}`, dot.x, dot.y, 'bg-gradient-to-br from-sky-400 via-sky-500 to-sky-700', 'rgba(14,165,233,0.4)'))}
                <div
                    className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-br from-white via-slate-100 to-slate-200 border border-slate-400 transition-all duration-700 ease-out"
                    style={{ 
                        left: `${ball.x}%`, 
                        top: `${ball.y}%`, 
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 3px 5px rgba(0,0,0,0.6), inset 0 -1.5px 2.5px rgba(0,0,0,0.35), 0 0 6px rgba(255,255,255,0.7)'
                    }}
                >
                    {/* Ball gloss point */}
                    <div className="absolute top-[1.5px] left-[1.5px] w-[3px] h-[2px] bg-white/80" style={{ borderRadius: '50% 50% 40% 40%' }} />
                </div>
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white/85 uppercase tracking-wider">
                <span>{shortName(awayTeamName)}</span>
                <span>Pressure Tilt {momentum > 0 ? `+${momentum}` : momentum}</span>
                <span>{shortName(homeTeamName)}</span>
            </div>
        </div>
    );
};

export default PitchView;

