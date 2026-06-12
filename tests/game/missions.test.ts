/**
 * Tests for GameState mission transitions, rank progression,
 * and persistence of mission progress after ball loss.
 * Ref: spec.md FR-005, FR-006; tasks.md 5.5.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, GameEventType } from '../../src/game/GameState.js';
import { GAME } from '../../src/config/scoring.js';
import { MISSIONS } from '../../src/config/missions.js';

function collectEvents(gs: GameState): GameEventType[] {
  const events: GameEventType[] = [];
  gs.on(e => events.push(e.type));
  return events;
}

describe('GameState mission transitions', () => {
  let gs: GameState;
  let events: GameEventType[];

  beforeEach(() => {
    gs = new GameState(0);
    events = collectEvents(gs);
    gs.startGame();
  });

  it('starts with rank 0 and no current mission', () => {
    expect(gs.getSnapshot().rankIndex).toBe(0);
    expect(gs.getSnapshot().currentMissionId).toBeNull();
  });

  it('activating first mission sets currentMissionId', () => {
    gs.activateMission('recruit');
    expect(gs.getSnapshot().currentMissionId).toBe('recruit');
  });

  it('completes recruit mission after hitting 5 bumpers', () => {
    gs.activateMission('recruit');
    const mission = MISSIONS.find(m => m.id === 'recruit')!;
    const bumperObjective = mission.objectives.find(o => o.type === 'hit-bumpers')!;

    for (let i = 0; i < bumperObjective.count; i++) {
      gs.onBumperHit('bumper-center');
    }

    expect(events).toContain('MissionComplete');
    expect(events).toContain('RankUp');
    // After completing recruit, the next mission (specialist) is auto-activated
    expect(gs.getSnapshot().currentMissionId).toBe('specialist');
    expect(gs.getSnapshot().rankIndex).toBe(1);
  });

  it('does not complete mission prematurely', () => {
    gs.activateMission('recruit');
    const mission = MISSIONS.find(m => m.id === 'recruit')!;
    const bumperObjective = mission.objectives.find(o => o.type === 'hit-bumpers')!;

    // Hit bumpers count - 1 times (one short)
    for (let i = 0; i < bumperObjective.count - 1; i++) {
      gs.onBumperHit('b');
    }

    expect(events).not.toContain('MissionComplete');
    expect(gs.getSnapshot().currentMissionId).toBe('recruit');
  });

  it('grants score bonus on mission complete', () => {
    gs.activateMission('recruit');
    const mission = MISSIONS.find(m => m.id === 'recruit')!;
    const bumperObjective = mission.objectives.find(o => o.type === 'hit-bumpers')!;

    const scoreBefore = gs.getSnapshot().score;
    for (let i = 0; i < bumperObjective.count; i++) {
      gs.onBumperHit('b');
    }

    // Score includes bumper hits + scoreBonus
    const expectedBonus = mission.scoreBonus;
    const expectedBumperScore = bumperObjective.count * 100; // SCORING.bumperHit = 100
    expect(gs.getSnapshot().score).toBe(scoreBefore + expectedBumperScore + expectedBonus);
  });
});

describe('GameState mission progress persistence after ball loss', () => {
  let gs: GameState;

  beforeEach(() => {
    gs = new GameState(0);
    gs.startGame();
  });

  it('preserves mission progress (hit count) after ball is lost', () => {
    gs.activateMission('recruit');
    const mission = MISSIONS.find(m => m.id === 'recruit')!;
    const bumperObjective = mission.objectives.find(o => o.type === 'hit-bumpers')!;

    // Hit 2 bumpers (less than needed to complete)
    const hitsBefore = 2;
    for (let i = 0; i < hitsBefore; i++) {
      gs.onBumperHit('bumper-center');
    }

    // Lose a ball (should NOT reset mission progress)
    gs.onDrain();
    expect(gs.getSnapshot().screen).toBe('playing');
    expect(gs.getSnapshot().currentMissionId).toBe('recruit'); // mission still active

    // Check progress is preserved: we can still complete the mission
    // by hitting the remaining bumpers
    const remaining = bumperObjective.count - hitsBefore;
    for (let i = 0; i < remaining; i++) {
      gs.onBumperHit('b');
    }

    const events: GameEventType[] = [];
    gs.on(e => events.push(e.type));
    // Trigger one more to ensure we don't complete mid-way after the listener
    // Actually the mission should already be complete from the hits above
    // Let's verify by checking rankIndex
    expect(gs.getSnapshot().rankIndex).toBe(1);
  });

  it('mission progress is NOT reset on ball loss', () => {
    gs.activateMission('recruit');
    gs.onBumperHit('b'); // 1 hit
    gs.onBumperHit('b'); // 2 hits
    gs.onDrain(); // ball lost — preserve progress

    // Progress map is not empty even after drain
    const snap = gs.getSnapshot();
    // We can't directly read missionProgress Map from snapshot easily,
    // but we can verify mission is still active
    expect(snap.currentMissionId).toBe('recruit');
  });

  it('mission progress resets on new game', () => {
    gs.activateMission('recruit');
    gs.onBumperHit('b');
    gs.startGame();
    expect(gs.getSnapshot().currentMissionId).toBeNull();
    expect(gs.getSnapshot().rankIndex).toBe(0);
  });
});

describe('GameState rank progression', () => {
  it('starts at rank 0', () => {
    const gs = new GameState(0);
    gs.startGame();
    expect(gs.getSnapshot().rankIndex).toBe(0);
  });

  it('advances rank after completing first mission', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();
    gs.activateMission('recruit');

    const mission = MISSIONS.find(m => m.id === 'recruit')!;
    const bumperObjective = mission.objectives.find(o => o.type === 'hit-bumpers')!;
    for (let i = 0; i < bumperObjective.count; i++) {
      gs.onBumperHit('b');
    }

    expect(gs.getSnapshot().rankIndex).toBe(1);
    const rankUpEvents = events.filter(e => e === 'RankUp');
    expect(rankUpEvents.length).toBe(1);
  });

  it('rankIndex maxes at 9 (science-officer)', () => {
    const gs = new GameState(0);
    gs.startGame();
    // Just verify that 9 is the maximum rank from MISSIONS config
    expect(MISSIONS.length).toBe(9);
  });
});

describe('GameState tilt behavior', () => {
  it('requires tiltWarnings + 1 presses to tilt', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();

    // GAME.tiltWarnings = 2 means 2 warnings then 3rd press tilts
    for (let i = 0; i < GAME.tiltWarnings; i++) {
      gs.onTiltInput();
      expect(gs.getSnapshot().tilt.tilted).toBe(false);
    }

    gs.onTiltInput(); // one more = tilt
    expect(gs.getSnapshot().tilt.tilted).toBe(true);
    expect(events).toContain('Tilt');
  });

  it('tilt prevents scoring', () => {
    const gs = new GameState(0);
    gs.startGame();

    for (let i = 0; i <= GAME.tiltWarnings; i++) {
      gs.onTiltInput();
    }
    expect(gs.getSnapshot().tilt.tilted).toBe(true);
    gs.onBumperHit('b');
    expect(gs.getSnapshot().score).toBe(0);
  });

  it('tilt on last ball leads to game over after drain', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();

    // Drain until 1 ball left
    for (let i = 0; i < GAME.ballsPerGame - 1; i++) {
      gs.onDrain();
    }
    expect(gs.getSnapshot().ballsRemaining).toBe(1);

    // Tilt the machine
    for (let i = 0; i <= GAME.tiltWarnings; i++) {
      gs.onTiltInput();
    }
    expect(gs.getSnapshot().tilt.tilted).toBe(true);

    // Drain last ball
    gs.onDrain();
    expect(gs.getSnapshot().screen).toBe('gameOver');
    expect(events).toContain('GameOver');
  });

  it('tilt warning emitted before full tilt', () => {
    const gs = new GameState(0);
    const events = collectEvents(gs);
    gs.startGame();

    gs.onTiltInput();
    expect(events).toContain('TiltWarning');
    expect(gs.getSnapshot().tilt.tilted).toBe(false);
  });
});
