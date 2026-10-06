import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DECK_TOP, Skateboard } from './Skateboard';
import { skinById } from '../../data/items';
import type { AnimSource } from './SaiModel';
import { normaliseGeometry, RIG_HEIGHT, rigSai } from './autoRig';
import { computePose } from './pose';
import { paintSai } from './saiColors';
import { loadGlb, preloadGlb } from './glbLoader';

import SAI_GLB_URL from './saiGlbUrl';

const loadSai = () => loadGlb(SAI_GLB_URL);
if (typeof window !== 'undefined') preloadGlb(SAI_GLB_URL);

const HEIGHT = 2.05;
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * Sai from the generated sai.glb, auto-rigged in code (autoRig.ts): arms,
 * legs, head and body follow the same procedural poses as every TZ §4 state.
 * A Mixamo-rigged sai.glb with real clips can replace the rig later.
 */
export function SaiGlbModel({ skin, source, riding, castShadow = true }: { skin: string; source: () => AnimSource; riding?: boolean; castShadow?: boolean }) {
  const scene = loadSai();
  const s = skinById(skin);
  const rig = useMemo(() => {
    let src: THREE.Mesh | null = null;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
    });
    const mesh = src! as THREE.Mesh;
    const orig = mesh.material as THREE.MeshStandardMaterial;
    let material: THREE.Material;
    let geometry: THREE.BufferGeometry;
    if (orig.map) {
      // Textured model: keep its own PBR materials, tint them for non-classic skins.
      const m = orig.clone();
      if (s.id !== 'classic') m.color = new THREE.Color(s.suit).lerp(new THREE.Color('#ffffff'), 0.25);
      if (s.emissive) {
        m.emissive = new THREE.Color(s.emissive);
        m.emissiveIntensity = 0.15;
      }
      material = m;
      geometry = normaliseGeometry(mesh);
    } else {
      // Untextured model: paint body regions per vertex (see saiColors.ts).
      const painted = new THREE.Mesh(paintSai(mesh.geometry, s));
      painted.matrixWorld.copy(mesh.matrixWorld);
      painted.matrixAutoUpdate = false;
      geometry = normaliseGeometry(painted);
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.05,
        emissive: s.emissive ?? '#000000',
        emissiveIntensity: s.emissive ? 0.12 : 0,
      });
    }
    const r = rigSai(geometry, material);
    r.mesh.castShadow = castShadow;
    r.mesh.receiveShadow = true;
    return r;
  }, [scene, s, castShadow]);
  const scale = HEIGHT / RIG_HEIGHT;

  const pivot = useRef<THREE.Group>(null!);
  const phase = useRef(0);
  const restBodyY = rig.bones.body.position.y;

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { anim, animTime, speed } = source();
    const pose = computePose(anim, animTime, speed, state.clock.elapsedTime, dt, phase);
    const b = rig.bones;
    // the generated mesh is one fused surface: keep arms in a range it can bend without tearing
    const clampX = (v: number) => Math.max(-1.9, Math.min(1.1, v));
    const clampZ = (v: number) => Math.max(-0.2, Math.min(1.5, v));
    pose.aL = clampX(pose.aL);
    pose.aR = clampX(pose.aR);
    pose.aLz = clampZ(pose.aLz);
    pose.aRz = clampZ(pose.aRz);
    const k = 18;
    const p = pivot.current;
    p.position.y = damp(p.position.y, HEIGHT / 2 + (riding ? DECK_TOP : 0), k, dt);
    p.rotation.x = pose.spin;
    b.body.position.y = damp(b.body.position.y, restBodyY + pose.bodyY / scale, k, dt);
    b.body.rotation.x = damp(b.body.rotation.x, pose.lean, 10, dt);
    b.body.scale.y = damp(b.body.scale.y, pose.squash, 25, dt);
    b.body.scale.x = b.body.scale.z = 1 + (1 - b.body.scale.y) * 0.5;
    b.head.rotation.z = damp(b.head.rotation.z, pose.headTilt, 6, dt);
    b.armL.rotation.x = damp(b.armL.rotation.x, pose.aL, k, dt);
    b.armR.rotation.x = damp(b.armR.rotation.x, pose.aR, k, dt);
    b.armL.rotation.z = damp(b.armL.rotation.z, -pose.aLz, k, dt);
    b.armR.rotation.z = damp(b.armR.rotation.z, pose.aRz, k, dt);
    b.legL.rotation.x = damp(b.legL.rotation.x, pose.lL, k, dt);
    b.legR.rotation.x = damp(b.legR.rotation.x, pose.lR, k, dt);
  });

  return (
    <group>
      <group ref={pivot} position={[0, HEIGHT / 2, 0]}>
        <group position={[0, -HEIGHT / 2, 0]} scale={scale}>
          <primitive object={rig.mesh} />
        </group>
      </group>
      {riding && <Skateboard speed={() => source().speed} castShadow={castShadow} />}
    </group>
  );
}
