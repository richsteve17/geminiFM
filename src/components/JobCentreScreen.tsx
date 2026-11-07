import React from 'react';
import type { Job } from '../types';
import ClubCrest from './ClubIdentity';

interface JobCentreScreenProps {
    jobs: Job[];
    onApply: (teamName: string) => void;
    onBack: () => void;
    careerSummary?: string;
}

const JobCentreScreen: React.FC<JobCentreScreenProps> = ({ jobs, onApply, onBack, careerSummary }) => {
    const sortedJobs = [...jobs].sort((a, b) => b.prestige - a.prestige);

    return (
        <section className="fm-screen max-w-5xl mx-auto px-4 py-8">
            <header className="mb-8 border-b border-[#172B24]/25 pb-6">
                <p className="fm-eyebrow">Office of Recruitment</p>
                <h2 className="fm-screen-title">Job Centre</h2>
                <p className="mt-3 max-w-2xl leading-relaxed">The following clubs are looking for a new manager. Do you have what it takes?</p>
                {careerSummary && <p className="mt-4 border-l-2 border-[#A47837] pl-4 text-sm leading-relaxed" role="status">{careerSummary}</p>}
            </header>
            <div className="fm-panel overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_8rem_8rem] gap-4 border-b border-[#172B24]/20 px-5 py-3 text-sm font-semibold">
                    <span>Club</span><span>Prestige</span><span className="text-right">Application</span>
                </div>
                {sortedJobs.map(job => (
                    <div key={job.teamName} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_8rem_8rem] items-center gap-4 border-b border-[#172B24]/15 last:border-b-0 px-5 py-5">
                        <div className="flex min-w-0 items-center gap-4">
                            <ClubCrest name={job.teamName} size="h-10 w-10" />
                            <div className="min-w-0">
                                <h3 className="text-2xl leading-tight font-semibold break-words">{job.teamName}</h3>
                                <p className="sm:hidden mt-1 text-sm">Prestige: <span className="font-semibold tabular-nums">{job.prestige}</span></p>
                            </div>
                        </div>
                        <p className="hidden sm:block font-semibold tabular-nums">{job.prestige}</p>
                        <button onClick={() => onApply(job.teamName)} className="fm-button justify-self-end">Apply</button>
                    </div>
                ))}
            </div>
            <footer className="mt-6">
                <button onClick={onBack} className="fm-button-secondary">&larr; Back to Main Menu</button>
            </footer>
        </section>
    );
};

export default JobCentreScreen;
