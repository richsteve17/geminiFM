import React, { useState, useMemo } from 'react';
import { Star, Ambulance, Armchair, BadgeAlert, CircleAlert, ClipboardList, Flame, Frown, Handshake, Trophy, UsersRound } from 'lucide-react';
import { GameState } from '../types';
import type { Team, Tactic, Formation, Mentality, Player, PlayerPosition } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { DocumentCheckIcon } from './icons/DocumentCheckIcon';
import TacticsBoard from './TacticsBoard';
import { analyzeTactics } from '../utils';
import { FORMATIONS, MENTALITIES, PLAYER_PERSONALITIES } from '../constants';

interface TacticsManagerProps {
    team: Team;
    onTacticChange: (tactic: Partial<Tactic>) => void;
    onStartContractTalk: (player: Player) => void;
    onToggleStarter: (playerName: string) => void;
    onSwapPlayers?: (p1: Player, p2: Player) => void;
    gameState: GameState;
    subsUsed: number;
    onSubstitute: (playerIn: Player, playerOut: Player) => void;
    onReorderPlayers?: (players: Player[]) => void;
    isNationalTeam: boolean;
}

const getPositionColor = (position: PlayerPosition) => {
    if (position === 'GK') return 'is-gk';
    if (['LB', 'RB', 'CB', 'LWB', 'RWB'].includes(position)) return 'is-def';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(position)) return 'is-mid';
    return 'is-fwd';
};

const getPersonalityBadgeColor = (personality: string) => {
    switch (personality) {
        case 'Leader': return 'fm-tactics-status-caution';
        case 'Young Prospect': return 'fm-tactics-status-positive';
        case 'Professional': return 'fm-tactics-status-positive';
        case 'Volatile': return 'fm-tactics-status-danger';
        default: return 'fm-roster-detail';
    }
};

const TacticsManager: React.FC<TacticsManagerProps> = ({
    team,
    onTacticChange,
    onStartContractTalk,
    onToggleStarter,
    onSwapPlayers,
    gameState,
    subsUsed,
    onSubstitute,
    onReorderPlayers,
    isNationalTeam
}) => {
    const [showContracts, setShowContracts] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [selectedListPlayer, setSelectedListPlayer] = useState<string | null>(null);
    const [dragSourcePlayer, setDragSourcePlayer] = useState<string | null>(null);
    const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

    const isMatchLive = gameState === GameState.PAUSED;

    const starters = useMemo(() => team.players.filter(p => p.isStarter), [team.players]);
    const bench = useMemo(() => team.players.filter(p => !p.isStarter), [team.players]);

    const tacticalAnalysis = useMemo(() => analyzeTactics(starters, team.tactic.formation), [starters, team.tactic.formation]);

    const playersWithContractIssues = useMemo(() => {
        if (isNationalTeam) return [];
        return team.players
            .filter(p => p.contractExpires < 2)
            .sort((a, b) => a.contractExpires - b.contractExpires);
    }, [team.players, isNationalTeam]);

    const handleSlotClick = (clickedSlotIndex: number) => {
        if (selectedSlot === null) {
            setSelectedSlot(clickedSlotIndex);
        } else {
            if (selectedSlot === clickedSlotIndex) {
                setSelectedSlot(null);
                return;
            }
            const currentStarters = [...starters];
            if (currentStarters[selectedSlot] && currentStarters[clickedSlotIndex]) {
                const temp = currentStarters[selectedSlot];
                currentStarters[selectedSlot] = currentStarters[clickedSlotIndex];
                currentStarters[clickedSlotIndex] = temp;
                if (onReorderPlayers) {
                    onReorderPlayers([...currentStarters, ...bench]);
                }
            }
            setSelectedSlot(null);
        }
    };

    const swapByName = (sourceName: string, targetName: string) => {
        if (sourceName === targetName) return;
        const p1 = team.players.find(p => p.name === sourceName);
        const p2 = team.players.find(p => p.name === targetName);
        if (!p1 || !p2) return;

        if (isMatchLive) {
            const isP1Starter = p1.isStarter;
            const isP2Starter = p2.isStarter;

            if (isP1Starter !== isP2Starter) {
                if (subsUsed >= 5) {
                    alert("Tactical Error: You have already used all 5 substitutions!");
                    return;
                }
                const playerIn = isP1Starter ? p2 : p1;
                const playerOut = isP1Starter ? p1 : p2;
                onSubstitute(playerIn, playerOut);
                return;
            }
        }

        if (onSwapPlayers) {
            onSwapPlayers(p1, p2);
        }
    };

    const handleListClick = (clickedPlayer: Player) => {
        if (selectedListPlayer === null) {
            setSelectedListPlayer(clickedPlayer.name);
        } else {
            if (selectedListPlayer === clickedPlayer.name) {
                setSelectedListPlayer(null);
            } else {
                swapByName(selectedListPlayer, clickedPlayer.name);
                setSelectedListPlayer(null);
            }
        }
    };

    const renderPlayerItem = (player: Player, isBench: boolean) => {
        const personalityColor = getPersonalityBadgeColor(player.personality);
        const isSelected = selectedListPlayer === player.name;

        // Effects & Status
        const effects: React.ReactNode[] = [];
        if (player.status.type === 'Injured') effects.push(<Ambulance key="inj" className="h-3.5 w-3.5 fm-tactics-status-danger" strokeWidth={1.75} role="img" aria-label={`Injured (${player.status.weeks} weeks)`} />);
        if (player.status.type === 'Suspended') effects.push(<BadgeAlert key="sus" className="h-3.5 w-3.5 fm-tactics-status-danger" strokeWidth={1.75} role="img" aria-label="Suspended" />);

        player.effects.forEach((eff, i) => {
            if (eff.type === 'PostTournamentMorale') {
                if (eff.morale === 'FiredUp') effects.push(<Flame key={`m-${i}`} className="h-3.5 w-3.5 fm-tactics-status-caution" strokeWidth={1.75} role="img" aria-label="Morale: fired up" />);
                if (eff.morale === 'Winner') effects.push(<Trophy key={`m-${i}`} className="h-3.5 w-3.5 fm-tactics-status-caution" strokeWidth={1.75} role="img" aria-label="Morale: winner" />);
                if (eff.morale === 'Disappointed') effects.push(<Frown key={`m-${i}`} className="h-3.5 w-3.5 fm-roster-detail" strokeWidth={1.75} role="img" aria-label="Morale: disappointed" />);
            }
            if (eff.type === 'BadChemistry') {
                effects.push(<CircleAlert key={`c-${i}`} className="h-3.5 w-3.5 fm-tactics-status-caution" strokeWidth={1.75} role="img" aria-label={`Chemistry rift with ${eff.with}`} />);
            }
            if (eff.type === 'InternationalRift') {
                const color = eff.severity === 'serious' ? 'fm-tactics-status-danger' : eff.severity === 'moderate' ? 'fm-tactics-status-caution' : 'fm-tactics-status-caution';
                effects.push(
                    <CircleAlert key={`ir-${i}`} className={`h-3.5 w-3.5 ${color}`} strokeWidth={1.75} role="img" aria-label={`International rift (${eff.severity}) with ${eff.with}: ${eff.message}`} />
                );
            }
            if (eff.type === 'TeammateBond') {
                effects.push(<Handshake key={`tb-${i}`} className="h-3.5 w-3.5 fm-tactics-status-positive" strokeWidth={1.75} role="img" aria-label={`Teammate bond with ${eff.with}: ${eff.message}`} />);
            }
        });

        const assignment = !isBench ? tacticalAnalysis.assignments.find(a => a.player.name === player.name) : null;
        const outOfPosition = assignment?.isOutOfPosition;

        return (
            <li
                key={player.name}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/player-name', player.name);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragSourcePlayer(player.name);
                    setSelectedListPlayer(null);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (dragSourcePlayer && dragSourcePlayer !== player.name) setDragOverPlayer(player.name);
                }}
                onDragLeave={() => {
                    if (dragOverPlayer === player.name) setDragOverPlayer(null);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const sourceName = e.dataTransfer.getData('text/player-name') || dragSourcePlayer;
                    if (sourceName) swapByName(sourceName, player.name);
                    setDragOverPlayer(null);
                    setDragSourcePlayer(null);
                }}
                onDragEnd={() => {
                    setDragOverPlayer(null);
                    setDragSourcePlayer(null);
                }}
                onClick={() => handleListClick(player)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleListClick(player);
                    }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${player.name}, ${player.position}, ${player.rating}, ${player.condition}% fit`}
                className={`fm-roster-row grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_2rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_2.5rem] items-center gap-2 sm:gap-3 py-3 px-2 cursor-pointer ${dragOverPlayer === player.name ? 'is-drop-target' : ''} ${isSelected ? 'is-selected' : ''} ${player.status.type === 'Injured' ? 'is-injured' : ''} ${isBench ? 'is-bench' : ''}`}
            >
                <span className={`fm-roster-position text-[10px] font-bold py-1 text-center ${getPositionColor(player.position)}`}>{player.position}</span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold" title={player.name}>{player.name}</p>
                        <div className="flex gap-1 items-center">{effects}</div>
                        {outOfPosition && <CircleAlert className="h-3.5 w-3.5 fm-tactics-status-caution" strokeWidth={1.75} role="img" aria-label={`Playing as ${assignment?.formationRole}`} />}
                    </div>
                    <div className="fm-roster-detail flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px]">
                        <span className={`fm-roster-personality font-semibold ${personalityColor}`}>{player.personality}</span>
                        {!isNationalTeam && <span>{player.contractExpires === 0 ? <span className="fm-tactics-status-danger font-semibold">Expiring!</span> : `${player.contractExpires}y`} &bull; ${player.wage.toLocaleString()}/wk</span>}
                        {player.stats && player.stats.appearances > 0 && <span className="fm-roster-season-stat">Rating: <Star size={10} strokeWidth={1.75} className="inline-block align-middle" aria-hidden="true" /> {player.stats.averageRating} &bull; Goals: {player.stats.goals}</span>}
                    </div>
                </div>
                <div className="text-right">
                    <span className="fm-roster-detail block text-[9px] uppercase">FIT:</span>
                    <span className={`text-[11px] font-semibold tabular-nums ${player.condition > 80 ? 'fm-tactics-status-positive' : player.condition > 60 ? 'fm-tactics-status-caution' : 'fm-tactics-status-danger'}`}>{player.condition}%</span>
                    <div className="fm-roster-condition h-1 mt-1 overflow-hidden">
                        <div className={`h-full ${player.condition > 80 ? 'fm-tactics-fill-positive' : player.condition > 60 ? 'fm-tactics-fill-caution' : 'fm-tactics-fill-danger'}`} style={{ width: `${player.condition}%` }} />
                    </div>
                </div>
                {isSelected ? <ArrowsRightLeftIcon className="w-5 h-5 fm-tactics-status-caution justify-self-end" /> : <span className={`fm-roster-rating text-xl font-bold tabular-nums text-right ${player.rating >= 85 ? 'is-high' : ''}`}>{player.rating}</span>}
            </li>
        );
    };

    return (
        <section className="fm-tactics space-y-5">
            <header className="fm-tactics-header flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4">
                <div>
                    <p className="fm-eyebrow mb-1">{team.name}</p>
                    <h2 className="fm-screen-title text-3xl sm:text-4xl">Pitch Lineup & Tactics</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={team.tactic.formation} onChange={e => onTacticChange({ formation: e.target.value as Formation })} aria-label="Formation" className="fm-field min-w-[100px] text-sm">
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={team.tactic.mentality} onChange={e => onTacticChange({ mentality: e.target.value as Mentality })} aria-label="Mentality" className="fm-field min-w-[130px] text-sm">
                        {MENTALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)] gap-5 xl:gap-7 items-start">
                <aside className="fm-tactics-workboard lg:order-2 lg:sticky lg:top-[88px] min-w-0">
                    <div className="max-w-[460px] mx-auto">
                        <TacticsBoard
                            assignments={tacticalAnalysis.assignments}
                            formation={team.tactic.formation}
                            onSlotClick={handleSlotClick}
                            onSlotSwap={(fromIndex, toIndex) => {
                                if (fromIndex === toIndex) return;
                                const currentStarters = [...starters];
                                if (!currentStarters[fromIndex] || !currentStarters[toIndex]) return;
                                const temp = currentStarters[fromIndex];
                                currentStarters[fromIndex] = currentStarters[toIndex];
                                currentStarters[toIndex] = temp;
                                if (onReorderPlayers) onReorderPlayers([...currentStarters, ...bench]);
                                setSelectedSlot(null);
                            }}
                            selectedSlotIndex={selectedSlot}
                        />
                        <div className="fm-tactics-report pt-4">
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <h3 className="fm-eyebrow flex items-center gap-2"><ClipboardList className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />Tactical Analysis Report</h3>
                                <span className={`text-sm font-bold tabular-nums ${tacticalAnalysis.score > 80 ? 'fm-tactics-status-positive' : tacticalAnalysis.score > 50 ? 'fm-tactics-status-caution' : 'fm-tactics-status-danger'}`}>{tacticalAnalysis.score}% Efficiency</span>
                            </div>
                            <div className="space-y-2">
                                {tacticalAnalysis.feedback.length > 0 ? tacticalAnalysis.feedback.map((msg, i) => <p key={i} className="text-xs leading-relaxed flex items-start gap-2"><span aria-hidden="true">•</span>{msg}</p>) : <p className="fm-roster-detail text-xs italic">No selections warnings. Roster is fully optimized.</p>}
                            </div>
                        </div>
                    </div>
                </aside>
                <div className="fm-panel fm-roster-sheet lg:order-1 min-w-0 px-3 sm:px-4">
                    {!isNationalTeam && playersWithContractIssues.length > 0 && gameState === GameState.PRE_MATCH && (
                        <div className="fm-roster-contracts py-3">
                            <button onClick={() => setShowContracts(!showContracts)} aria-expanded={showContracts} className="fm-button-secondary w-full flex justify-between items-center gap-2 px-3 text-xs">
                                <span className="flex items-center gap-2"><DocumentCheckIcon className="w-4 h-4 shrink-0" />{playersWithContractIssues.length} Payroll Contracts Expiring</span>
                                <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${showContracts ? 'rotate-180' : ''}`} />
                            </button>
                            {showContracts && <div className="mt-2">
                                {playersWithContractIssues.map(player => <div key={`con-${player.name}`} className="fm-roster-contract-row flex justify-between items-center gap-3 py-2"><span className="text-xs font-semibold">{player.name} ({player.position})</span><button onClick={() => onStartContractTalk(player)} className="fm-button px-3 text-xs">RENEW</button></div>)}
                            </div>}
                        </div>
                    )}
                    {selectedListPlayer && <div className="fm-roster-swap py-3 text-xs" aria-live="polite">
                        <div className="flex justify-between items-center gap-2"><p className="font-bold">Swap Mode Active</p><button onClick={() => setSelectedListPlayer(null)} className="fm-button-secondary px-3 text-xs">Cancel Swap</button></div>
                        <p className="mt-1">Click another player in the squad below to swap them.</p>
                    </div>}
                    <section aria-label="Starting XI">
                        <div className="fm-roster-section-heading flex flex-wrap justify-between items-center gap-3 py-4">
                            <h3 className="fm-eyebrow flex items-center gap-2"><UsersRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />Starting XI ({starters.length}/11)</h3>
                            {isMatchLive && <span className="fm-tactics-status-caution text-xs font-bold tabular-nums">SUBS USED: {subsUsed}/5</span>}
                        </div>
                        <ul className="m-0 p-0 list-none">{starters.map(p => renderPlayerItem(p, false))}</ul>
                    </section>
                    <section aria-label="Substitutes & Reserves" className="pb-2">
                        <h3 className="fm-roster-section-heading fm-eyebrow py-4 flex items-center gap-2"><Armchair className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />Substitutes & Reserves ({bench.length})</h3>
                        <ul className="m-0 p-0 list-none">{bench.map(p => renderPlayerItem(p, true))}</ul>
                    </section>
                </div>
            </div>
        </section>
    );
};

export default TacticsManager;
