
import React, { useEffect, useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';
import type { MatchEvent, Mentality, Formation, Player } from '../types';
import { FORMATION_SLOTS } from '../utils';

function getSlotCoords(role: string, indexInRole: number, totalInRole: number): { x: number; y: number } {
    let x = 50, y = 50;
    switch (role) {
        case 'GK': x = 50; y = 88; break;
        case 'LB': x = 15; y = 72; break;
        case 'LWB': x = 10; y = 60; break;
        case 'RB': x = 85; y = 72; break;
        case 'RWB': x = 90; y = 60; break;
        case 'CB':
            if (totalInRole === 1) x = 50;
            else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
            else x = indexInRole === 0 ? 25 : indexInRole === 1 ? 50 : 75;
            y = 75; break;
        case 'DM':
            x = totalInRole === 1 ? 50 : indexInRole === 0 ? 40 : 60;
            y = 60; break;
        case 'CM':
            if (totalInRole === 1) x = 50;
            else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
            else x = indexInRole === 0 ? 25 : indexInRole === 1 ? 50 : 75;
            y = 45; break;
        case 'AM':
            x = totalInRole === 1 ? 50 : indexInRole === 0 ? 35 : 65;
            y = 28; break;
        case 'LM': x = 15; y = 45; break;
        case 'RM': x = 85; y = 45; break;
        case 'LW': x = 20; y = 20; break;
        case 'RW': x = 80; y = 20; break;
        case 'ST': case 'CF':
            if (totalInRole === 1) x = 50;
            else if (totalInRole === 2) x = indexInRole === 0 ? 35 : 65;
            else x = indexInRole === 0 ? 20 : indexInRole === 1 ? 50 : 80;
            y = 12; break;
        default: x = 50; y = 50;
    }
    return { x, y };
}

function toHomePitch(tx: number, ty: number) {
    const px = 5 + (88 - ty) / 76 * 42;
    const py = 5 + (tx - 10) / 80 * 90;
    return { px, py };
}

function toAwayPitch(tx: number, ty: number) {
    const px = 95 - (88 - ty) / 76 * 42;
    const py = 5 + (tx - 10) / 80 * 90;
    return { px, py };
}

interface FormationDot { px: number; py: number; player?: Player; role: string; }

function buildFormationDots(formation: Formation, starters: Player[], isHome: boolean): FormationDot[] {
    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    const roleCounts: Record<string, number> = {};
    slots.forEach(r => { roleCounts[r] = (roleCounts[r] || 0) + 1; });
    const roleIdx: Record<string, number> = {};
    return slots.map((role, idx) => {
        const total = roleCounts[role] || 1;
        const index = roleIdx[role] || 0;
        roleIdx[role] = index + 1;
        const { x, y } = getSlotCoords(role, index, total);
        const { px, py } = isHome ? toHomePitch(x, y) : toAwayPitch(x, y);
        return { px, py, player: starters[idx], role };
    });
}

function dotColors(pos?: string): string {
    if (!pos) return 'bg-gray-500 border-white/40';
    if (pos === 'GK') return 'bg-yellow-500 border-yellow-200';
    if (['LB', 'RB', 'CB', 'LWB', 'RWB'].includes(pos)) return 'bg-sky-500 border-sky-200';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(pos)) return 'bg-emerald-500 border-emerald-200';
    return 'bg-rose-500 border-rose-200';
}

function conditionRing(c?: number): string {
    if (c === undefined || c >= 80) return '';
    if (c >= 60) return 'ring-1 ring-yellow-400';
    return 'ring-2 ring-red-500 animate-pulse';
}

interface PitchViewProps {
    momentum: number;
    homeTeamName: string;
    awayTeamName: string;
    lastEvent: MatchEvent | null;
    userMentality?: Mentality;
    userIsHome?: boolean;
    homeFormation?: Formation;
    homeStarters?: Player[];
    awayFormation?: Formation;
    awayStarters?: Player[];
}

const PitchView: React.FC<PitchViewProps> = ({
    momentum, homeTeamName, awayTeamName, lastEvent,
    userMentality, userIsHome,
    homeFormation, homeStarters, awayFormation, awayStarters
}) => {
    const normalizedMomentum = Math.min(Math.max(((momentum + 10) / 20) * 100, 10), 90);

    const [fieldPos, setFieldPos] = useState(50);
    const [isGoalAnim, setIsGoalAnim] = useState(false);
    const [animTeam, setAnimTeam] = useState<'home' | 'away' | null>(null);

    useEffect(() => { setFieldPos(normalizedMomentum); }, [momentum]);

    useEffect(() => {
        if (lastEvent?.type === 'goal') {
            setIsGoalAnim(true);
            setAnimTeam(lastEvent.teamName === homeTeamName ? 'home' : 'away');
            const timer = setTimeout(() => { setIsGoalAnim(false); setAnimTeam(null); }, 3000);
            return () => clearTimeout(timer);
        }
    }, [lastEvent, homeTeamName]);

    const momentumShift = (fieldPos - 50) / 50 * 5;

    const hasFormationData = !!(homeFormation && homeStarters?.length && awayFormation && awayStarters?.length);
    const homeDots = hasFormationData ? buildFormationDots(homeFormation!, homeStarters!, true) : null;
    const awayDots = hasFormationData ? buildFormationDots(awayFormation!, awayStarters!, false) : null;

    return (
        <div className="relative w-full aspect-[16/9] max-h-[280px] bg-green-700 rounded-lg overflow-hidden shadow-inner border-2 border-green-800 mb-0 select-none mx-auto">
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
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">GOAL!</h2>
                        <p className="text-xl text-green-400 font-bold">{animTeam === 'home' ? homeTeamName : awayTeamName}</p>
                    </div>
                </div>
            )}

            {hasFormationData && homeDots && awayDots ? (
                <>
                    {homeDots.map((dot, i) => (
                        <div
                            key={`h-${i}`}
                            className={`absolute w-3 h-3 rounded-full border-2 transition-all duration-700 ease-in-out shadow ${dotColors(dot.player?.position)} ${conditionRing(dot.player?.condition)}`}
                            style={{
                                left: `${Math.min(Math.max(dot.px + momentumShift, 1), 49)}%`,
                                top: `${dot.py}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            title={dot.player ? `${dot.player.name} — ${dot.player.position} (${dot.player.condition ?? 100}% stamina)` : dot.role}
                        />
                    ))}
                    {awayDots.map((dot, i) => (
                        <div
                            key={`a-${i}`}
                            className={`absolute w-3 h-3 rounded-full border-2 transition-all duration-700 ease-in-out shadow opacity-75 ${dotColors(dot.player?.position)} ${conditionRing(dot.player?.condition)}`}
                            style={{
                                left: `${Math.min(Math.max(dot.px - momentumShift, 51), 99)}%`,
                                top: `${dot.py}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            title={dot.player ? `${dot.player.name} — ${dot.player.position} (${dot.player.condition ?? 100}% stamina)` : dot.role}
                        />
                    ))}
                    <div
                        className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_6px_2px_rgba(255,255,255,0.7)] -translate-x-1/2 -translate-y-1/2 transition-all duration-700 z-10"
                        style={{ left: `${fieldPos}%`, top: '50%' }}
                    />
                </>
            ) : (
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
            )}

            <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-bold text-white/70 uppercase pointer-events-none">
                <span>{awayTeamName}</span>
                {userMentality && userMentality !== 'Balanced' && (
                    <span className="text-yellow-300/80 text-[9px] font-bold tracking-wide">{userMentality}</span>
                )}
                <span>{homeTeamName}</span>
            </div>
        </div>
    );
};

export default PitchView;
