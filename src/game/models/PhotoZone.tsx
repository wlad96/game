import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../store/gameStore';
import { photoSpots, useInteractable, type PhotoSpot } from '../runtime';
import { labelTexture } from '../textures';
import glowRing from '../../assets/glow-ring.webp';
import { Label, sharedMaterials as M } from './props';

let ring: THREE.Texture | null = null;
function ringTex() {
  if (!ring) {
    ring = new THREE.TextureLoader().load(glowRing);
    ring.colorSpace = THREE.SRGBColorSpace;
  }
  return ring;
}

/** A photo zone: a gold pad with a floating camera; press E to take a picture of Sai here. */
export function PhotoZone(spot: PhotoSpot) {
  const icon = useRef<THREE.Group>(null!);
  const [x, y, z] = spot.pos;
  // keep the marker out of the shot while this zone is in use
  const shooting = useGame((s) => s.panel === 'photo' && s.panelArg === spot.id);
  useEffect(() => {
    photoSpots.set(spot.id, spot);
    return () => void photoSpots.delete(spot.id);
  }, [spot]);
  useInteractable({ id: `photo-${spot.id}`, pos: spot.pos, radius: 2.2, label: 'Photo zone: take a picture' }, () => useGame.getState().openPanel('photo', spot.id));
  useFrame((s) => {
    icon.current.position.y = 2.9 + Math.sin(s.clock.elapsedTime * 2) * 0.12;
    icon.current.rotation.y = s.clock.elapsedTime * 0.8;
  });
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.gold}>
        <ringGeometry args={[1.05, 1.3, 40]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 40]} />
        <meshBasicMaterial color="#ffe7a8" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      {/* golden light ring standing over the pad */}
      <sprite position={[0, 0.35, 0]} scale={[3.4, 1.13, 1]} visible={!shooting}>
        <spriteMaterial map={ringTex()} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <group ref={icon} visible={!shooting}>
        <mesh>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial map={labelTexture('📸', { w: 128, h: 128, font: '96px system-ui' })} transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      {!shooting && <Label text="Photo zone" position={[0, 2.05, 0]} scale={0.75} bg="rgba(160,110,20,0.92)" />}
    </group>
  );
}
