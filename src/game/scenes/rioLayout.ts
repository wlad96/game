import type { Spawn } from '../Player';
import { rng } from '../rngCore';
import type { BlockDef } from '../SceneKit';

/**
 * Rio de Janeiro — stylized futuristic district, ~300×265 m (TZ §10).
 * x → east, z → south (towards the ocean). Shared by the 3D scene, the minimap
 * and the world map so they never disagree.
 */

export const RIO_BOUNDS = { minX: -148, maxX: 148, minZ: -148, maxZ: 112 };

export interface Zone {
  id: string;
  name: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  color: string;
}

export const RIO_ZONES: Zone[] = [
  { id: 'square', name: 'Central Square', x0: -26, z0: -26, x1: 26, z1: 26, color: '#d9d2c3' },
  { id: 'market', name: 'Market Street', x0: 26, z0: -9, x1: 114, z1: 9, color: '#b9a48c' },
  { id: 'beach', name: 'Beach District', x0: -80, z0: 64, x1: 148, z1: 112, color: '#f0d9a0' },
  { id: 'favela', name: 'Favela Hills', x0: -146, z0: -76, x1: -48, z1: 30, color: '#c48f6a' },
  { id: 'cable', name: 'Cable Car Station', x0: 44, z0: -82, x1: 86, z1: -40, color: '#9fb6c9' },
  { id: 'mountain', name: 'Mountain Area', x0: 86, z0: -146, x1: 146, z1: -82, color: '#6f9a6a' },
  { id: 'tower', name: 'Energy Tower', x0: -12, z0: -58, x1: 12, z1: -34, color: '#a8c8e8' },
  { id: 'event', name: 'Event Zone', x0: 60, z0: 22, x1: 104, z1: 58, color: '#d6a8e8' },
  { id: 'carnival', name: 'Carnival Plaza (NFT)', x0: 116, z0: -32, x1: 144, z1: -4, color: '#f5c542' },
  { id: 'apartment', name: 'Player Apartment', x0: -44, z0: 30, x1: -18, z1: 50, color: '#8fc1e8' },
];

export interface Poi {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  icon: string;
  kind: 'quest' | 'npc' | 'portal' | 'apartment' | 'shop' | 'fast' | 'viewpoint' | 'event' | 'landmark';
  description?: string;
}

export const RIO_POIS: Poi[] = [
  { id: 'portal', label: 'Portal to Home Planet', x: 0, y: 0, z: 34, icon: '🌀', kind: 'portal', description: 'Return to the Sai Home Planet.' },
  { id: 'technician', label: 'Rio Technician', x: 7, y: 0, z: 12, icon: '🧑‍🔧', kind: 'npc', description: 'Story quest giver: Energy of Rio.' },
  { id: 'beacon1', label: 'Energy Beacon #1', x: -14, y: 0, z: -8, icon: '⚡', kind: 'quest', description: 'Quest target · Central Square' },
  { id: 'beacon2', label: 'Energy Beacon #2', x: -111, y: 11.4, z: -46, icon: '⚡', kind: 'quest', description: 'Quest target · top of the Favela rooftops (parkour)' },
  { id: 'beacon3', label: 'Energy Beacon #3', x: 58, y: 0, z: -46, icon: '⚡', kind: 'quest', description: 'Quest target · Cable Car Station (puzzle)' },
  { id: 'tower', label: 'Energy Tower', x: 0, y: 0, z: -46, icon: '🗼', kind: 'landmark', description: 'The heart of the Rio energy network.' },
  { id: 'apartment', label: 'Rio Apartment', x: -31, y: 0, z: 29, icon: '🏠', kind: 'apartment', description: 'Your personal residence in Rio.' },
  { id: 'merchant', label: 'Market Merchant', x: 70, y: 0, z: -5, icon: '🛍️', kind: 'shop', description: 'Shop: skins, furniture, pets and vehicles.' },
  { id: 'pier', label: 'Pier Viewpoint', x: 40, y: 0.6, z: 108, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'favela-vp', label: 'Favela Viewpoint', x: -111, y: 11.4, z: -46, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'cable-vp', label: 'Cable Station Roof', x: 72, y: 8, z: -70, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'summit', label: 'Mountain Summit', x: 112, y: 24, z: -120, icon: '⛰️', kind: 'quest', description: 'Floating path from the cable station roof.' },
  { id: 'event', label: 'Event Stage', x: 85, y: 0, z: 46, icon: '🎉', kind: 'event', description: 'SAI FEST RIO — coming soon.' },
  { id: 'carnival', label: 'Carnival Plaza', x: 130, y: 0, z: -18, icon: '🎭', kind: 'landmark', description: 'NFT holders only: exclusive Rio Sai skin & trophy.' },
];

export const poiById = (id: string) => RIO_POIS.find((p) => p.id === id);

export interface FastTravelPoint {
  id: string;
  name: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
}

export const RIO_FAST_TRAVEL_POINTS: FastTravelPoint[] = [
  { id: 'plaza', name: 'Central Plaza', x: 0, y: 0, z: 18, yaw: Math.PI },
  { id: 'beach', name: 'Beach', x: 0, y: 0, z: 74, yaw: 0 },
  { id: 'favela', name: 'Favela Hills', x: -46, y: 0, z: 2, yaw: -Math.PI / 2 },
  { id: 'cable', name: 'Cable Station', x: 52, y: 0, z: -40, yaw: Math.PI },
  { id: 'apartment', name: 'Apartment', x: -31, y: 0, z: 25, yaw: Math.PI },
];

export const RIO_SPAWNS: Record<string, Spawn> = {
  portal: [0, 0, 28, Math.PI],
  apartment: [-31, 0, 26, Math.PI],
};

// ───────────────────────── Geometry ─────────────────────────

const RIO_COLORS = ['#f2c14e', '#f78154', '#4d9de0', '#e15554', '#3bb273', '#7768ae', '#f4a6c1', '#5fc9c4', '#fff3d6', '#ffb26b'];

/** Parkour route up the Favela to Beacon #2. Heights grow in jumpable steps. */
export const FAVELA_ROUTE: BlockDef[] = [
  { x: -54, z: -4, w: 6, d: 6, h: 1.2, color: '#f2c14e' },
  { x: -61, z: -11, w: 5, d: 5, h: 2.4, color: '#f78154' },
  { x: -68, z: -18, w: 5, d: 6, h: 3.6, color: '#4d9de0' },
  { x: -76, z: -24, w: 6, d: 5, h: 5.6, color: '#e15554' },
  { x: -84, z: -29, w: 5, d: 5, h: 6.8, color: '#3bb273' },
  { x: -92, z: -34, w: 6, d: 6, h: 8.0, color: '#7768ae' },
  { x: -101, z: -40, w: 5, d: 5, h: 10.2, color: '#f4a6c1' },
  { x: -111, z: -46, w: 8, d: 8, h: 11.4, color: '#5fc9c4' },
];

/** Hidden rooftop next to Beacon #2 with a Golden Sai Token. */
export const SECRET_ROOF: BlockDef = { x: -120, z: -54, w: 4, d: 4, h: 11.0, color: '#f2c14e' };

/** Floating path from the cable station roof to the summit (chapter 2). */
export const SUMMIT_PATH: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * Math.PI * 1.3;
    const x = 84 + t * 24 + Math.sin(a) * 6;
    const z = -76 - t * 40 + Math.cos(a) * 3;
    const y = 9.4 + i * 1.45;
    pts.push([x, y, z]);
  }
  return pts;
})();
export const SUMMIT: [number, number, number] = [112, 24.4, -120];

/** Favela houses and parkour blocks; regular buildings come from the city kit (cityKit.ts). */
export function buildRioBlocks(): { blocks: BlockDef[]; parkour: BlockDef[] } {
  const r = rng(2026);
  const pick = () => RIO_COLORS[Math.floor(r() * RIO_COLORS.length)];
  const blocks: BlockDef[] = [];

  // Favela houses — dense, colourful, mostly low (some are climbable shortcuts)
  for (let i = 0; i < 70; i++) {
    const x = -140 + r() * 88;
    const z = -72 + r() * 98;
    if (Math.abs(x + 80) < 32 && Math.abs(z + 25) < 26 && r() < 0.8) continue; // keep the route readable
    const w = 4 + r() * 4;
    const d = 4 + r() * 4;
    const hitsRoute = [...FAVELA_ROUTE, SECRET_ROOF].some(
      (b) => Math.abs(b.x - x) < (b.w + w) / 2 + 2 && Math.abs(b.z - z) < (b.d + d) / 2 + 2,
    );
    if (hitsRoute) continue;
    // never bury a collectible, secret or fast-travel point inside a house
    const covers = (px: number, pz: number) => Math.abs(px - x) < w / 2 + 1.5 && Math.abs(pz - z) < d / 2 + 1.5;
    if (RIO_ORBS.some(([px, , pz]) => covers(px, pz)) || RIO_FAST_TRAVEL_POINTS.some((f) => covers(f.x, f.z))) continue;
    const distWest = (-x - 50) / 90;
    const h = 2.5 + distWest * 9 * r() + r() * 2;
    blocks.push({ x, z, w, d, h, color: pick(), kind: 'facade' });
  }
  return { blocks, parkour: [...FAVELA_ROUTE, SECRET_ROOF] };
}

export const RIO_ORBS: [number, number, number][] = [
  [10, 1.2, -4],
  [-6, 1.2, 14],
  [0, 1.2, -20],
  [36, 1.2, 0],
  [52, 1.2, 3],
  [76, 1.2, -2],
  [96, 1.2, 4],
  [-20, 1.2, 70],
  [12, 1.2, 82],
  [30, 1.2, 92],
  [60, 1.2, 78],
  [90, 1.2, 88],
  [-54, 2.4, -4],
  [-68, 4.8, -18],
  [-84, 8.0, -29],
  [-101, 11.4, -40],
  [-60, 1.2, 14],
  [52, 1.2, -58],
  [80, 1.2, -50],
  [66, 9.2, -66],
  [80, 1.2, 36],
  [96, 1.2, 30],
  [-30, 1.2, 0],
  [-40, 1.2, -30],
  [120, 1.2, 20],
];

export const RIO_TOKENS: { id: string; pos: [number, number, number] }[] = [
  { id: 'token1', pos: [0, 1.2, -60] },
  { id: 'token2', pos: [45, 1.4, 110] },
  { id: 'token3', pos: [-120, 12.2, -54] },
  { id: 'token4', pos: [78, 9.2, -76] },
  { id: 'token5', pos: [92, 2.6, 49] },
];

export const RIO_VIEWPOINTS: { id: string; pos: [number, number, number]; name: string }[] = [
  { id: 'pier', pos: [40, 0.6, 106], name: 'Pier Viewpoint' },
  { id: 'favela', pos: [-111, 11.4, -46], name: 'Favela Viewpoint' },
  { id: 'cable', pos: [72, 8, -70], name: 'Cable Station Roof' },
];

/** Citizens walking loops through the city. */
export const RIO_WALKERS: { path: [number, number][]; shirt: string }[] = [
  { path: [[-20, 10], [20, 10], [20, -14], [-20, -14]], shirt: '#e15554' },
  { path: [[30, 4], [110, 4]], shirt: '#3bb273' },
  { path: [[108, -4], [30, -4]], shirt: '#f2c14e' },
  { path: [[-60, 74], [120, 74]], shirt: '#4d9de0' },
  { path: [[130, 96], [-50, 96]], shirt: '#f78154' },
  { path: [[-4, 26], [-4, 66], [4, 66], [4, 26]], shirt: '#7768ae' },
  { path: [[50, -24], [50, -58], [70, -58], [70, -24]], shirt: '#5fc9c4' },
  { path: [[-44, 20], [-44, -20], [-30, -20]], shirt: '#f4a6c1' },
];

for (const f of RIO_FAST_TRAVEL_POINTS) RIO_SPAWNS[`ft:${f.id}`] = [f.x, f.y, f.z, f.yaw];
