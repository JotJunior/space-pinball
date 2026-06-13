/**
 * Central game state machine for Space Cadet Pinball.
 * Ref: spec.md FR-004, FR-005, FR-006; plan.md §Data Model
 */

import { GAME, SCORING } from '../config/scoring.js';
import { MISSIONS, MissionId, MissionConfig } from '../config/missions.js';

// ---------------------------------------------------------------------------
// Game screen/phase
// ---------------------------------------------------------------------------
export type GameScreen = 'attract' | 'playing' | 'gameOver';

// ---------------------------------------------------------------------------
// Tilt state
// ---------------------------------------------------------------------------
export interface TiltState {
  warnings: number;
  tilted: boolean;
  tiltCooldownMs: number;  // ms remaining before tilt resets
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
export interface GameStateSnapshot {
  screen: GameScreen;
  score: number;
  highScore: number;
  ballsRemaining: number;
  currentBall: number;  // 1-based
  rankIndex: number;    // 0 = unranked, 1-9 = ranked
  currentMissionId: MissionId | null;
  missionProgress: Map<string, number>; // objective type+index -> count
  fuelLights: number;   // 0-5 lit
  tilt: TiltState;
  multiplier: number;
  extraBallEarned: boolean;
}

export type GameEventType =
  | 'BumperHit'
  | 'SlingHit'
  | 'TargetHit'
  | 'FlipperHit'
  | 'Drain'
  | 'RampCompleted'
  | 'HyperspaceUsed'
  | 'DropTargetHit'
  | 'DropTargetBankComplete'
  | 'MissionComplete'
  | 'RankUp'
  | 'NewHighScore'
  | 'ExtraBall'
  | 'GameOver'
  | 'BallLaunched'
  | 'Tilt'
  | 'TiltWarning';

export interface GameEvent {
  type: GameEventType;
  payload?: Record<string, unknown>;
}

export type GameEventHandler = (event: GameEvent) => void;

// ---------------------------------------------------------------------------
// GameState class
// ---------------------------------------------------------------------------
export class GameState {
  private state: GameStateSnapshot;
  private handlers: GameEventHandler[] = [];

  constructor(highScore: number) {
    this.state = {
      screen: 'attract',
      score: 0,
      highScore,
      ballsRemaining: GAME.ballsPerGame,
      currentBall: 1,
      rankIndex: 0,
      currentMissionId: null,
      missionProgress: new Map(),
      fuelLights: 0,
      tilt: { warnings: 0, tilted: false, tiltCooldownMs: 0 },
      multiplier: 1,
      extraBallEarned: false,
    };
  }

  on(handler: GameEventHandler): void {
    this.handlers.push(handler);
  }

  off(handler: GameEventHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  getSnapshot(): Readonly<GameStateSnapshot> {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Screen transitions
  // ---------------------------------------------------------------------------
  startGame(): void {
    this.state = {
      screen: 'playing',
      score: 0,
      highScore: this.state.highScore,
      ballsRemaining: GAME.ballsPerGame,
      currentBall: 1,
      rankIndex: 0,
      currentMissionId: null,
      missionProgress: new Map(),
      fuelLights: 0,
      tilt: { warnings: 0, tilted: false, tiltCooldownMs: 0 },
      multiplier: 1,
      extraBallEarned: false,
    };
    this.emit({ type: 'BallLaunched' });
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------
  addScore(points: number): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;

    const effectivePoints = points * this.state.multiplier;
    const prevScore = this.state.score;
    this.state.score += effectivePoints;

    // Check replay threshold
    if (prevScore < GAME.replayThreshold && this.state.score >= GAME.replayThreshold) {
      if (!this.state.extraBallEarned) {
        this.state.ballsRemaining = Math.min(this.state.ballsRemaining + 1, GAME.maxBalls);
        this.state.extraBallEarned = true;
        this.emit({ type: 'ExtraBall' });
      }
    }

    // Update high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.emit({ type: 'NewHighScore', payload: { score: this.state.score } });
    }
  }

  // ---------------------------------------------------------------------------
  // Physics event handlers
  // ---------------------------------------------------------------------------
  onBumperHit(bumperId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.bumperHit);
    this.advanceMissionObjective('hit-bumpers');
    this.emit({ type: 'BumperHit', payload: { id: bumperId } });
  }

  onSlingHit(slingId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.slingHit);
    this.advanceMissionObjective('hit-slings');
    this.emit({ type: 'SlingHit', payload: { id: slingId } });
  }

  onTargetHit(targetId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.targetHit);
    this.advanceMissionObjective('hit-targets');
    this.emit({ type: 'TargetHit', payload: { id: targetId } });
  }

  onDropTargetHit(targetId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.dropTargetHit);
    this.advanceMissionObjective('hit-targets');
    this.emit({ type: 'DropTargetHit', payload: { id: targetId } });
  }

  onDropTargetBankComplete(bankId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.dropTargetBankBonus);
    this.emit({ type: 'DropTargetBankComplete', payload: { id: bankId } });
  }

  onRampCompleted(rampId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.rampBonus);
    this.advanceMissionObjective('complete-ramps');
    this.emit({ type: 'RampCompleted', payload: { id: rampId } });
  }

  onHyperspaceUsed(hyperspaceId: string): void {
    if (this.state.screen !== 'playing' || this.state.tilt.tilted) return;
    this.addScore(SCORING.hyperspaceBonus);
    this.advanceMissionObjective('use-hyperspace');
    this.emit({ type: 'HyperspaceUsed', payload: { id: hyperspaceId } });
  }

  onDrain(): void {
    if (this.state.screen !== 'playing') return;

    this.state.tilt.tilted = false;
    this.state.tilt.warnings = 0;
    this.state.ballsRemaining -= 1;

    if (this.state.ballsRemaining <= 0) {
      this.state.screen = 'gameOver';
      this.emit({ type: 'GameOver', payload: { score: this.state.score } });
    } else {
      this.state.currentBall += 1;
      this.emit({ type: 'BallLaunched' });
    }
  }

  // ---------------------------------------------------------------------------
  // Tilt
  // ---------------------------------------------------------------------------
  onTiltInput(): void {
    if (this.state.screen !== 'playing') return;
    if (this.state.tilt.tilted) return;

    this.state.tilt.warnings += 1;
    if (this.state.tilt.warnings > GAME.tiltWarnings) {
      this.state.tilt.tilted = true;
      this.emit({ type: 'Tilt' });
    } else {
      this.emit({ type: 'TiltWarning', payload: { warnings: this.state.tilt.warnings } });
    }
  }

  // ---------------------------------------------------------------------------
  // Fuel lights
  // ---------------------------------------------------------------------------
  addFuelLight(): void {
    if (this.state.fuelLights < 5) {
      this.state.fuelLights += 1;
    }
  }

  resetFuelLights(): void {
    this.state.fuelLights = 0;
  }

  // ---------------------------------------------------------------------------
  // Mission progress
  // ---------------------------------------------------------------------------
  private advanceMissionObjective(type: string): void {
    if (!this.state.currentMissionId) return;

    const mission = MISSIONS.find(m => m.id === this.state.currentMissionId);
    if (!mission) return;

    const key = type;
    const current = this.state.missionProgress.get(key) ?? 0;
    this.state.missionProgress.set(key, current + 1);

    // Check if all objectives met
    const complete = mission.objectives
      .filter(obj => obj.type === type)
      .every(obj => (this.state.missionProgress.get(obj.type) ?? 0) >= obj.count);

    if (complete && this.checkMissionComplete(mission)) {
      this.completeMission(mission);
    }
  }

  private checkMissionComplete(mission: MissionConfig): boolean {
    return mission.objectives.every(obj => {
      const progress = this.state.missionProgress.get(obj.type) ?? 0;
      if (obj.type === 'score-points') {
        return this.state.score >= obj.count;
      }
      return progress >= obj.count;
    });
  }

  private completeMission(mission: MissionConfig): void {
    this.addScore(mission.scoreBonus);
    this.state.currentMissionId = null;
    this.state.missionProgress = new Map();
    this.emit({ type: 'MissionComplete', payload: { missionId: mission.id } });

    // Advance rank
    const newRank = this.state.rankIndex + 1;
    if (newRank <= 9) {
      this.state.rankIndex = newRank;
      this.emit({ type: 'RankUp', payload: { rank: newRank } });

      // Start next mission if available
      const nextMission = MISSIONS[newRank];
      if (nextMission !== undefined) {
        this.state.currentMissionId = nextMission.id;
      }
    }
  }

  activateMission(missionId: MissionId): void {
    this.state.currentMissionId = missionId;
    this.state.missionProgress = new Map();
  }

  // ---------------------------------------------------------------------------
  // Multiplier
  // ---------------------------------------------------------------------------
  setMultiplier(x: 1 | 2 | 3 | 5): void {
    this.state.multiplier = x;
  }

  // ---------------------------------------------------------------------------
  // Update (call each frame, dt in ms)
  // ---------------------------------------------------------------------------
  update(_dt: number): void {
    // Future: tilt cooldown timer
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------
  private emit(event: GameEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
