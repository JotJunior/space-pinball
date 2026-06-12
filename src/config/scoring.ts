/**
 * Scoring values and game thresholds for Space Cadet Pinball.
 * Calibrate values via playtest in task 7.5.3.
 */

export const SCORING = {
  bumperHit: 100,
  bumperHitBonus: 500,     // when bumper mode active
  slingHit: 50,
  targetHit: 500,
  targetCycleBonus: 5000,  // all 3 ATF targets hit in sequence
  rampBonus: 2500,
  hyperspaceBonus: 5000,
  flightBonus: 1000,       // per second of continuous flight without drain
} as const;

export const GAME = {
  ballsPerGame: 3,
  replayThreshold: 75000,     // score to earn extra ball
  extraBallThreshold: 150000, // score milestone
  maxBalls: 5,                // maximum balls in play simultaneously (normal = 1)
  multiplierMax: 5,
  tiltWarnings: 2,            // warnings before tilt penalty
} as const;

export const REPLAY_SCORE = 75000;

export const RANK_SCORE_MILESTONES = [
  0,        // recruit
  50000,    // specialist
  125000,   // trooper
  250000,   // sergeant
  500000,   // lieutenant
  750000,   // captain
  1000000,  // commodore
  2000000,  // admiral
  5000000,  // science officer
] as const;
