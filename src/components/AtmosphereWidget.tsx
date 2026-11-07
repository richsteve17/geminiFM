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
    if (status.state === 'playing-recorded') return 'fm-match-live';
    if (status.state === 'playing-synthetic-preview') return 'fm-atmosphere-status-preview';
    if (status.state === 'error' || status.state === 'unavailable') return 'fm-match-error';
    if (status.state === 'locked') return 'fm-atmosphere-status-preview';
    return 'fm-match-muted';
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

    const getBarColor = () => momentum < -3 ? 'fm-atmosphere-bar-negative' : momentum > 3 ? 'fm-atmosphere-bar-positive' : 'fm-atmosphere-bar-neutral';
    const getMoodText = () => momentum < -5 ? 'HOSTILE' : momentum < -2 ? 'TENSE' : momentum > 5 ? 'BOUNCING' : momentum > 2 ? 'ELECTRIC' : 'STEADY';
    const isPlayingThisChant = (audioStatus.state === 'playing-recorded' || audioStatus.state === 'playing-synthetic-preview')
        && audioStatus.chantId === chant?.id;

    if (!teamName) return null;

    return (
        <section className="fm-atmosphere py-3 sm:py-4" aria-label="Stadium atmosphere">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-end gap-1 h-5" aria-hidden="true">
                        {bars.map((height, index) => <div key={index} className={`w-1 transition-all duration-75 ${getBarColor()}`} style={{ height: `${height}%` }} />)}
                    </div>
                    <span className="fm-eyebrow text-[10px]">Home End</span>
                    <span className={`text-xs font-bold ${momentum < -2 ? 'fm-match-event-danger' : momentum > 2 ? 'fm-match-live' : 'fm-match-muted'}`}>{getMoodText()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="fm-eyebrow text-[10px]">Momentum</span>
                    <div className="fm-atmosphere-momentum h-2 w-20 overflow-hidden relative">
                        <div className={`absolute left-0 h-full transition-all duration-500 ease-out ${momentum > 0 ? 'fm-atmosphere-bar-positive' : 'fm-atmosphere-bar-negative'}`} style={{ width: `${((momentum + 10) / 20) * 100}%` }} />
                        <div className="absolute left-1/2 h-full w-px bg-white/50" />
                    </div>
                    <span className="text-xs font-bold tabular-nums">{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</span>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,1fr)] gap-3 sm:gap-6 items-start">
                <div className="fm-atmosphere-transcript min-w-0">
                    {chant ? (
                        <>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                                <p className="fm-atmosphere-source-type fm-eyebrow text-[10px]">{chant.audioSource === 'recorded-terrace' ? 'Recorded terrace clip' : 'Songbook cue — recording unavailable'}</p>
                                {isPlayingThisChant && <span className="fm-match-live text-[10px] font-bold">LIVE</span>}
                                <p className="text-xs font-bold">{chant.tune}</p>
                            </div>
                            {chant.lyrics.length > 0 && <div className="fm-atmosphere-lyrics text-sm italic leading-relaxed">{chant.lyrics.map((line, index) => <p key={index}>“{line.toUpperCase()}”</p>)}</div>}
                            <p className="fm-match-muted mt-2 text-[10px]">{chant.archetypeId.replaceAll('_', ' ')} · {chant.tempoBpm} BPM · {chant.clubName}</p>
                            {chant.recording && <p className="fm-match-muted mt-1 text-[10px]">Source: {chant.recording.source.sourceName} [{chant.recording.source.sourceId}]</p>}
                        </>
                    ) : <p className="fm-match-muted text-xs italic leading-relaxed">Waiting for a match cue. Audio only plays supplied recordings after you enable it.</p>}
                </div>
                <div className="fm-atmosphere-controls">
                    <div className="flex flex-wrap gap-2">
                        {audioStatus.state === 'locked' ? (
                            <button type="button" onClick={handleEnableAudio} className="fm-button px-3 text-xs">Enable stadium audio</button>
                        ) : audioStatus.state === 'muted' ? (
                            <button type="button" onClick={() => stadiumAudio.setMuted(false)} className="fm-button px-3 text-xs">Unmute stadium audio</button>
                        ) : (
                            <>
                                <button type="button" onClick={() => void handlePlayRecording(false)} disabled={!chant || audioStatus.state === 'loading-recorded'} className="fm-button-secondary px-3 text-xs">Play recording</button>
                                <button type="button" onClick={() => stadiumAudio.setMuted(true)} className="fm-button-secondary px-3 text-xs">Mute</button>
                            </>
                        )}
                        {(audioStatus.state === 'unavailable' || audioStatus.state === 'error') && audioStatus.retryable && chant && <button type="button" onClick={() => void handlePlayRecording(true)} className="fm-button px-3 text-xs">Retry recording</button>}
                        {chant?.lyrics.length ? <button type="button" onClick={() => void handleSyntheticPreview()} className="fm-button-secondary px-3 text-xs">Paid synthetic preview</button> : null}
                    </div>
                    <p className={`mt-2 text-[11px] leading-relaxed ${statusTone(audioStatus)}`} aria-live="polite">{audioStatus.message}</p>
                    {previewError && <p className="fm-match-error mt-1 text-[11px] leading-relaxed" role="alert">{previewError}</p>}
                    <p className="fm-match-muted mt-1 text-[10px] leading-relaxed">Synthetic preview is spoken TTS, never a claim of an authentic crowd recording.</p>
                </div>
            </div>
        </section>
    );
}
