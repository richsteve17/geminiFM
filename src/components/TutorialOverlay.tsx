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
            content: "Keep an eye on player morale and chemistry issues. Unhappy players perform worse. Click 'Squad' to see detailed stats.",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172B24]/80 p-3 sm:p-6">
            <section role="dialog" aria-modal="true" aria-labelledby="tutorial-step-title" aria-describedby="tutorial-step-content" className="fm-screen fm-panel w-full overflow-hidden flex flex-col max-h-[90dvh]" style={{ maxWidth: '36rem', padding: 0 }}>
                <header className="p-5 sm:p-7 border-b border-[#172B24]/25">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <p className="fm-eyebrow flex items-center gap-2"><FootballIcon className="w-5 h-5" />Tutorial</p>
                        <p className="text-sm tabular-nums">Step {step + 1} of {steps.length}</p>
                    </div>
                    <h3 id="tutorial-step-title" className="fm-screen-title">{currentStep.title}</h3>
                </header>
                <div className="p-5 sm:p-7 overflow-y-auto">
                    <p id="tutorial-step-content" className="text-lg leading-relaxed">{currentStep.content}</p>
                </div>
                <footer className="p-5 sm:px-7 border-t border-[#172B24]/20">
                    <div className="flex gap-2 mb-5" aria-hidden="true">
                        {steps.map((_, i) => <div key={i} className={`h-1 flex-1 ${i === step ? 'bg-[#A47837]' : 'bg-[#172B24]/20'}`} />)}
                    </div>
                    <div className="flex justify-between items-center gap-3">
                        <button onClick={onClose} className="fm-button-secondary">Skip</button>
                        <button onClick={step === steps.length - 1 ? onClose : onNext} className="fm-button">{step === steps.length - 1 ? "Let's Play" : "Next"}</button>
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default TutorialOverlay;
