import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../../src/physics/PhysicsEngine.js';

describe('PhysicsEngine', () => {
  it('creates engine with a ball in plunger position', () => {
    const engine = new PhysicsEngine();
    const state = engine.getState();
    expect(state.ball.radius).toBe(12);
    expect(state.flippers.length).toBe(2);
    expect(state.flippers[0]!.side).toBe('left');
    expect(state.flippers[1]!.side).toBe('right');
  });

  it('step() returns no drain event when ball is at start position', () => {
    const engine = new PhysicsEngine();
    // Ball at start (plunger), should not drain immediately
    const events = engine.step(8.33);
    const drains = events.filter(e => e.type === 'Drain');
    expect(drains.length).toBe(0);
  });

  it('getBallRenderPos interpolates between prevPos and pos', () => {
    const engine = new PhysicsEngine();
    const pos0 = engine.getBallRenderPos(0);
    const pos1 = engine.getBallRenderPos(1);
    // Both at same position before any steps
    expect(pos0).toEqual(pos1);
  });

  it('setFlipperPressed changes pressed state', () => {
    const engine = new PhysicsEngine();
    engine.setFlipperPressed('left', true);
    const state = engine.getState();
    const leftFlipper = state.flippers.find(f => f.side === 'left');
    expect(leftFlipper?.pressed).toBe(true);
  });

  it('setFlipperPressed right flipper', () => {
    const engine = new PhysicsEngine();
    engine.setFlipperPressed('right', true);
    const state = engine.getState();
    const rightFlipper = state.flippers.find(f => f.side === 'right');
    expect(rightFlipper?.pressed).toBe(true);
  });

  it('launchBall sets upward velocity', () => {
    const engine = new PhysicsEngine();
    engine.launchBall(1.0);
    const state = engine.getState();
    expect(state.ball.vel.y).toBeLessThan(0);  // negative = upward
  });

  it('launchBall at half charge gives half speed', () => {
    const engine1 = new PhysicsEngine();
    const engine2 = new PhysicsEngine();
    engine1.launchBall(0.5);
    engine2.launchBall(1.0);
    const speed1 = Math.abs(engine1.getState().ball.vel.y);
    const speed2 = Math.abs(engine2.getState().ball.vel.y);
    expect(speed1).toBeCloseTo(speed2 * 0.5);
  });

  it('resetBall puts ball back at plunger lane', () => {
    const engine = new PhysicsEngine();
    engine.launchBall(1.0);
    // Run a few steps so ball moves
    for (let i = 0; i < 10; i++) engine.step(8.33);
    engine.resetBall();
    const state = engine.getState();
    // Ball should be reset near y=800 (plunger lane)
    expect(state.ball.vel.y).toBe(0);
    expect(state.ball.vel.x).toBe(0);
  });

  it('emits BumperHit event when ball is at bumper position', () => {
    const engine = new PhysicsEngine();
    const events: string[] = [];
    engine.on((e) => events.push(e.type));

    // Manually place ball on top of center bumper
    const state = engine.getState();
    state.ball.pos = { x: 300, y: 155 };  // bumper center is (300, 180), radius 25, ball r 12
    state.ball.vel = { x: 0, y: 100 };    // moving down toward bumper
    state.ball.prevPos = { ...state.ball.pos };

    engine.step(8.33);
    expect(events).toContain('BumperHit');
  });

  it('isBumperActive returns false initially', () => {
    const engine = new PhysicsEngine();
    expect(engine.isBumperActive('bumper-center')).toBe(false);
  });

  it('on/off event handler registration', () => {
    const engine = new PhysicsEngine();
    const received: string[] = [];
    const handler = (e: { type: string }) => received.push(e.type);

    engine.on(handler);
    const state = engine.getState();
    // Place ball at drain
    state.ball.pos = { x: 300, y: 880 };
    state.ball.prevPos = { ...state.ball.pos };
    engine.step(8.33);
    expect(received).toContain('Drain');

    // Remove handler and check no more events
    engine.off(handler);
    const before = received.length;
    state.ball.pos = { x: 300, y: 880 };
    engine.step(8.33);
    expect(received.length).toBe(before);
  });
});
