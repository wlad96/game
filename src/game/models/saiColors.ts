import * as THREE from 'three';
import type { SkinDef } from '../../data/types';

/**
 * The generated Sai mesh has no textures, so skins paint it per vertex by
 * body region (model space: +z is the front, feet at y≈-1, head top y≈0.96).
 * The visor is found by flood-filling the smooth glass surface from its
 * centre (the knitted head around it is bumpy, the rim is a sharp crease),
 * then region borders are cleaned by a neighbour majority vote.
 * Replace with real texture maps once a textured / rigged sai.glb arrives.
 */
const SUIT = 0;
const HEAD = 1;
const TRIM = 2;
const GLOVES = 3;
const VISOR = 4;

const labelCache = new WeakMap<THREE.BufferGeometry, { geo: THREE.BufferGeometry; labels: Uint8Array }>();

function neighbours(geo: THREE.BufferGeometry) {
  const count = geo.attributes.position.count;
  const sets: Set<number>[] = Array.from({ length: count }, () => new Set());
  const idx = geo.index;
  if (!idx) return sets;
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    const b = idx.getX(i + 1);
    const c = idx.getX(i + 2);
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets;
}

function computeLabels(source: THREE.BufferGeometry) {
  const geo = source.clone();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const count = p.count;
  const labels = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const ax = Math.abs(x);
    let l = SUIT;
    if (y < -0.76) l = GLOVES; // boots
    else if (y < -0.4 && ax > 0.3) l = GLOVES; // hands
    else if (y > 0.0) l = ax > 0.56 && y > 0.25 && y < 0.7 ? TRIM : HEAD;
    labels[i] = l;
  }

  const nb = neighbours(geo);

  // visor: flood fill across smooth, front-facing surface
  let seed = -1;
  let best = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = p.getY(i);
    if (Math.abs(p.getX(i)) < 0.08 && y > 0.35 && y < 0.55 && n.getZ(i) > 0.8 && p.getZ(i) > best) {
      best = p.getZ(i);
      seed = i;
    }
  }
  if (seed >= 0) {
    const seen = new Uint8Array(count);
    const queue = [seed];
    seen[seed] = 1;
    const ni = new THREE.Vector3();
    const nj = new THREE.Vector3();
    while (queue.length) {
      const i = queue.pop()!;
      labels[i] = VISOR;
      ni.fromBufferAttribute(n, i);
      for (const j of nb[i]) {
        if (seen[j]) continue;
        nj.fromBufferAttribute(n, j);
        if (ni.dot(nj) < 0.985 || nj.z < 0.05 || p.getY(j) < 0.05) continue;
        seen[j] = 1;
        queue.push(j);
      }
    }
  }

  // clean ragged borders: each vertex takes its neighbourhood's majority
  for (let pass = 0; pass < 3; pass++) {
    const next = labels.slice();
    for (let i = 0; i < count; i++) {
      const votes = [0, 0, 0, 0, 0];
      votes[labels[i]] += 1;
      for (const j of nb[i]) votes[labels[j]] += 1;
      let m = labels[i];
      for (let k = 0; k < votes.length; k++) if (votes[k] > votes[m]) m = k;
      next[i] = m;
    }
    labels.set(next);
  }
  return { geo, labels };
}

export function paintSai(geometry: THREE.BufferGeometry, skin: SkinDef) {
  let entry = labelCache.get(geometry);
  if (!entry) {
    entry = computeLabels(geometry);
    labelCache.set(geometry, entry);
  }
  const g = entry.geo.clone();
  const palette = [skin.suit, skin.head, skin.trim, skin.gloves, '#141c33'].map((c) => new THREE.Color(c));
  const out = new Float32Array(g.attributes.position.count * 3);
  entry.labels.forEach((l, i) => {
    out[i * 3] = palette[l].r;
    out[i * 3 + 1] = palette[l].g;
    out[i * 3 + 2] = palette[l].b;
  });
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
