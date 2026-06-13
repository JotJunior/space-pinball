import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../../src/physics/PhysicsEngine.js';
import { TABLE_CONFIG } from '../../src/config/table.js';

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

  it('plunger only launches when the ball is in the lane, not from mid-playfield (regression)', () => {
    // Bug: segurar/soltar Espaço arremessava a bola para cima de QUALQUER
    // posição. O plunger só deve agir com a bola na lane.
    const engine = new PhysicsEngine();
    const state = engine.getState();

    // Bola em pleno jogo (centro do campo)
    state.ball.pos = { x: 300, y: 400 };
    state.ball.vel = { x: 0, y: 0 };
    expect(engine.isBallInPlungerLane()).toBe(false);

    // Carregar não deve acumular carga fora da lane
    engine.startChargePlunger();
    for (let i = 0; i < 30; i++) engine.step(8.33);
    expect(engine.getPlungerCharge()).toBe(0);

    // Arremessar fora da lane não muda a velocidade (sem empurrão pra cima)
    state.ball.pos = { x: 300, y: 400 };
    state.ball.vel = { x: 5, y: 5 };
    engine.launchBall(1.0);
    expect(state.ball.vel).toEqual({ x: 5, y: 5 });

    // Na lane, o plunger funciona normalmente
    engine.resetBall();
    expect(engine.isBallInPlungerLane()).toBe(true);
    engine.launchBall(1.0);
    expect(engine.getState().ball.vel.y).toBeLessThan(0);
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

  it('ejects the ball away from a bumper instead of trapping it (regression)', () => {
    // Bug: a bola encostava no bumper e ficava grudada, com BumperHit
    // disparando a cada step (loop sonoro + pontuação infinita).
    const engine = new PhysicsEngine();
    const events: string[] = [];
    engine.on((e) => events.push(e.type));

    const state = engine.getState();
    state.ball.pos = { x: 300, y: 155 }; // bumper-center (300,180), r=25, ball r=12
    state.ball.vel = { x: 0, y: 100 };
    state.ball.prevPos = { ...state.ball.pos };

    // ~0.4s de simulação — tempo de sobra para um loop infinito se manifestar
    for (let i = 0; i < 48; i++) engine.step(8.33);

    const bumperHits = events.filter((e) => e === 'BumperHit').length;
    // Um único contato físico => no máximo um punhado de eventos, jamais dezenas
    expect(bumperHits).toBeGreaterThanOrEqual(1);
    expect(bumperHits).toBeLessThanOrEqual(3);

    // A bola foi repelida para LONGE do bumper (não ficou grudada na superfície)
    const dist = Math.hypot(state.ball.pos.x - 300, state.ball.pos.y - 180);
    expect(dist).toBeGreaterThan(25 + 12); // fora do raio de contato
  });

  it('debounces repeated contact events while the ball rests against a bumper', () => {
    const engine = new PhysicsEngine();
    const events: string[] = [];
    engine.on((e) => events.push(e.type));

    const state = engine.getState();
    // Trava a bola sobre o bumper a cada step para forçar contato contínuo:
    // mesmo assim os eventos devem ser limitados pelo cooldown.
    for (let i = 0; i < 50; i++) {
      state.ball.pos = { x: 300, y: 168 }; // penetrando o bumper
      state.ball.vel = { x: 0, y: 0 };
      state.ball.prevPos = { ...state.ball.pos };
      engine.step(8.33);
    }
    const bumperHits = events.filter((e) => e === 'BumperHit').length;
    // 50 steps * 8.33ms = ~417ms / 100ms de cooldown => ~4-5 eventos, não 50+
    expect(bumperHits).toBeLessThanOrEqual(6);
  });

  it('hyperspace exit always launches the ball upward, never straight into the drain (regression)', () => {
    // Bug: a saída do hyperspace devolvia a bola com vel (0,+300) — caía reta
    // no dreno, fora do alcance dos flippers. Agora deve subir (vel.y < 0).
    const hyper = TABLE_CONFIG.hyperspaceChute;
    for (let trial = 0; trial < 50; trial++) {
      const engine = new PhysicsEngine();
      const state = engine.getState();
      // Coloca a bola SOBRE o disco do buraco negro, praticamente parada.
      state.ball.pos = { ...hyper.center };
      state.ball.vel = { x: 0, y: 0 };
      state.ball.prevPos = { ...state.ball.pos };

      const events = engine.step(8.33).map((e) => e.type);
      expect(events).toContain('HyperspaceUsed');

      // Velocidade resultante deve apontar para CIMA (y negativo) e ter módulo
      // significativo (não cair reto).
      expect(state.ball.vel.y).toBeLessThan(0);
      const speed = Math.hypot(state.ball.vel.x, state.ball.vel.y);
      expect(speed).toBeGreaterThan(300);
    }
  });

  it('no invisible teleporter on the left side (old ramp AABB removed) (regression)', () => {
    // Bug: um AABB invisível em (60-140, 400-460) teleportava a bola para o
    // topo ("comportamento de buraco negro" sem elemento visível). Agora a bola
    // ali deve seguir a física normal, sem RampCompleted nem teleporte.
    const engine = new PhysicsEngine();
    const events: string[] = [];
    engine.on((e) => events.push(e.type));
    const state = engine.getState();
    state.ball.pos = { x: 100, y: 430 };
    state.ball.vel = { x: -20, y: 50 };
    state.ball.prevPos = { x: 100, y: 430 };

    engine.step(8.33);

    expect(events).not.toContain('RampCompleted');
    // não teleportou para o topo (300,80)
    expect(state.ball.pos.y).toBeGreaterThan(300);
    expect(Math.abs(state.ball.pos.x - 300)).toBeGreaterThan(50);
  });

  it('hyperspace only triggers on contact with the black hole, not from the launch lane (regression)', () => {
    // Bug: a bola subindo pela lane do plunger (x=540) cruzava a antiga AABB
    // ampla e ativava o hyperspace em todo lançamento. Agora o gatilho é o
    // disco do buraco negro (center=475), longe da lane.
    const hyper = TABLE_CONFIG.hyperspaceChute;

    const engine = new PhysicsEngine();
    const events: string[] = [];
    engine.on((e) => events.push(e.type));
    const state = engine.getState();

    // Bola subindo na lane (x=540) na altura do buraco — NÃO deve ativar
    state.ball.pos = { x: 540, y: hyper.center.y };
    state.ball.vel = { x: 0, y: -600 };
    state.ball.prevPos = { x: 540, y: hyper.center.y + 8 };
    engine.step(8.33);
    expect(events).not.toContain('HyperspaceUsed');

    // Bola SOBRE o disco — deve ativar
    state.ball.pos = { ...hyper.center };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.prevPos = { ...hyper.center };
    const evts2 = engine.step(8.33).map((e) => e.type);
    expect(evts2).toContain('HyperspaceUsed');
  });

  it('exposes hyperspace exit flash progress 0..1 (drives the portal animation)', () => {
    const engine = new PhysicsEngine();
    const state = engine.getState();
    state.ball.pos = { ...TABLE_CONFIG.hyperspaceChute.center }; // sobre o buraco negro
    state.ball.vel = { x: 0, y: 0 };
    state.ball.prevPos = { ...TABLE_CONFIG.hyperspaceChute.center };

    engine.step(8.33); // dispara o hyperspace
    expect(engine.isHyperspaceExitFlashing()).toBe(true);
    expect(engine.getHyperspaceExitFlashProgress()).toBeLessThan(0.1); // recém-aberto

    for (let i = 0; i < 72; i++) engine.step(8.33); // ~600ms
    expect(engine.getHyperspaceExitFlashProgress()).toBeCloseTo(1, 1);
  });

  it('auto-ejects the ball upward from both bottom-corner kicker pockets (regression)', () => {
    // Bug: a bola caía na cova em V do fundo de cada gutter ((140,850) e
    // (460,850)), ficava presa acima do dreno e exigia o lançador. Agora o
    // kicker deve repeli-la para cima automaticamente ao tocar.
    for (const [id, pos] of [
      ['kicker-left',  { x: 140, y: 845 }],
      ['kicker-right', { x: 460, y: 845 }],
    ] as const) {
      const engine = new PhysicsEngine();
      const events: { type: string; id: string }[] = [];
      engine.on((e) => events.push({ type: e.type, id: e.elementId }));

      const state = engine.getState();
      state.ball.pos = { ...pos };
      state.ball.vel = { x: 0, y: 0 }; // parada na cova
      state.ball.prevPos = { ...pos };

      engine.step(8.33);

      // Disparou o kickback correto e a bola foi lançada PARA CIMA
      expect(events.some((e) => e.type === 'KickbackUsed' && e.id === id)).toBe(true);
      expect(state.ball.vel.y).toBeLessThan(0);
      expect(engine.isKickerActive(id)).toBe(true);
    }
  });

  it('kicker frees a wedged ball back into play within a few steps', () => {
    const engine = new PhysicsEngine();
    const state = engine.getState();
    state.ball.pos = { x: 140, y: 845 };
    state.ball.vel = { x: 0, y: 0 };
    state.ball.prevPos = { x: 140, y: 845 };

    for (let i = 0; i < 30; i++) engine.step(8.33);

    // A bola subiu para fora da cova (acima da zona do kicker) e não drenou (875)
    expect(state.ball.pos.y).toBeLessThan(818);
  });

  it('drop-target arc: knocks plates down, completes the bank and resets them', () => {
    const engine = new PhysicsEngine();
    const events: { type: string; id: string }[] = [];
    engine.on((e) => events.push({ type: e.type, id: e.elementId }));

    const plates = TABLE_CONFIG.dropTargetBank.targets;
    expect(plates.length).toBe(6);
    const state = engine.getState();

    for (const plate of plates) {
      // posiciona a bola sobreposta à plaquinha, vindo do lado do jogo (normal)
      state.ball.pos = {
        x: plate.center.x + plate.normal.x * (state.ball.radius - 2),
        y: plate.center.y + plate.normal.y * (state.ball.radius - 2),
      };
      state.ball.vel = { x: -plate.normal.x * 20, y: -plate.normal.y * 20 };
      state.ball.prevPos = { ...state.ball.pos };
      engine.step(8.33);
    }

    const hits = events.filter((e) => e.type === 'DropTargetHit');
    expect(hits.length).toBe(6);
    expect(events.some((e) => e.type === 'DropTargetBankComplete')).toBe(true);
    // após o bônus, todas voltam ao estado original (em pé)
    for (const plate of plates) {
      expect(engine.isDropTargetDown(plate.id)).toBe(false);
    }
  });

  it('drop target stops colliding once knocked down (until bank reset)', () => {
    const engine = new PhysicsEngine();
    let hits = 0;
    engine.on((e) => { if (e.type === 'DropTargetHit') hits++; });
    const plate = TABLE_CONFIG.dropTargetBank.targets[0]!;
    const state = engine.getState();
    const place = () => {
      state.ball.pos = {
        x: plate.center.x + plate.normal.x * (state.ball.radius - 2),
        y: plate.center.y + plate.normal.y * (state.ball.radius - 2),
      };
      state.ball.vel = { x: -plate.normal.x * 20, y: -plate.normal.y * 20 };
      state.ball.prevPos = { ...state.ball.pos };
    };
    place(); engine.step(8.33);
    place(); engine.step(8.33); // segunda passagem: já derrubada, não conta de novo
    expect(hits).toBe(1);
    expect(engine.isDropTargetDown(plate.id)).toBe(true);
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

  // Regressao: bola em repouso na plunger lane NAO pode drenar nem escapar da lane
  // (bug: gutter direito cruzava a lane e a lane nao tinha piso — 3 drenos instantaneos)
  it('ball at rest in plunger lane never drains nor leaves the lane (3s idle)', () => {
    const engine = new PhysicsEngine();
    const drains: string[] = [];
    engine.on((e: { type: string }) => {
      if (e.type === 'Drain') drains.push(e.type);
    });

    // ~3 segundos a 120Hz, sem nenhum input
    for (let i = 0; i < 360; i++) {
      engine.step(8.33);
    }

    const ball = engine.getState().ball;
    expect(drains.length).toBe(0);
    // Bola permanece dentro da lane (entre a parede interna x=520 e a externa x=560)
    expect(ball.pos.x).toBeGreaterThan(520);
    expect(ball.pos.x).toBeLessThan(560);
    // E acima do drainY
    expect(ball.pos.y).toBeLessThan(875);
  });

  it('launched ball exits the plunger lane upward into the playfield', () => {
    const engine = new PhysicsEngine();
    // Deixa a bola assentar no piso da lane
    for (let i = 0; i < 240; i++) engine.step(8.33);
    engine.launchBall(1);
    let minY = engine.getState().ball.pos.y;
    let minX = engine.getState().ball.pos.x;
    for (let i = 0; i < 240; i++) {
      engine.step(8.33);
      minY = Math.min(minY, engine.getState().ball.pos.y);
      minX = Math.min(minX, engine.getState().ball.pos.x);
    }
    // Com carga maxima a bola deve subir bem acima do topo da lane (y=780)
    expect(minY).toBeLessThan(700);
    // E o defletor do canto superior direito deve joga-la PARA DENTRO do
    // playfield (x < 500), nao deixa-la cair de volta no corredor da lane
    expect(minX).toBeLessThan(500);
  });

  // Regressao: a ponta do flipper em repouso ficava ABAIXO do drainY — bola
  // rolando ate a ponta "vazava" atraves do flipper
  it('flipper tips at rest keep a resting ball above the drain line', () => {
    const engine = new PhysicsEngine();
    const { flippers, ball } = engine.getState();
    for (const f of flippers) {
      const tipY = f.pivot.y + Math.sin(f.angle) * f.length;
      // Centro da bola apoiada na ponta = tipY - radius; precisa de folga ao drain
      expect(tipY - ball.radius).toBeLessThan(870);
    }
  });

  // Regressao: bola flipada a alta velocidade atravessava paredes laterais
  // (tunneling — sem sub-stepping nem clamp de velocidade)
  it('high-speed ball never escapes the table bounds nor exceeds max speed', () => {
    const engine = new PhysicsEngine();
    const state = engine.getState();
    // Bola na area dos flippers com velocidade absurda (como uma flipada de ponta)
    state.ball.pos = { x: 300, y: 800 };
    state.ball.prevPos = { x: 300, y: 800 };
    state.ball.vel = { x: 4800, y: -2400 };

    for (let i = 0; i < 360; i++) {
      engine.step(8.33);
      const b = engine.getState().ball;
      // Nunca fora do tabuleiro (600x900, com tolerancia do raio)
      expect(b.pos.x).toBeGreaterThan(0);
      expect(b.pos.x).toBeLessThan(600);
      expect(b.pos.y).toBeGreaterThan(-20);
      // Velocidade respeita o teto
      expect(Math.hypot(b.vel.x, b.vel.y)).toBeLessThanOrEqual(2200 + 1);
      if (b.pos.y >= 875) break; // drenou — fim legitimo
    }
  });

  // Regressao: flipper em snap (~72 rad/s) "pulava" por cima da bola perto da
  // ponta — com sub-stepping o contato e detectado e a bola e rebatida
  it('pressed flipper hits a ball falling near the tip (no pass-through)', () => {
    const engine = new PhysicsEngine();
    const state = engine.getState();
    const left = state.flippers.find(f => f.side === 'left')!;
    const tipX = left.pivot.x + Math.cos(left.angleRest) * left.length;
    // Bola caindo rapido logo acima da regiao da ponta
    state.ball.pos = { x: tipX - 6, y: 800 };
    state.ball.prevPos = { ...state.ball.pos };
    state.ball.vel = { x: 0, y: 900 };

    let flipperHit = false;
    engine.on((e: { type: string }) => {
      if (e.type === 'FlipperHit') flipperHit = true;
    });

    // Pressiona o flipper no mesmo instante da queda
    engine.setFlipperPressed('left', true);
    for (let i = 0; i < 60; i++) {
      engine.step(8.33);
    }
    expect(flipperHit).toBe(true);
  });
});
