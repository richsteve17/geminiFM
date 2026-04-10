
import React from 'react';
import type { Fixture, Team } from '../types';

interface ModeSelectScreenProps {
    fixture: Fixture;
    userTeam: Team;
    onManage: () => void;
    onPlay: (playerName: string) => void;
}

export default function ModeSelectScreen({ fixture, userTeam, onManage, onPlay }: ModeSelectScreenProps) {
    const starters = userTeam.players.filter(p => p.isStarter);
    const [selectedPlayer, setSelectedPlayer] = React.useState<string>(starters[1]?.name || starters[0]?.name || '');

    const outfieldStarters = starters.filter(p => p.position !== 'GK');

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 landscape:overflow-y-auto">
            <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-1">Match Day</h2>
                    <p className="text-gray-400 text-sm">
                        {fixture.homeTeam} <span className="text-yellow-400 font-bold">vs</span> {fixture.awayTeam}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={onManage}
                        className="group relative bg-gray-800 border-2 border-gray-600 hover:border-blue-500 rounded-xl p-6 text-center transition-all hover:bg-gray-700"
                    >
                        <div className="text-4xl mb-3">🪑</div>
                        <h3 className="text-lg font-black text-white uppercase mb-1">Manage</h3>
                        <p className="text-xs text-gray-400">Control tactics & shout from the touchline</p>
                        <div className="mt-3 text-xs text-blue-400 font-bold uppercase">Touchline Mode</div>
                    </button>

                    <button
                        onClick={() => selectedPlayer && onPlay(selectedPlayer)}
                        className="group relative bg-green-900/40 border-2 border-green-600 hover:border-green-400 rounded-xl p-6 text-center transition-all hover:bg-green-800/40"
                    >
                        <div className="text-4xl mb-3">🎮</div>
                        <h3 className="text-lg font-black text-white uppercase mb-1">Play</h3>
                        <p className="text-xs text-gray-400">Take direct control of a player</p>
                        <div className="mt-3 text-xs text-green-400 font-bold uppercase">NEW</div>
                    </button>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-3">Choose your player (Play mode)</p>
                    <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                        {outfieldStarters.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setSelectedPlayer(p.name)}
                                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                                    selectedPlayer === p.name
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <span className="truncate font-medium">{p.name}</span>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                    <span className="text-gray-400">{p.position}</span>
                                    <span className={`font-bold ${
                                        selectedPlayer === p.name ? 'text-yellow-300' : 'text-yellow-400'
                                    }`}>{p.rating}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                    {selectedPlayer && (
                        <p className="text-xs text-green-400 mt-2 text-center">
                            Playing as: <strong>{selectedPlayer}</strong>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
