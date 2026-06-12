/**
 * Procedural sound effects synthesizer using Web Audio API.
 * Generates all 9 SFX without any audio files.
 * Ref: spec.md FR-007; plan.md §Audio Design
 */

export type SoundEffect =
  | 'bumperHit'
  | 'slingHit'
  | 'flipperHit'
  | 'drain'
  | 'targetHit'
  | 'missionComplete'
  | 'rankUp'
  | 'launchBall'
  | 'tilt';

interface SoundDef {
  type: OscillatorType;
  freq: number;
  freqEnd: number;
  duration: number;     // seconds
  gainPeak: number;     // 0..1
  gainDecayTime: number;// seconds
  detune?: number;      // cents
  filterFreq?: number;
  filterType?: BiquadFilterType;
}

const SOUND_DEFS: Record<SoundEffect, SoundDef> = {
  bumperHit: {
    type: 'square', freq: 880, freqEnd: 440,
    duration: 0.12, gainPeak: 0.4, gainDecayTime: 0.1,
    filterFreq: 2000, filterType: 'bandpass',
  },
  slingHit: {
    type: 'sawtooth', freq: 660, freqEnd: 330,
    duration: 0.1, gainPeak: 0.35, gainDecayTime: 0.08,
  },
  flipperHit: {
    type: 'square', freq: 220, freqEnd: 110,
    duration: 0.05, gainPeak: 0.2, gainDecayTime: 0.04,
  },
  drain: {
    type: 'sine', freq: 440, freqEnd: 55,
    duration: 0.8, gainPeak: 0.5, gainDecayTime: 0.7,
  },
  targetHit: {
    type: 'triangle', freq: 1100, freqEnd: 880,
    duration: 0.15, gainPeak: 0.4, gainDecayTime: 0.12,
  },
  missionComplete: {
    type: 'sine', freq: 880, freqEnd: 1760,
    duration: 0.6, gainPeak: 0.6, gainDecayTime: 0.5,
    filterFreq: 4000, filterType: 'lowpass',
  },
  rankUp: {
    type: 'sine', freq: 440, freqEnd: 880,
    duration: 0.8, gainPeak: 0.7, gainDecayTime: 0.6,
  },
  launchBall: {
    type: 'sawtooth', freq: 330, freqEnd: 660,
    duration: 0.3, gainPeak: 0.5, gainDecayTime: 0.25,
  },
  tilt: {
    type: 'sawtooth', freq: 80, freqEnd: 40,
    duration: 1.0, gainPeak: 0.8, gainDecayTime: 0.9,
    filterFreq: 500, filterType: 'lowpass',
  },
};

export class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    try {
      this.ctx = new AudioContext();
      return this.ctx;
    } catch {
      return null;
    }
  }

  play(effect: SoundEffect): void {
    if (this.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const def = SOUND_DEFS[effect];
    const now = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = def.type;
    osc.frequency.setValueAtTime(def.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(def.freqEnd, 1), now + def.duration);

    if (def.detune !== undefined) {
      osc.detune.setValueAtTime(def.detune, now);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(def.gainPeak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + def.gainDecayTime);

    if (def.filterFreq !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = def.filterType ?? 'lowpass';
      filter.frequency.setValueAtTime(def.filterFreq, now);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + def.duration + 0.05);

    // Cleanup
    osc.onended = () => {
      try { osc.disconnect(); } catch { /* ignore */ }
      try { gain.disconnect(); } catch { /* ignore */ }
    };
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}
