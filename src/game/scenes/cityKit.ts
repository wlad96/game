import { rng } from '../rngCore';

/**
 * Kenney "City Kit (Commercial)" (CC0) — public/models/city/*.glb.
 * Footprints measured from the GLBs (kit units, front faces +z, base at y=0)
 * so colliders and layout need no model loading.
 */
export const KIT: Record<string, [number, number, number]> = {
  'building-a': [0.88, 1.29, 0.94],
  'building-b': [0.97, 1.29, 0.94],
  'building-c': [0.88, 0.89, 1.09],
  'building-d': [0.84, 1.29, 0.9],
  'building-e': [1.64, 0.89, 1.01],
  'building-f': [0.84, 1.69, 1.03],
  'building-g': [0.97, 1.69, 0.92],
  'building-h': [0.88, 1.29, 1.01],
  'building-i': [1.24, 1.68, 1.3],
  'building-j': [2.08, 1.69, 1.34],
  'building-k': [2.08, 1.47, 0.94],
  'building-l': [1.37, 2.27, 1.4],
  'building-m': [1.24, 3.15, 1.24],
  'building-n': [2.32, 2.48, 1.82],
  'building-skyscraper-a': [1.36, 2.88, 1.36],
  'building-skyscraper-b': [1.36, 4.48, 1.36],
  'building-skyscraper-c': [1.28, 4.08, 1.39],
  'building-skyscraper-d': [1.28, 5.47, 1.39],
  'building-skyscraper-e': [1.29, 4.08, 1.24],
  'detail-parasol-a': [0.35, 0.45, 0.4],
  'detail-parasol-b': [0.35, 0.45, 0.4],
  'low-detail-building-a': [0.5, 2.0, 0.5],
  'low-detail-building-b': [0.5, 2.23, 0.5],
  'low-detail-building-c': [0.5, 2.25, 0.5],
  'low-detail-building-d': [0.5, 1.75, 0.5],
  'low-detail-building-e': [0.5, 1.8, 0.5],
  'low-detail-building-f': [0.5, 2.0, 0.5],
  'low-detail-building-g': [0.5, 2.0, 0.5],
  'low-detail-building-h': [0.5, 2.1, 0.5],
  'low-detail-building-i': [0.5, 1.77, 0.5],
  'low-detail-building-j': [0.5, 1.75, 0.5],
  'low-detail-building-k': [0.5, 1.55, 0.5],
  'low-detail-building-l': [0.5, 1.85, 0.5],
  'low-detail-building-m': [0.5, 1.98, 0.5],
  'low-detail-building-wide-a': [1.0, 1.1, 0.5],
  'low-detail-building-wide-b': [1.0, 1.15, 0.5],
};

export interface Placement {
  model: string;
  x: number;
  z: number;
  /** 0 = front faces +z, PI = faces -z. */
  rot: 0 | typeof Math.PI;
  scale: number;
  /** Collider-less backdrop (far skyline). */
  solid: boolean;
}

/** World-space footprint of a placement. */
export function footprint(p: Placement) {
  const [w, h, d] = KIT[p.model];
  return { w: w * p.scale, h: h * p.scale, d: d * p.scale };
}

const STREET = ['building-a', 'building-b', 'building-c', 'building-d', 'building-f', 'building-g', 'building-h', 'building-i', 'building-e', 'building-k'];
const TOWERS = ['building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e', 'building-l', 'building-m', 'building-n'];
const FAR = Object.keys(KIT).filter((k) => k.startsWith('low-detail'));
const S = 9; // kit unit → metres: a 4-storey house is ~11.6 m, Sai is 2 m

/**
 * Rows of buildings with a straight frontage. `front` is the z of the street
 * edge, `dir` which way the facades look (+1 → +z).
 */
function row(out: Placement[], r: () => number, pool: string[], x0: number, x1: number, front: number, dir: 1 | -1, scale: number, skip: [number, number][], solid = true, gap = 0.6) {
  let x = x0;
  while (x < x1) {
    const hole = skip.find(([a, b]) => x >= a && x < b);
    if (hole) {
      x = hole[1];
      continue;
    }
    const model = pool[Math.floor(r() * pool.length)];
    const [w, , d] = KIT[model];
    const W = w * scale;
    if (x + W > x1) break;
    const D = d * scale;
    out.push({ model, x: x + W / 2, z: front - dir * (D / 2), rot: dir === 1 ? 0 : Math.PI, scale, solid });
    x += W + gap + (r() < 0.2 ? 3 : 0);
  }
}

export function buildRioCity(): Placement[] {
  const r = rng(4242);
  const out: Placement[] = [];
  // Market Street: facades look onto the street (z = ±10)
  row(out, r, STREET, 28, 112, -10, 1, S, []);
  row(out, r, STREET, 28, 112, 10, -1, S, []);
  // Beach avenue: towers facing the ocean, gaps for the main road, apartment and event zone
  row(out, r, TOWERS, -78, 140, 58.5, 1, S, [
    [-8, 8],
    [-46, -16],
    [56, 106],
  ], true, 2.5);
  // Square: three corner buildings
  out.push({ model: 'building-j', x: -20, z: -22, rot: 0, scale: S, solid: true });
  out.push({ model: 'building-k', x: 17.5, z: -22, rot: 0, scale: S, solid: true });
  out.push({ model: 'building-i', x: 21, z: 26, rot: Math.PI, scale: S, solid: true });
  // North skyline backdrop
  row(out, r, [...FAR, ...TOWERS.slice(0, 5)], -140, 40, -134, 1, 13, [], true, 2);
  return out;
}
