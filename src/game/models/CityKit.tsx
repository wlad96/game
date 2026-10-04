import { useMemo } from 'react';
import * as THREE from 'three';
import { footprint, type Placement } from '../scenes/cityKit';
import { cityModelUrl, PALETTE_URLS } from './cityModelUrls';
import { loadGlb } from './glbLoader';

// Kenney GLBs reference Textures/colormap.png next to them; point that at our copy,
// or at a plain light grey if the colormap was not provided.
const GREY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4+/btfwAJYQPzKZ3xJgAAAABJRU5ErkJggg==';
const rewrite = (u: string) => (u.includes('colormap') ? (PALETTE_URLS[0] ?? GREY) : u);

// Second palette, swapped onto every other building for a more colourful street.
let altPalette: THREE.Texture | null = null;
function alternatePalette() {
  if (!altPalette && PALETTE_URLS[1]) {
    altPalette = new THREE.TextureLoader().load(PALETTE_URLS[1]);
    altPalette.flipY = false; // glTF texture convention
    altPalette.colorSpace = THREE.SRGBColorSpace;
  }
  return altPalette;
}

function Building({ p, shadows, variant }: { p: Placement; shadows: boolean; variant: number }) {
  const src = loadGlb(cityModelUrl(p.model), rewrite);
  const obj = useMemo(() => {
    const o = src.clone(true);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = shadows && p.solid;
      m.receiveShadow = true;
      const alt = variant === 1 ? alternatePalette() : null;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (alt && mat.map) {
        const c = mat.clone();
        c.map = alt;
        m.material = c;
      }
    });
    return o;
  }, [src, shadows, p.solid, variant]);
  return <primitive object={obj} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={p.scale} />;
}

/** Renders city-kit placements; colliders are built from the same data in the scene. */
export function CityKit({ placements, shadows }: { placements: Placement[]; shadows: boolean }) {
  return (
    <>
      {placements.map((p, i) => (
        <Building key={i} p={p} shadows={shadows} variant={(i * 7 + 3) % 3 === 0 ? 1 : 0} />
      ))}
    </>
  );
}

export function placementCollider(p: Placement) {
  const { w, h, d } = footprint(p);
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2, minY: 0, maxY: h };
}
