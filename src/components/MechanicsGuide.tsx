import React, { useState } from 'react';
import { Link2 } from 'lucide-react';
import { FootballIcon } from './icons/FootballIcon';

interface MechanicsGuideProps {
    onClose: () => void;
}

const MechanicsGuide: React.FC<MechanicsGuideProps> = ({ onClose }) => {
    const [tab, setTab] = useState<'personalities' | 'condition' | 'chemistry'>('personalities');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B24]/80 p-3 sm:p-6">
            <section role="dialog" aria-modal="true" aria-labelledby="mechanics-guide-title" className="fm-screen fm-panel w-full overflow-hidden flex flex-col max-h-[90dvh]" style={{ maxWidth: '48rem', padding: 0 }}>
                <header className="p-5 sm:p-7 border-b border-[#172B24]/25 flex justify-between items-start gap-4">
                    <div>
                        <p className="fm-eyebrow flex items-center gap-2 mb-2"><FootballIcon className="w-5 h-5" />Manager's Handbook</p>
                        <h3 id="mechanics-guide-title" className="fm-screen-title">Manager's Handbook</h3>
                    </div>
                    <button onClick={onClose} className="fm-button-secondary min-w-[44px] text-xl" aria-label="Close Manager's Handbook">&times;</button>
                </header>
                <nav className="flex flex-wrap border-b border-[#172B24]/20 px-3 sm:px-5" aria-label="Handbook topics">
                    <button onClick={() => setTab('personalities')} aria-pressed={tab === 'personalities'} className={`flex-1 min-h-[48px] py-3 px-2 text-sm font-semibold border-b-2 ${tab === 'personalities' ? 'border-[#A47837] text-[#18392F]' : 'border-transparent hover:bg-[#172B24]/5'}`}>Personalities</button>
                    <button onClick={() => setTab('condition')} aria-pressed={tab === 'condition'} className={`flex-1 min-h-[48px] py-3 px-2 text-sm font-semibold border-b-2 ${tab === 'condition' ? 'border-[#A47837] text-[#18392F]' : 'border-transparent hover:bg-[#172B24]/5'}`}>Fatigue & Injuries</button>
                    <button onClick={() => setTab('chemistry')} aria-pressed={tab === 'chemistry'} className={`flex-1 min-h-[48px] py-3 px-2 text-sm font-semibold border-b-2 ${tab === 'chemistry' ? 'border-[#A47837] text-[#18392F]' : 'border-transparent hover:bg-[#172B24]/5'}`}>Tactics & Roles</button>
                </nav>
                <div className="p-5 sm:p-7 overflow-y-auto">
                    {tab === 'personalities' && (
                        <div>
                            <p className="leading-relaxed mb-5">Player personalities are not just labels. They are inserted directly into the Match Simulation Prompt used by the AI engine.</p>
                            <dl className="border-y border-[#172B24]/20 divide-y divide-[#172B24]/15">
                                <div className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <dt className="text-xl font-semibold">Leader</dt>
                                    <dd className="text-sm leading-relaxed">Increases the probability of "momentum shifts" in the final 15 minutes if losing. The AI is instructed to use Leaders to trigger comeback events.</dd>
                                </div>
                                <div className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <dt className="text-xl font-semibold">Volatile</dt>
                                    <dd className="text-sm leading-relaxed">Can produce moments of magic (Brilliance) but has a significantly higher weight for Red Cards and Arguments with referees when the team is losing.</dd>
                                </div>
                                <div className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <dt className="text-xl font-semibold">Loyal</dt>
                                    <dd className="text-sm leading-relaxed">Will accept lower wages during contract negotiations and rarely requests transfers even if benched. Provides stability to team chemistry.</dd>
                                </div>
                                <div className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <dt className="text-xl font-semibold">Mercenary</dt>
                                    <dd className="text-sm leading-relaxed">Performance drops if contract has less than 1 year remaining. Demands significantly higher signing bonuses.</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                    {tab === 'condition' && (
                        <div>
                            <p className="leading-relaxed mb-5">Fatigue is the silent killer. Playing the same XI every week will destroy your season.</p>
                            <ul className="border-y border-[#172B24]/20 divide-y divide-[#172B24]/15">
                                <li className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <span className="text-xl font-semibold tabular-nums">90-100%</span><p className="text-sm leading-relaxed">Peak physical condition. Max sprint speed and focus.</p>
                                </li>
                                <li className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <span className="text-xl font-semibold tabular-nums">70-89%</span><p className="text-sm leading-relaxed">Standard match fitness. Slight reduction in late-game pressing effectiveness.</p>
                                </li>
                                <li className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <span className="text-xl font-semibold tabular-nums">50-69%</span>
                                    <p className="text-sm leading-relaxed"><strong className="block mb-1">DANGER ZONE</strong>The AI engine forces "Errors" on these players. A defender with 60% condition is highly likely to concede a penalty or miss a tackle in the simulation.</p>
                                </li>
                                <li className="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-2 sm:gap-5 py-4">
                                    <span className="text-xl font-semibold tabular-nums">&lt; 50%</span><p className="text-sm leading-relaxed">High injury risk. If played, they may suffer long-term injuries (4+ weeks) during the match sim.</p>
                                </li>
                            </ul>
                        </div>
                    )}
                    {tab === 'chemistry' && (
                        <div className="divide-y divide-[#172B24]/20">
                            <section className="pb-5">
                                <h4 className="text-2xl font-semibold mb-3">Tactical Familiarity</h4>
                                <p className="text-sm leading-relaxed mb-3">Playing players out of position (e.g. ST at CB) incurs a <strong>-50% efficiency penalty</strong> in the match engine calculation.</p>
                                <p className="text-sm leading-relaxed">However, <strong>Wing Backs (RWB)</strong> and <strong>Full Backs (RB)</strong> are interchangeable with only a minor penalty.</p>
                            </section>
                            <section className="pt-5">
                                <h4 className="mb-3 flex items-center gap-2 text-2xl font-semibold"><Link2 className="h-5 w-5 text-[#A47837]" strokeWidth={1.75} aria-hidden="true" />Chemistry Rifts</h4>
                                <p className="text-sm leading-relaxed">If two players have a "Bad Chemistry" status (visible in the squad list), the engine increases the chance of "Miscommunication" events leading to conceded goals.</p>
                            </section>
                        </div>
                    )}
                </div>
                <footer className="p-5 border-t border-[#172B24]/20 flex justify-end"><button onClick={onClose} className="fm-button">Understood</button></footer>
            </section>
        </div>
    );
};

export default MechanicsGuide;
