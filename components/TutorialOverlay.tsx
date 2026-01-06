
import React from 'react';
import { FootballIcon } from './icons/FootballIcon';

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
    onClose: () => void;
    isNationalTeam: boolean;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onClose, isNationalTeam }) => {
    const steps = [
        {
            title: isNationalTeam ? "Welcome to the World Cup" : "Welcome, Boss",
            content: isNationalTeam 
                ? "You have taken charge of the national team. The eyes of the world are on you. Your goal is simple: Win the trophy."
                : "You are the new manager. The board has high expectations. Your job is to manage tactics, morale, and results.",
            position: "center"
        },
        {
            title: "Tactical Setup",
            content: "On the left, you control your Formation and Mentality. Changing these directly impacts how the AI simulates the match. A 'Park the Bus' strategy might steal a draw against a big team!",
            position: "left"
        },
        {
            title: "Player Management",
            content: "Keep an eye on player morale (🔥) and chemistry issues (🔗). Unhappy players perform worse. Click 'Squad' to see detailed stats.",
            position: "left"
        },
        {
            title: "The Match Engine",
            content: "Matches are simulated dynamically by AI. Your halftime team talks ('Demand More', 'Encourage') can genuinely turn a losing game around.",
            position: "center"
        },
        {
            title: "Good Luck",
            content: "That's the basics. Hit 'Kick Off' to start your first match.",
            position: "center"
        }
    ];

    const currentStep = steps[step];
    if (!currentStep) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border-2 border-green-500 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden relative animation-fade-in-up">
                <div className="bg-gray-900 p-4 border-b border-gray-700 flex items-center gap-3">
                    <FootballIcon className="w-6 h-6 text-green-400" />
                    <h3 className="text-xl font-bold text-white">{currentStep.title}</h3>
                </div>
                <div className="p-6">
                    <p className="text-gray-300 text-lg leading-relaxed">{currentStep.content}</p>
                </div>
                <div className="bg-gray-900/50 p-4 flex justify-between items-center">
                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-green-500' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                    <div className="flex gap-3">
                         <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-white text-sm font-semibold px-3"
                        >
                            Skip
                        </button>
                        <button 
                            onClick={step === steps.length - 1 ? onClose : onNext}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            {step === steps.length - 1 ? "Let's Play" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorialOverlay;
