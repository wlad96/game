import * as THREE from 'three';

/**
 * Builds a 6-bone skeleton for the generated (unrigged) Sai mesh and binds the
 * mesh to it with smooth, region-based skin weights. Landmarks were measured
 * on the model's silhouette after normalising it to 1.9 m, feet at y = 0:
 * legs up to ~0.33, arms hang from the shoulders (~0.84) to the hands (~0.38)
 * at |x| > ~0.26, neck at ~0.97. A Mixamo-rigged sai.glb can replace this 1:1.
 */
export const RIG_HEIGHT = 1.9;

const J = {
  body: new THREE.Vector3(0, 0.45, 0),
  head: new THREE.Vector3(0, 0.97, 0),
  armL: new THREE.Vector3(-0.27, 0.84, 0),
  armR: new THREE.Vector3(0.27, 0.84, 0),
  legL: new THREE.Vector3(-0.17, 0.4, 0),
  legR: new THREE.Vector3(0.17, 0.4, 0),
};

export interface SaiRig {
  mesh: THREE.SkinnedMesh;
  bones: { body: THREE.Bone; head: THREE.Bone; armL: THREE.Bone; armR: THREE.Bone; legL: THREE.Bone; legR: THREE.Bone };
}

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Copy an attribute to Float32 (quantized glTF attributes are normalized ints). */
function toFloat(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++) {
    for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.getComponent(i, k);
  }
  return new THREE.BufferAttribute(out, attr.itemSize);
}

/** Geometry baked into model space and normalised: height RIG_HEIGHT, feet at 0, centred. */
export function normaliseGeometry(mesh: THREE.Mesh) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) g.setAttribute(name, toFloat(src.attributes[name]));
  if (src.index) g.setIndex(src.index.clone());
  mesh.updateWorldMatrix(true, false);
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const k = RIG_HEIGHT / (bb.max.y - bb.min.y);
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  g.scale(k, k, k);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** Average weights with mesh neighbours on the same side, so seams bend softly. */
function smoothWeights(geometry: THREE.BufferGeometry, wts: Float32Array, passes = 2) {
  const index = geometry.index;
  if (!index) return;
  const p = geometry.attributes.position;
  const n = p.count;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    adj[a].push(b, c);
    adj[b].push(a, c);
    adj[c].push(a, b);
  }
  for (let pass = 0; pass < passes; pass++) {
    const next = wts.slice();
    for (let i = 0; i < n; i++) {
      const side = p.getX(i) < 0;
      let cnt = 1;
      const acc = [wts[i * 4], wts[i * 4 + 1], wts[i * 4 + 2], wts[i * 4 + 3]];
      for (const j of adj[i]) {
        if (p.getX(j) < 0 !== side) continue;
        for (let k = 0; k < 4; k++) acc[k] += wts[j * 4 + k];
        cnt++;
      }
      for (let k = 0; k < 4; k++) next[i * 4 + k] = acc[k] / cnt;
    }
    wts.set(next);
  }
}

export function rigSai(geometry: THREE.BufferGeometry, material: THREE.Material): SaiRig {
  const p = geometry.attributes.position;
  const idx = new Uint16Array(p.count * 4);
  const wts = new Float32Array(p.count * 4);
  // bone order: 0 body, 1 head, 2 armL, 3 armR, 4 legL, 5 legR
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const ax = Math.abs(x);
    const head = ss(0.92, 1.02, y);
    // arm/torso border measured on the mesh: ~0.28 along the forearm, ~0.25 at the armpit
    const edge = 0.275 - 0.03 * ss(0.56, 0.8, y);
    const arm = ss(edge - 0.008, edge + 0.012, ax) * (1 - ss(0.78, 0.9, y)) * ss(0.3, 0.36, y) * (1 - head);
    const leg = (1 - ss(0.33, 0.45, y)) * (1 - arm) * (1 - head);
    const body = Math.max(0, 1 - head - arm - leg);
    const left = x < 0;
    idx.set([0, 1, left ? 2 : 3, left ? 4 : 5], i * 4);
    const sum = body + head + arm + leg || 1;
    wts.set([body / sum, head / sum, arm / sum, leg / sum], i * 4);
  }
  smoothWeights(geometry, wts);
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));

  const bone = (name: string, at: THREE.Vector3, parent?: THREE.Bone) => {
    const b = new THREE.Bone();
    b.name = name;
    const local = parent ? at.clone().sub(J.body) : at.clone();
    b.position.copy(local);
    parent?.add(b);
    return b;
  };
  const body = bone('body', J.body);
  const bones = {
    body,
    head: bone('head', J.head, body),
    armL: bone('armL', J.armL, body),
    armR: bone('armR', J.armR, body),
    legL: bone('legL', J.legL, body),
    legR: bone('legR', J.legR, body),
  };
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.add(body);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([bones.body, bones.head, bones.armL, bones.armR, bones.legL, bones.legR]));
  mesh.frustumCulled = false;
  return { mesh, bones };
}
