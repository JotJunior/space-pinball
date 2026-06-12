# Technical Plan: Space Cadet Pinball Web

**Feature**: space-cadet-pinball  
**Status**: Draft  
**Created**: 2026-06-12  
**Spec**: [spec.md](./spec.md)

---

## Summary

Implementar o Space Cadet 3D Pinball como single-page web app TypeScript + Canvas 2D. A abordagem consiste em uma engine de fisica com fixed timestep (120 steps/s), renderizacao Canvas 2D com interpolacao, audio procedural via Web Audio API, state machine de missoes/patentes, e zero dependencias de runtime. Todo o codigo, geometria e audio sao gerados do zero — sem assets de copyright.

---

## Constitution Check

*GATE: Deve passar antes de prosseguir.*

| Principio | Status | Notas |
|-----------|--------|-------|
| P1 — Copyright-Free | PASS | Zero arquivos de asset; geometria e audio 100% procedurais |
| P2 — TypeScript Strict | PASS | `tsconfig.json` com `"strict": true`; ES2020 modules |
| P3 — Canvas-First, Zero Framework | PASS | Canvas 2D puro; nenhum framework de UI |
| P4 — Physics Fidelity | PASS | Fixed timestep 120Hz; colisao geometrica precisa |
| P5 — Zero Runtime Dependencies | PASS | `package.json` dependencies: {} (vazio); devDependencies apenas TS + Vitest |
| P6 — Test Physics Core | PASS | Vitest cobre engine de fisica (>= 70% cobertura em `src/physics/`) |
| P7 — Client-Only, No Backend | PASS | Zero fetch/WebSocket; localStorage apenas; serve estatico |
| AD-001 — Fixed Timestep | PASS | Game loop: accumulate → fixed step → interpolated render |
| AD-002 — Engine/Renderer Separation | PASS | `PhysicsEngine` independente de `Renderer` |
| AD-003 — Web Audio Procedural | PASS | Todos sons sintetizados; AudioContext apos interacao |
| AD-004 — Config Centralizada | PASS | `src/config/physics.ts`, `src/config/table.ts`, `src/config/missions.ts`, `src/config/scoring.ts` |
| AD-005 — State Machine Missoes | PASS | MissionManager com 9 estados explicitos e transicoes declaradas |

---

## Technical Context

| Campo | Valor |
|-------|-------|
| Linguagem | TypeScript 5.x, strict mode, ES2020 modules |
| Renderizacao | HTML5 Canvas 2D API |
| Audio | Web Audio API (AudioContext, OscillatorNode, GainNode, BiquadFilterNode) |
| Persistencia | localStorage (chave `spaceCadetHighScore`) |
| Build | `tsc --noEmit` (typecheck); `tsc` (compilar para dist/) |
| Dev server | `npx serve .` ou `npx serve dist/` |
| Testes | Vitest (unitarios de fisica e missoes) |
| Target browser | Chrome 100+, Firefox 100+, Safari 16+ |
| Resolucao alvo | 600x900px (mesa) + ~300px HUD lateral |
| Frame rate | 60fps render; 120Hz fisica (fixed timestep 8.33ms) |

**Convencoes de borda**: N/A — single-layer (client-side only, sem API, sem DB).

---

## Project Structure

```
space-pinball/
├── index.html                    # Entry point — carrega src/main.ts como ES module
├── tsconfig.json                 # strict:true, module:ES2020, target:ES2020
├── package.json                  # devDependencies: typescript, vitest; dependencies: {}
├── src/
│   ├── main.ts                   # Bootstrap: canvas setup, event listeners, game loop start
│   ├── config/
│   │   ├── physics.ts            # Constantes de fisica (gravidade, elasticidade, forcas)
│   │   ├── table.ts              # Geometria declarativa da mesa (posicoes, formas, elementos)
│   │   ├── missions.ts           # Definicao das 9 missoes/patentes e objetivos
│   │   └── scoring.ts            # Pontos por evento, thresholds (replay=75000, etc.)
│   ├── physics/
│   │   ├── PhysicsEngine.ts      # Fixed timestep loop, coordenacao de colisoes
│   │   ├── Ball.ts               # Estado e integracao da bola (posicao, velocidade)
│   │   ├── Flipper.ts            # Cinematica do flipper (angulo, velocidade angular)
│   │   ├── collision.ts          # Algoritmos de colisao geometrica
│   │   └── shapes.ts             # Primitivas geometricas (Circle, Segment, Polygon, Arc)
│   ├── game/
│   │   ├── GameState.ts          # Estado global da partida (pontuacao, bolas, status)
│   │   ├── MissionManager.ts     # State machine das 9 patentes
│   │   ├── ScoreManager.ts       # Acumulacao de pontos, multiplicadores, high score
│   │   └── InputHandler.ts       # Teclado: keydown/keyup, mapeamento de acoes
│   ├── renderer/
│   │   ├── Renderer.ts           # Canvas 2D: world-to-canvas transform, render loop
│   │   ├── TableRenderer.ts      # Desenho da mesa, elementos, HUD
│   │   ├── BallRenderer.ts       # Desenho da bola com interpolacao de posicao
│   │   └── HUDRenderer.ts        # Painel lateral: placar, bolas, patente, fuel bar
│   ├── audio/
│   │   ├── AudioManager.ts       # AudioContext, mute state, init-on-interaction
│   │   ├── SoundSynth.ts         # Sons pontuais (bumper, flipper, tilt, etc.)
│   │   └── MusicSynth.ts         # Musica de fundo procedural em loop
│   └── persistence/
│       └── HighScore.ts          # localStorage wrapper com graceful degradation
├── tests/
│   ├── physics/
│   │   ├── collision.test.ts     # Colisao bola-flipper, bola-bumper, bola-parede
│   │   ├── ball.test.ts          # Integracao de posicao/velocidade, gravidade
│   │   └── flipper.test.ts       # Cinematica do flipper, angulo dependente de carga
│   └── game/
│       ├── missions.test.ts      # Transicoes de patente, persistencia de progresso
│       └── scoring.test.ts       # Multiplicadores, replay threshold, high score
└── docs/
    └── specs/
        └── space-cadet-pinball/  # Artefatos SDD
```

---

## Game Loop Architecture

### Fixed Timestep com Interpolacao

```
requestAnimationFrame(timestamp):
  delta = min(timestamp - lastTimestamp, 100ms)  // cap anti-spiral
  lastTimestamp = timestamp
  accumulator += delta

  while accumulator >= PHYSICS_STEP (8.33ms = 1/120s):
    physicsEngine.step(PHYSICS_STEP)              // estado anterior salvo
    accumulator -= PHYSICS_STEP

  alpha = accumulator / PHYSICS_STEP              // 0.0..1.0
  renderer.render(physicsEngine.interpolate(alpha))
```

**PHYSICS_STEP** = 8.33ms (120Hz)  
**Beneficio**: determinismo entre maquinas; sem tunelamento em alta velocidade

---

## Physics Engine Design

### Algoritmo de Colisao

Abordagem: **colisao geometrica simples** com primitivas:
- **Circle vs Circle**: bumpers (circulo fixo) vs bola (circulo movel)
- **Circle vs Segment**: paredes, flippers, rebounds (segmentos de linha)
- **Circle vs Polygon**: slingshots (triangulo) — decompostos em segmentos
- **AABB trigger**: rampas e hyperspace chute — zona de entrada/saida

Justificativa: a mesa do Space Cadet tem geometria regular e bem definida; colisao continua ou GJK seria overkill. Circle-vs-segment cobre 95% dos casos.

### Detectar Colisao Circle vs Segment

```
1. Encontrar o ponto mais proximo da bola na linha (clamp ao segmento)
2. Se distancia(bola, ponto) < raio da bola → colisao detectada
3. Normal = normalizar(bola.pos - ponto)
4. Velocidade refletida: v' = v - 2 * dot(v, n) * n * elasticidade
5. Separar bola do segmento (position correction)
```

### Flipper Physics

```
Flipper em repouso: angulo_max (apontando para baixo ~55deg)
Flipper acionado: angulo_min (apontando para cima ~-30deg)
Velocidade angular: interpolacao exponencial (snap em ~80ms)

Colisao bola-flipper:
1. Tratar flipper como segmento rotacionado
2. Calcular velocidade da superficie no ponto de impacto: v_surface = omega * r
3. Velocidade resultante da bola: v' = reflexao + v_surface * transfer_factor
```

### Bumper Physics

```
Bumper = circulo fixo com raio bumper_radius
Ao detectar colisao:
1. Normal = normalizar(bola.pos - bumper.pos)
2. v' = normal * bumper_ejection_speed  (sobrescreve velocidade atual)
3. Ativar efeito visual (flash) por N frames
4. Disparar evento de pontuacao + audio
```

---

## Data Model (TypeScript Interfaces)

### Core State

```typescript
interface Vec2 { x: number; y: number; }

interface BallState {
  pos: Vec2;
  vel: Vec2;
  prevPos: Vec2;  // para interpolacao
  radius: number;
}

interface FlipperState {
  side: 'left' | 'right';
  angle: number;        // radianos
  angularVel: number;
  pivot: Vec2;
  length: number;
  pressed: boolean;
}

interface BumperState {
  id: string;
  pos: Vec2;
  radius: number;
  active: boolean;
  flashFrames: number;
}

interface TargetState {
  id: string;
  pos: Vec2;
  lit: boolean;
  missionRef: string;  // qual missao este target serve
}

interface GameState {
  status: 'attract' | 'playing' | 'tilt' | 'ball_lost' | 'game_over';
  score: number;
  balls: number;
  multiplier: 1 | 2 | 3 | 5;
  replayGranted: boolean;
  tiltCount: number;
}

interface MissionState {
  rank: RankName;       // 'Cadet' | 'Ensign' | ... | 'FleetAdmiral'
  objectives: ObjectiveState[];
  fuelLights: number;   // 0..5 acesos
}

type RankName = 'Cadet' | 'Ensign' | 'Lieutenant' | 'Captain' |
                'Commodore' | 'Admiral' | 'ViceAdmiral' |
                'AdmiralOfTheFleet' | 'FleetAdmiral';
```

### Config Types

```typescript
interface PhysicsConfig {
  gravity: number;           // pixels/s^2, ex: 981
  elasticity: number;        // coeficiente de restituicao, ex: 0.6
  friction: number;          // atrito de rolar, ex: 0.99
  flipperSnap: number;       // fator de velocidade angular, ex: 20
  bumperEjectionSpeed: number; // ex: 800
  tiltThreshold: number;     // presses para ativar tilt, ex: 3
}

interface TableConfig {
  width: number;   // pixels canvas, ex: 600
  height: number;  // pixels canvas, ex: 900
  bumpers: Array<{ pos: Vec2; radius: number; id: string }>;
  slingshots: Array<{ vertices: Vec2[]; id: string }>;
  flippers: Array<{ side: 'left'|'right'; pivot: Vec2; length: number }>;
  kickers: Array<{ segment: [Vec2, Vec2]; normal: Vec2; impulse: number }>;
  ramp: { entry: Vec2; exit: Vec2; path: Vec2[] };
  hyperspaceChute: { entry: Vec2; exitOptions: Vec2[] };
  plungerLane: { top: Vec2; bottom: Vec2 };
  walls: Array<[Vec2, Vec2]>;  // segmentos das paredes
  drainLine: { y: number };    // y abaixo do qual a bola e perdida
}
```

---

## Mission System (State Machine)

### 9 Estados e Transicoes

```
Cadet ──(complete cadet objectives)──> Ensign
Ensign ──(complete ensign objectives)──> Lieutenant
... (progressao linear)
AdmiralOfTheFleet ──(complete)──> FleetAdmiral
FleetAdmiral ──(complete)──> Cadet (ciclo reiniciado, bonus especial)
```

### Objectives por Patente (referencia — valores a calibrar)

| Patente | Objetivos principais |
|---------|---------------------|
| Cadet | Acertar 1 bumper 3x; completar 1 rampa |
| Ensign | Acender todas as flags; usar hyperspace chute 1x |
| Lieutenant | Acertar 3 bumpers em sequencia; multiplicador x2 ativo |
| Captain | Completar 2 rampas; acender slingshots 5x |
| Commodore | Multiplicador x3; fuel bar completa 1x |
| Admiral | Sequencia de targets especificos; hyperspace 2x |
| Vice Admiral | Todos os bumpers em sequencia; multiplicador x5 |
| Admiral of the Fleet | Meta-objetivo combinado de todos os anteriores |
| Fleet Admiral | Completar com 3 bolas restantes |

### MissionManager Implementation

```typescript
class MissionManager {
  private state: MissionState;
  private config: MissionConfig[];  // src/config/missions.ts
  
  onEvent(event: GameEvent): void {
    // Atualiza objetivos correntes
    // Verifica completude -> transicao se necessario
    // Emite MissionCompleteEvent se passou
  }
  
  private transitionTo(rank: RankName): void {
    // Preserva progresso de estado corrente
    // Inicia estado novo
    // Emite evento para audio + visual
  }
}
```

---

## Audio Design (Web Audio API)

### Inicializacao

```
1. Na primeira interacao do usuario (keydown ou click):
   audioCtx = new AudioContext()
   masterGain = audioCtx.createGain() → audioCtx.destination
   musicGain = audioCtx.createGain() → masterGain
   sfxGain = audioCtx.createGain() → masterGain

2. Mute: masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01)
```

### Sons Sintetizados

| Evento | Sintese |
|--------|---------|
| Bumper hit | OscillatorNode(triangle, 440Hz) + ramp down 50ms + BiquadFilter(bandpass) |
| Flipper press | OscillatorNode(sawtooth, 120Hz) + decay 30ms |
| Slingshot | OscillatorNode(square, 220Hz) + decay 40ms + GainNode ramp |
| Mission complete | Sequencia de notas: C4-E4-G4-C5, 100ms cada |
| Rank up | Fanfara 5 notas ascendentes |
| Tilt | OscillatorNode(sawtooth, 80Hz) + GainNode oscillation 200ms |
| Game Over | Descida cromatica 8 notas |
| New high score | Glissando ascendente 500ms |

### Musica de Fundo

Sequenciador procedural baseado em:
- BPM: ~140
- Escala: pentatonica menor (evoca o tema espacial do original)
- Instrumentos: bass (OscillatorNode sawtooth), lead (triangle), arpejo (square)
- Loop: 32 compassos, gerado via `AudioBufferSourceNode` ou scheduling de osciladores

---

## Renderer Design (Canvas 2D)

### Transformacao World-to-Canvas

```typescript
class Renderer {
  private scale: number;   // fator de escala para fit no viewport
  private offsetX: number; // offset para centralizar
  
  worldToCanvas(pos: Vec2): Vec2 {
    return { x: pos.x * this.scale + this.offsetX, 
             y: pos.y * this.scale };
  }
}
```

### Renderizacao da Mesa (TableRenderer)

Cada elemento e desenhado com primitivas Canvas 2D:
- **Bola**: `ctx.arc` + radial gradient (efeito metalico)
- **Flippers**: `ctx.bezierCurveTo` para forma curva, rotacionado por `ctx.rotate`
- **Bumpers**: `ctx.arc` concêntricos (anel externo + centro); flash via `globalAlpha`
- **Slingshots**: `ctx.polygon` + gradiente lateral
- **Paredes**: `ctx.lineTo` com gradiente de profundidade
- **Rampa**: path bezier com textura de trilho
- **HUD**: retangulo lateral, texto monoespaco (`ctx.fillText` com fonte Courier/monospace)

### Paleta de Cores

```typescript
const COLORS = {
  background: '#000814',      // azul muito escuro
  wall: '#1a3a5c',            // azul metalico
  bumperOff: '#0d47a1',       // azul escuro
  bumperOn: '#42a5f5',        // azul claro (flash)
  flipper: '#607d8b',         // cinza azulado
  ball: '#b0bec5',            // cinza claro metalico
  targetOff: '#37474f',       // cinza escuro
  targetOn: '#ffd600',        // amarelo neon
  hudBackground: '#0a0a0a',   // preto quase puro
  hudText: '#4fc3f7',         // azul claro para texto
  scoreText: '#ffffff',       // branco para pontuacao
  fuelOn: '#ffd600',          // amarelo neon (fuel bar)
  fuelOff: '#1a1a1a',         // cinza escuro (fuel bar vazio)
} as const;
```

---

## Implementation Phases

### Fase 1 — Esqueleto e Loop (Sprint 1)
1. Setup projeto: `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`
2. Canvas setup + resize handler
3. Game loop com fixed timestep (sem fisica, apenas timestamp)
4. `InputHandler` (keydown/keyup, mapeamento inicial)
5. Estrutura de `config/` (fisica, mesa, missoes, scoring — valores placeholder)

### Fase 2 — Engine de Fisica (Sprint 2)
6. `shapes.ts`: Vec2, Circle, Segment, AABB
7. `collision.ts`: circle-circle, circle-segment
8. `Ball.ts`: posicao, velocidade, integracao por Euler
9. `Flipper.ts`: cinematica + colisao
10. Testes Vitest: colisao bola-parede, bola-bumper, bola-flipper

### Fase 3 — Mesa Completa (Sprint 3)
11. `table.ts` config: geometria real de todos os elementos
12. `PhysicsEngine.ts`: coordena todas as colisoes por frame
13. `Renderer.ts` + `TableRenderer.ts`: desenho da mesa (formas basicas)
14. `BallRenderer.ts`: bola com interpolacao
15. Plunger: mecanica de carga + lancamento

### Fase 4 — Elementos de Jogo (Sprint 4)
16. Bumpers: estado ativo/flash, pontuacao, audio
17. Slingshots: reflexao + pontuacao
18. Flags/targets: acender/apagar, referencia a missao
19. Rampa: deteccao de entrada, trilho, saida
20. Hyperspace chute: trigger + teletransporte

### Fase 5 — Missoes e Scoring (Sprint 5)
21. `MissionManager.ts`: state machine 9 patentes
22. `ScoreManager.ts`: acumulacao, multiplicadores
23. `GameState.ts`: status, bolas, replay
24. Tilt: contador + penalidade
25. Testes Vitest: transicoes de patente, replay threshold

### Fase 6 — Audio (Sprint 6)
26. `AudioManager.ts`: init-on-interaction, mute
27. `SoundSynth.ts`: todos os 9 tipos de SFX
28. `MusicSynth.ts`: sequenciador procedural
29. Integracao: todos os eventos de jogo disparam sons corretos

### Fase 7 — HUD e Polish (Sprint 7)
30. `HUDRenderer.ts`: placar, bolas, patente, fuel bar, missao
31. `HighScore.ts`: localStorage com graceful degradation
32. Tela de game over + restart
33. Tela de attract (aguardando inicio)
34. Calibracao de valores de fisica e scoring por playtest

### Fase 8 — QA e Finalização (Sprint 8)
35. Testes de performance (60fps sustentado 5 min)
36. Cross-browser (Chrome, Firefox, Safari)
37. Cobertura de testes >= 70% em `src/physics/`
38. `npx tsc --noEmit` = exit 0
39. Review final contra constitution (todos P1-P7 e ADs)

---

## Test Scenarios (Physics Core)

| Cenario | Entrada | Expected |
|---------|---------|----------|
| Bola cai por gravidade | vel=(0,0), pos=(300,100) | pos.y aumenta; vel.y cresce |
| Bola reflete na parede direita | vel=(500,0), pos=(590,450) | vel.x inverte com elasticidade |
| Bumper repele bola | bola.pos=(300,200), bumper.pos=(300,150) | vel aponta para longe do bumper |
| Flipper esquerdo lanca bola para cima | flipper.pressed=true, impacto no centro | vel.y negativa; vel.x ligeiramente positiva |
| Flipper com velocidade angular lanca mais alto | flipper.angularVel alto no momento do impacto | vel.y mais negativa que sem velocidade |
| Bola abaixo de drainLine | pos.y > table.height | evento BallLost emitido |
| Tilt desabilita flippers | tiltCount >= threshold | Flipper.pressed ignorado |
| Replay concedido em 75000 pts | score atinge 75000 | balls += 1, replayGranted = true |
| Replay nao repete | score > 75000, replayGranted = true | balls nao incrementa de novo |

---

## Research Notes

### Referencia de Fisica (k4zmu2a/SpaceCadetPinball)

O port WebAssembly (github.com/k4zmu2a/SpaceCadetPinball) pode ser inspecionado para:
- Valores de constantes de fisica (gravity, elasticity)  
- Posicoes dos elementos da mesa (em coordenadas normalizadas)
- Logica da state machine de missoes

**IMPORTANTE**: usar APENAS como referencia de comportamento/valores — NUNCA copiar codigo (violacao de P1 da constitution). Inspecionar via DevTools do browser ou lendo o C++ source no GitHub para extrair constantes numericas.

### Geometria da Mesa Original

Proporcoes aproximadas (a partir de capturas de tela do original):
- Canvas interno: 600x900 pixels
- Drain line: y ~= 875
- Plunger lane: x=520..590, entrada em y~=800
- Bumpers: centrais no topo, aprox (300,180), (230,240), (370,240)
- Flippers: pivot esq (180,820), pivot dir (420,820), comprimento ~120px

---

## Complexity Tracking

Nenhuma violacao de constituicao identificada. Todas as escolhas tecnicas (fixed timestep, ES modules, audio procedural, config centralizada) estao em conformidade com os principios P1-P7 e ADs 1-5.
