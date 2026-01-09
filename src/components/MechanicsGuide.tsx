
import React, { useState } from 'react';
import { FootballIcon } from './icons/FootballIcon';

interface MechanicsGuideProps {
    onClose: () => void;
}

const MechanicsGuide: React.FC<MechanicsGuideProps> = ({ onClose }) => {
    const [tab, setTab] = useState<'personalities' | 'condition' | 'chemistry'>('personalities');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border-2 border-gray-600 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FootballIcon className="w-6 h-6 text-green-400" />
                        <h3 className="text-xl font-bold text-white">Manager's Handbook</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white font-bold px-2">&times;</button>
                </div>

                <div className="flex bg-gray-900/50 border-b border-gray-700">
                    <button 
                        onClick={() => setTab('personalities')} 
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${tab === 'personalities' ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Personalities
                    </button>
                    <button 
                        onClick={() => setTab('condition')} 
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${tab === 'condition' ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Fatigue & Injuries
                    </button>
                    <button 
                        onClick={() => setTab('chemistry')} 
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors ${tab === 'chemistry' ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Tactics & Roles
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {tab === 'personalities' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-300">
                                Player personalities are not just labels. They are inserted directly into the Match Simulation Prompt used by the AI engine.
                            </p>
                            <div className="grid gap-3">
                                <div className="bg-gray-700/30 p-3 rounded border-l-4 border-yellow-500">
                                    <h4 className="font-bold text-yellow-400 text-sm">Leader</h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Increases the probability of "momentum shifts" in the final 15 minutes if losing. The AI is instructed to use Leaders to trigger comeback events.
                                    </p>
                                </div>
                                <div className="bg-gray-700/30 p-3 rounded border-l-4 border-red-500">
                                    <h4 className="font-bold text-red-400 text-sm">Volatile</h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Can produce moments of magic (Brilliance) but has a significantly higher weight for Red Cards and Arguments with referees when the team is losing.
                                    </p>
                                </div>
                                <div className="bg-gray-700/30 p-3 rounded border-l-4 border-blue-500">
                                    <h4 className="font-bold text-blue-400 text-sm">Loyal</h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Will accept lower wages during contract negotiations and rarely requests transfers even if benched. Provides stability to team chemistry.
                                    </p>
                                </div>
                                <div className="bg-gray-700/30 p-3 rounded border-l-4 border-green-500">
                                    <h4 className="font-bold text-green-400 text-sm">Mercenary</h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Performance drops if contract has less than 1 year remaining. Demands significantly higher signing bonuses.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'condition' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-300">
                                Fatigue is the silent killer. Playing the same XI every week will destroy your season.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex gap-3 items-start">
                                    <span className="text-green-400 font-bold">90-100%</span>
                                    <p className="text-xs text-gray-400">Peak physical condition. Max sprint speed and focus.</p>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="text-yellow-400 font-bold">70-89%</span>
                                    <p className="text-xs text-gray-400">Standard match fitness. Slight reduction in late-game pressing effectiveness.</p>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="text-orange-500 font-bold">50-69%</span>
                                    <p className="text-xs text-gray-400">
                                        <span className="text-white font-bold block mb-1">DANGER ZONE</span>
                                        The AI engine forces "Errors" on these players. A defender with 60% condition is highly likely to concede a penalty or miss a tackle in the simulation.
                                    </p>
                                </li>
                                <li className="flex gap-3 items-start">
                                    <span className="text-red-500 font-bold">&lt; 50%</span>
                                    <p className="text-xs text-gray-400">
                                        High injury risk. If played, they may suffer long-term injuries (4+ weeks) during the match sim.
                                    </p>
                                </li>
                            </ul>
                        </div>
                    )}

                    {tab === 'chemistry' && (
                        <div className="space-y-4">
                            <div className="bg-gray-900/50 p-3 rounded">
                                <h4 className="font-bold text-white text-sm mb-2">Tactical Familiarity</h4>
                                <p className="text-xs text-gray-400 mb-2">
                                    Playing players out of position (e.g. ST at CB) incurs a <strong>-50% efficiency penalty</strong> in the match engine calculation.
                                </p>
                                <p className="text-xs text-gray-400">
                                    However, <span className="text-blue-400">Wing Backs (RWB)</span> and <span className="text-blue-400">Full Backs (RB)</span> are interchangeable with only a minor penalty.
                                </p>
                            </div>

                            <div className="bg-gray-900/50 p-3 rounded">
                                <h4 className="font-bold text-white text-sm mb-2">Chemistry Rifts 🔗</h4>
                                <p className="text-xs text-gray-400">
                                    If two players have a "Bad Chemistry" status (visible in the squad list), the engine increases the chance of "Miscommunication" events leading to conceded goals.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors text-sm"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MechanicsGuide;
