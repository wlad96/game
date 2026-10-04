import type { Spawn } from '../game/Player';

export const ROOM_SPAWNS: Record<string, Spawn> = {
  door: [0, 0, 4, Math.PI],
  portal: [5, 0, 2.5, Math.PI],
};

export const ROOM_SLOTS = [
  { id: 's1', x: -3, z: 2.6, minLevel: 1 },
  { id: 's2', x: 2.6, z: 2.6, minLevel: 1 },
  { id: 's3', x: -2.6, z: -4.6, minLevel: 1 },
  { id: 's4', x: 3, z: -4.6, minLevel: 2 },
  { id: 's5', x: -6.6, z: -0.5, minLevel: 2 },
  { id: 's6', x: 4.6, z: -0.2, minLevel: 3 },
  { id: 's7', x: -3.6, z: -0.6, minLevel: 3 },
];

export const TROPHY_SLOTS = ['t1', 't2', 't3'];

export const ROOM_LEVELS = [
  { level: 1, name: 'Rio Apartment Level 1', slots: 3, cost: 0 },
  { level: 2, name: 'Rio Apartment Level 2', slots: 5, cost: 300 },
  { level: 3, name: 'Explorer Residence', slots: 7, cost: 800 },
  { level: 4, name: 'Luxury Residence', slots: 7, cost: 1500 },
];

