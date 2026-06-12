/**
 * High score persistence via localStorage.
 * Includes graceful degradation when localStorage is unavailable.
 * Ref: spec.md P5, FR-009; plan.md §Data Model
 */

const STORAGE_KEY = 'spaceCadetHighScore';

export type NewHighScoreHandler = (score: number) => void;

export class HighScore {
  private current: number = 0;
  private handlers: NewHighScoreHandler[] = [];

  constructor() {
    this.current = this.load();
  }

  get(): number {
    return this.current;
  }

  /**
   * Submit a score; if it beats the current high score, save it and notify handlers.
   * Returns true if it was a new high score.
   */
  submit(score: number): boolean {
    if (score > this.current) {
      this.current = score;
      this.save(score);
      for (const handler of this.handlers) {
        handler(score);
      }
      return true;
    }
    return false;
  }

  onNewHighScore(handler: NewHighScoreHandler): void {
    this.handlers.push(handler);
  }

  /** Load from localStorage; returns 0 on any failure. */
  private load(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return 0;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    } catch {
      // localStorage unavailable (private browsing, storage quota, etc.)
      return 0;
    }
  }

  /** Save to localStorage; silently ignores any failure. */
  private save(score: number): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
      // Ignore: graceful degradation
    }
  }
}
