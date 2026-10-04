import * as THREE from 'three';
import type { SkinDef } from '../../data/types';

/**
 * The generated Sai mesh has no textures, so skins paint it per vertex by
 * body region (model space: +z is the front, feet at y≈-1, head top y≈0.96).
 * Replace with real texture maps once a textured / rigged sai.glb arrives.
 */
export function paintSai(geometry: THREE.BufferGeometry, skin: SkinDef) {
  const g = geometry.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const out = new Float32Array(p.count * 3);
  const c = {
    suit: new THREE.Color(skin.suit),
    head: new THREE.Color(skin.head),
    trim: new THREE.Color(skin.trim),
    gloves: new THREE.Color(skin.gloves),
    visor: new THREE.Color('#141c33'),
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ax = Math.abs(x);
    let col = c.suit;
    if (y < -0.74) col = c.gloves; // boots
    else if (y < -0.36 && ax > 0.3) col = c.gloves; // hands
    else if (y > 0.0) {
      if (ax > 0.56 && y > 0.25 && y < 0.7) col = c.trim; // ear pods
      else if (z > 0.28 && n.getZ(i) > 0.6 && y > 0.16 && y < 0.74 && ax < 0.46) col = c.visor;
      else col = c.head;
    }
    out[i * 3] = col.r;
    out[i * 3 + 1] = col.g;
    out[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}
