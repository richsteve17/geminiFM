import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateChantAudio, type Chant } from '../services/chantService';
import { stadiumAudio, type StadiumAudioPlaybackState } from '../services/audioDirector';
import { isPaidAudioEnabled } from '../services/geminiService';

interface Props {
    chant: Chant | null;
    momentum: number;
    teamName: string;
    /** Lets the match view advance a cue queue after an actual clip ends. */
    onChantFinished?: (chantId: string) => void;
}

const statusTone = (status: StadiumAudioPlaybackState) => {
    if (status.state === 'playing-recorded') return 'text-emerald-300';
    if (status.state === 'playing-synthetic-preview') return 'text-amber-300';
    if (status.state === 'error' || status.state === 'unavailable') return 'text-rose-300';
    if (status.state === 'locked') return 'text-amber-300';
    return 'text-slate-400';
};

export default function AtmosphereWidget({ chant, momentum, teamName, onChantFinished }: Props) {
    const [phase, setPhase] = useState(0);
    const [audioStatus, setAudioStatus] = useState<StadiumAudioPlaybackState>(() => stadiumAudio.getStatus());
    const [previewError, setPreviewError] = useState<string | null>(null);
    const autoPlayedChants = useRef(new Set<string>());
    const activePlaybackId = useRef<string | null>(null);

    useEffect(() => {
        const interval = window.setInterval(() => setPhase(previous => previous + 1), 100);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => stadiumAudio.subscribe(status => {
        setAudioStatus(status);
        if (status.state === 'playing-recorded' || status.state === 'playing-synthetic-preview') {
            activePlaybackId.current = status.chantId;
        } else if (status.state === 'ready' && activePlaybackId.current) {
            const completedId = activePlaybackId.current;
            activePlaybackId.current = null;
            onChantFinished?.(completedId);
        }
    }), [onChantFinished]);

    useEffect(() => {
        stadiumAudio.setCrowdIntensity(Math.min(1, 0.35 + Math.abs(momentum) / 13));
    }, [momentum]);

    // Match events may arrive in a batch. Each stable cue id plays once, but only after a prior
    // user gesture unlocked Web Audio. This effect never calls unlock itself.
    useEffect(() => {
        if (!chant || autoPlayedChants.current.has(chant.id)) return;
        if (audioStatus.state === 'locked' || audioStatus.state === 'muted') return;
        autoPlayedChants.current.add(chant.id);
        void stadiumAudio.playChant(chant);
    }, [chant, audioStatus.state]);

    useEffect(() => {
        if (!chant || !['unavailable', 'error'].includes(audioStatus.state)) return;
        const timer = window.setTimeout(() => onChantFinished?.(chant.id), 2200);
        return () => window.clearTimeout(timer);
    }, [chant?.id, audioStatus.state, onChantFinished]);

    useEffect(() => () => stadiumAudio.stopChant(), []);

    const bars = useMemo(() => Array.from({ length: 5 }, (_, index) => {
        const wave = Math.sin((phase + index * 3) * 0.72) * 11;
        return Math.max(12, Math.min(92, 31 + Math.abs(momentum) * 4.5 + wave));
    }), [momentum, phase]);

    const handleEnableAudio = async () => {
        setPreviewError(null);
        const status = await stadiumAudio.unlockFromUserGesture();
        if (status.state === 'ready' && chant) await stadiumAudio.playChant(chant);
    };

    const handlePlayRecording = async (forceReload = false) => {
        if (!chant) return;
        setPreviewError(null);
        await stadiumAudio.playChant(chant, { forceReload });
    };

    const handleSyntheticPreview = async () => {
        if (!chant) return;
        setPreviewError(null);
        const unlockStatus = await stadiumAudio.unlockFromUserGesture();
        if (unlockStatus.state !== 'ready') return;
        if (!isPaidAudioEnabled()) {
            setPreviewError('Synthetic previews are disabled by the Paid AI Commentary setting. Recorded terrace clips are unaffected.');
            return;
        }
        try {
            const preview = await generateChantAudio(chant);
            stadiumAudio.playSyntheticPreview(chant.id, preview);
        } catch (error) {
            setPreviewError(`Synthetic preview failed: ${error instanceof Error ? error.message : 'unknown error'}.`);
        }
    };

    const getBarColor = () => momentum < -3 ? 'bg-red-600' : momentum > 3 ? 'bg-green-500' : 'bg-cyan-500';
    const getMoodText = () => momentum < -5 ? 'HOSTILE' : momentum < -2 ? 'TENSE' : momentum > 5 ? 'BOUNCING' : momentum > 2 ? 'ELECTRIC' : 'STEADY';
    const isPlayingThisChant = (audioStatus.state === 'playing-recorded' || audioStatus.state === 'playing-synthetic-preview')
        && audioStatus.chantId === chant?.id;

    if (!teamName) return null;

    return (
        <section className="bg-slate-950 border border-slate-700 p-2 sm:p-3 mb-4 shadow-lg relative overflow-hidden rounded-lg" aria-label="Stadium atmosphere">
            <div className={`absolute inset-0 opacity-10 ${getBarColor()} transition-colors duration-500`} />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Home End</span>
                    <div className="flex items-end space-x-1 h-8">
                        {bars.map((height, index) => <div key={index} className={`w-1.5 transition-all duration-75 rounded-t ${getBarColor()}`} style={{ height: `${height}%` }} />)}
                    </div>
                    <span className={`text-[10px] font-bold mt-1 ${momentum < -2 ? 'text-red-400' : momentum > 2 ? 'text-green-400' : 'text-slate-400'}`}>{getMoodText()}</span>
                </div>

                <div className="flex-1 bg-black/30 rounded border border-slate-700/50 p-2 min-h-[90px] sm:min-h-[96px] flex flex-col justify-center items-center text-center relative">
                    <div className="sm:hidden mb-1 w-full flex items-center justify-between text-[10px] font-bold text-slate-300"><span>{getMoodText()}</span><span>{momentum > 0 ? '+' : ''}{momentum}</span></div>
                    {chant ? (
                        <div className="animate-in fade-in zoom-in duration-300 w-full text-center">
                            <p className="text-[9px] sm:text-[10px] text-amber-400 font-mono mb-1 tracking-widest uppercase flex items-center justify-center gap-2">
                                {chant.audioSource === 'recorded-terrace' ? 'Recorded terrace clip' : 'Songbook cue — recording unavailable'}
                                {isPlayingThisChant && <span className="animate-pulse text-emerald-400">LIVE</span>}
                            </p>
                            <p className="text-[10px] text-slate-300 font-bold">{chant.tune}</p>
                            {chant.lyrics.length > 0 && <div className="space-y-0.5 mt-1">{chant.lyrics.map((line, index) => <p key={index} className={`font-black italic text-slate-100 ${index === chant.lyrics.length - 1 ? 'text-amber-100 text-xs sm:text-sm' : 'text-[11px] sm:text-xs'}`}>“{line.toUpperCase()}”</p>)}</div>}
                            <p className="mt-1 text-[9px] text-slate-500 uppercase tracking-wider">{chant.archetypeId.replaceAll('_', ' ')} · {chant.tempoBpm} BPM · {chant.clubName}</p>
                            {chant.recording && <p className="mt-1 text-[8px] text-slate-600">Source: {chant.recording.source.sourceName} [{chant.recording.source.sourceId}]</p>}
                        </div>
                    ) : <div className="py-2 opacity-65"><p className="text-xs text-slate-400 font-bold italic">Waiting for a match cue. Audio only plays supplied recordings after you enable it.</p></div>}

                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {audioStatus.state === 'locked' ? (
                            <button type="button" onClick={handleEnableAudio} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400">Enable stadium audio</button>
                        ) : audioStatus.state === 'muted' ? (
                            <button type="button" onClick={() => stadiumAudio.setMuted(false)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400">Unmute stadium audio</button>
                        ) : (
                            <>
                                <button type="button" onClick={() => void handlePlayRecording(false)} disabled={!chant || audioStatus.state === 'loading-recorded'} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 disabled:opacity-50">Play recording</button>
                                <button type="button" onClick={() => stadiumAudio.setMuted(true)} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600">Mute</button>
                            </>
                        )}
                        {(audioStatus.state === 'unavailable' || audioStatus.state === 'error') && audioStatus.retryable && chant && (
                            <button type="button" onClick={() => void handlePlayRecording(true)} className="text-[10px] font-bold px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-50 border border-amber-500">Retry recording</button>
                        )}
                        {chant?.lyrics.length ? <button type="button" onClick={() => void handleSyntheticPreview()} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700">Paid synthetic preview</button> : null}
                    </div>
                    <p className={`mt-1 text-[9px] ${statusTone(audioStatus)}`} aria-live="polite">{audioStatus.message}</p>
                    {previewError && <p className="mt-1 text-[9px] text-rose-300" role="alert">{previewError}</p>}
                    <p className="mt-1 text-[8px] text-slate-600">Synthetic preview is spoken TTS, never a claim of an authentic crowd recording.</p>
                </div>

                <div className="hidden sm:flex flex-col items-center min-w-[80px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Momentum</span>
                    <div className="h-8 w-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-600"><div className={`absolute bottom-0 w-full transition-all duration-500 ease-out ${momentum > 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${((momentum + 10) / 20) * 100}%` }} /><div className="absolute top-1/2 w-full h-px bg-white/50" /></div>
                    <span className="text-[10px] font-bold mt-1 text-slate-300">{momentum > 0 ? '+' : ''}{momentum}</span>
                </div>
            </div>
        </section>
    );
}
