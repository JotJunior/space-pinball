import { describe, it, expect } from 'vitest';
import { createBall, integrateBall, applyFriction, interpolatedPos } from '../../src/physics/Ball.js';

describe('Ball integration', () => {
  it('starts at rest with given position', () => {
    const ball = createBall(100, 200, 12);
    expect(ball.pos).toEqual({ x: 100, y: 200 });
    expect(ball.vel).toEqual({ x: 0, y: 0 });
    expect(ball.prevPos).toEqual({ x: 100, y: 200 });
    expect(ball.radius).toBe(12);
  });

  it('saves prevPos before integrating', () => {
    const ball = createBall(0, 0, 12);
    ball.vel = { x: 10, y: 0 };
    const prevX = ball.pos.x;
    integrateBall(ball, 1/120, 0); // no gravity
    expect(ball.prevPos.x).toBe(prevX);
  });

  it('applies gravity correctly over one step', () => {
    const ball = createBall(0, 0, 12);
    const dt = 1 / 120; // one physics step at 120Hz
    const gravity = 981; // px/s²
    integrateBall(ball, dt, gravity);

    // vel should increase by gravity * dt
    const expectedVelY = gravity * dt;
    expect(ball.vel.y).toBeCloseTo(expectedVelY, 5);
    // pos should move by vel * dt = expectedVelY * dt
    expect(ball.pos.y).toBeCloseTo(expectedVelY * dt, 5);
  });

  it('falls with correct acceleration over N frames', () => {
    const ball = createBall(0, 0, 12);
    const dt = 1 / 120;
    const gravity = 981;
    const steps = 120; // 1 second

    for (let i = 0; i < steps; i++) {
      integrateBall(ball, dt, gravity);
    }

    // After 1 second, velocity ≈ 981 px/s (semi-implicit may differ slightly)
    expect(ball.vel.y).toBeGreaterThan(900);
    // Position should be roughly 0.5 * 981 * 1^2 = 490.5 px
    expect(ball.pos.y).toBeGreaterThan(450);
    expect(ball.pos.y).toBeLessThan(550);
  });

  it('applyFriction scales velocity', () => {
    const ball = createBall(0, 0, 12);
    ball.vel = { x: 100, y: 200 };
    applyFriction(ball, 0.99);
    expect(ball.vel.x).toBeCloseTo(99);
    expect(ball.vel.y).toBeCloseTo(198);
  });

  it('interpolatedPos interpolates correctly', () => {
    const ball = createBall(0, 0, 12);
    ball.prevPos = { x: 0, y: 0 };
    ball.pos     = { x: 10, y: 20 };

    const mid = interpolatedPos(ball, 0.5);
    expect(mid).toEqual({ x: 5, y: 10 });

    const start = interpolatedPos(ball, 0);
    expect(start).toEqual({ x: 0, y: 0 });

    const end = interpolatedPos(ball, 1);
    expect(end).toEqual({ x: 10, y: 20 });
  });
});
