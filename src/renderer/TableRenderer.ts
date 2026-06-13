/**
 * Renders the Space Cadet Pinball table elements on the canvas.
 * Ref: spec.md P2, P3, P4; plan.md §Renderer Design
 */

import { TABLE_CONFIG } from '../config/table.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { AssetLoader, FLIPPER_ANCHOR, PORTAL_SHEET } from './AssetLoader.js';

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
  private readonly assets: AssetLoader;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.W = TABLE_CONFIG.width;
    this.H = TABLE_CONFIG.height;
    this.assets = new AssetLoader();
  }

  render(engine: PhysicsEngine, alpha: number): void {
    this.drawBackground();
    this.drawWalls();
    this.drawSlingshots(engine);
    this.drawKickers(engine);
    this.drawBumpers(engine);
    this.drawDropTargets(engine);
    this.drawTargets();
    this.drawHyperspaceChute(engine);
    this.drawFlippers(engine);
    this.drawPlunger(engine);
    this.drawBall(engine, alpha);
    this.drawHyperspaceFlash(engine);
  }

  private drawBackground(): void {
    const { ctx } = this;
    const bg = this.assets.get('background');

    // Base fill (também é o fallback enquanto o fundo carrega)
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.W, this.H);

    if (bg) {
      // Fundo gerado (Gemini) — mesma proporção 2:3 da mesa lógica (600x900),
      // então preenche sem distorção.
      ctx.drawImage(bg, 0, 0, this.W, this.H);
      return;
    }

    // Fallback procedural
    ctx.fillStyle = '#0d1e38';
    ctx.fillRect(40, 0, 480, this.H);
  }

  private drawWalls(): void {
    const { ctx } = this;
    ctx.save();
    // Com o fundo ilustrado, as paredes viram guias sutis (apenas para
    // legibilidade das colisões); sem fundo, são o contorno principal.
    const hasBg = this.assets.get('background') !== null;
    ctx.strokeStyle = COLORS.tableWall;
    ctx.lineWidth = hasBg ? 2 : 3;
    ctx.globalAlpha = hasBg ? 0.35 : 1;
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
    const sprite = this.assets.get('bumper');

    if (sprite) {
      for (const bumper of TABLE_CONFIG.bumpers) {
        const active = engine.isBumperActive(bumper.id);
        // 1.3x cobre a margem de glow do sprite, alinhando o disco ao raio
        // de colisão (radius).
        const size = bumper.radius * 2 * 1.3;
        ctx.save();
        if (active) {
          ctx.shadowColor = COLORS.bumperActive;
          ctx.shadowBlur = 25;
        }
        ctx.drawImage(
          sprite,
          bumper.center.x - size / 2,
          bumper.center.y - size / 2,
          size, size,
        );
        ctx.restore();
      }
      return;
    }

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
    const sprite = this.assets.get('slingshot');

    if (sprite) {
      for (const sling of TABLE_CONFIG.slingshots) {
        const xs = sling.vertices.map((v) => v.x);
        const ys = sling.vertices.map((v) => v.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = maxX - minX;
        const h = maxY - minY;
        // O sprite aponta a face luminosa para a direita; espelha no lado
        // direito da mesa para que a face aponte para o centro.
        const flip = sling.id === 'sling-right';
        ctx.save();
        if (flip) {
          ctx.translate(minX + w, minY);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, 0, 0, w, h);
        } else {
          ctx.drawImage(sprite, minX, minY, w, h);
        }
        ctx.restore();
      }
      return;
    }

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

  /**
   * Kickers das covas inferiores — obstáculo visível (cunha âmbar com seta
   * para cima) que sinaliza o ponto onde a bola é repelida automaticamente.
   * Pisca quando dispara (isKickerActive).
   */
  private drawKickers(engine: PhysicsEngine): void {
    const { ctx } = this;
    for (const kicker of TABLE_CONFIG.kickers) {
      const active = engine.isKickerActive(kicker.id);
      const { apex } = kicker;
      const top = apex.y - 26;
      const hw = 22;

      // Cunha preenchendo a cova (ponta no cusp, base acima)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(apex.x - hw, top);
      ctx.lineTo(apex.x + hw, top);
      ctx.closePath();
      ctx.fillStyle = active ? '#ffcc33' : '#cc6600';
      ctx.shadowColor = active ? '#ffee88' : '#ff8800';
      ctx.shadowBlur = active ? 26 : 10;
      ctx.fill();
      ctx.strokeStyle = '#ffaa33';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Seta para cima (indica a direção do kick)
      ctx.save();
      ctx.strokeStyle = active ? '#ffffff' : '#ffe0a0';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const cy = apex.y - 11;
      ctx.beginPath();
      ctx.moveTo(apex.x - 8, cy + 4);
      ctx.lineTo(apex.x, cy - 5);
      ctx.lineTo(apex.x + 8, cy + 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFlippers(engine: PhysicsEngine): void {
    const { ctx } = this;
    const state = engine.getState();
    const sprite = this.assets.get('flipper');

    if (sprite) {
      const { hubX, hubY, axisFrac } = FLIPPER_ANCHOR;
      for (const flipper of state.flippers) {
        // Escala: o eixo hub→ponta do sprite (axisFrac * largura) deve medir
        // flipper.length em px de mundo.
        const scale = flipper.length / (axisFrac * sprite.naturalWidth);
        const sW = sprite.naturalWidth * scale;
        const sH = sprite.naturalHeight * scale;
        ctx.save();
        ctx.translate(flipper.pivot.x, flipper.pivot.y);
        ctx.rotate(flipper.angle); // eixo do sprite é +x → ângulo direto
        // O flipper direito aponta para a esquerda (ângulo ~153°): rotacionar
        // o sprite o vira de cabeça pra baixo (serrilhado/face no lado errado).
        // Espelhar no eixo local hub→ponta o torna IMAGEM ESPELHADA do esquerdo
        // (como flippers reais). O hub fica em y=0, então a âncora não muda.
        if (flipper.side === 'right') {
          ctx.scale(1, -1);
        }
        if (flipper.pressed) {
          ctx.shadowColor = COLORS.flipperStroke;
          ctx.shadowBlur = 12;
        }
        // Ancora o hub do sprite sobre o pivô.
        ctx.drawImage(sprite, -hubX * sW, -hubY * sH, sW, sH);
        ctx.restore();
      }
      return;
    }

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

  /**
   * Banco de plaquinhas em arco (canto superior-esquerdo). Plaquinha "em pé"
   * (up) brilha em ciano-esverdeado; derrubada (down) fica escura e recuada.
   */
  private drawDropTargets(engine: PhysicsEngine): void {
    const { ctx } = this;
    const bank = TABLE_CONFIG.dropTargetBank;
    for (const plate of bank.targets) {
      const down = engine.isDropTargetDown(plate.id);
      const angle = Math.atan2(plate.normal.y, plate.normal.x);
      const thickness = 8;
      const length = plate.halfWidth * 2;

      ctx.save();
      ctx.translate(plate.center.x, plate.center.y);
      ctx.rotate(angle); // +x local = normal (face); comprimento ao longo de y
      if (down) {
        ctx.fillStyle = '#15212e';
        ctx.fillRect(-thickness / 2, -length / 2, thickness, length);
        ctx.strokeStyle = '#2a3b4d';
        ctx.lineWidth = 1;
        ctx.strokeRect(-thickness / 2, -length / 2, thickness, length);
      } else {
        ctx.shadowColor = '#33ffcc';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#2ad9b0';
        ctx.fillRect(-thickness / 2, -length / 2, thickness, length);
        ctx.shadowBlur = 0;
        // faixa luminosa na face voltada ao jogo (+x)
        ctx.fillStyle = '#bdfff0';
        ctx.fillRect(thickness / 2 - 2.5, -length / 2 + 2, 2.5, length - 4);
        ctx.strokeStyle = '#0e6b58';
        ctx.lineWidth = 1;
        ctx.strokeRect(-thickness / 2, -length / 2, thickness, length);
      }
      ctx.restore();
    }
  }

  private drawTargets(): void {
    const { ctx } = this;
    const sprite = this.assets.get('target');

    if (sprite) {
      for (const target of TABLE_CONFIG.targets) {
        // Mantém a proporção do painel (vertical) ancorando pela largura do
        // alvo; o centro do sprite cai sobre o centro lógico do alvo.
        const drawW = target.width * 1.6;
        const drawH = drawW * (sprite.naturalHeight / sprite.naturalWidth);
        const cx = target.position.x + target.width / 2;
        const cy = target.position.y + target.height / 2;
        ctx.drawImage(sprite, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      }
      return;
    }

    for (const target of TABLE_CONFIG.targets) {
      ctx.fillStyle = COLORS.target;
      ctx.fillRect(target.position.x, target.position.y, target.width, target.height);
      ctx.strokeStyle = '#4488cc';
      ctx.lineWidth = 1;
      ctx.strokeRect(target.position.x, target.position.y, target.width, target.height);
    }
  }

  private drawPlunger(engine: PhysicsEngine): void {
    const { ctx } = this;
    const charge = engine.getPlungerCharge();
    const { x, bottomY, topY } = TABLE_CONFIG.plungerLane;
    const laneH = bottomY - topY;

    // Plunger lane background
    ctx.fillStyle = '#050d1a';
    ctx.fillRect(x - 15, topY, 30, laneH);

    // Plunger rod visual (compressed by charge)
    const rodOffset = charge * 20;
    ctx.strokeStyle = '#88aacc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, bottomY - 5 + rodOffset);
    ctx.lineTo(x, bottomY - 25 + rodOffset);
    ctx.stroke();

    // Charge indicator bar (on the right side of plunger lane)
    if (charge > 0) {
      const barX = x + 18;
      const barH = 60;
      const barY = bottomY - barH;

      // Background
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(barX, barY, 8, barH);

      // Fill — color transitions from green to yellow to red
      const fillH = barH * charge;
      const r = Math.round(255 * Math.min(charge * 2, 1));
      const g = Math.round(255 * Math.min(2 - charge * 2, 1));
      ctx.fillStyle = `rgb(${r},${g},0)`;
      ctx.fillRect(barX, barY + barH - fillH, 8, fillH);

      // Border
      ctx.strokeStyle = '#336699';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, 8, barH);
    }
  }

  private drawHyperspaceChute(engine: PhysicsEngine): void {
    const { ctx } = this;
    const hyper = TABLE_CONFIG.hyperspaceChute;
    const cx = hyper.center.x;
    const cy = hyper.center.y;
    const active = engine.isHyperspaceEntryFlashing();
    const sprite = this.assets.get('blackhole');

    if (sprite) {
      // Buraco negro desenhado EXATAMENTE sobre o disco de gatilho (raio), para
      // que o visual coincida com a área que ativa o hyperspace. Brilha/cresce
      // levemente quando acionado.
      const scale = active ? 1.12 : 1;
      const dw = hyper.radius * 2 * scale;
      const dh = dw * (sprite.naturalHeight / sprite.naturalWidth);
      ctx.save();
      if (active) {
        ctx.shadowColor = '#8a5cff';
        ctx.shadowBlur = 22;
      }
      ctx.drawImage(sprite, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
      return;
    }

    // Fallback procedural (círculo que coincide com o gatilho)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hyper.radius, 0, Math.PI * 2);
    ctx.strokeStyle = active ? '#ff00ff' : '#4433aa';
    ctx.lineWidth = 2;
    if (active) {
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 15;
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawHyperspaceFlash(engine: PhysicsEngine): void {
    const { ctx } = this;
    if (!engine.isHyperspaceExitFlashing()) return;

    const exitPos = engine.getHyperspaceExitPos();
    if (!exitPos) return;

    const sheet = this.assets.get('portalSheet');
    if (sheet) {
      // Portal abrindo e fechando: percorre os 16 quadros ao longo do flash.
      const progress = engine.getHyperspaceExitFlashProgress(); // 0..1
      const idx = Math.min(
        PORTAL_SHEET.frames - 1,
        Math.floor(progress * PORTAL_SHEET.frames),
      );
      const col = idx % PORTAL_SHEET.cols;
      const row = Math.floor(idx / PORTAL_SHEET.cols);
      const sx = col * PORTAL_SHEET.frameW;
      const sy = row * PORTAL_SHEET.frameH;
      const size = 90;
      ctx.save();
      ctx.shadowColor = '#8a5cff';
      ctx.shadowBlur = 18;
      ctx.drawImage(
        sheet,
        sx, sy, PORTAL_SHEET.frameW, PORTAL_SHEET.frameH,
        exitPos.x - size / 2, exitPos.y - size / 2, size, size,
      );
      ctx.restore();
      return;
    }

    // Fallback procedural
    ctx.save();
    ctx.beginPath();
    ctx.arc(exitPos.x, exitPos.y, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,0,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
  }

  private drawBall(engine: PhysicsEngine, alpha: number): void {
    const { ctx } = this;
    const pos = engine.getBallRenderPos(alpha);
    const r   = TABLE_CONFIG.ballRadius;
    const sprite = this.assets.get('ball');

    if (sprite) {
      // Sombra de contato sutil para dar profundidade
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      ctx.restore();
      ctx.drawImage(sprite, pos.x - r, pos.y - r, r * 2, r * 2);
      return;
    }

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
