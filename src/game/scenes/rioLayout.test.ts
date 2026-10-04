import { describe, expect, it } from 'vitest';
import { buildRioBuildings, footprint, KIT, S } from './cityKit';
import {
  BEACON2,
  KIOSKS,
  RIO_BOUNDS,
  RIO_FAST_TRAVEL_POINTS,
  RIO_ORBS,
  RIO_POIS,
  RIO_TOKENS,
  ROOF_ROUTE,
  ROUTE_BUILDINGS,
  ROUTE_ORDER,
  SECRET_ROOF,
  STATION,
  STREET,
  SUMMIT,
  SUMMIT_PATH,
} from './rioLayout';

// Controller limits (see Player.tsx): jump 10.2 m/s, double jump 9.2 m/s, gravity 28.
const SINGLE = (10.2 * 10.2) / (2 * 28); // ≈1.86 m
const DOUBLE = SINGLE + (9.2 * 9.2) / (2 * 28); // ≈3.37 m
const MAX_GAP = 5; // horizontal metres a running double jump clears comfortably

interface Plat {
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
}

const gap = (a: Plat, b: Plat) =>
  Math.hypot(Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2), Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2));

function checkRoute(route: Plat[]) {
  for (let i = 1; i < route.length; i++) {
    const rise = route[i].top - route[i - 1].top;
    expect(rise, `rise into step ${i}`).toBeLessThan(DOUBLE - 0.6);
    expect(gap(route[i - 1], route[i]), `gap into step ${i}`).toBeLessThan(MAX_GAP);
  }
}

const buildingPlat = (i: number): Plat => {
  const b = ROUTE_BUILDINGS[i];
  const [w, h, d] = KIT[b.model];
  return { x: b.x, z: STREET.front - (d * S) / 2, w: w * S, d: d * S, top: h * S };
};

describe('parkour routes are reachable', () => {
  const route = ROUTE_ORDER.map((s) => {
    if ('b' in s) return buildingPlat(s.b);
    const r = ROOF_ROUTE[s.r];
    return { x: r.x, z: r.z, w: r.w, d: r.d, top: (r.y ?? 0) + r.h };
  });

  it('rooftop route to Beacon #2 starts jumpable from the street', () => {
    expect(route[0].top).toBeLessThan(SINGLE);
    checkRoute(route);
  });

  it('Beacon #2 stands on the last roof of the route', () => {
    const last = route[route.length - 1];
    expect(BEACON2[1]).toBeCloseTo(last.top, 1);
    expect(Math.abs(BEACON2[0] - last.x)).toBeLessThan(last.w / 2 - 1.5);
    expect(Math.abs(BEACON2[2] - last.z)).toBeLessThan(last.d / 2 - 1.5);
  });

  it('secret water tower is reachable from the beacon roof', () => {
    checkRoute([route[route.length - 1], { x: SECRET_ROOF.x, z: SECRET_ROOF.z, w: SECRET_ROOF.w, d: SECRET_ROOF.d, top: SECRET_ROOF.h }]);
  });

  it('summit path from the cable station roof', () => {
    const station: Plat = { x: STATION.x, z: STATION.z, w: STATION.w, d: STATION.d, top: STATION.h };
    const plats = SUMMIT_PATH.map(([x, y, z]) => ({ x, z, w: 3.4, d: 3.4, top: y }));
    const summit: Plat = { x: SUMMIT[0], z: SUMMIT[2], w: 9, d: 9, top: SUMMIT[1] };
    checkRoute([station, ...plats, summit]);
    for (const p of [...plats, summit]) expect(p.z).toBeGreaterThan(RIO_BOUNDS.minZ + 3);
  });
});

describe('city layout', () => {
  const city = buildRioBuildings();
  const solids = [
    ...[...ROOF_ROUTE, SECRET_ROOF, STATION].map((b) => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2, y0: b.y ?? 0, top: (b.y ?? 0) + b.h })),
    ...KIOSKS.map(([x, h]) => ({ x0: x - 2, x1: x + 2, z0: 19.5, z1: 22.5, y0: 0, top: h })),
    ...city
      .filter((p) => p.solid)
      .map((p) => {
        const f = footprint(p);
        return { x0: p.x - f.w / 2, x1: p.x + f.w / 2, z0: p.z - f.d / 2, z1: p.z + f.d / 2, y0: 0, top: f.h };
      }),
  ];
  const buried = (x: number, y: number, z: number) =>
    solids.some((s) => x > s.x0 - 0.5 && x < s.x1 + 0.5 && z > s.z0 - 0.5 && z < s.z1 + 0.5 && y > s.y0 - 1.6 && y < s.top);

  it('places a real city', () => {
    expect(city.filter((p) => p.solid).length).toBeGreaterThan(25);
  });

  it('keeps the frontage, the street and the promenade clear', () => {
    for (const p of city.filter((c) => c.solid)) {
      const f = footprint(p);
      expect(p.z + f.d / 2, p.model).toBeLessThanOrEqual(STREET.front + 0.01);
    }
  });

  it('keeps orbs, secrets, quest points and fast travel reachable (not inside buildings)', () => {
    for (const [x, y, z] of RIO_ORBS) expect(buried(x, y, z), `orb ${x},${z}`).toBe(false);
    for (const t of RIO_TOKENS) expect(buried(t.pos[0], t.pos[1], t.pos[2]), t.id).toBe(false);
    for (const f of RIO_FAST_TRAVEL_POINTS) expect(buried(f.x, 0.1, f.z), f.id).toBe(false);
    for (const p of RIO_POIS) if (p.y === 0) expect(buried(p.x, 0.1, p.z), p.id).toBe(false);
  });

  it('keeps every playable point inside the bounds', () => {
    const inside = (x: number, z: number) => x > RIO_BOUNDS.minX && x < RIO_BOUNDS.maxX && z > RIO_BOUNDS.minZ && z <= RIO_BOUNDS.maxZ;
    for (const [x, , z] of RIO_ORBS) expect(inside(x, z), `orb ${x},${z}`).toBe(true);
    for (const t of RIO_TOKENS) expect(inside(t.pos[0], t.pos[2]), t.id).toBe(true);
    for (const f of RIO_FAST_TRAVEL_POINTS) expect(inside(f.x, f.z), f.id).toBe(true);
  });
});
