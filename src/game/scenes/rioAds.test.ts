import { describe, expect, it } from 'vitest';
import { AD_SLOTS } from './rioAds';
import { RIO_BOUNDS } from './rioLayout';

describe('Rio ad spots', () => {
  it('has every kind of spot with unique codes', () => {
    const codes = AD_SLOTS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const k of ['facade', 'rooftop', 'citylight', 'beach', 'screen', 'blimp']) expect(AD_SLOTS.some((s) => s.kind === k)).toBe(true);
    expect(AD_SLOTS.filter((s) => s.kind === 'rooftop')).toHaveLength(4);
  });
  it('can be reached: every card opens from inside the walkable city', () => {
    for (const s of AD_SLOTS) {
      if (!s.use) continue;
      const [x, , z] = s.use;
      expect(x).toBeGreaterThan(RIO_BOUNDS.minX);
      expect(x).toBeLessThan(RIO_BOUNDS.maxX);
      expect(z).toBeGreaterThan(RIO_BOUNDS.minZ);
      expect(z).toBeLessThan(RIO_BOUNDS.maxZ);
    }
  });
  it('rooftop boards are spread along the avenue', () => {
    const xs = AD_SLOTS.filter((s) => s.kind === 'rooftop').map((s) => s.pos[0]).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(20);
  });
});
