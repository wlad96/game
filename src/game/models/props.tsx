import { useFrame } from '@react-three/fiber';
import { tr } from '../../i18n';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { labelTexture } from '../textures';
import { player } from '../runtime';

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

// Shared materials keep draw calls and memory low.
const M = {
  trunk: new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#2f8f4a', roughness: 0.8, side: THREE.DoubleSide }),
  leafDark: new THREE.MeshStandardMaterial({ color: '#23703a', roughness: 0.8, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: '#f4f6fa', roughness: 0.35, metalness: 0.1 }),
  gold: new THREE.MeshStandardMaterial({ color: '#e2b65c', roughness: 0.25, metalness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: '#1b2236', roughness: 0.4, metalness: 0.5 }),
  cyanGlow: new THREE.MeshBasicMaterial({ color: '#59e6ff', toneMapped: false }),
  skin: ['#f1c7a0', '#c98e62', '#8d5a3b', '#e8b48a', '#5e3a26'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }),
  ),
};

export function Palm({ position, scale = 1, rot = 0 }: { position: [number, number, number]; scale?: number; rot?: number }) {
  const leaves = useMemo(() => Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2), []);
  return (
    <group position={position} scale={scale} rotation={[0, rot, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 0.12, 1 + i * 1.9, 0]} rotation={[0, 0, -0.06]} material={M.trunk} castShadow>
          <cylinderGeometry args={[0.22 - i * 0.03, 0.28 - i * 0.03, 2, 8]} />
        </mesh>
      ))}
      <group position={[0.45, 7.7, 0]}>
        {leaves.map((a, i) => (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[1.6, -0.5, 0]} rotation={[0, 0, -0.5]} material={i % 2 ? M.leaf : M.leafDark} castShadow>
              <boxGeometry args={[3.4, 0.05, 0.8]} />
            </mesh>
          </group>
        ))}
        <mesh material={M.trunk}>
          <sphereGeometry args={[0.35, 8, 6]} />
        </mesh>
      </group>
    </group>
  );
}

/** Text billboard drawn on a canvas — always faces the camera. */
export function Label({
  text,
  position,
  scale = 1,
  color = '#ffffff',
  bg = 'rgba(8,16,40,0.65)',
  sub,
}: {
  text: string;
  position: [number, number, number];
  scale?: number;
  color?: string;
  bg?: string;
  sub?: string;
}) {
  const tex = labelTexture(tr(text), { color, bg, sub: sub ? tr(sub) : undefined, w: 512, h: sub ? 160 : 112 });
  const aspect = sub ? 512 / 160 : 512 / 112;
  return (
    <sprite position={position} scale={[scale * aspect * 0.6, scale * 0.6, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

/** A citizen / tourist / technician. Walks a loop of waypoints if given. */
export function Npc({
  position,
  path,
  shirt = '#3b82c4',
  pants = '#2c3442',
  skin = 0,
  hat,
  vest,
  speed = 1.6,
  sitting,
  lookAtPlayer,
  seed = 0,
}: {
  position: [number, number, number];
  path?: [number, number][];
  shirt?: string;
  pants?: string;
  skin?: number;
  hat?: string;
  vest?: string;
  speed?: number;
  sitting?: boolean;
  lookAtPlayer?: boolean;
  seed?: number;
}) {
  const g = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Mesh>(null!);
  const legR = useRef<THREE.Mesh>(null!);
  const armL = useRef<THREE.Mesh>(null!);
  const armR = useRef<THREE.Mesh>(null!);
  const st = useRef({ i: 0, phase: seed });
  const mats = useMemo(
    () => ({
      shirt: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }),
      pants: new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 }),
      hat: hat ? new THREE.MeshStandardMaterial({ color: hat, roughness: 0.5 }) : null,
      vest: vest ? new THREE.MeshStandardMaterial({ color: vest, roughness: 0.6, emissive: vest, emissiveIntensity: 0.15 }) : null,
    }),
    [shirt, pants, hat, vest],
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const grp = g.current;
    let moving = false;
    if (path && path.length > 1) {
      const [tx, tz] = path[st.current.i];
      const dx = tx - grp.position.x;
      const dz = tz - grp.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) st.current.i = (st.current.i + 1) % path.length;
      else {
        grp.position.x += (dx / d) * speed * dt;
        grp.position.z += (dz / d) * speed * dt;
        const target = Math.atan2(dx, dz);
        grp.rotation.y = damp(grp.rotation.y, nearestAngle(grp.rotation.y, target), 6, dt);
        moving = true;
      }
    } else if (lookAtPlayer) {
      const dx = player.pos.x - grp.position.x;
      const dz = player.pos.z - grp.position.z;
      if (dx * dx + dz * dz < 100) {
        grp.rotation.y = damp(grp.rotation.y, nearestAngle(grp.rotation.y, Math.atan2(dx, dz)), 4, dt);
      }
    }
    const t = state.clock.elapsedTime;
    if (moving) {
      st.current.phase += dt * speed * 4;
      const p = Math.sin(st.current.phase);
      legL.current.rotation.x = p * 0.6;
      legR.current.rotation.x = -p * 0.6;
      armL.current.rotation.x = -p * 0.5;
      armR.current.rotation.x = p * 0.5;
    } else if (!sitting) {
      armR.current.rotation.x = Math.sin(t * 1.3 + seed) * 0.1;
      armL.current.rotation.x = -armR.current.rotation.x;
      legL.current.rotation.x = legR.current.rotation.x = 0;
    }
  });

  return (
    <group ref={g} position={position}>
      <group position={[0, sitting ? -0.45 : 0, 0]}>
        <mesh ref={legL} position={[-0.13, 0.82, 0]} material={mats.pants} castShadow rotation={[sitting ? -1.5 : 0, 0, 0]}>
          <boxGeometry args={[0.2, 0.85, 0.22]} />
        </mesh>
        <mesh ref={legR} position={[0.13, 0.82, 0]} material={mats.pants} castShadow rotation={[sitting ? -1.5 : 0, 0, 0]}>
          <boxGeometry args={[0.2, 0.85, 0.22]} />
        </mesh>
        <mesh position={[0, 1.45, 0]} material={mats.vest ?? mats.shirt} castShadow>
          <capsuleGeometry args={[0.26, 0.4, 4, 10]} />
        </mesh>
        <mesh ref={armL} position={[-0.36, 1.5, 0]} material={mats.shirt} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        </mesh>
        <mesh ref={armR} position={[0.36, 1.5, 0]} material={mats.shirt} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        </mesh>
        <mesh position={[0, 2.0, 0]} material={M.skin[skin % M.skin.length]} castShadow>
          <sphereGeometry args={[0.22, 14, 12]} />
        </mesh>
        {mats.hat && (
          <mesh position={[0, 2.16, 0]} material={mats.hat}>
            <sphereGeometry args={[0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function nearestAngle(from: number, to: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

/** Small hovering Sai robot (guide / city helper). */
export function SaiRobot({ position, path, speed = 2 }: { position: [number, number, number]; path?: [number, number][]; speed?: number }) {
  const g = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const st = useRef({ i: 0 });
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    inner.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 2.5 + position[0]) * 0.12;
    if (path && path.length > 1) {
      const [tx, tz] = path[st.current.i];
      const dx = tx - g.current.position.x;
      const dz = tz - g.current.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) st.current.i = (st.current.i + 1) % path.length;
      else {
        g.current.position.x += (dx / d) * speed * dt;
        g.current.position.z += (dz / d) * speed * dt;
        g.current.rotation.y = damp(g.current.rotation.y, nearestAngle(g.current.rotation.y, Math.atan2(dx, dz)), 5, dt);
      }
    } else {
      const dx = player.pos.x - g.current.position.x;
      const dz = player.pos.z - g.current.position.z;
      g.current.rotation.y = damp(g.current.rotation.y, nearestAngle(g.current.rotation.y, Math.atan2(dx, dz)), 4, dt);
    }
  });
  return (
    <group ref={g} position={position}>
      <group ref={inner}>
        <mesh position={[0, 0.6, 0]} material={M.white} castShadow>
          <capsuleGeometry args={[0.32, 0.35, 6, 14]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={M.white} castShadow>
          <sphereGeometry args={[0.36, 18, 14]} />
        </mesh>
        <mesh position={[0, 1.32, 0.22]} scale={[1, 0.55, 0.6]} material={M.dark}>
          <sphereGeometry args={[0.28, 16, 12]} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 1.34, 0.39]} material={M.cyanGlow}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
        ))}
        <mesh position={[0, 0.65, 0.3]} material={M.cyanGlow}>
          <boxGeometry args={[0.22, 0.05, 0.02]} />
        </mesh>
      </group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Floating collectible orb. */
export function Orb({ position, color = '#5fe3ff', size = 0.32 }: { position: [number, number, number]; color?: string; size?: number }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.15;
    g.current.rotation.y = t * 1.5;
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh scale={1.7}>
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Token({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    g.current.rotation.y = s.clock.elapsedTime * 2;
    g.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 2) * 0.1;
  });
  return (
    <group ref={g} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={M.gold}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 24]} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshBasicMaterial map={labelTexture('Sai', { color: '#7a4b00', w: 256, h: 128 })} transparent />
      </mesh>
    </group>
  );
}

/** Energy beacon: dark until `active`, then a tall cyan pillar of light. */
export function Beacon({ position, active, highlight }: { position: [number, number, number]; active: boolean; highlight?: boolean }) {
  const ring = useRef<THREE.Mesh>(null!);
  const core = useRef<THREE.Mesh>(null!);
  const coreMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a3550', emissive: '#59e6ff', emissiveIntensity: 0 }), []);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    ring.current.rotation.z = t * (active ? 1.5 : 0.2);
    const target = active ? 3 : highlight ? 0.5 + Math.sin(t * 4) * 0.4 : 0.05;
    coreMat.emissiveIntensity = damp(coreMat.emissiveIntensity, target, 3, dt);
    core.current.position.y = 2.2 + Math.sin(t * 2) * 0.1;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} material={M.white} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.7, 0.6, 24]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} material={M.gold} castShadow>
        <cylinderGeometry args={[0.35, 0.6, 1.0, 12]} />
      </mesh>
      <mesh ref={core} position={[0, 2.2, 0]} material={coreMat}>
        <octahedronGeometry args={[0.55, 0]} />
      </mesh>
      <mesh ref={ring} position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.gold}>
        <torusGeometry args={[0.95, 0.06, 8, 32]} />
      </mesh>
      {active && (
        <mesh position={[0, 30, 0]}>
          <cylinderGeometry args={[0.25, 0.6, 56, 12, 1, true]} />
          <meshBasicMaterial color="#59e6ff" transparent opacity={0.35} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/** Quest marker floating above a target. */
export function QuestMarker({ position, color = '#ffc94a' }: { position: [number, number, number]; color?: string }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    g.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 3) * 0.2;
    g.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <group ref={g} position={position}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.35, 0.8, 4]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export const sharedMaterials = M;
