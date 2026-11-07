import React from 'react';
import { FootballIcon } from './icons/FootballIcon';
import { ArrowLeftStartOnRectangleIcon } from './icons/ArrowLeftStartOnRectangleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { PRODUCT_NAME, EDITION_LABEL } from '../product';

interface HeaderProps {
    onQuit?: () => void;
    onSave?: () => void;
    onToggleGuide?: () => void;
    onToggleTerminal?: () => void;
    showQuit?: boolean;
    managerReputation?: number;
}
const Header: React.FC<HeaderProps> = ({ onQuit, onSave, onToggleGuide, onToggleTerminal, showQuit, managerReputation }) => (
    <header className="fm-header">
        <div className="fm-header-brand min-w-0">
            <FootballIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h1 className="whitespace-nowrap">{PRODUCT_NAME} <span className="text-[#A47837]">{EDITION_LABEL}</span></h1>
            {managerReputation !== undefined && <div className="hidden md:block ml-2 border-l border-[#172B24]/20 pl-3 text-sm tabular-nums" title="Manager Reputation"><span className="mr-1 text-[#637169]">Rep</span><strong>{managerReputation}</strong></div>}
        </div>
        <nav className="fm-header-actions" aria-label="Game controls">
            {showQuit && <>
                <button type="button" onClick={onSave} className="fm-button" aria-label="Save game" title="Save Game"><ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Save</span></button>
                <button type="button" onClick={onToggleGuide} className="fm-button-secondary" aria-label="Game guide" title="Game Guide"><BookOpenIcon className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Guide</span></button>
                <button type="button" onClick={onQuit} className="fm-button-secondary" aria-label="Quit to menu" title="Quit to Menu"><ArrowLeftStartOnRectangleIcon className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Menu</span></button>
            </>}
            <button type="button" onClick={onToggleTerminal} className="fm-button-secondary" aria-label="System terminal" title="System Terminal"><CommandLineIcon className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Terminal</span></button>
        </nav>
    </header>
);
export default Header;
