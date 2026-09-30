import type { Chant } from './chantService';

type BusName = 'master' | 'crowd' | 'commentary' | 'ui';

const dbToGain = (db: number) => Math.pow(10, db / 20);

/**
 * Web Audio mixing graph for Manus FM. It uses a crowd bed and terrace rhythm until a club's
 * licensed/sample asset map is installed; no speech-to-text chant approximation is used.
 */
class StadiumAudioDirector {
    private context: AudioContext | null = null;
    private buses: Partial<Record<BusName, GainNode>> = {};
    private crowdSource: AudioBufferSourceNode | null = null;
    private crowdGain: GainNode | null = null;
    private unlocked = false;

    unlock() {
        if (typeof window === 'undefined') return false;
        if (!this.context) {
            this.context = new AudioContext();
            const master = this.context.createGain();
            master.gain.value = dbToGain(-8);
            master.connect(this.context.destination);
            this.buses.master = master;
            (['crowd', 'commentary', 'ui'] as BusName[]).forEach(name => {
                const bus = this.context!.createGain();
                bus.gain.value = dbToGain(name === 'crowd' ? -18 : -10);
                bus.connect(master);
                this.buses[name] = bus;
            });
        }
        this.context.resume();
        this.unlocked = true;
        return true;
    }

    setBusVolume(bus: Exclude<BusName, 'master'>, slider: number) {
        const gain = this.buses[bus];
        if (!gain) return;
        gain.gain.setTargetAtTime(dbToGain(-60 + Math.max(0, Math.min(1, slider)) * 60), this.context!.currentTime, 0.08);
    }

    setCrowdIntensity(intensity: number) {
        if (!this.unlocked || !this.context || !this.buses.crowd) return;
        const normalized = Math.max(0, Math.min(1, intensity));
        if (!this.crowdSource) this.startCrowdBed();
        this.crowdGain?.gain.setTargetAtTime(dbToGain(-30 + normalized * 15), this.context.currentTime, 0.2);
    }

    triggerChant(chant: Chant) {
        if (!this.unlock() || !this.context || !this.buses.crowd) return;
        this.setCrowdIntensity(chant.intensity === 'high' ? 0.95 : chant.intensity === 'medium' ? 0.7 : 0.45);
        const pulse = this.context.createOscillator();
        const envelope = this.context.createGain();
        pulse.type = 'triangle';
        pulse.frequency.value = 95;
        envelope.gain.value = 0;
        pulse.connect(envelope).connect(this.buses.crowd);
        const beat = 60 / chant.tempoBpm;
        const start = this.context.currentTime + 0.02;
        for (let index = 0; index < 8; index += 1) {
            const at = start + index * beat;
            envelope.gain.setValueAtTime(0, at);
            envelope.gain.linearRampToValueAtTime(dbToGain(-20), at + 0.012);
            envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
        }
        pulse.start(start);
        pulse.stop(start + beat * 8 + 0.1);
    }

    private startCrowdBed() {
        if (!this.context || !this.buses.crowd) return;
        const seconds = 2;
        const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
        const channel = buffer.getChannelData(0);
        let last = 0;
        for (let index = 0; index < channel.length; index += 1) {
            const white = ((index * 16807) % 2147483647) / 2147483647 * 2 - 1;
            last = last * 0.985 + white * 0.015;
            channel[index] = last;
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        source.buffer = buffer;
        source.loop = true;
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 0.7;
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(this.buses.crowd);
        source.start();
        this.crowdSource = source;
        this.crowdGain = gain;
    }
}

export const stadiumAudio = new StadiumAudioDirector();
