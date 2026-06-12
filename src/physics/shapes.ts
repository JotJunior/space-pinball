/**
 * Geometric primitives for Space Cadet Pinball physics.
 * Ref: plan.md §Physics Engine Design §Algoritmo de Colisao
 */

// ---------------------------------------------------------------------------
// Vec2
// ---------------------------------------------------------------------------
export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D "cross product" scalar: a.x*b.y - a.y*b.x */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function length(v: Vec2): number {
  return Math.sqrt(lengthSq(v));
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------
export interface Circle {
  center: Vec2;
  radius: number;
}

// ---------------------------------------------------------------------------
// Segment
// ---------------------------------------------------------------------------
export interface Segment {
  start: Vec2;
  end:   Vec2;
}

/**
 * Returns the closest point on segment [start, end] to `point`.
 * The result is clamped to the segment (not the infinite line).
 */
export function closestPointOnSegment(point: Vec2, seg: Segment): Vec2 {
  const ab = sub(seg.end, seg.start);
  const ap = sub(point,   seg.start);
  const abLenSq = lengthSq(ab);

  if (abLenSq < 1e-10) {
    // Degenerate segment (start == end)
    return { ...seg.start };
  }

  const t = Math.max(0, Math.min(1, dot(ap, ab) / abLenSq));
  return add(seg.start, scale(ab, t));
}

// ---------------------------------------------------------------------------
// Polygon (collection of segments)
// ---------------------------------------------------------------------------
export interface Polygon {
  vertices: Vec2[];
}

export function polygonToSegments(poly: Polygon): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < poly.vertices.length; i++) {
    segs.push({
      start: poly.vertices[i]!,
      end:   poly.vertices[(i + 1) % poly.vertices.length]!,
    });
  }
  return segs;
}
