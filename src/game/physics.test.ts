import { describe, expect, it } from 'vitest';
import { boxAt, groundHeight, raycastWorld, stepBody, World } from './physics';

const body = (x = 0, y = 0, z = 0) => ({ x, y, z, vx: 0, vy: 0, vz: 0, grounded: true });
const run = (w: World, b: ReturnType<typeof body>, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 120) stepBody(w, b, 1 / 120, -28);
};

describe('physics', () => {
  it('stands on the ground and falls back after a jump', () => {
    const w = new World();
    const b = body();
    b.vy = 10;
    b.grounded = false;
    run(w, b, 0.2);
    expect(b.y).toBeGreaterThan(1);
    run(w, b, 2);
    expect(b.y).toBe(0);
    expect(b.grounded).toBe(true);
  });

  it('is blocked by walls', () => {
    const w = new World();
    w.set([boxAt(3, 0, 1, 10, 5)], null);
    const b = body();
    b.vx = 6;
    run(w, b, 2);
    expect(b.x).toBeLessThan(2.5 - 0.44);
  });

  it('walks up small steps but not tall blocks', () => {
    const w = new World();
    w.set([boxAt(2, 0, 2, 4, 0.4)], null);
    const b = body();
    b.vx = 3;
    run(w, b, 0.8);
    expect(b.y).toBeCloseTo(0.4);
  });

  it('lands on a rooftop reachable with a double jump', () => {
    const w = new World();
    w.set([boxAt(0, 0, 4, 4, 3)], null);
    expect(groundHeight(w, 0, 0, 10)).toBe(3);
    const b = body(0, 3.5, 0);
    b.grounded = false;
    run(w, b, 1);
    expect(b.y).toBe(3);
  });

  it('clamps to rect bounds', () => {
    const w = new World();
    w.set([], { type: 'rect', minX: -5, maxX: 5, minZ: -5, maxZ: 5 });
    const b = body();
    b.vx = 20;
    run(w, b, 1);
    expect(b.x).toBe(5);
  });

  it('camera ray hits boxes', () => {
    const w = new World();
    w.set([boxAt(0, -5, 4, 2, 4)], null);
    expect(raycastWorld(w, 0, 1, 0, 0, 0, -1, 20)).toBeCloseTo(4);
  });
});
