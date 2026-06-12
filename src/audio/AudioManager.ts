/**
 * AudioManager: coordinates SoundSynth and MusicSynth.
 * Ref: spec.md FR-007; plan.md §Audio Design
 */

import { SoundSynth, SoundEffect } from './SoundSynth.js';
import { MusicSynth } from './MusicSynth.js';

export class AudioManager {
  private readonly sound: SoundSynth;
  private readonly music: MusicSynth;
  private muted = false;

  constructor() {
    this.sound = new SoundSynth();
    this.music = new MusicSynth();
  }

  play(effect: SoundEffect): void {
    if (!this.muted) {
      this.sound.play(effect);
    }
  }

  startMusic(): void {
    if (!this.muted) {
      this.music.start();
    }
  }

  stopMusic(): void {
    this.music.stop();
  }

  mute(): void {
    this.muted = true;
    this.sound.setMuted(true);
    this.music.setMuted(true);
  }

  unmute(): void {
    this.muted = false;
    this.sound.setMuted(false);
    this.music.setMuted(false);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
    this.music.setMuted(this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
