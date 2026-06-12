/**
 * Tests for GameState scoring, multiplier, replay threshold, and high score.
 * Ref: spec.md FR-004, FR-005; tasks.md 5.5.2, 5.5.3, 5.5.4, 5.5.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, GameEventType } from '../../src/game/GameState.js';
import { GAME, SCORING } from '../../src/config/scoring.js';

// Helper to collect events
function collectEvents(gs: GameState): GameEventType[] {
  const events: GameEventType[] = [];
  gs.on(e => events.push(e.type));
  return events;
}

describe('GameState scoring', () => {
  let gs: GameState;
  let events: GameEventType[];

  beforeEach(() => {
    gs = new GameState(0);
    events = collectEvents(gs);
    gs.startGame();
  });

  it('starts at score 0', () => {
    expect(gs.getSnapshot().score).toBe(0);
  });

  it('adds bumper hit score with x1 multiplier', () => {
    gs.onBumperHit('bumper-center');
    expect(gs.getSnapshot().score).toBe(SCORING.bumperHit);
  });

  it('adds sling hit score', () => {
    gs.onSlingHit('sling-left');
    expect(gs.getSnapshot().score).toBe(SCORING.slingHit);
  });

  it('adds target hit score', () => {
    gs.onTargetHit('target-atf-1');
    expect(gs.getSnapshot().score).toBe(SCORING.targetHit);
  });

  it('does not score while tilted', () => {
    // Tilt the machine: GAME.tiltWarnings is 2, so need 3 presses
    for (let i = 0; i <= GAME.tiltWarnings; i++) {
      gs.onTiltInput();
    }
    expect(gs.getSnapshot().tilt.tilted).toBe(true);
    gs.onBumperHit('bumper-center');
    expect(gs.getSnapshot().score).toBe(0);
  });

  it('does not score when not playing', () => {
    // Not started yet
    const gs2 = new GameState(0);
    gs2.onBumperHit('bumper-center');
    expect(gs2.getSnapshot().score).toBe(0);
  });
});

describe('GameState multiplier', () => {
  let gs: GameState;

  beforeEach(() => {
    gs = new GameState(0);
    gs.startGame();
  });

  it('starts with multiplier x1', () => {
    expect(gs.getSnapshot().multiplier).toBe(1);
  });

  it('scores bumper hits correctly at x1', () => {
    gs.onBumperHit('b');
    expect(gs.getSnapshot().score).toBe(SCORING.bumperHit * 1);
  });

  it('scores bumper hits correctly at higher multiplier', () => {
    // Directly set multiplier via setMultiplier
    gs.setMultiplier(3);
    gs.onBumperHit('b');
    expect(gs.getSnapshot().score).toBe(SCORING.bumperHit * 3);
  });

  it('applies multiplier x5', () => {
    gs.setMultiplier(5);
    gs.onTargetHit('t');
    expect(gs.getSnapshot().score).toBe(SCORING.targetHit * 5);
  });

  it('multiplier resets to 1 on new game', () => {
    gs.setMultiplier(5);
    gs.startGame();
    expect(gs.getSnapshot().multiplier).toBe(1);
  });
});

describe('GameState replay threshold (extra ball)', () => {
  let gs: GameState;
  let events: GameEventType[];

  beforeEach(() => {
    gs = new GameState(0);
    events = collectEvents(gs);
    gs.startGame();
  });

  it('grants extra ball exactly once when crossing replay threshold', () => {
    const initialBalls = gs.getSnapshot().ballsRemaining;
    // Add score just below threshold, then push over
    const needed = GAME.replayThreshold;
    // Use addScore indirectly via bumper hits
    // bumperHit = 100; need replayThreshold / 100 hits
    const hitsNeeded = Math.ceil(needed / SCORING.bumperHit);
    for (let i = 0; i < hitsNeeded; i++) {
      gs.onBumperHit('b');
    }
    expect(gs.getSnapshot().score).toBeGreaterThanOrEqual(GAME.replayThreshold);
    expect(gs.getSnapshot().ballsRemaining).toBe(initialBalls + 1);
    expect(gs.getSnapshot().extraBallEarned).toBe(true);
    expect(events).toContain('ExtraBall');
  });

  it('does not grant extra ball a second time', () => {
    const hitsNeeded = Math.ceil(GAME.replayThreshold / SCORING.bumperHit);
    for (let i = 0; i < hitsNeeded; i++) {
      gs.onBumperHit('b');
    }
    const ballsAfterFirst = gs.getSnapshot().ballsRemaining;
    const extraBallEvents = events.filter(e => e === 'ExtraBall').length;
    expect(extraBallEvents).toBe(1);

    // Keep scoring well above threshold
    for (let i = 0; i < hitsNeeded; i++) {
      gs.onBumperHit('b');
    }
    expect(gs.getSnapshot().ballsRemaining).toBe(ballsAfterFirst); // unchanged
    const extraBallEventsAfter = events.filter(e => e === 'ExtraBall').length;
    expect(extraBallEventsAfter).toBe(1); // still only 1
  });

  it('extra ball does not carry over across new game', () => {
    const hitsNeeded = Math.ceil(GAME.replayThreshold / SCORING.bumperHit);
    for (let i = 0; i < hitsNeeded; i++) {
      gs.onBumperHit('b');
    }
    expect(gs.getSnapshot().extraBallEarned).toBe(true);
    gs.startGame();
    expect(gs.getSnapshot().extraBallEarned).toBe(false);
    expect(gs.getSnapshot().ballsRemaining).toBe(GAME.ballsPerGame);
  });
});

describe('GameState high score', () => {
  it('updates high score during play when exceeded', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();
    gs.onBumperHit('b'); // 100 pts
    expect(gs.getSnapshot().highScore).toBe(SCORING.bumperHit);
    expect(events).toContain('NewHighScore');
  });

  it('keeps existing high score when current score is lower', () => {
    const gs = new GameState(99999);
    gs.startGame();
    gs.onBumperHit('b');
    expect(gs.getSnapshot().highScore).toBe(99999);
  });

  it('updates high score inline during a game', () => {
    const gs = new GameState(50);
    gs.startGame();
    gs.onTargetHit('t'); // 500 pts
    expect(gs.getSnapshot().highScore).toBe(SCORING.targetHit);
  });
});

describe('GameState ball loss and game over', () => {
  it('decrements balls on drain', () => {
    const gs = new GameState(0);
    gs.startGame();
    gs.onDrain();
    expect(gs.getSnapshot().ballsRemaining).toBe(GAME.ballsPerGame - 1);
    expect(gs.getSnapshot().screen).toBe('playing');
  });

  it('transitions to gameOver when last ball drained', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();
    for (let i = 0; i < GAME.ballsPerGame; i++) {
      gs.onDrain();
    }
    expect(gs.getSnapshot().screen).toBe('gameOver');
    expect(events).toContain('GameOver');
  });

  it('tilt on last ball causes game over immediately on drain', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();
    // Drain until last ball
    for (let i = 0; i < GAME.ballsPerGame - 1; i++) {
      gs.onDrain();
    }
    expect(gs.getSnapshot().ballsRemaining).toBe(1);
    // Tilt the machine
    for (let i = 0; i <= GAME.tiltWarnings; i++) {
      gs.onTiltInput();
    }
    expect(gs.getSnapshot().tilt.tilted).toBe(true);
    // Drain the last ball
    gs.onDrain();
    expect(gs.getSnapshot().screen).toBe('gameOver');
    expect(events).toContain('GameOver');
  });

  it('tilt resets on new ball', () => {
    const gs = new GameState(0);
    gs.startGame();
    for (let i = 0; i <= GAME.tiltWarnings; i++) {
      gs.onTiltInput();
    }
    expect(gs.getSnapshot().tilt.tilted).toBe(true);
    gs.onDrain(); // lose ball, tilt resets
    expect(gs.getSnapshot().tilt.tilted).toBe(false);
    expect(gs.getSnapshot().tilt.warnings).toBe(0);
  });
});
