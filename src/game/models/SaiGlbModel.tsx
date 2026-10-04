import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { skinById } from '../../data/items';
import type { AnimSource } from './SaiModel';
import { paintSai } from './saiColors';

import SAI_GLB_URL from './saiGlbUrl';
useGLTF.preload(SAI_GLB_URL);

const HEIGHT = 2.05;
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * Sai from the generated sai.glb. The mesh is not rigged yet, so every TZ §4
 * state is expressed as whole-body motion (hop, waddle, lean, squash, flip).
 * Once a Mixamo-rigged version arrives, these become real clips.
 */
export function SaiGlbModel({ skin, source, riding, castShadow = true }: { skin: string; source: () => AnimSource; riding?: boolean; castShadow?: boolean }) {
  const gltf = useGLTF(SAI_GLB_URL);
  const s = skinById(skin);
  const { geometry, scale, offset } = useMemo(() => {
    let src: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((o) => {
      if (!src && (o as THREE.Mesh).isMesh) src = (o as THREE.Mesh).geometry;
    });
    const geo = paintSai(src!, s);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const k = HEIGHT / (bb.max.y - bb.min.y);
    return { geometry: geo, scale: k, offset: -bb.min.y * k };
  }, [gltf, s]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.05,
        emissive: s.emissive ?? '#000000',
        emissiveIntensity: s.emissive ? 0.12 : 0,
      }),
    [s],
  );
  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b2236', metalness: 0.6, roughness: 0.3 }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3fe0ff', toneMapped: false }), []);

  const pivot = useRef<THREE.Group>(null!);
  const phase = useRef(0);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { anim, animTime, speed } = source();
    const t = state.clock.elapsedTime;
    let y = 0;
    let lean = 0;
    let roll = 0;
    let yaw = 0;
    let flip = 0;
    let sy = 1;
    let sz = 1;
    const gait = (freq: number, hop: number, sway: number) => {
      phase.current += dt * freq;
      y = Math.abs(Math.sin(phase.current)) * hop;
      roll = Math.sin(phase.current) * sway;
    };
    switch (anim) {
      case 'idle':
        y = Math.sin(t * 2) * 0.015;
        sy = 1 + Math.sin(t * 2) * 0.012;
        yaw = Math.sin(t * 0.6) * 0.05;
        break;
      case 'walk':
        gait(Math.max(6, speed * 1.5), 0.09, 0.09);
        lean = 0.06;
        break;
      case 'run':
        gait(Math.max(10, speed * 1.35), 0.14, 0.12);
        lean = 0.2;
        break;
      case 'jump':
        sy = 1.07;
        lean = -0.08;
        break;
      case 'doubleJump':
        flip = Math.min(1, animTime / 0.38) * Math.PI * 2;
        break;
      case 'fall':
        sy = 1.04;
        lean = 0.05;
        break;
      case 'land':
        sy = 1 - Math.max(0, 0.18 - animTime) * 1.3;
        break;
      case 'dash':
        lean = 0.55;
        sz = 1.12;
        break;
      case 'interact':
        lean = 0.15 + Math.sin(t * 10) * 0.03;
        break;
      case 'wave':
        roll = Math.sin(t * 8) * 0.18;
        yaw = Math.sin(t * 4) * 0.2;
        break;
      case 'celebrate':
        y = Math.abs(Math.sin(t * 7)) * 0.4;
        yaw = t * 6;
        break;
      case 'sit':
        y = -0.3;
        sy = 0.85;
        lean = -0.1;
        break;
      case 'dance':
        y = Math.abs(Math.sin(t * 8)) * 0.12;
        roll = Math.sin(t * 4) * 0.18;
        yaw = Math.sin(t * 2) * 0.6;
        break;
      case 'board':
        y = Math.sin(t * 3) * 0.02;
        lean = 0.12 + Math.min(0.2, speed * 0.01);
        roll = Math.sin(t * 1.5) * 0.05;
        break;
    }
    const p = pivot.current;
    const k = 16;
    p.position.y = damp(p.position.y, HEIGHT / 2 + y + (riding ? 0.3 : 0), k, dt);
    p.rotation.x = flip || damp(p.rotation.x % (Math.PI * 2), lean, 10, dt);
    p.rotation.z = damp(p.rotation.z, roll, k, dt);
    p.rotation.y = anim === 'celebrate' ? yaw : damp(p.rotation.y, yaw, 8, dt);
    p.scale.y = damp(p.scale.y, sy, 22, dt);
    p.scale.z = damp(p.scale.z, sz, 22, dt);
    p.scale.x = 1 + (1 - p.scale.y) * 0.5;
  });

  return (
    <group>
      <group ref={pivot} position={[0, HEIGHT / 2, 0]}>
        <mesh
          geometry={geometry}
          material={material}
          scale={scale}
          position={[0, offset - HEIGHT / 2, 0]}
          castShadow={castShadow}
          receiveShadow
        />
      </group>
      {riding && (
        <group position={[0, 0.18, 0]}>
          <mesh material={boardMat} castShadow={castShadow}>
            <boxGeometry args={[0.7, 0.08, 1.5]} />
          </mesh>
          <mesh position={[0, -0.06, 0]} material={glowMat}>
            <boxGeometry args={[0.5, 0.03, 1.3]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
