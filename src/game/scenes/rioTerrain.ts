/**
 * Scenery around Copacabana (not walkable): green hills behind the city with
 * Corcovado, plus Sugarloaf and Urca rising from the bay in the east.
 */

/** Hill bumps behind the city: [x, z, radius, height]. */
const HILLS: [number, number, number, number][] = [
  [-250, -330, 70, 205], // Corcovado
  [-330, -260, 110, 110],
  [-150, -230, 90, 85],
  [-40, -260, 120, 120],
  [80, -230, 90, 80],
  [200, -280, 110, 130],
  [60, -360, 150, 160],
  [-180, -150, 55, 38],
  [40, -160, 55, 30],
  [-430, -160, 120, 90],
  [330, -320, 140, 120],
];

export const CORCOVADO: [number, number] = [-250, -330];

const smooth = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Terrain height behind the city; 0 near the streets. */
export function hillHeight(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, hh] of HILLS) {
    const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r);
    h += hh * Math.exp(-d2);
  }
  // gentle ripple so slopes are not perfectly smooth
  h += 6 * Math.sin(x * 0.031) * Math.cos(z * 0.027) + 3 * Math.sin(x * 0.07 + z * 0.05);
  return Math.max(0, h) * smooth(-95, -150, z);
}

/** Islands in the bay: [x, z, base radius, height, rocky]. */
export const BAY_PEAKS: { x: number; z: number; r: number; h: number; rock: boolean }[] = [
  { x: 330, z: -150, r: 62, h: 175, rock: true }, // Sugarloaf
  { x: 240, z: -105, r: 70, h: 72, rock: false }, // Urca
  { x: 420, z: -40, r: 50, h: 60, rock: false },
  { x: 470, z: 120, r: 45, h: 48, rock: false },
];

/** Profile of a bay peak at relative height t ∈ [0, 1] → radius factor. */
export function peakProfile(t: number, rock: boolean) {
  return rock ? Math.pow(Math.max(0, 1 - t ** 2.4), 0.55) : Math.pow(Math.max(0, 1 - t ** 1.6), 0.7);
}
