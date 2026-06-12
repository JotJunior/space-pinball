import { describe, it, expect } from 'vitest';
import {
  circleVsCircle,
  circleVsSegment,
  resolveCollision,
  separateBall,
} from '../../src/physics/collision.js';
import { closestPointOnSegment } from '../../src/physics/shapes.js';

// ---------------------------------------------------------------------------
// closestPointOnSegment
// ---------------------------------------------------------------------------
describe('closestPointOnSegment', () => {
  const seg = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };

  it('returns the projected point when within segment', () => {
    const p = closestPointOnSegment({ x: 5, y: 3 }, seg);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(0);
  });

  it('clamps to start when point is before segment', () => {
    const p = closestPointOnSegment({ x: -5, y: 0 }, seg);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
  });

  it('clamps to end when point is past segment', () => {
    const p = closestPointOnSegment({ x: 15, y: 0 }, seg);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it('handles degenerate segment (start == end)', () => {
    const degen = { start: { x: 5, y: 5 }, end: { x: 5, y: 5 } };
    const p = closestPointOnSegment({ x: 10, y: 10 }, degen);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// circleVsCircle
// ---------------------------------------------------------------------------
describe('circleVsCircle', () => {
  it('returns no hit when circles are apart', () => {
    const c1 = { center: { x: 0, y: 0 }, radius: 10 };
    const c2 = { center: { x: 30, y: 0 }, radius: 10 };
    const result = circleVsCircle(c1, c2);
    expect(result.hit).toBe(false);
  });

  it('detects overlap when circles touch', () => {
    const c1 = { center: { x: 0, y: 0 }, radius: 10 };
    const c2 = { center: { x: 15, y: 0 }, radius: 10 };
    const result = circleVsCircle(c1, c2);
    expect(result.hit).toBe(true);
    expect(result.penetration).toBeCloseTo(5);
    // normal = normalize(c1.center - c2.center) = normalize(-15, 0) = (-1, 0)
    expect(result.normal.x).toBeCloseTo(-1);
    expect(result.normal.y).toBeCloseTo(0);
  });

  it('normal points from c2 toward c1 (c1 above c2 vertically)', () => {
    const c1 = { center: { x: 0, y: 0 }, radius: 10 };
    const c2 = { center: { x: 0, y: 15 }, radius: 10 };
    const result = circleVsCircle(c1, c2);
    expect(result.hit).toBe(true);
    // normal = normalize(c1 - c2) = normalize(0, -15) = (0, -1)
    expect(result.normal.x).toBeCloseTo(0);
    expect(result.normal.y).toBeCloseTo(-1);
  });
});

// ---------------------------------------------------------------------------
// circleVsSegment
// ---------------------------------------------------------------------------
describe('circleVsSegment', () => {
  it('detects ball hitting horizontal wall', () => {
    const wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } };
    const circle = { center: { x: 50, y: -5 }, radius: 12 };
    const result = circleVsSegment(circle, wall);
    expect(result.hit).toBe(true);
    expect(result.penetration).toBeCloseTo(7);
  });

  it('returns no hit when ball is far from wall', () => {
    const wall = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } };
    const circle = { center: { x: 50, y: -20 }, radius: 12 };
    const result = circleVsSegment(circle, wall);
    expect(result.hit).toBe(false);
  });

  it('normal points from wall toward ball center', () => {
    const wall = { start: { x: 0, y: 100 }, end: { x: 100, y: 100 } };
    const circle = { center: { x: 50, y: 90 }, radius: 12 };
    const result = circleVsSegment(circle, wall);
    expect(result.hit).toBe(true);
    // Ball is above wall (y=90 < y=100), normal should point up (y=-1)
    expect(result.normal.y).toBeCloseTo(-1);
  });
});

// ---------------------------------------------------------------------------
// resolveCollision
// ---------------------------------------------------------------------------
describe('resolveCollision', () => {
  it('reflects velocity off horizontal wall (90° angle)', () => {
    const vel    = { x: 0, y: 100 };
    const normal = { x: 0, y: -1 };
    const result = resolveCollision(vel, normal, 1.0);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-100);
  });

  it('reflects velocity off vertical wall (0° angle)', () => {
    const vel    = { x: 100, y: 0 };
    const normal = { x: -1, y: 0 };
    const result = resolveCollision(vel, normal, 1.0);
    expect(result.x).toBeCloseTo(-100);
    expect(result.y).toBeCloseTo(0);
  });

  it('reflects velocity at 45° angle', () => {
    const vel    = { x: 100, y: 100 };
    const normal = { x: 0, y: -1 };
    const result = resolveCollision(vel, normal, 1.0);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(-100);
  });

  it('applies restitution correctly (e=0.6)', () => {
    const vel    = { x: 0, y: 100 };
    const normal = { x: 0, y: -1 };
    const result = resolveCollision(vel, normal, 0.6);
    expect(result.y).toBeCloseTo(-60);
  });

  it('does not affect velocity moving away from surface', () => {
    const vel    = { x: 0, y: -100 }; // already moving away from +y surface
    const normal = { x: 0, y: -1 };
    const result = resolveCollision(vel, normal, 1.0);
    expect(result.y).toBeCloseTo(-100); // unchanged
  });
});

// ---------------------------------------------------------------------------
// separateBall
// ---------------------------------------------------------------------------
describe('separateBall', () => {
  it('pushes position out of penetration', () => {
    const pos = { x: 50, y: 90 };
    const normal = { x: 0, y: -1 };
    const result = separateBall(pos, normal, 5);
    expect(result.y).toBeLessThan(pos.y);
  });

  it('leaves position unchanged when penetration <= slop', () => {
    const pos = { x: 50, y: 90 };
    const normal = { x: 0, y: -1 };
    // Default slop = 0.5; penetration 0.3 < slop
    const result = separateBall(pos, normal, 0.3);
    expect(result).toEqual(pos);
  });
});
