import React from 'react';
import type { Job } from '../types';

interface JobCentreScreenProps {
    jobs: Job[];
    onApply: (teamName: string) => void;
    onBack: () => void;
}

const JobCentreScreen: React.FC<JobCentreScreenProps> = ({ jobs, onApply, onBack }) => {
    const sortedJobs = [...jobs].sort((a, b) => b.prestige - a.prestige);

    return (
        <div className="mt-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Job Centre</h2>
                <p className="text-lg text-gray-400">The following clubs are looking for a new manager. Do you have what it takes?</p>
            </div>
            <div className="space-y-3">
                {sortedJobs.map(job => (
                    <div key={job.teamName} className="bg-gray-800/50 rounded-lg shadow-lg border border-gray-700 p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-blue-400">{job.teamName}</h3>
                            <p className="text-sm text-gray-300">Prestige: <span className="font-bold">{job.prestige}</span></p>
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
