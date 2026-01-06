
import React, { useState } from 'react';
import { EXPERIENCE_LEVELS } from '../constants';
import type { ExperienceLevel } from '../types';
import { UserIcon } from './icons/UserIcon';

interface CreateManagerScreenProps {
    onCreate: (name: string, experience: ExperienceLevel) => void;
    onBack: () => void;
}

const CreateManagerScreen: React.FC<CreateManagerScreenProps> = ({ onCreate, onBack }) => {
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
        <div className="mt-12 max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create Your Profile</h2>
                <p className="text-lg text-gray-400">Define your managerial background to see who will hire you.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 p-6 md:p-8">
                <div className="mb-6">
                    <label htmlFor="managerName" className="block text-sm font-bold text-gray-300 mb-2">
                        Manager Name
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            id="managerName"
                            required
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-3"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-sm font-bold text-gray-300 mb-4">
                        Past Playing Experience
                    </label>
                    <div className="space-y-3">
                        {EXPERIENCE_LEVELS.map(level => (
                            <label 
                                key={level.id} 
                                className={`flex items-start p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selectedExpId === level.id ? 'bg-blue-900/40 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'}`}
                            >
                                <input 
                                    type="radio" 
                                    name="experience" 
                                    value={level.id} 
                                    checked={selectedExpId === level.id}
                                    onChange={() => setSelectedExpId(level.id)}
                                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 focus:ring-blue-500"
                                />
                                <div className="ml-4">
                                    <span className={`block text-base font-semibold ${selectedExpId === level.id ? 'text-blue-400' : 'text-gray-200'}`}>
                                        {level.label}
                                    </span>
                                    <span className="block text-sm text-gray-400 mt-1">
                                        {level.description}
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-1/3 py-3 px-4 bg-gray-700 text-gray-300 font-bold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="w-2/3 py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Start Career
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateManagerScreen;
