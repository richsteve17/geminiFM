import React, { useState } from 'react';
import { EXPERIENCE_LEVELS } from '../constants';
import type { ExperienceLevel } from '../types';

interface CreateManagerScreenProps {
    onCreate: (name: string, experience: ExperienceLevel) => void;
    onBack: () => void;
    tutorialSummary?: string;
}

const CreateManagerScreen: React.FC<CreateManagerScreenProps> = ({ onCreate, onBack, tutorialSummary }) => {
    const [name, setName] = useState('');
    const [selectedExpId, setSelectedExpId] = useState(EXPERIENCE_LEVELS[0].id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const exp = EXPERIENCE_LEVELS.find(e => e.id === selectedExpId);
        if (exp && name.trim()) {
            onCreate(name, exp);
        }
    };

    return (
        <section className="fm-screen max-w-5xl mx-auto px-4 py-8">
            <header className="mb-8 border-b border-[#172B24]/25 pb-6">
                <p className="fm-eyebrow">Manager Profile</p>
                <h2 className="fm-screen-title">Create Your Profile</h2>
            </header>
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start">
                <aside className="border-l-2 border-[#A47837] pl-5">
                    <p className="text-lg leading-relaxed">Your World Cup tutorial record determines starting job access.</p>
                    {tutorialSummary && <p className="mt-4 text-sm leading-relaxed" role="status">{tutorialSummary}</p>}
                </aside>
                <form onSubmit={handleSubmit} className="fm-panel p-5 sm:p-7">
                    <div className="mb-7">
                        <label htmlFor="managerName" className="block font-semibold mb-2">Manager Name</label>
                        <input type="text" id="managerName" required className="fm-field w-full" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <fieldset className="mb-7">
                        <legend className="block font-semibold mb-4">Past Playing Experience — profile only, not an unlock</legend>
                        <div className="border-y border-[#172B24]/20 divide-y divide-[#172B24]/15">
                            {EXPERIENCE_LEVELS.map(level => (
                                <label key={level.id} className={`flex items-start gap-4 py-4 pl-3 pr-2 border-l-2 cursor-pointer transition-colors ${selectedExpId === level.id ? 'border-[#A47837] bg-[#A47837]/10' : 'border-transparent hover:bg-[#172B24]/5'}`}>
                                    <input type="radio" name="experience" value={level.id} checked={selectedExpId === level.id} onChange={() => setSelectedExpId(level.id)} className="mt-1 w-5 h-5 shrink-0 accent-[#18392F]" />
                                    <div>
                                        <span className="block text-lg font-semibold">{level.label}</span>
                                        <span className="block text-sm leading-relaxed mt-1">Profile background only. Starting clubs are determined by your World Cup tutorial record.</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#172B24]/20 pt-5">
                        <button type="button" onClick={onBack} className="fm-button-secondary">Back</button>
                        <button type="submit" className="fm-button">Start Career</button>
                    </footer>
                </form>
            </div>
        </section>
    );
};

export default CreateManagerScreen;
