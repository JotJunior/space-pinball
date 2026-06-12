/**
 * Space Cadet Pinball — entry point.
 * Wires together: PhysicsEngine, GameState, renderers, audio, input, persistence.
 * Ref: spec.md FR-001 through FR-009; plan.md §Game Loop Architecture
 */

import { PHYSICS_STEP, MAX_ACCUMULATOR } from './config/physics.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { GameState } from './game/GameState.js';
import { InputHandler } from './game/InputHandler.js';
import { TableRenderer } from './renderer/TableRenderer.js';
import { HUDRenderer } from './renderer/HUDRenderer.js';
import { ScreenRenderer } from './renderer/ScreenRenderer.js';
import { AudioManager } from './audio/AudioManager.js';
import { HighScore } from './persistence/HighScore.js';

const CANVAS_WIDTH  = 900; // includes HUD panel (600 table + 300 HUD)
const CANVAS_HEIGHT = 900;
const MIN_VIEWPORT_WIDTH = 600;

// ---------------------------------------------------------------------------
// Canvas / layout helpers
// ---------------------------------------------------------------------------
function getCanvas(): HTMLCanvasElement {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (canvas === null) throw new Error('Canvas element #gameCanvas not found');
  return canvas;
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Could not obtain 2D context');
  return ctx;
}

function checkMinResolution(): void {
  const warning = document.getElementById('minResWarning') as HTMLDivElement | null;
  if (warning !== null) {
    warning.style.display = window.innerWidth < MIN_VIEWPORT_WIDTH ? 'flex' : 'none';
  }
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  checkMinResolution();
  const scaleX = window.innerWidth  / CANVAS_WIDTH;
  const scaleY = window.innerHeight / CANVAS_HEIGHT;
  const scale  = Math.min(scaleX, scaleY);
  const scaledW = CANVAS_WIDTH  * scale;
  const scaledH = CANVAS_HEIGHT * scale;
  canvas.style.width    = `${scaledW}px`;
  canvas.style.height   = `${scaledH}px`;
  canvas.style.marginLeft = `${(window.innerWidth  - scaledW) / 2}px`;
  canvas.style.marginTop  = `${(window.innerHeight - scaledH) / 2}px`;
}

// ---------------------------------------------------------------------------
// Main bootstrap
// ---------------------------------------------------------------------------
function init(): void {
  const canvas = getCanvas();
  const ctx    = getContext(canvas);
  canvas.width  = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  resizeCanvas(canvas);
  window.addEventListener('resize', () => resizeCanvas(canvas));

  // Systems
  const highScore      = new HighScore();
  const physics        = new PhysicsEngine();
  const gameState      = new GameState(highScore.get());
  const input          = new InputHandler();
  const audio          = new AudioManager();
  const tableRenderer  = new TableRenderer(ctx);
  const hudRenderer    = new HUDRenderer(ctx);
  const screenRenderer = new ScreenRenderer(ctx);

  // Wire physics events → game state + audio
  physics.on((evt) => {
    switch (evt.type) {
      case 'BumperHit':
        gameState.onBumperHit(evt.elementId);
        audio.play('bumperHit');
        break;
      case 'SlingHit':
        gameState.onSlingHit(evt.elementId);
        audio.play('slingHit');
        break;
      case 'TargetHit':
        gameState.onTargetHit(evt.elementId);
        audio.play('targetHit');
        break;
      case 'FlipperHit':
        audio.play('flipperHit');
        break;
      case 'Drain':
        gameState.onDrain();
        audio.play('drain');
        physics.resetBall();
        break;
    }
  });

  // Wire game events → audio + high score
  gameState.on((evt) => {
    switch (evt.type) {
      case 'MissionComplete': audio.play('missionComplete'); break;
      case 'RankUp':          audio.play('rankUp');          break;
      case 'Tilt':            audio.play('tilt');            break;
    }
    if (evt.type === 'GameOver') {
      const snap = gameState.getSnapshot();
      highScore.submit(snap.score);
    }
  });

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------
  let lastTimestamp = 0;
  let accumulator   = 0;

  function gameLoop(timestamp: number): void {
    const delta = Math.min(timestamp - lastTimestamp, MAX_ACCUMULATOR);
    lastTimestamp = timestamp;
    accumulator  += delta;

    const snap = gameState.getSnapshot();

    // Input polling
    input.update(timestamp);
    const inputState = input.getState();

    if (snap.screen === 'playing') {
      physics.setFlipperPressed('left',  inputState.flipperLeft);
      physics.setFlipperPressed('right', inputState.flipperRight);

      if (inputState.tiltPressed) {
        gameState.onTiltInput();
      }
    }

    // Mute toggle
    if (inputState.muteToggled) {
      audio.toggleMute();
      input.consumeMuteToggle();
    }

    // Fixed physics steps (only during playing and not tilted)
    while (accumulator >= PHYSICS_STEP) {
      if (snap.screen === 'playing' && !snap.tilt.tilted) {
        physics.step(PHYSICS_STEP);
      }
      accumulator -= PHYSICS_STEP;
    }

    const alpha = accumulator / PHYSICS_STEP;

    // Render
    screenRenderer.update(delta);

    if (snap.screen === 'attract') {
      tableRenderer.render(physics, alpha);
      screenRenderer.renderAttract(snap.highScore);
    } else if (snap.screen === 'playing') {
      tableRenderer.render(physics, alpha);
      hudRenderer.render(snap, audio.isMuted());
    } else if (snap.screen === 'gameOver') {
      tableRenderer.render(physics, alpha);
      hudRenderer.render(snap, audio.isMuted());
      screenRenderer.renderGameOver(snap);
    }

    requestAnimationFrame(gameLoop);
  }

  // Space key detection for start/restart
  let spaceWasDown = false;
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const s = gameState.getSnapshot();
      if ((s.screen === 'attract' || s.screen === 'gameOver') && !spaceWasDown) {
        spaceWasDown = true;
        gameState.startGame();
        physics.resetBall();
        audio.play('launchBall');
      }
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceWasDown = false;
    }
  });

  requestAnimationFrame((ts) => {
    lastTimestamp = ts;
    gameLoop(ts);
  });
}

init();
