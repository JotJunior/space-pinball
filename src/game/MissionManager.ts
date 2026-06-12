/**
 * Mission state machine for Space Cadet Pinball.
 * Manages activation, progress tracking, and completion for 9 ranked missions.
 * Ref: spec.md FR-005; plan.md §Mission State Machine
 */

import { MISSIONS, MissionConfig, MissionId, MissionObjective } from '../config/missions.js';

export type MissionStatus = 'inactive' | 'active' | 'completed';

export interface MissionState {
  id: MissionId;
  status: MissionStatus;
  progress: Map<number, number>; // objectiveIndex -> current count
}

export class MissionManager {
  private missions: Map<MissionId, MissionState>;
  private currentRank: number = 0;  // 0 = unranked
  private activeMissionId: MissionId | null = null;

  constructor() {
    this.missions = new Map();
    for (const cfg of MISSIONS) {
      this.missions.set(cfg.id, {
        id: cfg.id,
        status: 'inactive',
        progress: new Map(),
      });
    }
  }

  getCurrentRank(): number {
    return this.currentRank;
  }

  getActiveMission(): MissionConfig | null {
    if (!this.activeMissionId) return null;
    return MISSIONS.find(m => m.id === this.activeMissionId) ?? null;
  }

  getMissionState(id: MissionId): MissionState | undefined {
    return this.missions.get(id);
  }

  getObjectiveProgress(objectiveType: string): number {
    const state = this.activeMissionId ? this.missions.get(this.activeMissionId) : null;
    if (!state) return 0;
    const mission = MISSIONS.find(m => m.id === this.activeMissionId);
    if (!mission) return 0;
    const objIdx = mission.objectives.findIndex(o => o.type === objectiveType);
    return objIdx >= 0 ? (state.progress.get(objIdx) ?? 0) : 0;
  }

  /** Activate a mission (typically called when fuel lights are full). */
  activateMission(id: MissionId): boolean {
    const state = this.missions.get(id);
    if (!state || state.status !== 'inactive') return false;

    this.activeMissionId = id;
    state.status = 'active';
    state.progress = new Map();
    return true;
  }

  /**
   * Record progress toward the active mission.
   * Returns true if this advance caused mission completion.
   */
  recordProgress(type: MissionObjective['type'], amount: number = 1): boolean {
    if (!this.activeMissionId) return false;

    const state = this.missions.get(this.activeMissionId);
    const mission = MISSIONS.find(m => m.id === this.activeMissionId);
    if (!state || !mission || state.status !== 'active') return false;

    // Advance all objectives of this type
    for (let i = 0; i < mission.objectives.length; i++) {
      const obj = mission.objectives[i]!;
      if (obj.type === type) {
        const current = state.progress.get(i) ?? 0;
        state.progress.set(i, Math.min(current + amount, obj.count));
      }
    }

    // Check completion
    return this.checkCompletion(mission, state);
  }

  private checkCompletion(mission: MissionConfig, state: MissionState): boolean {
    const allMet = mission.objectives.every((obj, idx) => {
      const progress = state.progress.get(idx) ?? 0;
      return progress >= obj.count;
    });

    if (allMet) {
      state.status = 'completed';
      this.activeMissionId = null;
      this.currentRank = Math.min(this.currentRank + 1, 9);
      return true;
    }
    return false;
  }

  /** Reset for new game. */
  reset(): void {
    this.currentRank = 0;
    this.activeMissionId = null;
    for (const state of this.missions.values()) {
      state.status = 'inactive';
      state.progress = new Map();
    }
  }

  /**
   * Get the next mission to activate (first non-completed in rank order).
   */
  getNextMission(): MissionConfig | null {
    for (const cfg of MISSIONS) {
      const state = this.missions.get(cfg.id);
      if (state && state.status === 'inactive') {
        return cfg;
      }
    }
    return null;
  }
}
