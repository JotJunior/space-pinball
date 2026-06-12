/**
 * Procedural background music synthesizer at 140 BPM.
 * Generates a looping 32-bar sequence using Web Audio API oscillators.
 * Ref: spec.md P6; plan.md §Musica de Fundo
 */

const BPM = 140;
const BEAT_DURATION = 60 / BPM;          // seconds per beat
// 32-bar pentatonic loop at 140 BPM (sequence repeats continuously)

// Pentatonic minor scale in Hz (root A2 = 110Hz)
const PENTATONIC: number[] = [
  110, 130.81, 146.83, 164.81, 196.00,  // A2 C3 D3 E3 G3
  220, 261.63, 293.66, 329.63, 392.00,  // A3 C4 D4 E4 G4
  440, 523.25, 587.33, 659.25, 784.00,  // A4 C5 D5 E5 G5
];

// Simple repeating bass pattern (index into PENTATONIC)
const BASS_PATTERN:  number[] = [0, 0, 5, 5, 2, 2, 7, 7, 0, 0, 5, 5, 3, 3, 7, 7];
const LEAD_PATTERN:  number[] = [5, 7, 9, 7, 5, 4, 5, 7, 5, 7, 9, 11, 9, 7, 5, 4];
const ARPEG_PATTERN: number[] = [0, 4, 5, 7, 0, 4, 5, 7, 2, 5, 7, 9, 2, 5, 7, 9];

export class MusicSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private running = false;
  private scheduleAheadTime = 0.1; // seconds
  private nextNoteTime = 0;
  private currentStep = 0;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
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

  start(): void {
    if (this.running) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    if (ctx.state === 'suspended') void ctx.resume();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.15, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.running = true;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.currentStep = 0;
    this.scheduleNotes();
  }

  stop(): void {
    this.running = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx.currentTime);
    }
  }

  private scheduleNotes(): void {
    if (!this.running) return;
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      const stepInPattern = this.currentStep % BASS_PATTERN.length;
      const beatTime = this.nextNoteTime;

      // Bass (sawtooth, low velocity)
      this.playNote(ctx, 'sawtooth',
        PENTATONIC[BASS_PATTERN[stepInPattern]!]! * 0.5, // one octave down
        0.08, beatTime, BEAT_DURATION * 0.9, this.masterGain);

      // Lead (triangle, every other beat)
      if (stepInPattern % 2 === 0) {
        this.playNote(ctx, 'triangle',
          PENTATONIC[LEAD_PATTERN[stepInPattern >> 1]!]! ?? 440,
          0.06, beatTime + BEAT_DURATION * 0.25, BEAT_DURATION * 0.5, this.masterGain);
      }

      // Arpeggio (square, every beat, very soft)
      this.playNote(ctx, 'square',
        PENTATONIC[ARPEG_PATTERN[stepInPattern]!]! ?? 220,
        0.025, beatTime, BEAT_DURATION * 0.2, this.masterGain);

      this.currentStep++;
      this.nextNoteTime += BEAT_DURATION;
    }

    this.schedulerTimer = setTimeout(() => this.scheduleNotes(), 25);
  }

  private playNote(
    ctx: AudioContext,
    type: OscillatorType,
    freq: number,
    gain: number,
    startTime: number,
    duration: number,
    destination: AudioNode,
  ): void {
    const osc  = ctx.createOscillator();
    const gn   = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(freq, 1), startTime);
    gn.gain.setValueAtTime(0, startTime);
    gn.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gn);
    gn.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    osc.onended = () => {
      try { osc.disconnect(); } catch { /* ignore */ }
      try { gn.disconnect(); } catch { /* ignore */ }
    };
  }
}
