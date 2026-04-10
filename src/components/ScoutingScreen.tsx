
import React, { useState, useRef, useEffect } from 'react';
import type { Player } from '../types';
import type { ScoutArchetype, ScoutReport, ScoutedPlayer } from '../services/geminiService';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { FootballIcon } from './icons/FootballIcon';

interface ChatMessage {
    role: 'manager' | 'scout';
    text?: string;
    report?: ScoutReport;
    isFollowUp?: boolean;
}

interface ScoutSession {
    archetype: ScoutArchetype;
    scoutName: string;
    useRealWorld: boolean;
    messages: ChatMessage[];
    originalRequest: string;
    lastReportText: string;
}

interface ScoutingScreenProps {
    onScout: (request: string, useRealWorld: boolean, archetype?: ScoutArchetype, isFictional?: boolean) => Promise<ScoutReport>;
    onFollowUp: (originalRequest: string, previousResponse: string, followUp: string, archetype: ScoutArchetype, useRealWorld: boolean) => Promise<string>;
    isLoading: boolean;
    onApproachPlayer: (player: Player) => void;
    onBack: () => void;
    onGoToTransfers?: () => void;
    isNationalTeam?: boolean;
    isFictionalMode?: boolean;
}

const SCOUT_NAMES: Record<ScoutArchetype, string> = {
    Pessimist: 'Viktor Mráz',
    Romantic: 'Lorenzo Fiore',
    Mercenary: 'Declan Sharp',
    Pragmatist: 'Anne Tordal',
};

const ARCHETYPE_COLORS: Record<ScoutArchetype, string> = {
    Pessimist: 'text-gray-400',
    Romantic: 'text-pink-400',
    Mercenary: 'text-yellow-400',
    Pragmatist: 'text-blue-400',
};

const ARCHETYPE_BG: Record<ScoutArchetype, string> = {
    Pessimist: 'bg-gray-700/40 border-gray-600',
    Romantic: 'bg-pink-900/20 border-pink-700/50',
    Mercenary: 'bg-yellow-900/20 border-yellow-700/50',
    Pragmatist: 'bg-blue-900/20 border-blue-700/50',
};

const ARCHETYPE_LABELS: Record<ScoutArchetype, string> = {
    Pessimist: 'The Pessimist',
    Romantic: 'The Romantic',
    Mercenary: 'The Mercenary',
    Pragmatist: 'The Pragmatist',
};

const CONFIDENCE_COLORS: Record<string, string> = {
    'High Confidence': 'text-green-400 bg-green-900/30 border-green-700/50',
    'Heard Good Things': 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50',
    'Unconfirmed Tip': 'text-orange-400 bg-orange-900/30 border-orange-700/50',
};

const getPositionColor = (pos: string) => {
    if (pos === 'GK') return 'bg-yellow-600';
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'bg-blue-600';
    if (['DM', 'CM', 'AM', 'LM', 'RM'].includes(pos)) return 'bg-green-600';
    return 'bg-red-600';
};

function randomArchetype(): ScoutArchetype {
    const types: ScoutArchetype[] = ['Pessimist', 'Romantic', 'Mercenary', 'Pragmatist'];
    return types[Math.floor(Math.random() * types.length)];
}

const PlayerReportCard: React.FC<{ scoutedPlayer: ScoutedPlayer; archetype: ScoutArchetype; onApproach: (p: Player) => void; isNationalTeam?: boolean }> = ({ scoutedPlayer, archetype, onApproach, isNationalTeam }) => {
    const { player, reportParagraph, personalityFlag, agentNote, confidenceLevel } = scoutedPlayer;
    return (
        <div className={`border rounded-xl p-5 mt-3 ${ARCHETYPE_BG[archetype]}`}>
            <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-3xl">{player.nationality}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${getPositionColor(player.position)}`}>{player.position}</span>
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-white">{player.name}</h4>
                        <span className="text-gray-400 text-sm">Age {player.age}</span>
                        {player.currentClub && <span className="text-gray-500 text-xs px-2 py-0.5 bg-gray-900/60 rounded">{player.currentClub}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                        <span className="bg-gray-800/80 px-2 py-1 rounded text-gray-300">Rating <span className="text-white font-bold">{player.rating}</span></span>
                        {!isNationalTeam && <span className="bg-gray-800/80 px-2 py-1 rounded text-gray-300">Wage <span className="text-white font-bold">${player.wage?.toLocaleString()}/wk</span></span>}
                        {!isNationalTeam && <span className="bg-gray-800/80 px-2 py-1 rounded text-gray-300">Value <span className="text-white font-bold">${(player.marketValue || 0).toLocaleString()}</span></span>}
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${CONFIDENCE_COLORS[confidenceLevel] || 'text-gray-400 bg-gray-800/80'}`}>{confidenceLevel}</span>
                    </div>
                    <p className="text-sm text-gray-200 italic leading-relaxed mb-3">"{reportParagraph}"</p>
                    <div className="space-y-1 text-xs text-gray-400">
                        <p><span className="text-gray-500 font-semibold">Character:</span> {personalityFlag}</p>
                        <p><span className="text-gray-500 font-semibold">Situation:</span> {agentNote}</p>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => onApproach(player)}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                    {isNationalTeam ? 'Call Up' : 'Approach Player'}
                </button>
            </div>
        </div>
    );
};

const ScoutingScreen: React.FC<ScoutingScreenProps> = ({
    onScout, onFollowUp, isLoading, onApproachPlayer, onBack, onGoToTransfers, isNationalTeam, isFictionalMode
}) => {
    const [input, setInput] = useState('');
    const [useRealWorld, setUseRealWorld] = useState(false);
    const [session, setSession] = useState<ScoutSession | null>(null);
    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    const handleNewSession = async () => {
        if (!input.trim()) return;
        const archetype = randomArchetype();
        const request = input.trim();
        const realWorld = !isNationalTeam && useRealWorld;
        setInput('');

        const newSession: ScoutSession = {
            archetype,
            scoutName: SCOUT_NAMES[archetype],
            useRealWorld: realWorld,
            messages: [{ role: 'manager', text: request }],
            originalRequest: request,
            lastReportText: '',
        };
        setSession(newSession);

        const report = await onScout(request, realWorld, archetype, isFictionalMode);

        const reportText = [
            report.scoutNarrative,
            ...report.players.map(p =>
                `${p.player.name} (${p.player.currentClub}, ${p.player.age}): ${p.reportParagraph} ${p.personalityFlag} ${p.agentNote}`
            )
        ].join('\n\n');

        setSession(prev => prev ? {
            ...prev,
            lastReportText: reportText,
            messages: [...prev.messages, { role: 'scout', report }],
        } : null);
    };

    const handleFollowUp = async () => {
        if (!input.trim() || !session) return;
        const question = input.trim();
        const currentTranscript = session.lastReportText;
        setInput('');
        setIsFollowUpLoading(true);

        setSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, { role: 'manager', text: question, isFollowUp: true }],
        } : null);

        const reply = await onFollowUp(
            session.originalRequest,
            currentTranscript,
            question,
            session.archetype,
            session.useRealWorld
        );

        setSession(prev => prev ? {
            ...prev,
            lastReportText: `${currentTranscript}\n\nManager: ${question}\nScout: ${reply}`,
            messages: [...prev.messages, { role: 'scout', text: reply, isFollowUp: true }],
        } : null);
        setIsFollowUpLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        if (session) {
            handleFollowUp();
        } else {
            handleNewSession();
        }
    };

    const handleNewSearch = () => {
        setSession(null);
        setInput('');
    };

    const isAnyLoading = isLoading || isFollowUpLoading;
    const hasSession = !!session;

    return (
        <div className="mt-8 max-w-3xl mx-auto px-4 flex flex-col" style={{ minHeight: 'calc(100vh - 100px)' }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">
                        {isNationalTeam ? 'National Pool Selection' : 'Scouting'}
                    </h2>
                    {session ? (
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${ARCHETYPE_COLORS[session.archetype]}`}>{session.scoutName}</span>
                            <span className="text-gray-600 text-sm">·</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${ARCHETYPE_BG[session.archetype]} ${ARCHETYPE_COLORS[session.archetype]}`}>{ARCHETYPE_LABELS[session.archetype]}</span>
                            {session.useRealWorld && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded border text-blue-400 bg-blue-900/20 border-blue-700/50 flex items-center gap-1">
                                    <GlobeAltIcon className="w-3 h-3" /> Live Network
                                </span>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">Tell your scout what you're looking for.</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {hasSession && (
                        <button onClick={handleNewSearch} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded border border-gray-600">
                            New Search
                        </button>
                    )}
                    {onGoToTransfers && (
                        <button onClick={onGoToTransfers} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded border border-gray-600 whitespace-nowrap">
                            {isNationalTeam ? 'View All Eligible' : 'Transfer List'}
                        </button>
                    )}
                </div>
            </div>

            {/* Chat area */}
            {!hasSession ? (
                /* Initial state: just the input */
                <div className="flex-grow flex flex-col justify-center">
                    <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-8 mb-4">
                        <p className="text-gray-300 text-center mb-6 text-lg">
                            {isNationalTeam
                                ? 'Describe what kind of players you need for the national squad.'
                                : 'Describe who you\'re looking for — in any words you like.'}
                        </p>
                        <div className="space-y-3 text-sm text-gray-500 text-center mb-8">
                            <p className="italic">"Find me someone like Messi but faster"</p>
                            <p className="italic">"An under-18 street futsal prodigy from South America"</p>
                            <p className="italic">"A defensive midfielder who reads the game, not just a destroyer"</p>
                        </div>

                        {!isNationalTeam && (
                            <div
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer mb-4 ${useRealWorld ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-700/30 border-gray-600'}`}
                                onClick={() => setUseRealWorld(!useRealWorld)}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${useRealWorld ? 'bg-blue-500 border-blue-400' : 'border-gray-400'}`}>
                                    {useRealWorld && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${useRealWorld ? 'text-blue-300' : 'text-gray-300'}`}>Real World Network</p>
                                    <p className="text-xs text-gray-500">Search live football databases via Google (Gemini Grounding)</p>
                                </div>
                                <GlobeAltIcon className={`w-5 h-5 ${useRealWorld ? 'text-blue-400' : 'text-gray-600'}`} />
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={isNationalTeam ? "e.g. 'Fit strikers playing in Premier League'" : "Describe the player you need..."}
                                className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isAnyLoading}
                            />
                            <button
                                type="submit"
                                disabled={isAnyLoading || !input.trim()}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                                {isLoading ? <FootballIcon className="w-4 h-4 animate-spin" /> : null}
                                {isNationalTeam ? 'Search Pool' : 'Send Scout'}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* Conversation view */
                <div className="flex-grow flex flex-col">
                    <div className="flex-grow space-y-4 mb-4 overflow-y-auto">
                        {session.messages.map((msg, i) => (
                            <div key={i}>
                                {msg.role === 'manager' ? (
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] bg-blue-700/40 border border-blue-600/50 rounded-2xl rounded-tr-sm px-4 py-3">
                                            <p className="text-white text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-start">
                                        <div className="max-w-[95%] w-full">
                                            <div className="flex items-center gap-2 mb-2 ml-1">
                                                <span className={`text-xs font-bold ${ARCHETYPE_COLORS[session.archetype]}`}>{session.scoutName}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${ARCHETYPE_BG[session.archetype]} ${ARCHETYPE_COLORS[session.archetype]}`}>{ARCHETYPE_LABELS[session.archetype]}</span>
                                            </div>
                                            {msg.report ? (
                                                <div className={`border rounded-2xl rounded-tl-sm px-5 py-4 ${ARCHETYPE_BG[session.archetype]}`}>
                                                    {msg.report.scoutNarrative && (
                                                        <p className="text-gray-300 text-sm italic mb-4 leading-relaxed">"{msg.report.scoutNarrative}"</p>
                                                    )}
                                                    {msg.report.players.map((sp, j) => (
                                                        <PlayerReportCard
                                                            key={j}
                                                            scoutedPlayer={sp}
                                                            archetype={session.archetype}
                                                            onApproach={onApproachPlayer}
                                                            isNationalTeam={isNationalTeam}
                                                        />
                                                    ))}
                                                    {msg.report.players.length === 0 && (
                                                        <p className="text-gray-500 italic text-sm">No players found for this search.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={`border rounded-2xl rounded-tl-sm px-4 py-3 ${ARCHETYPE_BG[session.archetype]}`}>
                                                    <p className="text-gray-200 text-sm leading-relaxed">{msg.text}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isAnyLoading && (
                            <div className="flex justify-start">
                                <div className={`border rounded-2xl rounded-tl-sm px-5 py-4 ${ARCHETYPE_BG[session.archetype]} flex items-center gap-3`}>
                                    <FootballIcon className="w-4 h-4 animate-spin text-gray-400" />
                                    <span className="text-gray-400 text-sm italic">{session.scoutName} is on it...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Follow-up input */}
                    <div className="sticky bottom-0 bg-gray-900 pt-3 pb-2">
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask a follow-up — 'Is he available?' or 'What about his injury?'"
                                className="flex-grow p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isAnyLoading}
                            />
                            <button
                                type="submit"
                                disabled={isAnyLoading || !input.trim()}
                                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="text-center mt-6 pb-4">
                <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm">
                    &larr; Back to Team
                </button>
            </div>
        </div>
    );
};

export default ScoutingScreen;
