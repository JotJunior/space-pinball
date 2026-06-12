/**
 * Complete physics engine integrating ball, flippers, bumpers, slingshots, and walls.
 * Ref: plan.md §Physics Engine Design; spec.md FR-002
 */

import { Vec2, Segment, Circle, scale, polygonToSegments } from './shapes.js';
import { BallState, createBall, integrateBall, applyFriction, interpolatedPos } from './Ball.js';
import { FlipperState, createFlipper, updateFlipper, resolveFlipperCollision } from './Flipper.js';
import { circleVsSegment, circleVsCircle, resolveCollision, separateBall } from './collision.js';
import { TABLE_CONFIG } from '../config/table.js';
import { GRAVITY, BALL_ELASTICITY, FRICTION, BUMPER_EJECTION_SPEED } from '../config/physics.js';

// ---------------------------------------------------------------------------
// Events emitted by the engine
// ---------------------------------------------------------------------------
export type PhysicsEventType =
  | 'BumperHit'
  | 'SlingHit'
  | 'TargetHit'
  | 'Drain'
  | 'FlipperHit';

export interface PhysicsEvent {
  type: PhysicsEventType;
  elementId: string;
  contactPoint: Vec2;
}

export type PhysicsEventHandler = (event: PhysicsEvent) => void;

// ---------------------------------------------------------------------------
// Engine state
// ---------------------------------------------------------------------------
export interface PhysicsEngineState {
  ball:     BallState;
  flippers: FlipperState[];
  bumperActiveUntil: Map<string, number>; // id -> timestamp ms
}

export class PhysicsEngine {
  private state: PhysicsEngineState;
  private walls: Segment[];
  private eventHandlers: PhysicsEventHandler[] = [];
  private timeMs = 0;

  constructor() {
    const cfg = TABLE_CONFIG;

    this.state = {
      ball: createBall(cfg.plungerLane.x, cfg.plungerLane.topY - 20, cfg.ballRadius),
      flippers: cfg.flippers.map(f =>
        createFlipper(f.side, f.pivot, f.length, f.angleRest, f.angleActive)
      ),
      bumperActiveUntil: new Map(),
    };

    this.walls = cfg.walls;
  }

  on(handler: PhysicsEventHandler): void {
    this.eventHandlers.push(handler);
  }

  off(handler: PhysicsEventHandler): void {
    this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
  }

  getState(): Readonly<PhysicsEngineState> {
    return this.state;
  }

  getBallRenderPos(alpha: number): Vec2 {
    return interpolatedPos(this.state.ball, alpha);
  }

  setFlipperPressed(side: 'left' | 'right', pressed: boolean): void {
    for (const flipper of this.state.flippers) {
      if (flipper.side === side) {
        flipper.pressed = pressed;
      }
    }
  }

  /** Launch ball from plunger lane with given charge (0..1) */
  launchBall(charge: number): void {
    const PLUNGER_MAX_SPEED = 1200; // px/s at full charge (synced with config/physics.ts)
    this.state.ball.vel = { x: 0, y: -(charge * PLUNGER_MAX_SPEED) };
  }

  /** Reset ball to plunger position */
  resetBall(): void {
    const cfg = TABLE_CONFIG;
    this.state.ball = createBall(
      cfg.plungerLane.x,
      cfg.plungerLane.topY - 20,
      cfg.ballRadius,
    );
  }

  /**
   * Advance physics by one fixed step (PHYSICS_STEP ms = 8.33ms at 120Hz).
   * Returns list of events emitted this step.
   */
  step(dtMs: number): PhysicsEvent[] {
    const dt = dtMs / 1000; // convert to seconds
    this.timeMs += dtMs;

    const events: PhysicsEvent[] = [];
    const { ball } = this.state;

    // 1. Update flippers
    for (const flipper of this.state.flippers) {
      updateFlipper(flipper, dt);
    }

    // 2. Integrate ball
    integrateBall(ball, dt, GRAVITY);

    // 3. Apply friction
    applyFriction(ball, FRICTION);

    // 4. Resolve wall collisions
    for (const wall of this.walls) {
      const result = circleVsSegment({ center: ball.pos, radius: ball.radius }, wall);
      if (result.hit) {
        ball.pos = separateBall(ball.pos, result.normal, result.penetration);
        ball.vel = resolveCollision(ball.vel, result.normal, BALL_ELASTICITY);
      }
    }

    // 5. Resolve flipper collisions
    for (const flipper of this.state.flippers) {
      const hit = resolveFlipperCollision(ball, flipper, BALL_ELASTICITY, dt);
      if (hit) {
        events.push({ type: 'FlipperHit', elementId: flipper.side, contactPoint: ball.pos });
      }
    }

    // 6. Resolve bumper collisions
    for (const bumper of TABLE_CONFIG.bumpers) {
      const circle: Circle = { center: bumper.center, radius: bumper.radius };
      const result = circleVsCircle({ center: ball.pos, radius: ball.radius }, circle);
      if (result.hit) {
        // Separate ball from bumper surface
        ball.pos = separateBall(ball.pos, result.normal, result.penetration);
        // Eject ball at BUMPER_EJECTION_SPEED
        ball.vel = scale(result.normal, -BUMPER_EJECTION_SPEED);
        this.state.bumperActiveUntil.set(bumper.id, this.timeMs + 100);
        events.push({ type: 'BumperHit', elementId: bumper.id, contactPoint: result.contactPoint });
      }
    }

    // 7. Resolve slingshot collisions
    for (const sling of TABLE_CONFIG.slingshots) {
      const poly = { vertices: sling.vertices };
      for (const seg of polygonToSegments(poly)) {
        const result = circleVsSegment({ center: ball.pos, radius: ball.radius }, seg);
        if (result.hit) {
          ball.pos = separateBall(ball.pos, result.normal, result.penetration);
          // Slingshots reflect with extra speed
          const reflected = resolveCollision(ball.vel, result.normal, BALL_ELASTICITY * 1.5);
          ball.vel = reflected;
          events.push({ type: 'SlingHit', elementId: sling.id, contactPoint: result.contactPoint });
          break; // one sling collision per step
        }
      }
    }

    // 8. Resolve target collisions
    for (const target of TABLE_CONFIG.targets) {
      const targetRect: Segment[] = [
        { start: target.position, end: { x: target.position.x + target.width, y: target.position.y } },
        { start: { x: target.position.x + target.width, y: target.position.y },
          end:   { x: target.position.x + target.width, y: target.position.y + target.height } },
        { start: { x: target.position.x + target.width, y: target.position.y + target.height },
          end:   { x: target.position.x,                y: target.position.y + target.height } },
        { start: { x: target.position.x, y: target.position.y + target.height },
          end:   target.position },
      ];
      for (const seg of targetRect) {
        const result = circleVsSegment({ center: ball.pos, radius: ball.radius }, seg);
        if (result.hit) {
          ball.pos = separateBall(ball.pos, result.normal, result.penetration);
          ball.vel = resolveCollision(ball.vel, result.normal, BALL_ELASTICITY * 0.8);
          events.push({ type: 'TargetHit', elementId: target.id, contactPoint: result.contactPoint });
          break;
        }
      }
    }

    // 9. Check drain
    if (ball.pos.y >= TABLE_CONFIG.drainY) {
      events.push({ type: 'Drain', elementId: 'drain', contactPoint: ball.pos });
    }

    // 10. Emit events
    for (const event of events) {
      for (const handler of this.eventHandlers) {
        handler(event);
      }
    }

    return events;
  }

  /** Is bumper in its brief "lit" state after being hit? */
  isBumperActive(id: string): boolean {
    const until = this.state.bumperActiveUntil.get(id);
    return until !== undefined && this.timeMs < until;
  }
}
