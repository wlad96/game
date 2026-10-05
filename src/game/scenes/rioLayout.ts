import type { Spawn } from '../Player';
import type { BlockDef } from '../SceneKit';

/**
 * Rio de Janeiro — Copacabana. A playable strip along Avenida Atlântica:
 * the building frontage, the avenue and the wave-patterned promenade. The
 * beach, the ocean, the hills, Sugarloaf and the Redeemer are scenery.
 * x → east, z → south (towards the ocean). Shared by the 3D scene, the
 * minimap and the world map so they never disagree.
 */

/** Street cross-section (z). */
export const STREET = {
  /** Building frontage (row A facades). */
  front: -14,
  /** North sidewalk: front … roadN0. */
  roadN: [-6, 3] as [number, number],
  median: [3, 6] as [number, number],
  roadS: [6, 15] as [number, number],
  /** Calçadão (promenade): roadS[1] … beach. */
  beach: 27,
  /** Waterline. */
  shore: 86,
  /** Row B facades (second row of buildings). */
  backFront: -34,
  /** Invisible wall behind the city blocks. */
  north: -62,
};

export const RIO_BOUNDS = { minX: -156, maxX: 156, minZ: -112, maxZ: STREET.beach };

/** Side streets cut through the frontage: [x0, x1]. */
export const SIDE_STREETS = {
  carnival: [-112.5, -103.5] as [number, number],
  tower: [-4.5, 4.5] as [number, number],
};
/** Plazas behind the frontage (gaps in the second row). */
export const PLAZAS = {
  carnival: { x0: -130, x1: -86, z0: STREET.north, z1: STREET.backFront },
  tower: { x0: -22, x1: 22, z0: STREET.north, z1: STREET.backFront },
  /** East end: Cable Car Station square and the park up the hill. */
  station: { x0: 116, x1: 156, z0: RIO_BOUNDS.minZ, z1: STREET.front },
};

export interface Zone {
  id: string;
  name: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  color: string;
}

// Specific zones first: the HUD shows the first zone containing the player.
export const RIO_ZONES: Zone[] = [
  { id: 'apartment', name: 'Player Apartment', x0: -72, z0: -24, x1: -48, z1: -14, color: '#8fc1e8' },
  { id: 'rooftops', name: 'Rooftop Route', x0: 34, z0: -26, x1: 62, z1: -6, color: '#c48f6a' },
  { id: 'tower', name: 'Energy Tower Square', x0: -22, z0: -62, x1: 22, z1: -34, color: '#a8c8e8' },
  { id: 'carnival', name: 'Carnival Plaza (NFT)', x0: -130, z0: -62, x1: -86, z1: -34, color: '#f5c542' },
  { id: 'park', name: 'Morro Park', x0: 116, z0: -112, x1: 156, z1: -62, color: '#6f9a6a' },
  { id: 'cable', name: 'Cable Car Station', x0: 116, z0: -62, x1: 156, z1: -14, color: '#9fb6c9' },
  { id: 'event', name: 'Event Stage', x0: 56, z0: 27, x1: 84, z1: 40, color: '#d6a8e8' },
  { id: 'promenade', name: 'Copacabana Promenade', x0: -156, z0: 15, x1: 156, z1: 27, color: '#ece6d6' },
  { id: 'avenue', name: 'Avenida Atlântica', x0: -156, z0: -14, x1: 156, z1: 15, color: '#6a717c' },
  { id: 'blocks', name: 'Copacabana Blocks', x0: -156, z0: -62, x1: 116, z1: -14, color: '#c9ced6' },
  { id: 'beach', name: 'Copacabana Beach', x0: -156, z0: 27, x1: 156, z1: STREET.shore, color: '#f0d9a0' },
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

// ───────────────────────── Rooftop route (Beacon #2) ─────────────────────────

/**
 * Hand-placed frontage buildings the rooftop route climbs (city kit, scale 9).
 * Kept here so the route test and the scene share one source.
 */
export const ROUTE_BUILDINGS: { model: string; x: number }[] = [
  { model: 'building-c', x: 41 }, // roof 8.0
  { model: 'building-a', x: 49.32 }, // roof 11.6
  { model: 'building-f', x: 57.46 }, // roof 15.2 — Beacon #2
  { model: 'building-l', x: 67.8 },
];

/** Street furniture and roof clutter that make the climb (kiosk → shelter → balcony → roofs). */
export const ROOF_ROUTE: BlockDef[] = [
  { x: 36.5, z: -9, w: 3, d: 2.4, h: 1.4, color: '#f2c14e' }, // newsstand
  { x: 40.5, z: -11.2, w: 4.4, d: 2.4, h: 3.4, color: '#4d9de0' }, // bus shelter
  { x: 44, z: -12.8, w: 4, d: 2.4, h: 0.6, y: 5.2, color: '#f78154' }, // balcony
  { x: 44, z: -21, w: 2.4, d: 3, h: 1.8, y: 8.01, color: '#cfd8e3' }, // AC unit on roof 1
  { x: 52.3, z: -19, w: 2, d: 2, h: 1.8, y: 11.61, color: '#cfd8e3' }, // water tank on roof 2
];
/** Order of the climb, as indexes into [...ROOF_ROUTE] (r) and ROUTE_BUILDINGS (b). */
export const ROUTE_ORDER: ({ r: number } | { b: number })[] = [{ r: 0 }, { r: 1 }, { r: 2 }, { b: 0 }, { r: 3 }, { b: 1 }, { r: 4 }, { b: 2 }];

export const BEACON2: [number, number, number] = [57.46, 15.21, -18.6];

/** Hidden water tower behind the beacon roof with a Golden Sai Token. */
export const SECRET_ROOF: BlockDef = { x: 57.5, z: -25.2, w: 3, d: 2.6, h: 17.4, color: '#cfd8e3' };

// ───────────────────────── Cable station and the summit path ─────────────────────────

export const STATION: BlockDef = { x: 138, z: -40, w: 18, d: 14, h: 8, color: '#e8eef5', kind: 'facadeLit', roof: '#9fb6c9' };
/** Stairs up the west side of the station. */
/**
 * Stairs along the station's street side, rising eastwards to roof height; the
 * top step sits right next to the roof edge. Each rise is below the physics step height.
 */
export const STAIR_RISE = 0.4;
const STAIR_RUN = 0.9;
const STAIR_COUNT = Math.ceil(STATION.h / STAIR_RISE);
export const STATION_STAIRS: BlockDef[] = Array.from({ length: STAIR_COUNT }, (_, i) => ({
  x: STATION.x - STATION.w / 2 + STAIR_RUN * (i + 0.5),
  z: STATION.z + STATION.d / 2 + 2,
  w: STAIR_RUN + 0.02,
  d: 4,
  h: Math.min(STATION.h, STAIR_RISE * (i + 1)),
  color: '#cfd8e3',
}));

/** Floating path from the cable station roof up to the summit (chapter 2). */
export const SUMMIT_PATH: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * Math.PI * 1.3;
    const x = 140 - t * 6 + Math.sin(a) * 7;
    const z = -51 - t * 44 + Math.cos(a) * 2;
    pts.push([x, 9.4 + i * 1.45, z]);
  }
  return pts;
})();
export const SUMMIT: [number, number, number] = [130, 24.4, -104];

// ───────────────────────── Points of interest ─────────────────────────

export const PORTAL_POS: [number, number, number] = [-9, 0, 21];
export const BEACON1: [number, number, number] = [-40, 0, 21];
export const BEACON3: [number, number, number] = [128, 0, -22];
export const TOWER_POS: [number, number, number] = [0, 0, -50];
export const APARTMENT_DOOR: [number, number, number] = [-60, 0, -13];

export const RIO_POIS: Poi[] = [
  { id: 'portal', label: 'Portal to Home Planet', x: PORTAL_POS[0], y: 0, z: PORTAL_POS[2], icon: '🌀', kind: 'portal', description: 'Return to the Sai Home Planet.' },
  { id: 'technician', label: 'Rio Technician', x: 7, y: 0, z: 21, icon: '🧑‍🔧', kind: 'npc', description: 'Story quest giver: Energy of Rio.' },
  { id: 'beacon1', label: 'Energy Beacon #1', x: BEACON1[0], y: 0, z: BEACON1[2], icon: '⚡', kind: 'quest', description: 'Quest target · Copacabana Promenade' },
  { id: 'beacon2', label: 'Energy Beacon #2', x: BEACON2[0], y: BEACON2[1], z: BEACON2[2], icon: '⚡', kind: 'quest', description: 'Quest target · rooftops across the avenue (parkour)' },
  { id: 'beacon3', label: 'Energy Beacon #3', x: BEACON3[0], y: 0, z: BEACON3[2], icon: '⚡', kind: 'quest', description: 'Quest target · Cable Car Station (puzzle)' },
  { id: 'tower', label: 'Energy Tower', x: TOWER_POS[0], y: 0, z: TOWER_POS[2], icon: '🗼', kind: 'landmark', description: 'The heart of the Rio energy network.' },
  { id: 'apartment', label: 'Rio Apartment', x: APARTMENT_DOOR[0], y: 0, z: APARTMENT_DOOR[2], icon: '🏠', kind: 'apartment', description: 'Your personal residence in Rio.' },
  { id: 'merchant', label: 'Beach Kiosk Merchant', x: 30, y: 0, z: 18.6, icon: '🛍️', kind: 'shop', description: 'Shop: skins, furniture, pets and vehicles.' },
  { id: 'lookout', label: 'Beach Lookout', x: 96, y: 0, z: 25, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'rooftop-vp', label: 'Rooftop Viewpoint', x: 55, y: BEACON2[1], z: -21.4, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'cable-vp', label: 'Cable Station Roof', x: 144, y: 8, z: -36, icon: '📷', kind: 'viewpoint', description: 'Viewpoint · daily quest' },
  { id: 'summit', label: 'Mountain Summit', x: SUMMIT[0], y: SUMMIT[1], z: SUMMIT[2], icon: '⛰️', kind: 'quest', description: 'Floating path from the cable station roof.' },
  { id: 'event', label: 'Event Stage', x: 70, y: 0, z: 31, icon: '🎉', kind: 'event', description: 'SAI FEST RIO — coming soon.' },
  { id: 'carnival', label: 'Carnival Plaza', x: -108, y: 0, z: -48, icon: '🎭', kind: 'landmark', description: 'NFT holders only: exclusive Rio Sai skin & trophy.' },
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
  { id: 'promenade', name: 'Copacabana Promenade', x: 14, y: 0, z: 23, yaw: Math.PI },
  { id: 'leme', name: 'West Promenade', x: -110, y: 0, z: 19, yaw: Math.PI },
  { id: 'tower', name: 'Energy Tower Square', x: -12, y: 0, z: -38, yaw: Math.PI },
  { id: 'cable', name: 'Cable Station', x: 124, y: 0, z: -14, yaw: Math.PI },
  { id: 'apartment', name: 'Apartment', x: -66, y: 0, z: -9, yaw: Math.PI },
];

export const RIO_SPAWNS: Record<string, Spawn> = {
  portal: [4, 0, 20, Math.PI],
  apartment: [APARTMENT_DOOR[0], 0, -9, 0],
};

export const RIO_ORBS: [number, number, number][] = [
  // promenade
  [-14, 1.2, 21],
  [-26, 1.2, 18],
  [-60, 1.2, 22],
  [-90, 1.2, 19],
  [-136, 1.2, 22],
  [16, 1.2, 22],
  [48, 1.2, 18],
  [80, 1.2, 22],
  [110, 1.2, 19],
  // median (raised planter)
  [-20, 1.5, 4.5],
  [20, 1.5, 4.5],
  [-80, 1.5, 4.5],
  [100, 1.5, 4.5],
  // north sidewalk
  [-30, 1.2, -9],
  [-96, 1.2, -10],
  [20, 1.2, -9],
  [88, 1.2, -10],
  // side streets and plazas
  [0, 1.2, -24],
  [12, 1.2, -44],
  [-12, 1.2, -56],
  [136, 1.2, -20],
  // rooftop route
  [44, 7.0, -12.8],
  [41, 9.2, -18],
  [49.3, 12.8, -17],
  [146, 9.2, -36],
];

export const RIO_TOKENS: { id: string; pos: [number, number, number] }[] = [
  { id: 'token1', pos: [0, 1.2, -60] },
  { id: 'token2', pos: [-80, 3.8, 21] },
  { id: 'token3', pos: [SECRET_ROOF.x, SECRET_ROOF.h + 1.2, SECRET_ROOF.z] },
  { id: 'token4', pos: [130, 1.2, -96] },
  { id: 'token5', pos: [-150, 1.5, 4.5] },
];

export const RIO_VIEWPOINTS: { id: string; pos: [number, number, number]; name: string }[] = [
  { id: 'lookout', pos: [96, 0, 25], name: 'Beach Lookout' },
  { id: 'rooftop', pos: [55, BEACON2[1], -21.4], name: 'Rooftop Viewpoint' },
  { id: 'cable', pos: [144, 8, -36], name: 'Cable Station Roof' },
];

/** Pedestrians walking loops (Kenney mini characters). */
export const RIO_WALKERS: { path: [number, number][]; model: number }[] = [
  { path: [[-150, 17.2], [150, 17.2]], model: 0 },
  { path: [[140, 23.5], [-140, 23.5]], model: 1 },
  { path: [[-60, 17.2], [60, 17.2]], model: 2 },
  { path: [[110, -8.5], [64, -8.5]], model: 3 },
  { path: [[-140, -8.5], [30, -8.5]], model: 4 },
  { path: [[-2, -10], [-2, -40], [16, -52], [-16, -52], [-2, -40]], model: 5 },
  { path: [[118, -16], [150, -16], [150, -30], [118, -30]], model: 6 },
  { path: [[20, 23.5], [140, 23.5]], model: 7 },
];

/** Kiosks on the promenade: [x, height]; the merchant's and a climbable one with a secret. */
export const KIOSKS: [number, number][] = [
  [-120, 2.6],
  [-80, 2.6],
  [30, 2.6],
  [130, 2.6],
];

for (const f of RIO_FAST_TRAVEL_POINTS) RIO_SPAWNS[`ft:${f.id}`] = [f.x, f.y, f.z, f.yaw];
