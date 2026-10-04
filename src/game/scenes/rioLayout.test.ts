import { describe, expect, it } from 'vitest';
import { FAVELA_ROUTE, SECRET_ROOF, SUMMIT, SUMMIT_PATH } from './rioLayout';

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

describe('parkour routes are reachable', () => {
  it('favela route to Beacon #2 starts jumpable from the street', () => {
    expect(FAVELA_ROUTE[0].h).toBeLessThan(SINGLE);
    checkRoute(FAVELA_ROUTE.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d, top: b.h })));
  });

  it('secret rooftop is reachable from the beacon roof', () => {
    const roof = FAVELA_ROUTE[FAVELA_ROUTE.length - 1];
    checkRoute([
      { x: roof.x, z: roof.z, w: roof.w, d: roof.d, top: roof.h },
      { x: SECRET_ROOF.x, z: SECRET_ROOF.z, w: SECRET_ROOF.w, d: SECRET_ROOF.d, top: SECRET_ROOF.h },
    ]);
  });

  it('summit path from the cable station roof', () => {
    const station: Plat = { x: 70, z: -70, w: 18, d: 14, top: 8 };
    const plats = SUMMIT_PATH.map(([x, y, z]) => ({ x, z, w: 3.4, d: 3.4, top: y }));
    const summit: Plat = { x: SUMMIT[0], z: SUMMIT[2], w: 9, d: 9, top: SUMMIT[1] };
    checkRoute([station, ...plats, summit]);
  });
});

import { buildRioBlocks, RIO_ORBS, RIO_TOKENS, RIO_FAST_TRAVEL_POINTS, RIO_POIS } from './rioLayout';
import { buildRioCity, footprint } from './cityKit';

describe('city layout', () => {
  const city = buildRioCity();
  const solids = [
    ...buildRioBlocks().blocks.map((b) => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2, top: (b.y ?? 0) + b.h })),
    ...city
      .filter((p) => p.solid)
      .map((p) => {
        const f = footprint(p);
        return { x0: p.x - f.w / 2, x1: p.x + f.w / 2, z0: p.z - f.d / 2, z1: p.z + f.d / 2, top: f.h };
      }),
  ];
  const buried = (x: number, y: number, z: number) => solids.some((s) => x > s.x0 - 0.5 && x < s.x1 + 0.5 && z > s.z0 - 0.5 && z < s.z1 + 0.5 && y < s.top);

  it('places a real city', () => {
    expect(city.length).toBeGreaterThan(30);
  });

  it('keeps orbs, secrets, quest points and fast travel reachable (not inside buildings)', () => {
    for (const [x, y, z] of RIO_ORBS) expect(buried(x, y, z), `orb ${x},${z}`).toBe(false);
    for (const t of RIO_TOKENS) expect(buried(t.pos[0], t.pos[1], t.pos[2]), t.id).toBe(false);
    for (const f of RIO_FAST_TRAVEL_POINTS) expect(buried(f.x, 0.1, f.z), f.id).toBe(false);
    for (const p of RIO_POIS) if (p.y === 0) expect(buried(p.x, 0.1, p.z), p.id).toBe(false);
  });
});
