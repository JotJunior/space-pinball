/**
 * Declarative geometry of the Space Cadet Pinball table.
 * Coordinate system: (0,0) top-left, x increases right, y increases down.
 * Table logical dimensions: 600 x 900 px.
 * Positions are approximate — calibrate against screenshots in FASE 7 (task 7.5.2).
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface BumperConfig {
  id: string;
  center: Vec2;
  radius: number;
  scoreValue: number;
}

export interface SlingConfig {
  id: string;
  vertices: Vec2[];
  scoreValue: number;
}

export interface FlipperConfig {
  id: string;
  side: 'left' | 'right';
  pivot: Vec2;
  length: number;
  angleRest: number;    // radians, resting position
  angleActive: number;  // radians, pressed position
}

export interface TargetConfig {
  id: string;
  position: Vec2;
  width: number;
  height: number;
  scoreValue: number;
}

export interface RampConfig {
  id: string;
  entryAABB: { x: number; y: number; w: number; h: number };
  exitPos: Vec2;
  exitVel: Vec2;
  scoreValue: number;
}

export interface HyperspaceConfig {
  id: string;
  center: Vec2;   // centro do buraco negro — gatilho CIRCULAR (== disco visível)
  radius: number; // raio do disco de contato
  exitOptions: Vec2[];
  scoreValue: number;
}

/**
 * Kicker (kickback) das saídas inferiores. A bola que cai na "cova" em V no
 * fundo de cada gutter (onde a parede do gutter encontra a guia da inlane e o
 * divisor do dreno) ficava presa acima do dreno. Estes kickers detectam a bola
 * na zona e a relançam PARA CIMA automaticamente, em vez de exigir o lançador.
 */
export interface KickerConfig {
  id: string;
  triggerAABB: { x: number; y: number; w: number; h: number };
  ejectVel: Vec2;
  apex: Vec2; // ponto da cova (para renderização do obstáculo visível)
}

/**
 * Banco de "plaquinhas" (drop targets) dispostas em meio-arco no canto
 * superior-esquerdo, acompanhando a curva desenhada na mesa. Cada plaquinha é
 * derrubada quando atingida; ao derrubar todas, o jogador ganha um bônus e
 * elas voltam ao estado original.
 */
export interface DropTargetConfig {
  id: string;
  center: Vec2;
  normal: Vec2;     // unitário, aponta para o lado de onde a bola vem (centro do arco)
  halfWidth: number;
}

export interface DropTargetBankConfig {
  id: string;
  center: Vec2;     // centro do arco (referência/render)
  radius: number;
  targets: DropTargetConfig[];
}

/**
 * Converte uma polilinha (lista de pontos) em segmentos de parede consecutivos.
 * Usado para que as barreiras laterais ACOMPANHEM as curvas pintadas na mesa
 * (arco superior, laterais arredondadas, trilho/swoosh do plunger) em vez de
 * usar paredes retas que a bola "atravessava" visualmente nas curvas.
 */
function wallChain(points: Vec2[]): Array<{ start: Vec2; end: Vec2 }> {
  const out: Array<{ start: Vec2; end: Vec2 }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    out.push({ start: points[i]!, end: points[i + 1]! });
  }
  return out;
}

/** Gera N plaquinhas igualmente espaçadas ao longo de um arco. */
function buildArcDropTargets(
  center: Vec2,
  radius: number,
  startDeg: number,
  endDeg: number,
  count: number,
  halfWidth: number,
): DropTargetConfig[] {
  const out: DropTargetConfig[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const rad = ((startDeg + (endDeg - startDeg) * t) * Math.PI) / 180;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    out.push({
      id: `drop-${i + 1}`,
      center: { x: center.x + dir.x * radius, y: center.y + dir.y * radius },
      normal: { x: -dir.x, y: -dir.y }, // face voltada ao centro do arco (lado do jogo)
      halfWidth,
    });
  }
  return out;
}

export interface TableConfig {
  width: number;
  height: number;
  ballRadius: number;
  drainY: number;
  plungerLane: { x: number; topY: number; bottomY: number };
  bumpers: BumperConfig[];
  slingshots: SlingConfig[];
  flippers: FlipperConfig[];
  targets: TargetConfig[];
  walls: Array<{ start: Vec2; end: Vec2 }>;
  ramps: RampConfig[];
  hyperspaceChute: HyperspaceConfig;
  kickers: KickerConfig[];
  dropTargetBank: DropTargetBankConfig;
}

export const TABLE_CONFIG: TableConfig = {
  width: 600,
  height: 900,
  ballRadius: 12,
  drainY: 875,
  plungerLane: { x: 540, topY: 820, bottomY: 870 },

  bumpers: [
    { id: 'bumper-center',      center: { x: 300, y: 180 }, radius: 25, scoreValue: 100 },
    { id: 'bumper-left',        center: { x: 230, y: 240 }, radius: 25, scoreValue: 100 },
    { id: 'bumper-right',       center: { x: 370, y: 240 }, radius: 25, scoreValue: 100 },
  ],

  slingshots: [
    {
      id: 'sling-left',
      vertices: [{ x: 100, y: 580 }, { x: 160, y: 640 }, { x: 100, y: 700 }],
      scoreValue: 50,
    },
    {
      id: 'sling-right',
      vertices: [{ x: 500, y: 580 }, { x: 440, y: 640 }, { x: 500, y: 700 }],
      scoreValue: 50,
    },
  ],

  // Pivos em y=810 e repouso a 27°: a PONTA em repouso fica em y~864.5 — a
  // bola apoiada nela (centro ~852) permanece ACIMA do drainY=875. Com o
  // antigo 36°/y=820 a ponta caia em y~890 e a bola "vazava" pelo flipper.
  flippers: [
    {
      id: 'flipper-left',
      side: 'left',
      pivot: { x: 180, y: 810 },
      length: 120,
      angleRest:   Math.PI * 0.15,  // ~27° angled down
      angleActive: -Math.PI * 0.15, // ~-27° angled up
    },
    {
      id: 'flipper-right',
      side: 'right',
      pivot: { x: 420, y: 810 },
      length: 120,
      angleRest:   Math.PI * 0.85,  // ~153° (espelho de 27° down)
      angleActive: Math.PI * 1.15,  // angled up
    },
  ],

  targets: [
    { id: 'target-atf-1', position: { x: 200, y: 320 }, width: 20, height: 8, scoreValue: 500 },
    { id: 'target-atf-2', position: { x: 250, y: 320 }, width: 20, height: 8, scoreValue: 500 },
    { id: 'target-atf-3', position: { x: 300, y: 320 }, width: 20, height: 8, scoreValue: 500 },
  ],

  // Barreiras laterais traçadas a partir da arte (assets/table-bg.jpg):
  // seguem o contorno neon/metálico curvo do playfield em vez de retas, para
  // a bola NÃO "passar por cima" da borda pintada nas curvas.
  walls: [
    // ----- Borda ESQUERDA: parede prateada INTERNA curva (cabaça) -----
    // A bola colide com a PAREDE INTERNA curva do playfield (não a barra
    // externa reta): domo no topo → CINTURA que avança até ~x72 em y385 →
    // recua → corpo inferior (~x31) → gutter. (A barra metálica externa fica
    // ATRÁS desta parede; o anel de Saturno é decoração de piso.)
    ...wallChain([
      { x: 300, y: 21  }, // ápice do arco (compartilhado com a borda direita)
      { x: 232, y: 25  },
      { x: 168, y: 31  },
      { x: 120, y: 42  },
      { x: 90,  y: 55  },
      { x: 72,  y: 69  },
      { x: 54,  y: 90  },
      { x: 42,  y: 114 },
      { x: 34,  y: 135 }, // base do domo
      { x: 34,  y: 175 },
      { x: 36,  y: 235 },
      { x: 40,  y: 270 },
      { x: 46,  y: 295 }, // cintura: subindo
      { x: 55,  y: 315 },
      { x: 62,  y: 330 },
      { x: 71,  y: 345 },
      { x: 78,  y: 362 },
      { x: 79,  y: 375 }, // ápice da cintura (borda do trilho, ponto mais interno)
      { x: 74,  y: 392 },
      { x: 69,  y: 408 },
      { x: 65,  y: 425 },
      { x: 62,  y: 450 },
      { x: 60,  y: 490 },
      { x: 56,  y: 515 },
      { x: 49,  y: 535 },
      { x: 41,  y: 555 },
      { x: 35,  y: 575 }, // cintura: recuando
      { x: 32,  y: 600 }, // corpo inferior
      { x: 31,  y: 660 },
      { x: 31,  y: 710 },
      { x: 29,  y: 750 },
      { x: 27,  y: 780 }, // início do gutter
    ]),

    // ----- Borda SUPERIOR-DIREITA: arco → defletor → parede externa -----
    // Do ápice, o arco desce pelo canto superior-direito e vira o defletor
    // que arremessa a bola para a ESQUERDA, para fora do corredor do plunger;
    // segue como a parede externa direita (que também fecha o canal do plunger).
    ...wallChain([
      { x: 300, y: 21  }, // ápice (compartilhado)
      { x: 372, y: 23  },
      { x: 432, y: 27  },
      { x: 474, y: 33  },
      { x: 508, y: 46  },
      { x: 536, y: 70  },
      { x: 556, y: 108 },
      { x: 560, y: 150 },
      { x: 560, y: 875 }, // parede externa direita / canal do plunger
    ]),

    // ----- Swoosh do plunger: trilho livre que divide playfield × canal -----
    // Borda esquerda do trilho prateado = limite direito do playfield, que
    // INCHA para dentro (~x483 em y355) acompanhando a curva pintada — antes
    // era reta em ~x518 e a bola encostava no metal do trilho.
    // O topo começa em y150 à direita do buraco negro (478,150,r38) p/ não
    // cruzá-lo, e deixa o canal aberto p/ a bola lançada sair à esquerda.
    ...wallChain([
      { x: 474, y: 196 }, // logo abaixo do buraco negro (478,150,r38)
      { x: 470, y: 225 },
      { x: 468, y: 252 },
      { x: 467, y: 282 }, // ponto mais interno do trilho
      { x: 467, y: 312 },
      { x: 468, y: 340 },
      { x: 471, y: 368 },
      { x: 476, y: 400 },
      { x: 484, y: 445 },
      { x: 492, y: 490 },
      { x: 499, y: 535 },
      { x: 506, y: 585 },
      { x: 512, y: 635 },
      { x: 517, y: 690 },
      { x: 520, y: 780 },
    ]),

    // Left gutter wall
    { start: { x: 27,  y: 780 }, end: { x: 140, y: 850 } },
    // Right gutter wall (starts at the plunger lane inner wall — must NOT cross the lane)
    { start: { x: 520, y: 780 }, end: { x: 460, y: 850 } },
    // Center drain divider
    { start: { x: 140, y: 850 }, end: { x: 140, y: 875 } },
    { start: { x: 460, y: 850 }, end: { x: 460, y: 875 } },
    // Plunger lane left wall
    { start: { x: 520, y: 780 }, end: { x: 520, y: 875 } },
    // Plunger lane floor (keeps the resting ball above drainY=875)
    { start: { x: 520, y: 875 }, end: { x: 560, y: 875 } },
    // Inlane guides: conectam o fim dos gutters aos pivos dos flippers,
    // entregando a bola SOBRE o flipper (sem vazar por baixo do pivo)
    { start: { x: 140, y: 850 }, end: { x: 178, y: 812 } },
    { start: { x: 460, y: 850 }, end: { x: 422, y: 812 } },
  ],

  // Sem ramps: a antiga "ramp" era um AABB INVISÍVEL no lado esquerdo
  // (x60-140, y400-460) que teleportava a bola para o topo — exatamente o
  // "comportamento de buraco negro" que o jogador via num ponto sem elemento.
  // Teleporte agora só ocorre ao encostar no buraco negro (hyperspace) visível.
  ramps: [],

  // Buraco negro (hyperspace): disco circular no quadrante superior-direito,
  // posicionado FORA da trajetória de lançamento (a bola sobe pela lane x=540 e
  // deflete para a esquerda pela faixa y~60). center=(478,150) fica abaixo
  // dessa faixa e à esquerda da lane, então só ativa ao ENCOSTAR no disco.
  hyperspaceChute: {
    id: 'hyperspace',
    center: { x: 478, y: 150 },
    radius: 38,
    exitOptions: [
      { x: 150, y: 400 },
      { x: 300, y: 500 },
      { x: 450, y: 400 },
    ],
    scoreValue: 500,
  },

  // Kickers das covas inferiores (cusps em (140,850) e (460,850)). A zona
  // cobre a bola em repouso (centro ~y838). ejectVel sobe e desvia para o
  // centro, tirando a bola do divisor do dreno e devolvendo-a ao jogo.
  kickers: [
    {
      id: 'kicker-left',
      triggerAABB: { x: 115, y: 818, w: 52, h: 52 },
      ejectVel: { x: 260, y: -680 },
      apex: { x: 140, y: 850 },
    },
    {
      id: 'kicker-right',
      triggerAABB: { x: 433, y: 818, w: 52, h: 52 },
      ejectVel: { x: -260, y: -680 },
      apex: { x: 460, y: 850 },
    },
  ],

  // Barreira de 6 plaquinhas em meio-arco no canto superior-esquerdo,
  // acompanhando a curva da mesa. center/radius/ângulos calibrados contra a
  // arte de fundo (task de calibração visual).
  dropTargetBank: {
    id: 'top-left-arc',
    center: { x: 330, y: 250 },
    radius: 230,
    targets: buildArcDropTargets({ x: 330, y: 250 }, 230, 188, 250, 6, 18),
  },
};
