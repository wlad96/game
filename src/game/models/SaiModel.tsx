import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { skinById } from '../../data/items';
import type { AnimState } from '../runtime';
import { knitTexture, labelTexture } from '../textures';
import { computePose } from './pose';

export interface AnimSource {
  anim: AnimState;
  animTime: number;
  /** Horizontal speed in m/s, drives the gait frequency. */
  speed: number;
}

interface Props {
  skin: string;
  source: () => AnimSource;
  riding?: boolean;
  castShadow?: boolean;
}

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/**
 * Sai, built from primitives on one shared "skeleton" (groups). Skins only swap
 * materials (TZ §27); every animation state from TZ §4 is procedural here and
 * can be replaced 1:1 by clips from sai.glb later.
 */
export function SaiModel({ skin, source, riding, castShadow = true }: Props) {
  const s = skinById(skin);
  const mats = useMemo(() => {
    const knit = knitTexture(5);
    const headKnit = knitTexture(7);
    const em = s.emissive ? new THREE.Color(s.emissive) : new THREE.Color('#000000');
    return {
      suit: new THREE.MeshStandardMaterial({ color: s.suit, map: knit, roughness: 0.95 }),
      head: new THREE.MeshStandardMaterial({ color: s.head, map: headKnit, roughness: 1 }),
      trim: new THREE.MeshStandardMaterial({
        color: s.trim,
        metalness: 0.7,
        roughness: 0.3,
        emissive: em,
        emissiveIntensity: s.emissive ? 0.9 : 0,
      }),
      gloves: new THREE.MeshStandardMaterial({ color: s.gloves, roughness: 0.6, map: knit }),
      visor: new THREE.MeshStandardMaterial({
        color: s.visor,
        metalness: 0.9,
        roughness: 0.2,
        emissive: em,
        emissiveIntensity: s.emissive ? 1.5 : 0,
      }),
      eye: new THREE.MeshStandardMaterial({ color: '#1a1f2e', roughness: 0.3 }),
      label: new THREE.MeshBasicMaterial({
        map: labelTexture('Sai', { color: '#1d2f6b', font: 'italic 800 84px "Exo 2", system-ui', w: 256, h: 128 }),
        transparent: true,
        depthWrite: false,
      }),
      board: new THREE.MeshStandardMaterial({ color: '#1b2236', metalness: 0.6, roughness: 0.3 }),
      boardGlow: new THREE.MeshBasicMaterial({ color: '#3fe0ff', toneMapped: false }),
    };
  }, [s]);

  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const phase = useRef(0);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { anim, animTime, speed } = source();
    const t = state.clock.elapsedTime;

    const { bodyY, lean, spin, squash, aL, aR, aLz, aRz, lL, lR, headTilt } = computePose(anim, animTime, speed, t, dt, phase);

    const k = 18;
    body.current.position.y = damp(body.current.position.y, bodyY + (riding ? 0.32 : 0), k, dt);
    body.current.rotation.x = damp(body.current.rotation.x, lean, 10, dt);
    body.current.scale.y = damp(body.current.scale.y, squash, 25, dt);
    body.current.scale.x = body.current.scale.z = 1 + (1 - body.current.scale.y) * 0.5;
    root.current.rotation.x = spin;
    head.current.rotation.z = damp(head.current.rotation.z, headTilt, 6, dt);
    armL.current.rotation.x = damp(armL.current.rotation.x, aL, k, dt);
    armR.current.rotation.x = damp(armR.current.rotation.x, aR, k, dt);
    // positive values in the switch mean "outward" for the left arm; mirror to rotation space
    armL.current.rotation.z = damp(armL.current.rotation.z, -aLz, k, dt);
    armR.current.rotation.z = damp(armR.current.rotation.z, aRz, k, dt);
    legL.current.rotation.x = damp(legL.current.rotation.x, lL, k, dt);
    legR.current.rotation.x = damp(legR.current.rotation.x, lR, k, dt);
  });

  const sh = castShadow;
  return (
    <group>
      <group ref={root} position={[0, 0.85, 0]}>
        <group ref={body} position={[0, 0, 0]}>
          <group position={[0, -0.85, 0]}>
            {/* torso */}
            <mesh position={[0, 0.95, 0]} material={mats.suit} castShadow={sh}>
              <capsuleGeometry args={[0.36, 0.32, 6, 16]} />
            </mesh>
            <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
              <torusGeometry args={[0.35, 0.045, 8, 24]} />
            </mesh>
            <mesh position={[0, 1.0, 0.35]} material={mats.label}>
              <planeGeometry args={[0.42, 0.21]} />
            </mesh>
            <mesh position={[0, 1.24, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
              <torusGeometry args={[0.24, 0.05, 8, 24]} />
            </mesh>
            {/* backpack */}
            <mesh position={[0, 1.0, -0.36]} material={mats.suit} castShadow={sh}>
              <boxGeometry args={[0.46, 0.5, 0.22]} />
            </mesh>
            <mesh position={[0, 1.0, -0.475]} material={mats.visor}>
              <boxGeometry args={[0.3, 0.06, 0.02]} />
            </mesh>
            {/* head */}
            <group ref={head} position={[0, 1.62, 0]}>
              <mesh material={mats.head} castShadow={sh}>
                <sphereGeometry args={[0.5, 28, 22]} />
              </mesh>
              <mesh rotation={[0.25, 0, 0]} material={mats.trim}>
                <torusGeometry args={[0.5, 0.045, 8, 36]} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.visor}>
                  <cylinderGeometry args={[0.13, 0.13, 0.1, 18]} />
                </mesh>
              ))}
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.16, 0.02, 0.46]} scale={[1, 1.4, 0.5]} material={mats.eye}>
                  <sphereGeometry args={[0.055, 12, 10]} />
                </mesh>
              ))}
            </group>
            {/* arms */}
            {[
              [armL, -1],
              [armR, 1],
            ].map(([ref, side]) => (
              <group key={side as number} ref={ref as RefObject<THREE.Group>} position={[(side as number) * 0.4, 1.18, 0]}>
                <mesh position={[(side as number) * 0.04, -0.22, 0]} material={mats.suit} castShadow={sh}>
                  <capsuleGeometry args={[0.11, 0.26, 4, 10]} />
                </mesh>
                <mesh position={[(side as number) * 0.05, -0.47, 0]} material={mats.gloves} castShadow={sh}>
                  <sphereGeometry args={[0.13, 14, 12]} />
                </mesh>
              </group>
            ))}
            {/* legs */}
            {[
              [legL, -1],
              [legR, 1],
            ].map(([ref, side]) => (
              <group key={side as number} ref={ref as RefObject<THREE.Group>} position={[(side as number) * 0.17, 0.58, 0]}>
                <mesh position={[0, -0.2, 0]} material={mats.suit} castShadow={sh}>
                  <capsuleGeometry args={[0.13, 0.2, 4, 10]} />
                </mesh>
                <mesh position={[0, -0.47, 0.05]} material={mats.gloves} castShadow={sh}>
                  <boxGeometry args={[0.24, 0.2, 0.34]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
      {riding && (
        <group position={[0, 0.18, 0]}>
          <mesh material={mats.board} castShadow={sh}>
            <boxGeometry args={[0.7, 0.08, 1.5]} />
          </mesh>
          <mesh position={[0, -0.06, 0]} material={mats.boardGlow}>
            <boxGeometry args={[0.5, 0.03, 1.3]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
