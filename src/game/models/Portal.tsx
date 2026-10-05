import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { labelTexture } from '../textures';
import { Label, sharedMaterials as M } from './props';

interface Props {
  position: [number, number, number];
  rotation?: number;
  /** Texture shown inside the arch (city postcard). */
  image?: THREE.Texture;
  locked?: boolean;
  title?: string;
  status?: string;
  statusColor?: string;
  glow?: string;
  scale?: number;
}

/** Large arched city portal (TZ §6). */
const W = 5.2;
const H = 6.6;
/** Picture art is 4:5; the opening shows a slice of it, a little left of centre (city signs sit there). */
const ART_ASPECT = 0.8;
const ART_FOCUS = 0.41;

/**
 * The opening of the portal (a rectangle under a half circle) as one shape, so
 * the picture covers it once, cropped like CSS `object-fit: cover`.
 */
const pictureGeo = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0);
  shape.lineTo(W / 2, 0);
  shape.lineTo(W / 2, H);
  shape.absarc(0, H, W / 2, 0, Math.PI, false);
  shape.lineTo(-W / 2, 0);
  const g = new THREE.ShapeGeometry(shape, 24);
  const top = H + W / 2;
  const uSpan = W / top / ART_ASPECT; // part of the picture's width that fits
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, ART_FOCUS + (pos.getX(i) / W) * uSpan, pos.getY(i) / top);
  uv.needsUpdate = true;
  return g;
})();

export function Portal({ position, rotation = 0, image, locked, title, status, statusColor = '#21c26b', glow = '#59e6ff', scale = 1 }: Props) {
  const swirl = useRef<THREE.Mesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }), [glow]);
  const swirlMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: glow,
        transparent: true,
        opacity: locked ? 0.08 : 0.25,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    [glow, locked],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    swirl.current.rotation.z = t * 0.6;
    ring.current.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
  });

  const fill = locked ? '#4a5878' : image ? '#ffffff' : '#2a3a8a';
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* base */}
      <mesh position={[0, 0.25, 0]} material={M.white} receiveShadow castShadow>
        <boxGeometry args={[W + 2.4, 0.5, 2.6]} />
      </mesh>
      <mesh position={[0, 0.52, 1.0]} material={glowMat}>
        <boxGeometry args={[W, 0.05, 0.12]} />
      </mesh>
      {/* pillars */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (W / 2 + 0.45), 0.5 + H / 2, 0]} material={M.white} castShadow>
            <boxGeometry args={[0.9, H, 1.2]} />
          </mesh>
          <mesh position={[s * (W / 2 + 0.02), 0.5 + H / 2, 0.45]} material={glowMat}>
            <boxGeometry args={[0.08, H, 0.08]} />
          </mesh>
        </group>
      ))}
      {/* arch */}
      <mesh ref={ring} position={[0, 0.5 + H, 0]} material={M.white} castShadow>
        <torusGeometry args={[W / 2 + 0.45, 0.5, 10, 32, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.5 + H, 0.42]} material={M.gold}>
        <torusGeometry args={[W / 2 + 0.05, 0.08, 6, 32, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.5 + H + W / 2 + 0.95, 0]} material={M.gold}>
        <octahedronGeometry args={[0.45, 0]} />
      </mesh>
      {/* inner picture */}
      <group position={[0, 0.5, 0]}>
        <mesh geometry={pictureGeo}>
          <meshBasicMaterial map={image ?? null} color={fill} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={swirl} position={[0, H * 0.62, 0.05]} material={swirlMat}>
          <ringGeometry args={[0.4, W / 2, 6, 3]} />
        </mesh>
        {locked && (
          <mesh position={[0, H * 0.55, 0.08]}>
            <planeGeometry args={[1.6, 1.6]} />
            <meshBasicMaterial map={labelTexture('🔒', { w: 128, h: 128, font: '96px system-ui' })} transparent />
          </mesh>
        )}
      </group>
      {title && <Label text={title} position={[0, 2.0, 1.5]} scale={1.2} />}
      {status && (
        <Label text={status} position={[0, 1.15, 1.5]} scale={0.8} bg={statusColor} />
      )}
    </group>
  );
}
