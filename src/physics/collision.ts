/**
 * Collision detection and resolution for Space Cadet Pinball.
 * Ref: plan.md §Detectar Colisao Circle vs Segment; spec.md FR-002
 */

import { Vec2, Circle, Segment, add, sub, scale, dot, normalize, length, closestPointOnSegment } from './shapes.js';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------
export interface CollisionResult {
  hit: boolean;
  normal: Vec2;
  penetration: number;
  contactPoint: Vec2;
}

const NO_HIT: CollisionResult = {
  hit: false,
  normal: { x: 0, y: 0 },
  penetration: 0,
  contactPoint: { x: 0, y: 0 },
};

// ---------------------------------------------------------------------------
// Circle vs Circle
// ---------------------------------------------------------------------------
export function circleVsCircle(c1: Circle, c2: Circle): CollisionResult {
  const diff = sub(c1.center, c2.center);
  const dist = length(diff);
  const minDist = c1.radius + c2.radius;

  if (dist >= minDist) return NO_HIT;

  const normal = dist < 1e-10
    ? { x: 1, y: 0 } // fallback for exact overlap
    : normalize(diff);

  return {
    hit: true,
    normal,
    penetration: minDist - dist,
    contactPoint: add(c2.center, scale(normal, c2.radius)),
  };
}

// ---------------------------------------------------------------------------
// Circle vs Segment
// ---------------------------------------------------------------------------
export function circleVsSegment(circle: Circle, seg: Segment): CollisionResult {
  const closest = closestPointOnSegment(circle.center, seg);
  const diff    = sub(circle.center, closest);
  const dist    = length(diff);

  if (dist >= circle.radius) return NO_HIT;

  const normal: Vec2 = dist < 1e-10
    ? normalize(sub(circle.center, seg.start)) // edge case: center on segment
    : normalize(diff);

  return {
    hit: true,
    normal,
    penetration: circle.radius - dist,
    contactPoint: closest,
  };
}

// ---------------------------------------------------------------------------
// Velocity reflection
// ---------------------------------------------------------------------------
/**
 * Reflects velocity `vel` off a surface with given `normal` and `restitution`.
 * v' = v - (1 + e) * dot(v, n) * n
 */
export function resolveCollision(vel: Vec2, normal: Vec2, restitution: number): Vec2 {
  const vDotN = dot(vel, normal);
  if (vDotN >= 0) return vel; // Moving away from surface already
  return sub(vel, scale(normal, (1 + restitution) * vDotN));
}

// ---------------------------------------------------------------------------
// Positional correction
// ---------------------------------------------------------------------------
/**
 * Pushes ball position out of penetration along `normal`.
 * `slop` is small tolerance to prevent jitter.
 */
export function separateBall(pos: Vec2, normal: Vec2, penetration: number, slop = 0.5): Vec2 {
  const correction = Math.max(penetration - slop, 0);
  return add(pos, scale(normal, correction));
}

// ---------------------------------------------------------------------------
// Surface velocity contribution (for flippers)
// ---------------------------------------------------------------------------
/**
 * Computes the velocity at `contactPoint` on a rotating body.
 * omega: angular velocity (rad/s), positive = counterclockwise
 * pivot: rotation pivot point
 * Returns tangential velocity at contactPoint.
 */
export function surfaceVelocity(contactPoint: Vec2, pivot: Vec2, omega: number): Vec2 {
  const r = sub(contactPoint, pivot);
  // v = omega x r  (2D: rotate r by 90° and scale by omega)
  return { x: -omega * r.y, y: omega * r.x };
}
