import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Sai's skateboard: a popsicle deck with kicktails, grip tape, a SAI graphic
 * underneath, metal trucks and wheels that spin with the riding speed.
 * Wheels touch y = 0; the deck top is at DECK_TOP.
 */
const L = 1.5; // deck length (along z)
const W = 0.48; // deck width
const T = 0.035; // deck thickness
const WHEEL_R = 0.06;
const DECK_Y = 0.17;
export const DECK_TOP = DECK_Y + T;
const TAIL = 0.5; // where the kicktails start (|z|)
const KICK = 0.32; // tail rise per metre

/** Stadium outline in the x/z plane (shape y → world -z). */
function outline(inset = 0) {
  const r = W / 2 - inset;
  const h = L / 2 - W / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, -h);
  s.lineTo(-r, h);
  s.absarc(0, h, r, Math.PI, 0, true);
  s.lineTo(r, -h);
  s.absarc(0, -h, r, 0, -Math.PI, true);
  return s;
}

/** Lay a shape geometry flat (y up) and bend its ends up into kicktails. */
function bend(g: THREE.BufferGeometry) {
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const over = Math.abs(z) - TAIL;
    if (over > 0) p.setY(i, p.getY(i) + over * over * (KICK / 0.25) + over * KICK * 0.4);
  }
  g.computeVertexNormals();
  return g;
}

function graphic() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 384;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#6a3fc4');
  grad.addColorStop(0.5, '#2a1f7a');
  grad.addColorStop(1, '#ff7eb6');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 384);
  g.fillStyle = '#ffd36b';
  g.fillRect(0, 150, 128, 6);
  g.fillRect(0, 228, 128, 6);
  g.save();
  g.translate(64, 192);
  g.rotate(-Math.PI / 2);
  g.fillStyle = '#ffffff';
  g.font = 'italic 800 64px "Exo 2", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SAI', 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Skateboard({ speed, castShadow = true }: { speed: () => number; castShadow?: boolean }) {
  const parts = useMemo(() => {
    const deckGeo = bend(new THREE.ExtrudeGeometry(outline(), { depth: T, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -T));
    const gripGeo = bend(new THREE.ShapeGeometry(outline(0.012), 12)).translate(0, 0.002, 0);
    // bottom graphic: a flat shape facing down, uv mapped along the deck
    const bottom = new THREE.ShapeGeometry(outline(0.01), 12);
    const uv = bottom.attributes.uv;
    const pos = bottom.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / L + 0.5);
    const bottomGeo = bend(bottom.rotateY(Math.PI)).translate(0, -T - 0.002, 0);
    return {
      deckGeo,
      gripGeo,
      bottomGeo,
      wood: new THREE.MeshStandardMaterial({ color: '#e9c48c', roughness: 0.7 }),
      grip: new THREE.MeshStandardMaterial({ color: '#23233a', roughness: 1 }),
      art: new THREE.MeshStandardMaterial({ map: graphic(), roughness: 0.5 }),
      metal: new THREE.MeshStandardMaterial({ color: '#c9cdd8', metalness: 0.8, roughness: 0.3 }),
      wheel: new THREE.MeshStandardMaterial({ color: '#6ff3e0', roughness: 0.45 }),
      wheelGeo: new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.055, 16).rotateZ(Math.PI / 2),
    };
  }, []);
  const wheels = useRef<THREE.Mesh[]>([]);
  useFrame((_, dt) => {
    const a = (speed() * Math.min(dt, 0.05)) / WHEEL_R;
    for (const w of wheels.current) if (w) w.rotation.x += a;
  });
  const truckZ = [-(TAIL - 0.08), TAIL - 0.08];
  return (
    <group>
      <group position={[0, DECK_Y + T, 0]}>
        <mesh geometry={parts.deckGeo} material={parts.wood} castShadow={castShadow} />
        <mesh geometry={parts.gripGeo} material={parts.grip} />
        <mesh geometry={parts.bottomGeo} material={parts.art} />
      </group>
      {truckZ.map((z, ti) => (
        <group key={z} position={[0, 0, z]}>
          {/* baseplate, kingpin and axle */}
          <mesh position={[0, DECK_Y - 0.012, 0]} material={parts.metal}>
            <boxGeometry args={[0.16, 0.025, 0.2]} />
          </mesh>
          <mesh position={[0, (DECK_Y + WHEEL_R) / 2, 0]} material={parts.metal}>
            <boxGeometry args={[0.07, DECK_Y - WHEEL_R, 0.07]} />
          </mesh>
          <mesh position={[0, WHEEL_R, 0]} rotation={[0, 0, Math.PI / 2]} material={parts.metal} castShadow={castShadow}>
            <cylinderGeometry args={[0.022, 0.022, W * 0.92, 8]} />
          </mesh>
          {[-1, 1].map((s, wi) => (
            <mesh
              key={s}
              ref={(m) => void (wheels.current[ti * 2 + wi] = m!)}
              position={[s * W * 0.44, WHEEL_R, 0]}
              geometry={parts.wheelGeo}
              material={parts.wheel}
              castShadow={castShadow}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
