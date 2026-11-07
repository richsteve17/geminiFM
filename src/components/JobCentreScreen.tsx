
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
        <div className="mt-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Job Centre</h2>
                <p className="text-lg text-gray-400">The following clubs are looking for a new manager. Do you have what it takes?</p>
                {careerSummary && <p className="mt-3 text-sm text-emerald-300" role="status">{careerSummary}</p>}
            </div>
            <div className="space-y-3">
                {sortedJobs.map(job => (
                    <div key={job.teamName} className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <ClubCrest name={job.teamName} size="h-10 w-10" />
                            <div className="min-w-0">
                                <h3 className="truncate text-xl font-bold text-blue-400">{job.teamName}</h3>
                                <p className="text-sm text-gray-300">Prestige: <span className="font-bold">{job.prestige}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => onApply(job.teamName)}
                            className="py-2 px-5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                            Apply
                        </button>
                    </div>
                ))}
            </div>
             <div className="text-center mt-8">
                 <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    &larr; Back to Main Menu
                </button>
            </div>
        </div>
    );
};

export default JobCentreScreen;
