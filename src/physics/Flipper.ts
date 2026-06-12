/**
 * Flipper kinematics and collision for Space Cadet Pinball.
 * Ref: plan.md §Flipper Physics; spec.md FR-002
 */

import { Vec2, Segment, add, scale, sub } from './shapes.js';
import { BallState } from './Ball.js';
import { resolveCollision, separateBall, circleVsSegment, surfaceVelocity } from './collision.js';

export type FlipperSide = 'left' | 'right';

export interface FlipperState {
  side:        FlipperSide;
  angle:       number;  // current angle in radians
  angularVel:  number;  // rad/s
  pivot:       Vec2;
  length:      number;  // px
  angleRest:   number;  // resting angle (unpressed)
  angleActive: number;  // pressed angle
  pressed:     boolean;
}

// Transfer factor: how much of the flipper surface velocity transfers to the ball
const TRANSFER_FACTOR = 0.7;

/**
 * Creates flipper state from config values.
 */
export function createFlipper(
  side: FlipperSide,
  pivot: Vec2,
  length: number,
  angleRest: number,
  angleActive: number,
): FlipperState {
  return {
    side,
    angle:       angleRest,
    angularVel:  0,
    pivot,
    length,
    angleRest,
    angleActive,
    pressed: false,
  };
}

/**
 * Returns the tip position of the flipper.
 */
export function getFlipperTip(flipper: FlipperState): Vec2 {
  return {
    x: flipper.pivot.x + Math.cos(flipper.angle) * flipper.length,
    y: flipper.pivot.y + Math.sin(flipper.angle) * flipper.length,
  };
}

/**
 * Returns the flipper as a Segment for collision detection.
 */
export function getFlipperSegment(flipper: FlipperState): Segment {
  return {
    start: flipper.pivot,
    end:   getFlipperTip(flipper),
  };
}

/**
 * Updates flipper angle via exponential interpolation toward target.
 * Snap time ~80ms (FLIPPER_SNAP_MS) achieved by choosing lambda = -ln(0.01)/0.08.
 * dt in seconds.
 */
export function updateFlipper(flipper: FlipperState, dt: number): void {
  const targetAngle = flipper.pressed ? flipper.angleActive : flipper.angleRest;
  const lambda = 57.6; // ~= -ln(0.01) / 0.08

  const prevAngle = flipper.angle;
  flipper.angle += (targetAngle - flipper.angle) * (1 - Math.exp(-lambda * dt));

  // Compute angular velocity for surface-velocity transfer
  flipper.angularVel = (flipper.angle - prevAngle) / dt;
}

/**
 * Resolves collision between ball and flipper.
 * Modifies ball.pos and ball.vel in place.
 * Returns true if a collision occurred.
 */
export function resolveFlipperCollision(
  ball: BallState,
  flipper: FlipperState,
  restitution: number,
  _dt: number,
): boolean {
  const seg = getFlipperSegment(flipper);
  const result = circleVsSegment(
    { center: ball.pos, radius: ball.radius },
    seg,
  );

  if (!result.hit) return false;

  // Positional correction
  ball.pos = separateBall(ball.pos, result.normal, result.penetration);

  // Surface velocity of the flipper at contact point
  const vSurf = surfaceVelocity(result.contactPoint, flipper.pivot, flipper.angularVel);

  // Relative velocity of ball w.r.t. flipper surface
  const vRel = sub(ball.vel, vSurf);

  // Reflect relative velocity
  const vRelReflected = resolveCollision(vRel, result.normal, restitution);

  // New ball velocity = reflected relative + flipper surface velocity (scaled by transfer)
  ball.vel = add(vRelReflected, scale(vSurf, TRANSFER_FACTOR));

  return true;
}
