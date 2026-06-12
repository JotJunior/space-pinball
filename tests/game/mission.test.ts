import { describe, it, expect, beforeEach } from 'vitest';
import { MissionManager } from '../../src/game/MissionManager.js';

describe('MissionManager', () => {
  let mm: MissionManager;

  beforeEach(() => {
    mm = new MissionManager();
  });

  it('starts with rank 0 and no active mission', () => {
    expect(mm.getCurrentRank()).toBe(0);
    expect(mm.getActiveMission()).toBeNull();
  });

  it('can activate the first mission', () => {
    const result = mm.activateMission('recruit');
    expect(result).toBe(true);
    expect(mm.getActiveMission()?.id).toBe('recruit');
  });

  it('records progress toward active mission', () => {
    mm.activateMission('recruit');
    mm.recordProgress('hit-bumpers');
    expect(mm.getObjectiveProgress('hit-bumpers')).toBe(1);
  });

  it('completes mission when objectives are met', () => {
    mm.activateMission('recruit');
    // recruit needs 5 bumper hits
    for (let i = 0; i < 5; i++) {
      mm.recordProgress('hit-bumpers');
    }
    expect(mm.getActiveMission()).toBeNull();
    expect(mm.getCurrentRank()).toBe(1);
  });

  it('returns false when activating already active mission', () => {
    mm.activateMission('recruit');
    const result = mm.activateMission('recruit');
    expect(result).toBe(false);
  });

  it('getNextMission returns first inactive mission', () => {
    const next = mm.getNextMission();
    expect(next?.id).toBe('recruit');
  });

  it('resets state on reset()', () => {
    mm.activateMission('recruit');
    for (let i = 0; i < 5; i++) mm.recordProgress('hit-bumpers');
    mm.reset();
    expect(mm.getCurrentRank()).toBe(0);
    expect(mm.getActiveMission()).toBeNull();
    expect(mm.getNextMission()?.id).toBe('recruit');
  });
});
