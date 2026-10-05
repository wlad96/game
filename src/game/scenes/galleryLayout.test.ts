import { describe, expect, it } from 'vitest';
import { nftName } from '../../data/art';
import { galleryLayout } from './galleryLayout';

describe('gallery layout', () => {
  for (const n of [5, 16, 40, 44, 80, 120]) {
    it(`fits ${n} NFTs without overlaps and keeps the exit free`, () => {
      const { R, frames, rows } = galleryLayout(n);
      expect(frames).toHaveLength(n);
      for (const f of frames) {
        expect(Math.hypot(f.x, f.z)).toBeLessThan(R);
        // exit in the south (+z): no frame within ±0.45 rad of angle 0
        const a = Math.atan2(Math.sin(f.a), Math.cos(f.a));
        expect(Math.abs(a)).toBeGreaterThan(0.45);
      }
      // neighbours on the same row are at least a frame apart
      for (const f of frames)
        for (const g of frames)
          if (f !== g && f.y === g.y) expect(Math.hypot(f.x - g.x, f.z - g.z)).toBeGreaterThan(f.size + 0.4);
      expect(rows).toBe(n > 44 ? 2 : 1);
    });
  }
});

describe('nft names', () => {
  it('drops the leading number', () => {
    expect(nftName('007 Sai Astronaut')).toBe('Sai Astronaut');
    expect(nftName('12-Golden_Sai')).toBe('Golden Sai');
    expect(nftName('42')).toBe('#42');
  });
});
