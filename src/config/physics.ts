/**
 * Physics constants for Space Cadet Pinball simulation.
 * Calibrated via playtest (task 7.5.1).
 *
 * Table dimensions: 600x900 logical px.
 * Physics runs at 120Hz (8.33ms step) with sub-ms accumulator.
 *
 * Calibration notes (2026-06-12):
 *   - gravity=1200 gives a noticeably faster ball than 981, closer to original
 *   - elasticity=0.65 keeps ball lively without feeling bouncy
 *   - friction=0.995 allows longer ball travel (less drag per step at 120Hz)
 *   - bumperEjection=850 keeps ball energetic through bumper clusters
 *   - plungerMaxSpeed=2000 reaches the top-right deflector at full charge
 */
export const PHYSICS_STEP = 1000 / 120; // 8.33ms at 120Hz
export const MAX_ACCUMULATOR = 100; // ms, anti-spiral-of-death cap

export const GRAVITY = 1200;          // px/s² — calibrated for 900px table height
export const BALL_ELASTICITY = 0.65;  // coefficient of restitution
export const FRICTION = 0.995;        // velocity multiplier per physics step (at 120Hz)
export const FLIPPER_SNAP_MS = 80;    // ms to full angle (exponential interpolation)
export const FLIPPER_ANGULAR_VEL_SNAP = 20; // rad/s snap threshold
export const BUMPER_EJECTION_SPEED = 850;   // px/s — energetic ejection
// Janela mínima entre eventos de pontuação/som para um MESMO elemento. Impede
// que um único contato físico (que pode durar vários sub-steps + a folga de
// separação) dispare BumperHit/SlingHit/TargetHit repetidamente — causa do
// "loop sonoro" e pontuação infinita quando a bola encosta num repulsor.
export const CONTACT_EVENT_COOLDOWN_MS = 100;
export const TILT_THRESHOLD = 3;      // number of rapid tilt events before penalty
// Saída do hyperspace: a bola é relançada PARA CIMA num ângulo aleatório (em
// vez de cair reto no dreno, fora do alcance dos flippers). Velocidade
// energética porém abaixo de MAX_BALL_SPEED para não tunelar.
export const HYPERSPACE_EXIT_SPEED = 520;        // px/s
export const HYPERSPACE_EXIT_SPREAD = Math.PI * 0.28; // ±~50° em torno do "para cima"
export const PLUNGER_MAX_CHARGE_MS = 2000;  // ms for full charge
// px/s at full charge — precisa alcancar o defletor do canto superior direito
// (y<=60) partindo do piso da lane (y~863). Com gravity=1200 E friction=0.995
// por step (~-0.6*v/s de arrasto), a subida real e ~da metade da balistica:
// v0=1600 -> apice ~707px (insuficiente); v0=2000 -> ~1023px (ok, margem)
export const PLUNGER_MAX_SPEED = 2000;

// Teto de velocidade da bola (px/s). O flipper em snap pode injetar >6000
// px/s na ponta; acima deste teto a bola atravessaria paredes-segmento mesmo
// com sub-stepping. Clampada ao fim de cada sub-step do PhysicsEngine.
export const MAX_BALL_SPEED = 2200;
