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

  flippers: [
    {
      id: 'flipper-left',
      side: 'left',
      pivot: { x: 180, y: 820 },
      length: 120,
      angleRest:   Math.PI * 0.2,   // ~36° angled down
      angleActive: -Math.PI * 0.2,  // ~-36° angled up
    },
    {
      id: 'flipper-right',
      side: 'right',
      pivot: { x: 420, y: 820 },
      length: 120,
      angleRest:   Math.PI * 0.8,   // ~144° angled down
      angleActive: Math.PI * 1.2,   // angled up
    },
  ],

  targets: [
    { id: 'target-atf-1', position: { x: 200, y: 320 }, width: 20, height: 8, scoreValue: 500 },
    { id: 'target-atf-2', position: { x: 250, y: 320 }, width: 20, height: 8, scoreValue: 500 },
    { id: 'target-atf-3', position: { x: 300, y: 320 }, width: 20, height: 8, scoreValue: 500 },
  ],

  walls: [
    // Left wall
    { start: { x: 40,  y: 0   }, end: { x: 40,  y: 780 } },
    // Right wall (excluding plunger lane)
    { start: { x: 560, y: 0   }, end: { x: 560, y: 780 } },
    // Top wall
    { start: { x: 40,  y: 0   }, end: { x: 560, y: 0   } },
    // Left gutter wall
    { start: { x: 40,  y: 780 }, end: { x: 140, y: 850 } },
    // Right gutter wall
    { start: { x: 560, y: 780 }, end: { x: 460, y: 850 } },
    // Center drain divider
    { start: { x: 140, y: 850 }, end: { x: 140, y: 875 } },
    { start: { x: 460, y: 850 }, end: { x: 460, y: 875 } },
    // Plunger lane left wall
    { start: { x: 520, y: 780 }, end: { x: 520, y: 875 } },
  ],
};
