import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { skinById } from '../../data/items';
import type { AnimSource } from './SaiModel';
import { paintSai } from './saiColors';

import SAI_GLB_URL from './saiGlbUrl';

/**
 * Loads sai.glb once. A `data:` URL (artifact build) is decoded locally because
 * strict hosts block fetch() of data URLs; a normal URL is fetched.
 */
interface SaiCache {
  promise: Promise<void>;
  scene?: THREE.Object3D;
  error?: unknown;
}
let cache: SaiCache | null = null;
function loadSai(): THREE.Object3D {
  if (!cache) {
    const c: SaiCache = { promise: Promise.resolve() };
    c.promise = (async () => {
        let buf: ArrayBuffer;
        if (SAI_GLB_URL.startsWith('data:')) {
          const bin = atob(SAI_GLB_URL.slice(SAI_GLB_URL.indexOf(',') + 1));
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          buf = bytes.buffer;
        } else {
          const res = await fetch(SAI_GLB_URL);
          if (!res.ok) throw new Error(`sai.glb: HTTP ${res.status}`);
          buf = await res.arrayBuffer();
        }
        // GLTFLoader decodes embedded textures with fetch(blob:) when
        // createImageBitmap exists; strict CSP hosts block that. Hiding it while
        // the parser is constructed makes it use <img> loading instead.
        const w = window as unknown as { createImageBitmap?: typeof createImageBitmap };
        const cib = w.createImageBitmap;
        w.createImageBitmap = undefined;
        let pending: Promise<{ scene: THREE.Group }>;
        try {
          pending = new GLTFLoader().parseAsync(buf, '');
        } finally {
          w.createImageBitmap = cib;
        }
        const gltf = await pending;
        c.scene = gltf.scene;
      })().catch((e) => {
        c.error = e;
      });
    cache = c;
  }
  if (cache.error) throw cache.error;
  if (!cache.scene) throw cache.promise;
  return cache.scene;
}
if (typeof window !== 'undefined') void Promise.resolve().then(() => {
  try {
    loadSai();
  } catch {
    // preload only
  }
});

const HEIGHT = 2.05;
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * Sai from the generated sai.glb. The mesh is not rigged yet, so every TZ §4
 * state is expressed as whole-body motion (hop, waddle, lean, squash, flip).
 * Once a Mixamo-rigged version arrives, these become real clips.
 */
export function SaiGlbModel({ skin, source, riding, castShadow = true }: { skin: string; source: () => AnimSource; riding?: boolean; castShadow?: boolean }) {
  const scene = loadSai();
  const s = skinById(skin);
  const { object, scale, offset } = useMemo(() => {
    // Textured model: keep its own PBR materials, tint them for non-classic skins.
    // Untextured model: paint body regions per vertex (see saiColors.ts).
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (src.map) {
        const m = src.clone();
        if (s.id !== 'classic') m.color = new THREE.Color(s.suit).lerp(new THREE.Color('#ffffff'), 0.25);
        if (s.emissive) {
          m.emissive = new THREE.Color(s.emissive);
          m.emissiveIntensity = 0.15;
        }
        mesh.material = m;
      } else {
        mesh.geometry = paintSai(mesh.geometry, s);
        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.82,
          metalness: 0.05,
          emissive: s.emissive ?? '#000000',
          emissiveIntensity: s.emissive ? 0.12 : 0,
        });
      }
    });
    const bb = new THREE.Box3().setFromObject(root);
    const k = HEIGHT / (bb.max.y - bb.min.y);
    return { object: root, scale: k, offset: -bb.min.y * k };
  }, [scene, s, castShadow]);
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
        <primitive object={object} scale={scale} position={[0, offset - HEIGHT / 2, 0]} />
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
