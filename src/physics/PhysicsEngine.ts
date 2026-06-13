/**
 * Complete physics engine integrating ball, flippers, bumpers, slingshots, and walls.
 * Ref: plan.md §Physics Engine Design; spec.md FR-002
 */

import { Vec2, Segment, Circle, scale, polygonToSegments } from './shapes.js';
import { BallState, createBall, integrateBall, applyFriction, interpolatedPos } from './Ball.js';
import { FlipperState, createFlipper, updateFlipper, resolveFlipperCollision } from './Flipper.js';
import { circleVsSegment, circleVsCircle, resolveCollision, separateBall } from './collision.js';
import { TABLE_CONFIG } from '../config/table.js';
import { GRAVITY, BALL_ELASTICITY, FRICTION, BUMPER_EJECTION_SPEED, PLUNGER_MAX_SPEED, MAX_BALL_SPEED, CONTACT_EVENT_COOLDOWN_MS, HYPERSPACE_EXIT_SPEED, HYPERSPACE_EXIT_SPREAD } from '../config/physics.js';

// ---------------------------------------------------------------------------
// Events emitted by the engine
// ---------------------------------------------------------------------------
export type PhysicsEventType =
  | 'BumperHit'
  | 'SlingHit'
  | 'TargetHit'
  | 'Drain'
  | 'FlipperHit'
  | 'RampCompleted'
  | 'HyperspaceUsed'
  | 'KickbackUsed'
  | 'DropTargetHit'
  | 'DropTargetBankComplete';

export interface PhysicsEvent {
  type: PhysicsEventType;
  elementId: string;
  contactPoint: Vec2;
}

export type PhysicsEventHandler = (event: PhysicsEvent) => void;

// Durações dos flashes do hyperspace (ms) — usadas para tempo de animação.
const HYPERSPACE_ENTRY_FLASH_MS = 300;
const HYPERSPACE_EXIT_FLASH_MS = 600;

// ---------------------------------------------------------------------------
// Engine state
// ---------------------------------------------------------------------------
export interface PhysicsEngineState {
  ball:     BallState;
  flippers: FlipperState[];
  bumperActiveUntil: Map<string, number>; // id -> timestamp ms
  kickerActiveUntil: Map<string, number>; // id -> timestamp ms (flash do kicker)
  droppedTargets: Set<string>; // ids das plaquinhas atualmente derrubadas
  plungerCharge: number;  // 0..1, charging while Space held
  plungerCharging: boolean;
  hyperspaceFlashUntil: number; // ms timestamp for entry flash
  hyperspaceExitFlashUntil: number; // ms timestamp for exit flash
  hyperspaceExitPos: Vec2 | null;
}

export class PhysicsEngine {
  private state: PhysicsEngineState;
  private walls: Segment[];
  private eventHandlers: PhysicsEventHandler[] = [];
  private timeMs = 0;
  // elementId -> timestamp (ms) até o qual novos eventos de contato são
  // suprimidos. A física (separação/ejeção) continua a cada sub-step; apenas
  // o evento de pontuação/som é debounced. Ver CONTACT_EVENT_COOLDOWN_MS.
  private contactCooldownUntil = new Map<string, number>();

  constructor() {
    const cfg = TABLE_CONFIG;

    this.state = {
      ball: createBall(cfg.plungerLane.x, cfg.plungerLane.topY - 20, cfg.ballRadius),
      flippers: cfg.flippers.map(f =>
        createFlipper(f.side, f.pivot, f.length, f.angleRest, f.angleActive)
      ),
      bumperActiveUntil: new Map(),
      kickerActiveUntil: new Map(),
      droppedTargets: new Set(),
      plungerCharge: 0,
      plungerCharging: false,
      hyperspaceFlashUntil: 0,
      hyperspaceExitFlashUntil: 0,
      hyperspaceExitPos: null,
    };

    this.walls = cfg.walls;
  }

  /**
   * Retorna true (e arma o cooldown) somente se este elemento puder disparar
   * um novo evento de contato agora. Enquanto a bola permanece encostada, os
   * sub-steps seguintes retornam false — sem spam de eventos.
   */
  private tryFireContact(id: string): boolean {
    const until = this.contactCooldownUntil.get(id) ?? 0;
    if (this.timeMs < until) return false;
    this.contactCooldownUntil.set(id, this.timeMs + CONTACT_EVENT_COOLDOWN_MS);
    return true;
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

  /**
   * A bola está repousando na lane do plunger? O plunger só carrega/arremessa
   * quando ela está lá — caso contrário a bola seria lançada para cima de
   * qualquer posição do campo ao segurar/soltar Espaço.
   */
  isBallInPlungerLane(): boolean {
    const b = this.state.ball.pos;
    // Corredor da lane: x ∈ [520,560] (paredes), y abaixo do campo (>= 780)
    return b.x >= 520 && b.x <= 560 && b.y >= 780;
  }

  /** Launch ball from plunger lane with given charge (0..1) */
  launchBall(charge: number): void {
    // Só arremessa se a bola estiver na lane; senão apenas zera o estado.
    if (this.isBallInPlungerLane()) {
      this.state.ball.vel = { x: 0, y: -(charge * PLUNGER_MAX_SPEED) };
    }
    this.state.plungerCharge = 0;
    this.state.plungerCharging = false;
  }

  /** Start charging the plunger (called while Space is held) */
  startChargePlunger(): void {
    // Só carrega com a bola na lane — impede "lançar" a bola em pleno jogo.
    if (!this.isBallInPlungerLane()) return;
    this.state.plungerCharging = true;
  }

  /** Stop charging and launch the ball */
  releasePlunger(): void {
    if (this.state.plungerCharging) {
      this.launchBall(this.state.plungerCharge);
    }
  }

  /** Get current plunger charge (0..1) */
  getPlungerCharge(): number {
    return this.state.plungerCharge;
  }

  /** Reset ball to plunger position */
  resetBall(): void {
    const cfg = TABLE_CONFIG;
    this.state.ball = createBall(
      cfg.plungerLane.x,
      cfg.plungerLane.topY - 20,
      cfg.ballRadius,
    );
    this.state.plungerCharge = 0;
    this.state.plungerCharging = false;
    this.contactCooldownUntil.clear();
    this.state.droppedTargets.clear();
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

    // 0. Update plunger charge
    const PLUNGER_CHARGE_RATE = 0.8; // 0..1 in ~1.25s
    if (this.state.plungerCharging) {
      this.state.plungerCharge = Math.min(1, this.state.plungerCharge + PLUNGER_CHARGE_RATE * dt);
    }

    // Sub-stepping anti-tunneling: limita o deslocamento da bola (~6px) e a
    // varredura angular do flipper por sub-iteracao. Sem isso, a 120Hz a bola
    // rapida atravessa paredes-segmento e o flipper em snap (~72 rad/s)
    // "pula" por cima da bola perto da ponta.
    let substeps = Math.min(8, Math.max(2, Math.ceil((Math.hypot(ball.vel.x, ball.vel.y) * dt) / 6)));
    for (const f of this.state.flippers) {
      const target = f.pressed ? f.angleActive : f.angleRest;
      if (Math.abs(target - f.angle) > 0.05) {
        substeps = Math.max(substeps, 6);
        break;
      }
    }
    const sdt = dt / substeps;
    const stepStartPos = { x: ball.pos.x, y: ball.pos.y };
    // Reset do banco de plaquinhas é adiado para o FIM do passo: se feito no
    // meio dos sub-steps, a bola ainda sobreposta re-atingiria a plaquinha
    // recém-reerguida (contagem dupla).
    let resetDropBank = false;

    for (let s = 0; s < substeps; s++) {
      // 1. Update flippers
      for (const flipper of this.state.flippers) {
        updateFlipper(flipper, sdt);
      }

      // 2. Integrate ball
      integrateBall(ball, sdt, GRAVITY);

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
        const hit = resolveFlipperCollision(ball, flipper, BALL_ELASTICITY, sdt);
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
          // Ejeta a bola PARA FORA do bumper. `result.normal` aponta do centro
          // do bumper para a bola (para fora), então a ejeção usa +speed. Com
          // -speed a bola era empurrada PARA DENTRO e ficava grudada.
          ball.vel = scale(result.normal, BUMPER_EJECTION_SPEED);
          this.state.bumperActiveUntil.set(bumper.id, this.timeMs + 100);
          if (this.tryFireContact(bumper.id)) {
            events.push({ type: 'BumperHit', elementId: bumper.id, contactPoint: result.contactPoint });
          }
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
            if (this.tryFireContact(sling.id)) {
              events.push({ type: 'SlingHit', elementId: sling.id, contactPoint: result.contactPoint });
            }
            break; // one sling collision per substep
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
            if (this.tryFireContact(target.id)) {
              events.push({ type: 'TargetHit', elementId: target.id, contactPoint: result.contactPoint });
            }
            break;
          }
        }
      }

      // 8b. Banco de plaquinhas (drop targets) em arco superior-esquerdo
      const bank = TABLE_CONFIG.dropTargetBank;
      for (const plate of bank.targets) {
        if (this.state.droppedTargets.has(plate.id)) continue; // já derrubada: sem colisão
        const tang = { x: -plate.normal.y, y: plate.normal.x };
        const seg: Segment = {
          start: { x: plate.center.x + tang.x * plate.halfWidth, y: plate.center.y + tang.y * plate.halfWidth },
          end:   { x: plate.center.x - tang.x * plate.halfWidth, y: plate.center.y - tang.y * plate.halfWidth },
        };
        const result = circleVsSegment({ center: ball.pos, radius: ball.radius }, seg);
        if (result.hit) {
          ball.pos = separateBall(ball.pos, result.normal, result.penetration);
          ball.vel = resolveCollision(ball.vel, result.normal, BALL_ELASTICITY * 0.5);
          this.state.droppedTargets.add(plate.id);
          events.push({ type: 'DropTargetHit', elementId: plate.id, contactPoint: result.contactPoint });
          if (this.state.droppedTargets.size >= bank.targets.length && !resetDropBank) {
            // Todas derrubadas: bônus agora; reset adiado para o fim do passo
            events.push({ type: 'DropTargetBankComplete', elementId: bank.id, contactPoint: { ...ball.pos } });
            resetDropBank = true;
          }
        }
      }

      // Clamp de velocidade: pos-colisoes (flipper pode injetar >6000 px/s na
      // ponta; acima de MAX_BALL_SPEED voltaria a haver risco de tunneling)
      const sp = Math.hypot(ball.vel.x, ball.vel.y);
      if (sp > MAX_BALL_SPEED) {
        ball.vel = scale(ball.vel, MAX_BALL_SPEED / sp);
      }
    }

    // Reset adiado do banco de plaquinhas (ver declaração de resetDropBank)
    if (resetDropBank) this.state.droppedTargets.clear();

    // prevPos deve cobrir o passo COMPLETO (interpolacao de render usa
    // prevPos->pos do passo inteiro, nao do ultimo sub-step)
    ball.prevPos = stepStartPos;

    // 3. Apply friction (uma vez por passo completo, como antes do sub-stepping)
    applyFriction(ball, FRICTION);

    // 9a. Check ramp entry
    for (const ramp of TABLE_CONFIG.ramps) {
      const { x, y, w, h } = ramp.entryAABB;
      if (ball.pos.x >= x && ball.pos.x <= x + w &&
          ball.pos.y >= y && ball.pos.y <= y + h) {
        // Teleport ball to ramp exit
        ball.pos = { ...ramp.exitPos };
        ball.prevPos = { ...ramp.exitPos };
        ball.vel = { ...ramp.exitVel };
        events.push({ type: 'RampCompleted', elementId: ramp.id, contactPoint: ramp.exitPos });
      }
    }

    // 9b. Hyperspace: só dispara ao ENCOSTAR no disco do buraco negro
    // (círculo-vs-círculo), não numa zona ampla. Isso impede a ativação
    // espúria pela bola subindo na lane do plunger.
    const hyper = TABLE_CONFIG.hyperspaceChute;
    const dxh = ball.pos.x - hyper.center.x;
    const dyh = ball.pos.y - hyper.center.y;
    const hyperReach = hyper.radius + ball.radius;
    if (dxh * dxh + dyh * dyh <= hyperReach * hyperReach) {
      // Pick random exit
      const exitIdx = Math.floor(Math.random() * hyper.exitOptions.length);
      const exitPos = hyper.exitOptions[exitIdx]!;
      this.state.hyperspaceFlashUntil = this.timeMs + HYPERSPACE_ENTRY_FLASH_MS;
      this.state.hyperspaceExitFlashUntil = this.timeMs + HYPERSPACE_EXIT_FLASH_MS;
      this.state.hyperspaceExitPos = exitPos;
      ball.pos = { ...exitPos };
      ball.prevPos = { ...exitPos };
      // Relança a bola PARA CIMA num ângulo aleatório (cone em torno de
      // -90°). Antes saía reto para baixo (y:+300), caindo no dreno entre os
      // flippers — agora sobe e volta jogável.
      const angle = -Math.PI / 2 + (Math.random() * 2 - 1) * HYPERSPACE_EXIT_SPREAD;
      ball.vel = {
        x: Math.cos(angle) * HYPERSPACE_EXIT_SPEED,
        y: Math.sin(angle) * HYPERSPACE_EXIT_SPEED,
      };
      events.push({ type: 'HyperspaceUsed', elementId: hyper.id, contactPoint: exitPos });
    }

    // 8c. Kickers das covas inferiores: relança a bola PARA CIMA quando ela
    // entra na zona (antes do dreno, para resgatá-la da cova onde ficava
    // presa). A velocidade é re-aplicada a cada step enquanto estiver na zona,
    // garantindo a saída; o EVENTO é limitado pelo cooldown (sem spam).
    for (const kicker of TABLE_CONFIG.kickers) {
      const { x, y, w, h } = kicker.triggerAABB;
      if (ball.pos.x >= x && ball.pos.x <= x + w &&
          ball.pos.y >= y && ball.pos.y <= y + h) {
        ball.vel = { ...kicker.ejectVel };
        this.state.kickerActiveUntil.set(kicker.id, this.timeMs + 150);
        if (this.tryFireContact(kicker.id)) {
          events.push({ type: 'KickbackUsed', elementId: kicker.id, contactPoint: { ...ball.pos } });
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

  /** Kicker em estado "disparando" (flash) logo após repelir a bola? */
  isKickerActive(id: string): boolean {
    const until = this.state.kickerActiveUntil.get(id);
    return until !== undefined && this.timeMs < until;
  }

  /** A plaquinha (drop target) está derrubada? */
  isDropTargetDown(id: string): boolean {
    return this.state.droppedTargets.has(id);
  }

  /** Is hyperspace entry flashing? */
  isHyperspaceEntryFlashing(): boolean {
    return this.timeMs < this.state.hyperspaceFlashUntil;
  }

  /** Is hyperspace exit flashing? */
  isHyperspaceExitFlashing(): boolean {
    return this.timeMs < this.state.hyperspaceExitFlashUntil;
  }

  /** Progresso 0..1 do flash de saída (para animar o portal abrindo/fechando). */
  getHyperspaceExitFlashProgress(): number {
    const remaining = this.state.hyperspaceExitFlashUntil - this.timeMs;
    const p = 1 - remaining / HYPERSPACE_EXIT_FLASH_MS;
    return Math.max(0, Math.min(1, p));
  }

  /** Last hyperspace exit position (for rendering flash) */
  getHyperspaceExitPos(): Vec2 | null {
    return this.state.hyperspaceExitPos;
  }
}
