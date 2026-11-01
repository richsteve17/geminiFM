import type { Chant, SyntheticChantPreview } from './chantService';

type BusName = 'master' | 'crowd' | 'commentary' | 'ui';

export type StadiumAudioPlaybackState =
    | { state: 'locked'; message: string; retryable: true }
    | { state: 'ready'; message: string; retryable: false }
    | { state: 'muted'; message: string; retryable: false }
    | { state: 'loading-recorded'; message: string; retryable: false }
    | { state: 'playing-recorded'; message: string; retryable: false; chantId: string }
    | { state: 'playing-synthetic-preview'; message: string; retryable: false; chantId: string }
    | { state: 'unavailable'; message: string; retryable: boolean; chantId?: string }
    | { state: 'error'; message: string; retryable: true; chantId?: string };

export type StadiumAudioPlaybackOptions = {
    /** Bypass cached 404/decoded data after a deployment adds or replaces an asset. */
    forceReload?: boolean;
};

type StatusListener = (status: StadiumAudioPlaybackState) => void;

const dbToGain = (db: number) => Math.pow(10, db / 20);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function browserAudioContext(): typeof AudioContext | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function isMissingRecordingError(error: unknown) {
    return error instanceof Error && error.message.startsWith('RECORDED_CLIP_');
}

/**
 * A small Web Audio bus graph for actual bundled terrace recordings. It intentionally creates no
 * oscillator, noise bed, browser speech, or TTS replacement when a recording is unavailable.
 */
export class StadiumAudioDirector {
    private context: AudioContext | null = null;
    private buses: Partial<Record<BusName, GainNode>> = {};
    private activeSource: AudioBufferSourceNode | null = null;
    private sourceSerial = 0;
    private playbackRequest = 0;
    private unlocked = false;
    private muted = false;
    private readonly decodedRecordingCache = new Map<string, AudioBuffer>();
    private readonly missingRecordingUrls = new Set<string>();
    private readonly listeners = new Set<StatusListener>();
    private status: StadiumAudioPlaybackState = {
        state: 'locked',
        message: 'Stadium audio is locked until you enable it with a match control.',
        retryable: true,
    };

    subscribe(listener: StatusListener) {
        this.listeners.add(listener);
        listener(this.status);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getStatus() {
        return this.status;
    }

    private publish(status: StadiumAudioPlaybackState) {
        this.status = status;
        this.listeners.forEach(listener => listener(status));
        return status;
    }

    /** Must be called synchronously from a button/keyboard gesture, never an effect. */
    async unlockFromUserGesture(): Promise<StadiumAudioPlaybackState> {
        const AudioContextCtor = browserAudioContext();
        if (!AudioContextCtor) {
            return this.publish({
                state: 'unavailable',
                message: 'This browser does not support Web Audio playback.',
                retryable: false,
            });
        }

        try {
            if (!this.context || this.context.state === 'closed') this.createGraph(AudioContextCtor);
            await this.context!.resume();
            if (this.context!.state !== 'running') {
                return this.publish({
                    state: 'locked',
                    message: 'Browser playback is still blocked. Use Enable stadium audio and try again.',
                    retryable: true,
                });
            }
            this.unlocked = true;
            return this.publish(this.muted
                ? { state: 'muted', message: 'Stadium audio is muted.', retryable: false }
                : { state: 'ready', message: 'Stadium recordings are enabled.', retryable: false });
        } catch (error) {
            return this.publish({
                state: 'error',
                message: `Could not enable stadium audio: ${error instanceof Error ? error.message : 'unknown error'}.`,
                retryable: true,
            });
        }
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        if (muted) this.stopChant(false);
        const master = this.buses.master;
        if (master && this.context) master.gain.setTargetAtTime(muted ? 0 : dbToGain(-3), this.context.currentTime, 0.04);
        return this.publish(muted
            ? { state: 'muted', message: 'Stadium audio is muted.', retryable: false }
            : this.unlocked
                ? { state: 'ready', message: 'Stadium recordings are enabled.', retryable: false }
                : { state: 'locked', message: 'Stadium audio is locked until you enable it with a match control.', retryable: true });
    }

    /**
     * Retained for the atmosphere meter. It adjusts the crowd bus only; it does not synthesize a
     * fake crowd bed when no supplied recording is playing.
     */
    setCrowdIntensity(intensity: number) {
        if (!this.context || !this.buses.crowd) return;
        const normalized = clamp(intensity, 0, 1);
        this.buses.crowd.gain.setTargetAtTime(dbToGain(-6 + normalized * 6), this.context.currentTime, 0.12);
    }

    async playChant(chant: Chant, options: StadiumAudioPlaybackOptions = {}): Promise<StadiumAudioPlaybackState> {
        if (!this.unlocked || !this.context || this.context.state !== 'running') {
            return this.publish({
                state: 'locked',
                message: 'Enable stadium audio first. No chant has played yet.',
                retryable: true,
            });
        }
        if (this.muted) return this.publish({ state: 'muted', message: 'Stadium audio is muted.', retryable: false });
        this.stopChant(false);
        const request = ++this.playbackRequest;
        if (!chant.recording) {
            return this.publish({
                state: 'unavailable',
                chantId: chant.id,
                message: `No supplied recording is installed for ${chant.clubName}. No synthetic chant was substituted.`,
                retryable: false,
            });
        }

        this.publish({
            state: 'loading-recorded',
            message: `Loading supplied recording: ${chant.recording.title}.`,
            retryable: false,
        });

        try {
            const buffer = await this.loadRecording(chant.recording.url, options.forceReload === true);
            if (request !== this.playbackRequest || this.muted) return this.status;
            return this.startBuffer(buffer, chant.id, 'recorded');
        } catch (error) {
            if (request !== this.playbackRequest) return this.status;
            if (isMissingRecordingError(error)) {
                return this.publish({
                    state: 'unavailable',
                    chantId: chant.id,
                    message: `The supplied recording file is unavailable (${chant.recording.url}). No synthetic chant was substituted.`,
                    retryable: true,
                });
            }
            return this.publish({
                state: 'error',
                chantId: chant.id,
                message: `Could not play the supplied recording: ${error instanceof Error ? error.message : 'unknown error'}.`,
                retryable: true,
            });
        }
    }

    /**
     * Plays only an explicit user-requested provider result. This is intentionally separate from
     * playChant so synthetic speech can never be mistaken for the supplied terrace recording.
     */
    playSyntheticPreview(chantId: string, preview: SyntheticChantPreview): StadiumAudioPlaybackState {
        if (!this.unlocked || !this.context || this.context.state !== 'running') {
            return this.publish({ state: 'locked', message: 'Enable stadium audio first. No preview has played yet.', retryable: true });
        }
        if (this.muted) return this.publish({ state: 'muted', message: 'Stadium audio is muted.', retryable: false });
        try {
            const buffer = this.decodePcmPreview(preview);
            return this.startBuffer(buffer, chantId, 'synthetic-preview');
        } catch (error) {
            return this.publish({
                state: 'error',
                chantId,
                message: `Could not play the synthetic preview: ${error instanceof Error ? error.message : 'unknown error'}.`,
                retryable: true,
            });
        }
    }

    stopChant(publishReady = true) {
        this.sourceSerial += 1;
        this.playbackRequest += 1;
        if (this.activeSource) {
            try {
                this.activeSource.stop();
            } catch {
                // The source may have ended between render frames.
            }
            try {
                this.activeSource.disconnect();
            } catch {
                // Best-effort cleanup for browser-specific node state.
            }
            this.activeSource = null;
        }
        if (publishReady && this.unlocked && !this.muted) {
            this.publish({ state: 'ready', message: 'Stadium recordings are enabled.', retryable: false });
        }
    }

    async dispose() {
        this.stopChant(false);
        this.decodedRecordingCache.clear();
        this.missingRecordingUrls.clear();
        const context = this.context;
        this.context = null;
        this.buses = {};
        this.unlocked = false;
        if (context && context.state !== 'closed') await context.close();
        this.publish({ state: 'locked', message: 'Stadium audio is locked until you enable it with a match control.', retryable: true });
    }

    private createGraph(AudioContextCtor: typeof AudioContext) {
        const context = new AudioContextCtor();
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : dbToGain(-3);
        master.connect(context.destination);

        const crowd = context.createGain();
        crowd.gain.value = dbToGain(-3);
        crowd.connect(master);

        const commentary = context.createGain();
        commentary.gain.value = dbToGain(-10);
        commentary.connect(master);

        const ui = context.createGain();
        ui.gain.value = dbToGain(-10);
        ui.connect(master);

        this.context = context;
        this.buses = { master, crowd, commentary, ui };
    }

    private async loadRecording(url: string, forceReload: boolean) {
        if (forceReload) {
            this.decodedRecordingCache.delete(url);
            this.missingRecordingUrls.delete(url);
        }
        const cached = this.decodedRecordingCache.get(url);
        if (cached) return cached;
        if (this.missingRecordingUrls.has(url)) throw new Error(`RECORDED_CLIP_NOT_FOUND:${url}`);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        let bytes: ArrayBuffer;
        try {
            response = await fetch(url, { cache: forceReload ? 'reload' : 'default', signal: controller.signal });
            if (!response.ok) {
                this.missingRecordingUrls.add(url);
                throw new Error(`RECORDED_CLIP_NOT_FOUND:${url}`);
            }
            bytes = await response.arrayBuffer();
            if (bytes.byteLength > 4_000_000) throw new Error(`RECORDED_CLIP_TOO_LARGE:${url}`);
        } catch {
            throw new Error(`RECORDED_CLIP_NETWORK:${url}`);
        } finally {
            clearTimeout(timer);
        }

        try {
            const buffer = await this.context!.decodeAudioData(bytes.slice(0));
            this.decodedRecordingCache.set(url, buffer);
            return buffer;
        } catch {
            throw new Error(`RECORDED_CLIP_DECODE_FAILED:${url}`);
        }
    }

    private decodePcmPreview(preview: SyntheticChantPreview) {
        if (!this.context) throw new Error('AUDIO_CONTEXT_MISSING');
        const binary = atob(preview.dataBase64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const frames = Math.floor(bytes.byteLength / 2 / preview.channels);
        const buffer = this.context.createBuffer(preview.channels, frames, preview.sampleRate);
        const view = new DataView(bytes.buffer);
        for (let channel = 0; channel < preview.channels; channel += 1) {
            const channelData = buffer.getChannelData(channel);
            for (let frame = 0; frame < frames; frame += 1) {
                channelData[frame] = view.getInt16((frame * preview.channels + channel) * 2, true) / 32768;
            }
        }
        return buffer;
    }

    private startBuffer(buffer: AudioBuffer, chantId: string, kind: 'recorded' | 'synthetic-preview') {
        if (!this.context || !this.buses.crowd) throw new Error('AUDIO_GRAPH_MISSING');
        this.stopChant(false);
        const source = this.context.createBufferSource();
        const highPass = this.context.createBiquadFilter();
        const lowPass = this.context.createBiquadFilter();
        const presence = this.context.createBiquadFilter();
        const gain = this.context.createGain();

        highPass.type = 'highpass';
        highPass.frequency.value = 120;
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 4800;
        presence.type = 'peaking';
        presence.frequency.value = 2800;
        presence.gain.value = 3;
        gain.gain.value = 1;

        source.buffer = buffer;
        source.connect(highPass).connect(lowPass).connect(presence).connect(gain).connect(this.buses.crowd);
        const serial = ++this.sourceSerial;
        source.onended = () => {
            if (serial !== this.sourceSerial) return;
            this.activeSource = null;
            this.publish(this.muted
                ? { state: 'muted', message: 'Stadium audio is muted.', retryable: false }
                : { state: 'ready', message: 'Stadium recordings are enabled.', retryable: false });
        };
        this.activeSource = source;
        source.start();
        return this.publish(kind === 'recorded'
            ? { state: 'playing-recorded', chantId, message: 'Playing supplied terrace recording.', retryable: false }
            : { state: 'playing-synthetic-preview', chantId, message: 'Playing synthetic spoken preview — not a recorded chant.', retryable: false });
    }
}

export const stadiumAudio = new StadiumAudioDirector();
