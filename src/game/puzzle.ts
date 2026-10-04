import { rng } from './rngCore';

/**
 * "Energy Network" mini-game (TZ §24–25): rotate tiles so every node is
 * connected to the core. Generated as a random spanning tree, so it is always
 * solvable, then scrambled.
 */

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export const rotateMask = (m: number) => ((m << 1) | (m >> 3)) & 15;

export interface NetPuzzle {
  size: number;
  source: number;
  /** Current tile masks (what the player sees). */
  tiles: number[];
}

const DIRS = [
  { bit: N, dx: 0, dy: -1, opp: S },
  { bit: E, dx: 1, dy: 0, opp: W },
  { bit: S, dx: 0, dy: 1, opp: N },
  { bit: W, dx: -1, dy: 0, opp: E },
];

export function generatePuzzle(size: number, seed: number): NetPuzzle {
  const r = rng(seed * 9973 + size);
  const n = size * size;
  const masks = new Array<number>(n).fill(0);
  const source = Math.floor(size / 2) * size + Math.floor(size / 2);
  const visited = new Set([source]);
  const stack = [source];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % size;
    const cy = Math.floor(cur / size);
    const options = DIRS.filter((d) => {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      return nx >= 0 && ny >= 0 && nx < size && ny < size && !visited.has(ny * size + nx);
    });
    // avoid 4-way crosses at the source so it reads as a "core"
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(r() * options.length)];
    const next = (cy + d.dy) * size + (cx + d.dx);
    masks[cur] |= d.bit;
    masks[next] |= d.opp;
    visited.add(next);
    stack.push(next);
  }
  const tiles = masks.map((m) => {
    let t = m;
    const k = Math.floor(r() * 4);
    for (let i = 0; i < k; i++) t = rotateMask(t);
    return t;
  });
  const p = { size, source, tiles };
  // never hand out an already-solved board
  if (isSolved(p)) tiles[0] = rotateMask(tiles[0]) === tiles[0] ? rotateMask(rotateMask(tiles[0])) : rotateMask(tiles[0]);
  if (isSolved(p)) tiles[n - 1] = rotateMask(tiles[n - 1]);
  return p;
}

/** Indices of tiles connected to the source. */
export function poweredTiles(p: NetPuzzle): Set<number> {
  const { size, tiles } = p;
  const seen = new Set([p.source]);
  const queue = [p.source];
  while (queue.length) {
    const cur = queue.shift()!;
    const cx = cur % size;
    const cy = Math.floor(cur / size);
    for (const d of DIRS) {
      if (!(tiles[cur] & d.bit)) continue;
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const ni = ny * size + nx;
      if (seen.has(ni) || !(tiles[ni] & d.opp)) continue;
      seen.add(ni);
      queue.push(ni);
    }
  }
  return seen;
}

export function isSolved(p: NetPuzzle) {
  return poweredTiles(p).size === p.size * p.size;
}

export function rotateTile(p: NetPuzzle, i: number): NetPuzzle {
  const tiles = [...p.tiles];
  tiles[i] = rotateMask(tiles[i]);
  return { ...p, tiles };
}

/** Leaves of the tree are the "energy nodes" that must be lit. */
export const isNode = (m: number) => m === N || m === E || m === S || m === W;
