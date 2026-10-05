import { PORTALS } from '../../data/cities';
import type { Spawn } from '../Player';

export const CORE: [number, number] = [0, -6];
/** Walkable plaza radius (railing), the island rim around it and the monorail ring over the rim. */
export const PLAZA_R = 45.5;
export const ISLAND_R = 56;
export const MONORAIL = { r: 51, y: 6, segments: 64 };
const ARC_R = 32;
const ANGLES = [-70, -35, 0, 35, 70];

export const HOME_PORTALS = PORTALS.map((p, i) => {
  const a = (ANGLES[i] * Math.PI) / 180;
  const x = CORE[0] + Math.sin(a) * ARC_R;
  const z = CORE[1] - Math.cos(a) * ARC_R;
  const yaw = Math.atan2(CORE[0] - x, CORE[1] - z);
  return { ...p, x, z, yaw };
});

function portalSpawn(city: string): Spawn {
  const p = HOME_PORTALS.find((h) => h.city === city)!;
  return [p.x + Math.sin(p.yaw) * 6, 0, p.z + Math.cos(p.yaw) * 6, p.yaw];
}

export const HOME_SPAWNS: Record<string, Spawn> = {
  start: [0, 0, 30, Math.PI],
  rio: portalSpawn('rio'),
  home: [-20, 0, 18, Math.PI * 0.75],
  gallery: [-29, 0, 6, Math.PI / 2],
};

/** Home-plaza points shown on the world map. */
export const HOME_POIS = [
  { id: 'core', label: 'Sai Core', x: 0, z: -6, icon: '🌐' },
  ...HOME_PORTALS.map((p) => ({ id: `portal-${p.city}`, label: `Portal: ${p.name}`, x: p.x, z: p.z, icon: p.status === 'open' ? '🌀' : '🔒' })),
  { id: 'terminal', label: 'Quest Terminal', x: -12, z: 12, icon: '📜' },
  { id: 'shop', label: 'Shop', x: 13, z: 12, icon: '🛍️' },
  { id: 'gallery', label: 'NFT Gallery', x: -34, z: 6, icon: '🖼️' },
  { id: 'event', label: 'Event Portal', x: 34, z: 6, icon: '🎉' },
  { id: 'homeportal', label: 'Player Home Portal', x: -24, z: 24, icon: '🏠' },
  { id: 'season', label: 'Season Board', x: 24, z: 24, icon: '🏆' },
];

