/**
 * Ball physics state and integration for Space Cadet Pinball.
 * Ref: plan.md §Data Model; spec.md FR-002
 */

import { Vec2, add, scale } from './shapes.js';

// ---------------------------------------------------------------------------
// Ball state
// ---------------------------------------------------------------------------
export interface BallState {
  pos:     Vec2;
  vel:     Vec2;
  prevPos: Vec2;
  radius:  number;
}

export function createBall(x: number, y: number, radius: number): BallState {
  return {
    pos:     { x, y },
    vel:     { x: 0, y: 0 },
    prevPos: { x, y },
    radius,
  };
}

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------
/**
 * Semi-implicit Euler integration.
 * vel += gravity * dt (gravity in px/s², dt in seconds)
 * pos += vel * dt
 * Saves prevPos before updating pos (for render interpolation).
 */
export function integrateBall(ball: BallState, dt: number, gravity: number): void {
  ball.prevPos = { ...ball.pos };

  // Apply gravity (downward = +y)
  ball.vel = add(ball.vel, { x: 0, y: gravity * dt });

  // Integrate position
  ball.pos = add(ball.pos, scale(ball.vel, dt));
}

/**
 * Per-frame friction: vel *= friction.
 * Should be applied after collision resolution in each physics step.
 */
export function applyFriction(ball: BallState, friction: number): void {
  ball.vel = scale(ball.vel, friction);
}

/**
 * Returns interpolated render position between prevPos and pos.
 * alpha = accumulator / PHYSICS_STEP (0..1)
 */
export function interpolatedPos(ball: BallState, alpha: number): Vec2 {
  return {
    x: ball.prevPos.x + (ball.pos.x - ball.prevPos.x) * alpha,
    y: ball.prevPos.y + (ball.pos.y - ball.prevPos.y) * alpha,
  };
}
