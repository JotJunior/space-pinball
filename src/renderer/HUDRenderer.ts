/**
 * Renders the HUD panel (score, balls, rank, mission, fuel lights, mute).
 * Ref: spec.md P5, FR-008; plan.md §Renderer Design
 */

import { GameStateSnapshot } from '../game/GameState.js';
import { MISSIONS } from '../config/missions.js';

const HUD_X = 608; // right panel start (table is 600px wide; canvas is 900px)
const HUD_W = 280;
const HUD_BG = '#0a0a1a';
const FONT_MONO = '14px monospace';
const FONT_MONO_LG = '20px monospace';
const FONT_MONO_SM = '11px monospace';

const RANK_NAMES = [
  'UNRANKED',
  'CADET',
  'SPECIALIST',
  'TROOPER',
  'SERGEANT',
  'LIEUTENANT',
  'CAPTAIN',
  'COMMODORE',
  'ADMIRAL',
  'SCIENCE OFFICER',
];

export class HUDRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(state: GameStateSnapshot, muteOn: boolean): void {
    const { ctx } = this;

    // HUD background
    ctx.fillStyle = HUD_BG;
    ctx.fillRect(HUD_X, 0, HUD_W, 900);

    // Border line
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HUD_X, 0);
    ctx.lineTo(HUD_X, 900);
    ctx.stroke();

    let y = 40;

    // Score
    ctx.fillStyle = '#888888';
    ctx.font = FONT_MONO_SM;
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', HUD_X + 16, y);
    y += 20;

    ctx.fillStyle = '#00ff88';
    ctx.font = FONT_MONO_LG;
    ctx.fillText(this.formatScore(state.score), HUD_X + 16, y);
    y += 36;

    // High score
    ctx.fillStyle = '#555555';
    ctx.font = FONT_MONO_SM;
    ctx.fillText('HIGH SCORE', HUD_X + 16, y);
    y += 18;
    ctx.fillStyle = '#ffaa00';
    ctx.font = FONT_MONO;
    ctx.fillText(this.formatScore(state.highScore), HUD_X + 16, y);
    y += 32;

    // Separator
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(HUD_X + 10, y);
    ctx.lineTo(HUD_X + HUD_W - 10, y);
    ctx.stroke();
    y += 16;

    // Ball indicator
    ctx.fillStyle = '#555555';
    ctx.font = FONT_MONO_SM;
    ctx.fillText('BALL', HUD_X + 16, y);
    y += 16;
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT_MONO;
    ctx.fillText(`${state.currentBall} / ${state.ballsRemaining + state.currentBall - 1}`, HUD_X + 16, y);
    y += 32;

    // Rank
    ctx.fillStyle = '#555555';
    ctx.font = FONT_MONO_SM;
    ctx.fillText('RANK', HUD_X + 16, y);
    y += 18;
    ctx.fillStyle = '#00aaff';
    ctx.font = FONT_MONO;
    ctx.fillText(RANK_NAMES[state.rankIndex] ?? 'UNKNOWN', HUD_X + 16, y);
    y += 30;

    // Mission
    ctx.fillStyle = '#555555';
    ctx.font = FONT_MONO_SM;
    ctx.fillText('MISSION', HUD_X + 16, y);
    y += 18;

    if (state.currentMissionId !== null) {
      const mission = MISSIONS.find(m => m.id === state.currentMissionId);
      if (mission !== undefined) {
        ctx.fillStyle = '#ffff00';
        ctx.font = FONT_MONO_SM;
        // Word-wrap to 2 lines max
        const desc = mission.objectives[0]?.description ?? '';
        ctx.fillText(desc.substring(0, 28), HUD_X + 16, y);
        y += 16;
        if (desc.length > 28) {
          ctx.fillText(desc.substring(28, 56), HUD_X + 16, y);
          y += 16;
        }
      }
    } else {
      ctx.fillStyle = '#444444';
      ctx.font = FONT_MONO_SM;
      ctx.fillText('NO ACTIVE MISSION', HUD_X + 16, y);
      y += 16;
    }
    y += 16;

    // Fuel lights (5 segments)
    ctx.fillStyle = '#555555';
    ctx.font = FONT_MONO_SM;
    ctx.fillText('FUEL', HUD_X + 16, y);
    y += 18;
    this.drawFuelLights(state.fuelLights, HUD_X + 16, y);
    y += 28;

    // Tilt warning
    if (state.tilt.tilted) {
      ctx.fillStyle = '#ff0000';
      ctx.font = FONT_MONO;
      ctx.textAlign = 'center';
      ctx.fillText('!! TILT !!', HUD_X + HUD_W / 2, y);
      ctx.textAlign = 'left';
    } else if (state.tilt.warnings > 0) {
      ctx.fillStyle = '#ff8800';
      ctx.font = FONT_MONO_SM;
      ctx.fillText(`TILT WARNING x${state.tilt.warnings}`, HUD_X + 16, y);
    }
    y += 28;

    // Mute icon
    if (muteOn) {
      ctx.fillStyle = '#ff4444';
      ctx.font = FONT_MONO_SM;
      ctx.fillText('[ MUTE ON ]', HUD_X + 16, y);
    }
  }

  private drawFuelLights(count: number, x: number, y: number): void {
    const { ctx } = this;
    const segW = 28;
    const segH = 12;
    const gap = 6;

    for (let i = 0; i < 5; i++) {
      const lit = i < count;
      ctx.fillStyle = lit ? '#ffff00' : '#222222';
      ctx.strokeStyle = lit ? '#aaaa00' : '#444444';
      ctx.lineWidth = 1;
      ctx.fillRect(x + i * (segW + gap), y, segW, segH);
      ctx.strokeRect(x + i * (segW + gap), y, segW, segH);
    }
  }

  private formatScore(score: number): string {
    return score.toLocaleString('en-US').padStart(10);
  }
}
