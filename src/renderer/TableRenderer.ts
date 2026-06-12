/**
 * Renders the Space Cadet Pinball table elements on the canvas.
 * Ref: spec.md P2, P3, P4; plan.md §Renderer Design
 */

import { TABLE_CONFIG } from '../config/table.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';

// Color palette inspired by Space Cadet's blue-gray aesthetic
const COLORS = {
  background:    '#0a1628',
  tableWall:     '#1e3a5f',
  tableWallGlow: '#2a5080',
  bumper:        '#1a2a4a',
  bumperActive:  '#00aaff',
  bumperRing:    '#0066cc',
  slingshot:     '#1e3a5f',
  slingshotHit:  '#ff6600',
  flipperLeft:   '#4488cc',
  flipperRight:  '#4488cc',
  flipperStroke: '#66aaff',
  target:        '#336699',
  targetHit:     '#ff4400',
  ball:          '#c8c8c8',
  ballShine:     '#ffffff',
  drain:         '#330000',
} as const;

export class TableRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W: number;
  private readonly H: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.W = TABLE_CONFIG.width;
    this.H = TABLE_CONFIG.height;
  }

  render(engine: PhysicsEngine, alpha: number): void {
    this.drawBackground();
    this.drawWalls();
    this.drawSlingshots(engine);
    this.drawBumpers(engine);
    this.drawTargets();
    this.drawFlippers(engine);
    this.drawBall(engine, alpha);
  }

  private drawBackground(): void {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.W, this.H);

    // Draw lane background (table area)
    ctx.fillStyle = '#0d1e38';
    ctx.fillRect(40, 0, 480, this.H);
  }

  private drawWalls(): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = COLORS.tableWall;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.tableWallGlow;
    ctx.shadowBlur = 6;

    for (const wall of TABLE_CONFIG.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBumpers(engine: PhysicsEngine): void {
    const { ctx } = this;

    for (const bumper of TABLE_CONFIG.bumpers) {
      const active = engine.isBumperActive(bumper.id);
      const color  = active ? COLORS.bumperActive : COLORS.bumper;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bumper.center.x, bumper.center.y, bumper.radius, 0, Math.PI * 2);

      // Fill
      ctx.fillStyle = color;
      if (active) {
        ctx.shadowColor = COLORS.bumperActive;
        ctx.shadowBlur  = 20;
      }
      ctx.fill();

      // Ring
      ctx.strokeStyle = COLORS.bumperRing;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Inner dot
      ctx.beginPath();
      ctx.arc(bumper.center.x, bumper.center.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#ffffff' : '#2255aa';
      ctx.fill();
    }
  }

  private drawSlingshots(_engine: PhysicsEngine): void {
    const { ctx } = this;

    for (const sling of TABLE_CONFIG.slingshots) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sling.vertices[0]!.x, sling.vertices[0]!.y);
      for (let i = 1; i < sling.vertices.length; i++) {
        ctx.lineTo(sling.vertices[i]!.x, sling.vertices[i]!.y);
      }
      ctx.closePath();
      ctx.fillStyle = COLORS.slingshot;
      ctx.fill();
      ctx.strokeStyle = COLORS.tableWall;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFlippers(engine: PhysicsEngine): void {
    const { ctx } = this;
    const state = engine.getState();

    for (const flipper of state.flippers) {
      const tipX = flipper.pivot.x + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivot.y + Math.sin(flipper.angle) * flipper.length;

      ctx.save();
      ctx.beginPath();

      // Draw flipper as a thick line (trapezoid approximation)
      const angle = flipper.angle;
      const normalAngle = angle + Math.PI / 2;
      const baseWidth = 12;
      const tipWidth  = 6;

      // Base (pivot end)
      const bx1 = flipper.pivot.x + Math.cos(normalAngle) * baseWidth;
      const by1 = flipper.pivot.y + Math.sin(normalAngle) * baseWidth;
      const bx2 = flipper.pivot.x - Math.cos(normalAngle) * baseWidth;
      const by2 = flipper.pivot.y - Math.sin(normalAngle) * baseWidth;

      // Tip
      const tx1 = tipX + Math.cos(normalAngle) * tipWidth;
      const ty1 = tipY + Math.sin(normalAngle) * tipWidth;
      const tx2 = tipX - Math.cos(normalAngle) * tipWidth;
      const ty2 = tipY - Math.sin(normalAngle) * tipWidth;

      ctx.moveTo(bx1, by1);
      ctx.lineTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.lineTo(bx2, by2);
      ctx.closePath();

      ctx.fillStyle = flipper.pressed ? '#66aaff' : COLORS.flipperLeft;
      ctx.fill();
      ctx.strokeStyle = COLORS.flipperStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTargets(): void {
    const { ctx } = this;

    for (const target of TABLE_CONFIG.targets) {
      ctx.fillStyle = COLORS.target;
      ctx.fillRect(target.position.x, target.position.y, target.width, target.height);
      ctx.strokeStyle = '#4488cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(target.position.x, target.position.y, target.width, target.height);
    }
  }

  private drawBall(engine: PhysicsEngine, alpha: number): void {
    const { ctx } = this;
    const pos = engine.getBallRenderPos(alpha);
    const r   = TABLE_CONFIG.ballRadius;

    // Main ball
    const grad = ctx.createRadialGradient(
      pos.x - r * 0.3, pos.y - r * 0.3, r * 0.1,
      pos.x, pos.y, r
    );
    grad.addColorStop(0, COLORS.ballShine);
    grad.addColorStop(0.4, COLORS.ball);
    grad.addColorStop(1, '#666666');

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
