import { describe, expect, it } from 'vitest';
import { generatePuzzle, isSolved, rotateMask, type NetPuzzle } from './puzzle';

/** Brute-force-with-pruning solver: proves every generated board has a solution. */
function solve(p: NetPuzzle): boolean {
  const { size } = p;
  const tiles = [...p.tiles];
  const opts = tiles.map((m) => {
    const set = new Set<number>();
    let t = m;
    for (let i = 0; i < 4; i++) {
      set.add(t);
      t = rotateMask(t);
    }
    return [...set];
  });
  const ok = (i: number, m: number) => {
    const x = i % size;
    const y = Math.floor(i / size);
    if (y === 0 && m & 1) return false;
    if (x === size - 1 && m & 2) return false;
    if (y === size - 1 && m & 4) return false;
    if (x === 0 && m & 8) return false;
    if (y > 0 && !!(m & 1) !== !!(tiles[i - size] & 4)) return false;
    if (x > 0 && !!(m & 8) !== !!(tiles[i - 1] & 2)) return false;
    return true;
  };
  const rec = (i: number): boolean => {
    if (i === tiles.length) return isSolved({ ...p, tiles });
    for (const m of opts[i]) {
      if (!ok(i, m)) continue;
      tiles[i] = m;
      if (rec(i + 1)) return true;
    }
    return false;
  };
  return rec(0);
}

describe('energy network puzzle', () => {
  it('rotates masks clockwise', () => {
    expect(rotateMask(1)).toBe(2);
    expect(rotateMask(8)).toBe(1);
    expect(rotateMask(5)).toBe(10);
  });

  it.each([
    [4, 7],
    [5, 31],
    [4, 1],
    [5, 2],
  ])('size %i seed %i is scrambled and solvable', (size, seed) => {
    const p = generatePuzzle(size, seed);
    expect(p.tiles).toHaveLength(size * size);
    expect(isSolved(p)).toBe(false);
    expect(solve(p)).toBe(true);
  });
});
