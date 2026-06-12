/**
 * Renders attract screen, game over screen, and restart prompt.
 * Ref: spec.md P1 Acceptance Scenarios; spec.md FR-006; plan.md §Renderer Design
 */

import { GameStateSnapshot } from '../game/GameState.js';

const W = 600;
const H = 900;

export class ScreenRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private flashPhase = 0; // animation counter

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  update(dt: number): void {
    this.flashPhase = (this.flashPhase + dt * 0.002) % (Math.PI * 2);
  }

  renderAttract(highScore: number): void {
    const { ctx } = this;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00aaff';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('SPACE CADET', W / 2, H / 2 - 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('3D PINBALL', W / 2, H / 2 - 40);

    // High score
    if (highScore > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '16px monospace';
      ctx.fillText('HIGH SCORE', W / 2, H / 2 + 20);
      ctx.font = '24px monospace';
      ctx.fillText(highScore.toLocaleString('en-US'), W / 2, H / 2 + 48);
    }

    // Blinking prompt
    const alpha = (Math.sin(this.flashPhase * 3) + 1) / 2;
    ctx.globalAlpha = 0.4 + alpha * 0.6;
    ctx.fillStyle = '#00ff88';
    ctx.font = '18px monospace';
    ctx.fillText('PRESS SPACE TO START', W / 2, H / 2 + 100);
    ctx.globalAlpha = 1.0;

    // Controls hint
    ctx.fillStyle = '#444444';
    ctx.font = '12px monospace';
    ctx.fillText('Z / LEFT = Left Flipper   / / RIGHT = Right Flipper', W / 2, H - 60);
    ctx.fillText('SPACE = Launch   X = Tilt   M = Mute', W / 2, H - 40);
  }

  renderGameOver(state: GameStateSnapshot): void {
    const { ctx } = this;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    // GAME OVER title
    ctx.fillStyle = '#ff2222';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 80);

    // Final score
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText('FINAL SCORE', W / 2, H / 2 - 20);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(state.score.toLocaleString('en-US'), W / 2, H / 2 + 20);

    // High score
    ctx.fillStyle = '#888888';
    ctx.font = '14px monospace';
    ctx.fillText('HIGH SCORE', W / 2, H / 2 + 60);
    ctx.fillStyle = '#ffaa00';
    ctx.font = '20px monospace';
    ctx.fillText(state.highScore.toLocaleString('en-US'), W / 2, H / 2 + 86);

    // Blinking restart prompt
    const alpha = (Math.sin(this.flashPhase * 2.5) + 1) / 2;
    ctx.globalAlpha = 0.4 + alpha * 0.6;
    ctx.fillStyle = '#00aaff';
    ctx.font = '18px monospace';
    ctx.fillText('PRESS SPACE TO PLAY AGAIN', W / 2, H / 2 + 140);
    ctx.globalAlpha = 1.0;
  }
}
