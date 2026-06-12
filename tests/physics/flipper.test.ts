import { describe, it, expect } from 'vitest';
import { createFlipper, getFlipperSegment, getFlipperTip, updateFlipper } from '../../src/physics/Flipper.js';
import { createBall, integrateBall } from '../../src/physics/Ball.js';
import { resolveFlipperCollision } from '../../src/physics/Flipper.js';

describe('Flipper kinematics', () => {
  it('creates flipper at rest angle', () => {
    const flipper = createFlipper(
      'left',
      { x: 180, y: 820 },
      120,
      Math.PI * 0.2,  // rest: angled down
      -Math.PI * 0.2, // active: angled up
    );
    expect(flipper.angle).toBeCloseTo(Math.PI * 0.2);
    expect(flipper.pressed).toBe(false);
  });

  it('getFlipperSegment returns segment from pivot to tip', () => {
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0, 0);
    const seg = getFlipperSegment(flipper);
    expect(seg.start).toEqual({ x: 0, y: 0 });
    // angle=0 → tip at (100, 0)
    expect(seg.end.x).toBeCloseTo(100);
    expect(seg.end.y).toBeCloseTo(0);
  });

  it('moves toward active angle when pressed', () => {
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0.5, -0.5);
    flipper.pressed = true;
    const dt = 1 / 120;
    const angleBefore = flipper.angle;
    updateFlipper(flipper, dt);
    // Should be moving toward -0.5 (decreasing)
    expect(flipper.angle).toBeLessThan(angleBefore);
  });

  it('moves toward rest angle when not pressed', () => {
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0.5, -0.5);
    flipper.angle   = -0.4; // displaced toward active
    flipper.pressed = false;
    const dt = 1 / 120;
    updateFlipper(flipper, dt);
    // Should move back toward rest (0.5 = increasing)
    expect(flipper.angle).toBeGreaterThan(-0.4);
  });

  it('computes angularVel after update', () => {
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0, Math.PI / 2);
    flipper.pressed = true;
    updateFlipper(flipper, 1 / 60);
    // With pressed=true and large angle difference, angularVel should be positive
    expect(flipper.angularVel).toBeGreaterThan(0);
  });
});

describe('Flipper collision — impulse', () => {
  it('deflects ball away when it hits the flipper', () => {
    // Flipper at rest: horizontal (angle=0), pivot at (0,0), length 100
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0, -Math.PI / 4);

    // Ball approaching from above, moving downward
    const ball = createBall(50, -6, 12);
    ball.vel = { x: 0, y: 50 };

    const hit = resolveFlipperCollision(ball, flipper, 0.6, 1 / 120);
    expect(hit).toBe(true);
    // After reflection off horizontal surface, y-velocity should be negative (moving up)
    expect(ball.vel.y).toBeLessThan(0);
  });

  it('returns false when ball is far from flipper', () => {
    const flipper = createFlipper('left', { x: 0, y: 0 }, 100, 0, -Math.PI / 4);
    const ball = createBall(50, -200, 12);
    ball.vel = { x: 0, y: 50 };
    const hit = resolveFlipperCollision(ball, flipper, 0.6, 1 / 120);
    expect(hit).toBe(false);
  });

  it('fast-moving flipper imparts more speed to ball than static flipper', () => {
    // Static flipper
    const flipperStatic  = createFlipper('left', { x: 0, y: 0 }, 100, 0, 0);
    flipperStatic.angularVel = 0;

    // Moving flipper (high angular velocity)
    const flipperMoving  = createFlipper('left', { x: 0, y: 0 }, 100, 0, 0);
    flipperMoving.angularVel = 50; // rad/s, fast upswing

    const ballStatic  = createBall(50, -6, 12);
    ballStatic.vel  = { x: 0, y: 0 };

    const ballMoving  = createBall(50, -6, 12);
    ballMoving.vel = { x: 0, y: 0 };

    resolveFlipperCollision(ballStatic,  flipperStatic,  0.6, 1 / 120);
    resolveFlipperCollision(ballMoving,  flipperMoving,  0.6, 1 / 120);

    const speedStatic = Math.abs(ballStatic.vel.y);
    const speedMoving = Math.abs(ballMoving.vel.y);

    expect(speedMoving).toBeGreaterThan(speedStatic);
  });
});
