/**
 * Physics constants for Space Cadet Pinball simulation.
 * All values calibrated via playtest (task 7.5.1).
 */
export const PHYSICS_STEP = 1000 / 120; // 8.33ms at 120Hz
export const MAX_ACCUMULATOR = 100; // ms, anti-spiral-of-death cap

export const GRAVITY = 981; // px/s² (calibrate in FASE 7)
export const BALL_ELASTICITY = 0.6; // coefficient of restitution
export const FRICTION = 0.99; // velocity multiplier per physics step
export const FLIPPER_SNAP_MS = 80; // ms to full angle (exponential interpolation)
export const FLIPPER_ANGULAR_VEL_SNAP = 20; // rad/s snap threshold
export const BUMPER_EJECTION_SPEED = 800; // px/s
export const TILT_THRESHOLD = 3; // number of rapid tilt events before penalty
export const PLUNGER_MAX_CHARGE_MS = 2000; // ms for full charge
export const PLUNGER_MAX_SPEED = 1200; // px/s at full charge
