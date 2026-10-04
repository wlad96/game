import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityArt } from '../../data/types';
import { useGame } from '../../store/gameStore';
import { SaiAvatar } from '../models/SaiAvatar';
import { cityArtTexture } from '../textures';

const STREAKS = 420;

/** Screen 3: Sai flies through a warp tunnel towards the destination city (TZ §9). */
export default function Warp({ art, artKey }: { art: CityArt | null; artKey: string }) {
  const skin = useGame((s) => s.equippedSkin);
  const { camera } = useThree();
  const inst = useRef<THREE.InstancedMesh>(null!);
  const sai = useRef<THREE.Group>(null!);
  const picture = useRef<THREE.Mesh>(null!);
  const rings = useRef<THREE.Group>(null!);
  const start = useRef(performance.now());

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < STREAKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 7;
      arr.push({ a, r, z: -Math.random() * 120, speed: 50 + Math.random() * 60, len: 1 + Math.random() * 4 });
    }
    return arr;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => ['#59e6ff', '#b57bff', '#ffffff', '#4f7dff'].map((c) => new THREE.Color(c)), []);

  useEffect(() => {
    camera.position.set(0, 0.6, 7);
    camera.lookAt(0, 0, -20);
    for (let i = 0; i < STREAKS; i++) inst.current.setColorAt(i, colors[i % colors.length]);
    inst.current.instanceColor!.needsUpdate = true;
  }, [camera, colors]);

  useFrame((s, dt) => {
    const t = (performance.now() - start.current) / 1000;
    data.forEach((d, i) => {
      d.z += d.speed * dt;
      if (d.z > 10) d.z = -120;
      d.a += dt * 0.6;
      dummy.position.set(Math.cos(d.a) * d.r, Math.sin(d.a) * d.r, d.z);
      dummy.scale.set(1, 1, d.len);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
    sai.current.position.set(Math.sin(t * 1.3) * 0.4, Math.sin(t * 2.1) * 0.25, 0);
    sai.current.rotation.z = Math.sin(t * 1.3) * 0.25;
    const k = Math.min(1, t / 3);
    picture.current.position.z = -90 + k * 50;
    rings.current.rotation.z = s.clock.elapsedTime * 0.8;
    rings.current.children.forEach((c, i) => {
      c.position.z = ((s.clock.elapsedTime * 25 + i * 15) % 90) - 85;
    });
  });

  return (
    <>
      <color attach="background" args={['#050a24']} />
      <fog attach="fog" args={['#0a1240', 20, 110]} />
      <ambientLight intensity={1.2} />
      <pointLight position={[0, 2, 4]} intensity={30} color="#9feaff" />
      <instancedMesh ref={inst} args={[undefined, undefined, STREAKS]}>
        <boxGeometry args={[0.05, 0.05, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={rings}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i}>
            <torusGeometry args={[9, 0.06, 6, 64]} />
            <meshBasicMaterial color={i % 2 ? '#59e6ff' : '#b57bff'} toneMapped={false} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      {art && (
        <mesh ref={picture} position={[0, 0, -90]}>
          <circleGeometry args={[14, 48]} />
          <meshBasicMaterial map={cityArtTexture(art, artKey)} toneMapped={false} />
        </mesh>
      )}
      {!art && <mesh ref={picture} visible={false} />}
      <group ref={sai}>
        <group rotation={[-1.1, Math.PI, 0]} position={[0, -0.8, 0]}>
          <SaiAvatar skin={skin} source={() => ({ anim: 'dash', animTime: 0, speed: 0 })} castShadow={false} />
          {[-0.17, 0.17].map((x) => (
            <mesh key={x} position={[x, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.14, 0.9, 10]} />
              <meshBasicMaterial color="#7fe9ff" toneMapped={false} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}
