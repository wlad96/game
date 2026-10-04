import type { KitId } from '../models/kitUrls';
import { rng } from '../rngCore';
import { PLAZAS, ROUTE_BUILDINGS, SIDE_STREETS, STREET } from './rioLayout';
import { hillHeight } from './rioTerrain';

/**
 * Kenney kits (CC0) — public/models/<kit>/*.glb.
 * City-kit footprints are measured from the GLBs (kit units, front faces +z,
 * base at y=0) so colliders and layout need no model loading.
 */
export const KIT: Record<string, [number, number, number]> = {
  'building-a': [0.88, 1.29, 0.94],
  'building-c': [0.88, 0.89, 1.09],
  'building-d': [0.84, 1.29, 0.9],
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
  kit: KitId;
  model: string;
  x: number;
  z: number;
  y?: number;
  /** Radians about y; city-kit buildings use quarter turns (0 = front faces +z). */
  rot: number;
  scale: number;
  /** Has a collider (city-kit buildings only). */
  solid: boolean;
  /** Alternative city-kit palette. */
  palette?: 'cream';
  /** Casts shadows (default: solid pieces and street props). */
  shadow?: boolean;
}

/** World-space footprint of a city-kit placement. */
export function footprint(p: Placement) {
  const [w, h, d] = KIT[p.model];
  const side = Math.round(p.rot / (Math.PI / 2)) % 2 !== 0;
  return { w: (side ? d : w) * p.scale, h: h * p.scale, d: (side ? w : d) * p.scale };
}

const MID = ['building-i', 'building-j', 'building-k', 'building-l', 'building-m', 'building-n', 'building-f', 'building-g', 'building-d', 'building-h'];
const TOWERS = ['building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e', 'building-l', 'building-m', 'building-n'];
const FAR = Object.keys(KIT).filter((k) => k.startsWith('low-detail'));
export const S = 9; // kit unit → metres: a 4-storey house is ~11.6 m, Sai is 2 m
const TILE = S; // one road tile

/**
 * A row of buildings with a straight frontage. `front` is the z of the street
 * edge; facades look towards +z. Gaps `skip` stay open (streets, plazas).
 */
function row(out: Placement[], r: () => number, pool: string[], x0: number, x1: number, front: number, scale: number, skip: [number, number][], solid = true, gap = 0.6) {
  let x = x0;
  while (x < x1) {
    const hole = skip.find(([a, b]) => x + 0.01 >= a && x < b);
    if (hole) {
      x = hole[1] + gap;
      continue;
    }
    // room until the next gap (street, plaza) or the end of the row
    const stop = Math.min(x1, ...skip.filter(([a]) => a > x).map(([a]) => a));
    const fits = pool.filter((m) => KIT[m][0] * scale <= stop - x);
    if (!fits.length) {
      const hole2 = skip.find(([a]) => a === stop);
      x = hole2 ? hole2[1] + gap : x1;
      continue;
    }
    const model = fits[Math.floor(r() * fits.length)];
    const [w, , d] = KIT[model];
    const W = w * scale;
    out.push({ kit: 'city', model, x: x + W / 2, z: front - (d * scale) / 2, rot: 0, scale, solid, palette: r() < 0.4 ? 'cream' : undefined });
    x += W + gap + (r() < 0.15 ? 2 : 0);
  }
}

/** Buildings of the frontage and the second row, plus the far skyline. */
export function buildRioBuildings(): Placement[] {
  const r = rng(4242);
  const out: Placement[] = [];
  const { carnival, tower } = SIDE_STREETS;
  // Row A: the frontage on Avenida Atlântica
  row(out, r, [...TOWERS, ...MID], -170, 116, STREET.front, S, [carnival, [-71, -49], tower, [36.5, 74.5]]);
  // Apartment and the rooftop route
  out.push({ kit: 'city', model: 'building-n', x: -60, z: STREET.front - (KIT['building-n'][2] * S) / 2, rot: 0, scale: S, solid: true });
  for (const b of ROUTE_BUILDINGS) out.push({ kit: 'city', model: b.model, x: b.x, z: STREET.front - (KIT[b.model][2] * S) / 2, rot: 0, scale: S, solid: true, palette: b.model === 'building-a' ? 'cream' : undefined });
  // Row B: taller towers behind, seen over the frontage roofs
  row(out, r, TOWERS, -170, 116, STREET.backFront, 10, [[PLAZAS.carnival.x0, PLAZAS.carnival.x1], [PLAZAS.tower.x0, PLAZAS.tower.x1]], true, 1.2);
  // Far skyline (scenery)
  row(out, r, [...FAR, ...TOWERS.slice(0, 5)], -320, 112, -80, 13, [], false, 3);
  row(out, r, FAR, -320, 112, -112, 15, [], false, 6);
  for (const p of out) if (!p.solid) p.shadow = false;
  return out;
}

/** Roads, crossings, lamps and traffic lights (roads kit) and palms (nature kit). */
export function buildRioStreet(): Placement[] {
  const out: Placement[] = [];
  const zN = (STREET.roadN[0] + STREET.roadN[1]) / 2;
  const zS = (STREET.roadS[0] + STREET.roadS[1]) / 2;
  const sideX = [SIDE_STREETS.carnival, SIDE_STREETS.tower].map(([a, b]) => (a + b) / 2);
  for (let i = -18; i <= 18; i++) {
    const x = i * TILE;
    const side = sideX.includes(x);
    const cross = side || CROSSINGS.includes(x);
    out.push({ kit: 'roads', model: side ? 'road-intersection' : cross ? 'road-crossing' : 'road-straight', x, z: zN, rot: side ? Math.PI : 0, scale: S, solid: false, shadow: false });
    out.push({ kit: 'roads', model: cross ? 'road-crossing' : 'road-straight', x, z: zS, rot: 0, scale: S, solid: false, shadow: false });
  }
  // side streets up to the plazas
  for (const x of sideX)
    for (let z = STREET.roadN[0] - TILE / 2; z > STREET.backFront; z -= TILE)
      out.push({ kit: 'roads', model: 'road-straight', x, z, rot: Math.PI / 2, scale: S, solid: false, shadow: false });
  // lamps: double lamps on the median, single ones along both curbs
  const mz = (STREET.median[0] + STREET.median[1]) / 2;
  for (let x = -153; x <= 153; x += 18) {
    if (!nearCrossing(x)) out.push({ kit: 'roads', model: 'light-curved-double', x, z: mz, rot: 0, scale: S, solid: false });
    if (!nearCrossing(x + 9) && !inRoute(x + 9)) out.push({ kit: 'roads', model: 'light-curved', x: x + 9, z: STREET.roadN[0] - 0.8, rot: Math.PI, scale: S, solid: false });
    out.push({ kit: 'roads', model: 'light-curved', x, z: STREET.roadS[1] + 0.8, rot: 0, scale: S, solid: false });
  }
  for (const x of [...CROSSINGS, ...sideX]) {
    out.push({ kit: 'roads', model: 'traffic-light', x: x - 5.5, z: STREET.roadN[0] - 0.8, rot: 0, scale: S, solid: false });
    out.push({ kit: 'roads', model: 'traffic-light', x: x + 5.5, z: STREET.roadS[1] + 0.8, rot: Math.PI, scale: S, solid: false });
  }
  // palms: median, promenade (both edges) and the north sidewalk
  const PALMS = ['tree_palmTall', 'tree_palm', 'tree_palmDetailedTall', 'tree_palmBend'];
  let k = 0;
  const palm = (x: number, z: number, s = 6.5) => out.push({ kit: 'nature', model: PALMS[k++ % PALMS.length], x, z, rot: (k * 2.3) % (Math.PI * 2), scale: s + (k % 3) * 0.6, solid: false });
  for (let x = -157.5; x <= 157.5; x += 9) if (!nearCrossing(x)) palm(x, mz, 5.5);
  for (let x = -150; x <= 150; x += 15) {
    palm(x + 7.5, STREET.roadS[1] + 1.6);
    palm(x, STREET.beach - 1.4, 7);
  }
  for (let x = -144; x <= 110; x += 18) if (!nearCrossing(x) && !inRoute(x) && !inSide(x)) palm(x, STREET.front + 3.2, 6);
  return out;
}

/** Scenery: hill trees, hillside houses and the park up to the summit. */
export function buildRioScenery(): Placement[] {
  const r = rng(77);
  const out: Placement[] = [];
  const TREES = ['tree_default', 'tree_fat', 'tree_detailed', 'tree_oak'];
  const HOUSES = ['building-type-a', 'building-type-c', 'building-type-h', 'building-type-k', 'building-type-o', 'building-type-r', 'building-type-t'];
  for (let i = 0; i < 6000 && out.length < 1100; i++) {
    const x = -560 + r() * 1000;
    const z = -125 - r() * 330;
    const h = hillHeight(x, z);
    if (h < 6) continue;
    const houseBand = h < 34 && r() < 0.06;
    if (houseBand) out.push({ kit: 'suburb', model: HOUSES[Math.floor(r() * HOUSES.length)], x, z, y: h - 0.5, rot: (r() - 0.5) * 0.6, scale: 9, solid: false, shadow: false });
    else out.push({ kit: 'nature', model: TREES[Math.floor(r() * TREES.length)], x, z, y: h - 1.5, rot: r() * 6.28, scale: 10 + r() * 6, solid: false, shadow: false });
  }
  // the park on the hill behind the cable station
  const P = PLAZAS.station;
  for (let i = 0; i < 60; i++) {
    const x = P.x0 + 3 + r() * (P.x1 - P.x0 - 6);
    const z = -66 - r() * 44;
    if (Math.abs(x - 130) < 7 && z < -95) continue; // summit rock
    out.push({ kit: 'nature', model: TREES[Math.floor(r() * TREES.length)], x, z, rot: r() * 6.28, scale: 6 + r() * 3, solid: false });
  }
  return out;
}

/** x of pedestrian crossings (tile centres). */
export const CROSSINGS = [-54, 36, 108];
const nearCrossing = (x: number) => [...CROSSINGS, -108, 0].some((c) => Math.abs(c - x) < 6);
const inRoute = (x: number) => x > 32 && x < 60;
const inSide = (x: number) => [SIDE_STREETS.carnival, SIDE_STREETS.tower].some(([a, b]) => x > a - 3 && x < b + 3);
