import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { play } from '../audio/sfx';
import { useGame } from '../store/gameStore';
import { Label } from './models/props';
import { collectibles, player } from './runtime';

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/** Companion that follows Sai, teleports when left behind and hints at nearby orbs. */
export function Pet() {
  const pet = useGame((s) => s.equippedPet);
  const g = useRef<THREE.Group>(null!);
  const hint = useRef<THREE.Group>(null!);
  const st = useRef({ init: false, beepT: 0, hinting: false });

  useFrame((state, dtRaw) => {
    if (!g.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const side = Math.sin(player.facing + Math.PI * 0.75);
    const back = Math.cos(player.facing + Math.PI * 0.75);
    const tx = player.pos.x + side * 1.6;
    const tz = player.pos.z + back * 1.6;
    const ty = player.pos.y + 1.9 + Math.sin(t * 3) * 0.15;
    const p = g.current.position;
    if (!st.current.init || p.distanceTo(player.pos) > 20) {
      p.set(tx, ty, tz);
      st.current.init = true;
    }
    p.x = damp(p.x, tx, 4, dt);
    p.y = damp(p.y, ty, 5, dt);
    p.z = damp(p.z, tz, 4, dt);
    g.current.rotation.y = damp(g.current.rotation.y, player.facing, 4, dt);

    let near = false;
    for (const c of collectibles.values()) {
      if (c.distanceToSquared(player.pos) < 14 * 14) {
        near = true;
        break;
      }
    }
    hint.current.visible = near;
    if (near && !st.current.hinting) play('click');
    st.current.hinting = near;
  });

  if (!pet) return null;
  return (
    <group ref={g}>
      {pet === 'pet_drone' ? (
        <group scale={0.7}>
          <mesh>
            <sphereGeometry args={[0.35, 18, 14]} />
            <meshStandardMaterial color="#f4f6fa" metalness={0.3} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.3]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshBasicMaterial color="#59e6ff" toneMapped={false} />
          </mesh>
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <group key={`${sx}${sz}`} position={[sx * 0.45, 0.15, sz * 0.45]}>
                <mesh>
                  <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
                  <meshStandardMaterial color="#1b2236" />
                </mesh>
                <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.22, 16]} />
                  <meshBasicMaterial color="#9feaff" transparent opacity={0.35} side={THREE.DoubleSide} />
                </mesh>
              </group>
            )),
          )}
        </group>
      ) : (
        <group>
          <mesh>
            <sphereGeometry args={[0.25, 20, 16]} />
            <meshBasicMaterial color="#6fd8ff" toneMapped={false} />
          </mesh>
          <mesh scale={1.8}>
            <sphereGeometry args={[0.25, 20, 16]} />
            <meshBasicMaterial color="#6fd8ff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
          {[-0.08, 0.08].map((x) => (
            <mesh key={x} position={[x, 0.04, 0.22]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshBasicMaterial color="#0b1530" />
            </mesh>
          ))}
        </group>
      )}
      <group ref={hint} visible={false}>
        <Label text="!" position={[0, 0.8, 0]} scale={0.8} color="#ffd24a" bg="rgba(0,0,0,0)" />
      </group>
    </group>
  );
}
