import { useFrame, type ThreeElements } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { footprint, type Placement } from '../scenes/cityKit';
import { player } from '../runtime';
import { loadGltf, loadGlb } from './glbLoader';
import { kitModelUrl, kitPaletteUrl, type KitId } from './kitUrls';

// City-kit GLBs reference Textures/colormap.png next to them; Rio paints them
// with a white palette (the other kits embed their own colormap).
const cityRewrite = (u: string) => (u.includes('colormap') ? kitPaletteUrl('rio-white') : u);
export const kitUrl = (kit: KitId, model: string) => kitModelUrl(kit, model);
export const loadKit = (kit: KitId, model: string) => loadGlb(kitUrl(kit, model), kit === 'city' ? cityRewrite : undefined);
const loadKitGltf = (kit: KitId, model: string) => loadGltf(kitUrl(kit, model), kit === 'city' ? cityRewrite : undefined);

const palettes = new Map<string, THREE.Texture>();
function palette(name: string) {
  let t = palettes.get(name);
  if (!t) {
    t = new THREE.TextureLoader().load(kitPaletteUrl(name));
    t.flipY = false; // glTF texture convention
    t.colorSpace = THREE.SRGBColorSpace;
    palettes.set(name, t);
  }
  return t;
}

const dummy = new THREE.Object3D();

/**
 * Dither away fragments right in front of the camera, so palms and lamp posts
 * the follow camera passes through don't fill the screen.
 */
function withNearFade<M extends THREE.Material>(m: M): M {
  const c = m.clone();
  c.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying float vCamDist;\nvoid main() {')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vCamDist = -mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader.replace(
      'void main() {',
      `varying float vCamDist;
void main() {
  if (vCamDist < 2.6) {
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (n > (vCamDist - 0.8) / 1.8) discard;
  }`,
    );
  };
  c.customProgramCacheKey = () => 'near-fade';
  return c;
}

/** One model, many copies: one InstancedMesh per mesh of the model. */
function KitGroup({ items, shadows }: { items: Placement[]; shadows: boolean }) {
  const { kit, model, palette: pal } = items[0];
  const src = loadKit(kit, model);
  const meshes = useMemo(() => {
    src.updateMatrixWorld(true);
    const parts: THREE.Mesh[] = [];
    src.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) parts.push(m);
    });
    const cast = shadows && (items[0].shadow ?? true);
    return parts.map((m) => {
      const geo = m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      let mat = m.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      if (kit === 'nature' || kit === 'roads') mat = Array.isArray(mat) ? mat.map(withNearFade) : withNearFade(mat);
      if (pal === 'cream') {
        const swap = (x: THREE.MeshStandardMaterial) => {
          if (!x.map) return x;
          const c = x.clone();
          c.map = palette('rio-cream');
          return c;
        };
        mat = Array.isArray(mat) ? mat.map(swap) : swap(mat);
      }
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((p, i) => {
        dummy.position.set(p.x, p.y ?? 0, p.z);
        dummy.rotation.set(0, p.rot, 0);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.castShadow = cast;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      return im;
    });
  }, [src, items, pal, shadows, kit]);
  useEffect(
    () => () => {
      for (const m of meshes) {
        m.geometry.dispose();
        m.dispose();
      }
    },
    [meshes],
  );
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

/** Renders kit placements, batched into instanced meshes per model. */
export function KitInstances({ placements, shadows }: { placements: Placement[]; shadows: boolean }) {
  const groups = useMemo(() => {
    const g = new Map<string, Placement[]>();
    for (const p of placements) {
      const key = `${p.kit}|${p.model}|${p.palette ?? ''}|${p.shadow ?? true}`;
      const list = g.get(key);
      if (list) list.push(p);
      else g.set(key, [p]);
    }
    return [...g.entries()];
  }, [placements]);
  return (
    <>
      {groups.map(([key, items]) => (
        <Suspense key={key} fallback={null}>
          <KitGroup items={items} shadows={shadows} />
        </Suspense>
      ))}
    </>
  );
}

/** A single (cloned) kit model, e.g. for things that move. */
export function KitModel({ kit, model, shadows = true, ...props }: { kit: KitId; model: string; shadows?: boolean } & ThreeElements['group']) {
  const src = loadKit(kit, model);
  const obj = useMemo(() => {
    const o = src.clone(true);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = shadows;
        m.receiveShadow = true;
      }
    });
    return o;
  }, [src, shadows]);
  return (
    <group {...props}>
      <primitive object={obj} />
    </group>
  );
}

export function placementCollider(p: Placement) {
  const { w, h, d } = footprint(p);
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2, minY: p.y ?? 0, maxY: (p.y ?? 0) + h };
}

// ───────────────────────── People (Kenney Mini Characters) ─────────────────────────

export const PEOPLE = [
  'character-female-a',
  'character-male-a',
  'character-female-b',
  'character-male-b',
  'character-female-c',
  'character-male-c',
  'character-female-d',
  'character-male-d',
];
/** Mini characters are ~0.75 units tall; this makes them ~1.8 m next to a 2 m Sai. */
export const PERSON_SCALE = 2.4;

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
function nearestAngle(from: number, to: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

/**
 * Animated pedestrian / NPC: walks a looping path, sits, or stands idle and
 * turns towards the player when `lookAtPlayer`.
 */
export function Person({
  model,
  position,
  path,
  speed = 1.4,
  pose = 'idle',
  lookAtPlayer,
  rotation = 0,
}: {
  model: number | string;
  position: [number, number, number];
  path?: [number, number][];
  speed?: number;
  pose?: 'idle' | 'sit' | 'emote-yes';
  lookAtPlayer?: boolean;
  rotation?: number;
}) {
  const name = typeof model === 'number' ? PEOPLE[model % PEOPLE.length] : model;
  const gltf = loadKitGltf('people', name);
  const g = useRef<THREE.Group>(null!);
  const st = useRef({ i: 0 });
  const { obj, mixer, actions } = useMemo(() => {
    const o = cloneSkinned(gltf.scene);
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false; // skinned bounds don't follow the animation
      }
    });
    const mx = new THREE.AnimationMixer(o);
    const action = (n: string) => {
      const c = THREE.AnimationClip.findByName(gltf.animations, n);
      return c ? mx.clipAction(c) : null;
    };
    const acts = { walk: action('walk'), still: action(pose) };
    return { obj: o, mixer: mx, actions: acts };
  }, [gltf, pose]);
  const moving = useRef<boolean | null>(null);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const grp = g.current;
    let walk = false;
    if (path && path.length > 1) {
      const [tx, tz] = path[st.current.i];
      const dx = tx - grp.position.x;
      const dz = tz - grp.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) st.current.i = (st.current.i + 1) % path.length;
      else {
        grp.position.x += (dx / d) * speed * dt;
        grp.position.z += (dz / d) * speed * dt;
        grp.rotation.y = damp(grp.rotation.y, nearestAngle(grp.rotation.y, Math.atan2(dx, dz)), 6, dt);
        walk = true;
      }
    } else if (lookAtPlayer) {
      const dx = player.pos.x - grp.position.x;
      const dz = player.pos.z - grp.position.z;
      if (dx * dx + dz * dz < 100) grp.rotation.y = damp(grp.rotation.y, nearestAngle(grp.rotation.y, Math.atan2(dx, dz)), 4, dt);
    }
    if (moving.current !== walk) {
      moving.current = walk;
      const on = walk ? actions.walk : actions.still;
      const off = walk ? actions.still : actions.walk;
      off?.fadeOut(0.25);
      on?.reset().fadeIn(0.25).play();
      if (on && walk) on.timeScale = speed / 1.4;
    }
    mixer.update(dt);
  });

  return (
    <group ref={g} position={position} rotation={[0, rotation, 0]}>
      <primitive object={obj} scale={PERSON_SCALE} />
    </group>
  );
}
