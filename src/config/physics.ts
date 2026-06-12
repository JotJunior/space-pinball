/**
 * Physics constants for Space Cadet Pinball simulation.
 * Calibrated via playtest (task 7.5.1).
 *
 * Table dimensions: 600x900 logical px.
 * Physics runs at 120Hz (8.33ms step) with sub-ms accumulator.
 *
 * Calibration notes (2026-06-12):
 *   - gravity=1200 gives a noticeably faster ball than 981, closer to original
 *   - elasticity=0.65 keeps ball lively without feeling bouncy
 *   - friction=0.995 allows longer ball travel (less drag per step at 120Hz)
 *   - bumperEjection=850 keeps ball energetic through bumper clusters
 *   - plungerMaxSpeed=1300 allows reaching top bumpers at full charge
 */
export const PHYSICS_STEP = 1000 / 120; // 8.33ms at 120Hz
export const MAX_ACCUMULATOR = 100; // ms, anti-spiral-of-death cap

export const GRAVITY = 1200;          // px/s² — calibrated for 900px table height
export const BALL_ELASTICITY = 0.65;  // coefficient of restitution
export const FRICTION = 0.995;        // velocity multiplier per physics step (at 120Hz)
export const FLIPPER_SNAP_MS = 80;    // ms to full angle (exponential interpolation)
export const FLIPPER_ANGULAR_VEL_SNAP = 20; // rad/s snap threshold
export const BUMPER_EJECTION_SPEED = 850;   // px/s — energetic ejection
export const TILT_THRESHOLD = 3;      // number of rapid tilt events before penalty
export const PLUNGER_MAX_CHARGE_MS = 2000;  // ms for full charge
export const PLUNGER_MAX_SPEED = 1300;      // px/s at full charge (reaches bumpers)
