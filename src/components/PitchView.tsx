
import React, { useEffect, useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import type { MatchEvent } from '../types';

interface PitchViewProps {
    momentum: number; // -10 to +10
    homeTeamName: string;
    awayTeamName: string;
    lastEvent: MatchEvent | null;
}

const PitchView: React.FC<PitchViewProps> = ({ momentum, homeTeamName, awayTeamName, lastEvent }) => {
    const normalizedMomentum = Math.min(Math.max(((momentum + 10) / 20) * 100, 10), 90);
    
    const [fieldPos, setFieldPos] = useState(50);
    const [isGoalAnim, setIsGoalAnim] = useState(false);
    const [animTeam, setAnimTeam] = useState<'home'|'away'|null>(null);

    useEffect(() => {
        setFieldPos(normalizedMomentum);
    }, [momentum]);

    useEffect(() => {
        if (lastEvent?.type === 'goal') {
            setIsGoalAnim(true);
            setAnimTeam(lastEvent.teamName === homeTeamName ? 'home' : 'away');
            const timer = setTimeout(() => {
                setIsGoalAnim(false);
                setAnimTeam(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [lastEvent, homeTeamName]);

    return (
        <div className="relative w-full aspect-[16/9] bg-green-700 rounded-lg overflow-hidden shadow-inner border-2 border-green-800 mb-4 select-none">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <div className="w-full h-full bg-[linear-gradient(90deg,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:10%_100%]"></div>
                 <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white"></div>
                 <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                 <div className="absolute top-1/4 bottom-1/4 left-0 w-[15%] border-r-2 border-y-2 border-white bg-transparent"></div>
                 <div className="absolute top-1/4 bottom-1/4 right-0 w-[15%] border-l-2 border-y-2 border-white bg-transparent"></div>
            </div>

            {isGoalAnim && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="text-center">
                        <FootballIcon className="w-16 h-16 text-white mx-auto mb-2 animate-bounce" />
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                            GOAL!
                        </h2>
                        <p className="text-xl text-green-400 font-bold">{animTeam === 'home' ? homeTeamName : awayTeamName}</p>
                    </div>
                </div>
            )}

            <div 
                className="absolute top-0 bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out"
                style={{ transform: `translateX(${(fieldPos - 50) / 2}%)` }} 
            >
                <div className="absolute top-1/2 left-[45%] w-full h-full -translate-y-1/2 transition-all duration-1000">
                     <div className="absolute top-[40%] left-[10%] w-3 h-3 bg-red-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[60%] left-[10%] w-3 h-3 bg-red-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[30%] left-[20%] w-3 h-3 bg-red-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[50%] left-[25%] w-3 h-3 bg-red-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[70%] left-[20%] w-3 h-3 bg-red-500 rounded-full shadow border border-white"></div>
                </div>

                 <div className="absolute top-1/2 left-[55%] w-full h-full -translate-y-1/2 transition-all duration-1000">
                     <div className="absolute top-[40%] right-[10%] w-3 h-3 bg-blue-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[60%] right-[10%] w-3 h-3 bg-blue-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[30%] right-[20%] w-3 h-3 bg-blue-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[50%] right-[25%] w-3 h-3 bg-blue-500 rounded-full shadow border border-white"></div>
                     <div className="absolute top-[70%] right-[20%] w-3 h-3 bg-blue-500 rounded-full shadow border border-white"></div>
                </div>
                
                <div className="absolute top-[50%] left-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_5px_white] -translate-x-1/2 -translate-y-1/2 transition-all duration-500"></div>
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-bold text-white/70 uppercase">
                <span>{awayTeamName} Pressure</span>
                <span>{homeTeamName} Pressure</span>
            </div>
        </div>
    );
};

export default PitchView;
