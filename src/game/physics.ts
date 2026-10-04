/**
 * Tiny kinematic physics for a platformer character against static AABBs.
 * Deterministic and cheap; enough for the MVP city and parkour routes.
 */

export interface Box {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** Camera rays ignore it (e.g. thin railings, barriers). */
  noCamera?: boolean;
}

export type Bounds =
  | { type: 'rect'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { type: 'circle'; x: number; z: number; r: number };

/** Build a box from a centre on the ground plane: x, z, width, depth, height (and base y). */
export function boxAt(x: number, z: number, w: number, d: number, h: number, y = 0, extra?: Partial<Box>): Box {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y, maxY: y + h, ...extra };
}

export const PLAYER_RADIUS = 0.45;
export const PLAYER_HEIGHT = 1.7;
export const STEP_HEIGHT = 0.45;

export class World {
  boxes: Box[] = [];
  bounds: Bounds | null = null;
  /** Height used when nothing is under the player. */
  groundY = 0;
  /** Below this, the player respawns. */
  killY = -25;
  /** Is there a ground plane at all (home planet has floor only inside the plaza bounds). */
  hasGround = true;

  set(boxes: Box[], bounds: Bounds | null, opts?: { hasGround?: boolean; killY?: number }) {
    this.boxes = boxes;
    this.bounds = bounds;
    this.hasGround = opts?.hasGround ?? true;
    this.killY = opts?.killY ?? -25;
  }

  add(box: Box) {
    this.boxes.push(box);
    return () => {
      const i = this.boxes.indexOf(box);
      if (i >= 0) this.boxes.splice(i, 1);
    };
  }
}

export const world = new World();

interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
}

function pushOutXZ(b: Body, box: Box, r: number) {
  const cx = Math.max(box.minX, Math.min(b.x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(b.z, box.maxZ));
  const dx = b.x - cx;
  const dz = b.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    b.x += dx * k;
    b.z += dz * k;
    // cancel velocity into the wall
    const nx = dx / d;
    const nz = dz / d;
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      b.vx -= vn * nx;
      b.vz -= vn * nz;
    }
  } else {
    // centre inside the box: push out on the shortest axis
    const left = b.x - box.minX;
    const right = box.maxX - b.x;
    const back = b.z - box.minZ;
    const front = box.maxZ - b.z;
    const m = Math.min(left, right, back, front);
    if (m === left) b.x = box.minX - r;
    else if (m === right) b.x = box.maxX + r;
    else if (m === back) b.z = box.minZ - r;
    else b.z = box.maxZ + r;
  }
  return true;
}

function overlapsXZ(x: number, z: number, r: number, box: Box) {
  const cx = Math.max(box.minX, Math.min(x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

/** Height of the highest walkable surface under (x, z) that is not above `maxY`. */
export function groundHeight(w: World, x: number, z: number, maxY: number, r = PLAYER_RADIUS * 0.8): number {
  let best = w.hasGround && insideBounds(w, x, z) ? w.groundY : -Infinity;
  for (const box of w.boxes) {
    if (box.maxY > maxY) continue;
    if (box.maxY <= best) continue;
    if (overlapsXZ(x, z, r, box)) best = box.maxY;
  }
  return best;
}

function insideBounds(w: World, x: number, z: number) {
  const b = w.bounds;
  if (!b) return true;
  if (b.type === 'rect') return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  const dx = x - b.x;
  const dz = z - b.z;
  return dx * dx + dz * dz <= b.r * b.r;
}

function clampBounds(w: World, b: Body) {
  const bd = w.bounds;
  if (!bd || !w.hasGround) return;
  if (bd.type === 'rect') {
    b.x = Math.max(bd.minX, Math.min(bd.maxX, b.x));
    b.z = Math.max(bd.minZ, Math.min(bd.maxZ, b.z));
  } else {
    const dx = b.x - bd.x;
    const dz = b.z - bd.z;
    const d = Math.hypot(dx, dz);
    if (d > bd.r) {
      b.x = bd.x + (dx / d) * bd.r;
      b.z = bd.z + (dz / d) * bd.r;
    }
  }
}

/**
 * Integrate one step. Mutates `b`. Returns true when the body landed this step.
 */
export function stepBody(w: World, b: Body, dt: number, gravity: number): boolean {
  const r = PLAYER_RADIUS;
  const wasGrounded = b.grounded;

  // Horizontal
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  for (let iter = 0; iter < 2; iter++) {
    for (const box of w.boxes) {
      if (box.maxY <= b.y + STEP_HEIGHT || box.minY >= b.y + PLAYER_HEIGHT) continue;
      pushOutXZ(b, box, r);
    }
  }
  clampBounds(w, b);

  // Vertical
  b.vy += gravity * dt;
  let ny = b.y + b.vy * dt;

  if (b.vy > 0) {
    for (const box of w.boxes) {
      if (box.minY < b.y + PLAYER_HEIGHT - 0.05) continue;
      if (ny + PLAYER_HEIGHT <= box.minY) continue;
      if (!overlapsXZ(b.x, b.z, r * 0.8, box)) continue;
      ny = box.minY - PLAYER_HEIGHT;
      b.vy = 0;
    }
  }

  const g = groundHeight(w, b.x, b.z, b.y + STEP_HEIGHT);
  let landed = false;
  if (b.vy <= 0 && ny <= g) {
    ny = g;
    landed = !wasGrounded;
    b.vy = 0;
    b.grounded = true;
  } else if (wasGrounded && b.vy <= 0 && b.y - g < 0.35 && g > -Infinity) {
    // stick to stairs / small drops
    ny = g;
    b.vy = 0;
    b.grounded = true;
  } else {
    b.grounded = false;
  }
  b.y = ny;
  return landed;
}

/** Ray vs AABB slab test, returns hit distance or Infinity. */
export function rayBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, box: Box): number {
  let tmin = 0;
  let tmax = Infinity;
  const o = [ox, oy, oz];
  const d = [dx, dy, dz];
  const mn = [box.minX, box.minY, box.minZ];
  const mx = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return Infinity;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

/** Distance along a ray to the first box hit (for camera collision). */
export function raycastWorld(w: World, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number) {
  let best = maxDist;
  for (const box of w.boxes) {
    if (box.noCamera) continue;
    const t = rayBox(ox, oy, oz, dx, dy, dz, box);
    if (t < best) best = t;
  }
  return best;
}
