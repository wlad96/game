import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../store/gameStore';
import { world, type Bounds, type Box } from './physics';
import { player } from './runtime';
import { facadeGlowTexture, facadeTexture } from './textures';

/** Register a scene's static colliders. Old scene data is released on unmount (TZ §56). */
export function useWorld(boxes: Box[], bounds: Bounds | null, opts?: { hasGround?: boolean; killY?: number }) {
  useLayoutEffect(() => {
    world.set([...boxes], bounds, opts);
    return () => {
      world.set([], null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, bounds]);
}

/** Directional "sun" that follows the player so a small shadow map stays sharp. */
export function FollowSun({
  color = '#fff1d6',
  intensity = 2.2,
  offset = [30, 50, 20],
}: {
  color?: string;
  intensity?: number;
  offset?: [number, number, number];
}) {
  const quality = useGame((s) => s.settings.quality);
  const light = useRef<THREE.DirectionalLight>(null!);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const p = player.pos;
    light.current.position.set(p.x + offset[0], p.y + offset[1], p.z + offset[2]);
    target.position.set(p.x, p.y, p.z);
    target.updateMatrixWorld();
  });
  const shadows = quality === 'high';
  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        color={color}
        intensity={intensity}
        target={target}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
    </>
  );
}

// ───────────────────────── Buildings ─────────────────────────

const matCache = new Map<string, THREE.Material>();
let cityGlow = 0;

/** Light up every window in the city (Rio after the network is restored). */
export function setCityGlow(v: number) {
  cityGlow = v;
  for (const [key, m] of matCache) {
    if (key.includes(':facadeLit:')) (m as THREE.MeshStandardMaterial).emissiveIntensity = v;
  }
}
export function matFor(color: string, kind: 'plain' | 'facade' | 'facadeLit' | 'glow' = 'plain', extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const key = `${color}:${kind}:${JSON.stringify(extra ?? {})}`;
  let m = matCache.get(key);
  if (!m) {
    if (kind === 'glow') m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    else
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        map: kind === 'plain' ? null : facadeTexture(kind === 'facadeLit'),
        emissive: kind === 'facadeLit' ? new THREE.Color('#ffd27a') : undefined,
        emissiveMap: kind === 'facadeLit' ? facadeGlowTexture() : null,
        emissiveIntensity: kind === 'facadeLit' ? cityGlow : 0,
        ...extra,
      });
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
/** Box geometry whose UVs repeat every `tile` metres so windows keep their size. */
export function tiledBox(w: number, h: number, d: number, tile = 3.2) {
  const key = `${w.toFixed(1)}:${h.toFixed(1)}:${d.toFixed(1)}:${tile}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    // face order: +x, -x, +y, -y, +z, -z — 4 verts each
    const dims: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(dims[f][0] / tile)), uv.getY(i) * Math.max(1, Math.round(dims[f][1] / tile)));
      }
    }
    uv.needsUpdate = true;
    geoCache.set(key, g);
  }
  return g;
}

export interface BlockDef {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y?: number;
  color: string;
  kind?: 'plain' | 'facade' | 'facadeLit' | 'glow';
  roof?: string;
  collide?: boolean;
  noCamera?: boolean;
}

export function blockCollider(b: BlockDef): Box {
  const y = b.y ?? 0;
  return {
    minX: b.x - b.w / 2,
    maxX: b.x + b.w / 2,
    minZ: b.z - b.d / 2,
    maxZ: b.z + b.d / 2,
    minY: y,
    maxY: y + b.h,
    noCamera: b.noCamera,
  };
}

export function Blocks({ blocks, shadows }: { blocks: BlockDef[]; shadows: boolean }) {
  return (
    <>
      {blocks.map((b, i) => {
        const y = (b.y ?? 0) + b.h / 2;
        return (
          <group key={i}>
            <mesh
              position={[b.x, y, b.z]}
              geometry={tiledBox(b.w, b.h, b.d)}
              material={matFor(b.color, b.kind ?? 'plain')}
              castShadow={shadows}
              receiveShadow
            />
            {b.roof && (
              <mesh position={[b.x, (b.y ?? 0) + b.h + 0.1, b.z]} material={matFor(b.roof)} receiveShadow>
                <boxGeometry args={[b.w + 0.4, 0.2, b.d + 0.4]} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

export { rng } from './rngCore';
