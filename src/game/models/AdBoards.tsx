import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { tr } from '../../i18n';
import { useGame } from '../../store/gameStore';
import { boxAt, type Box } from '../physics';
import { useInteractable } from '../runtime';
import { adImage, AD_CONTENT, type AdSlot } from '../scenes/rioAds';
import { sharedMaterials as M } from './props';

const cache = new Map<string, THREE.CanvasTexture>();

/** "Your ad here" artwork in the spot's proportions. */
export function adPlaceholderCanvas(slot: AdSlot) {
  const W = 1024;
  const H = Math.round(Math.max(256, Math.min(1400, (W * slot.h) / slot.w)));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a1f7a');
  bg.addColorStop(0.55, '#6a3fc4');
  bg.addColorStop(1, '#ff7eb6');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // soft stars
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${0.15 + ((i * 7) % 10) / 20})`;
    g.fillRect((i * 173) % W, (i * 97) % H, 3, 3);
  }
  const u = Math.min(W, H) / 100;
  g.strokeStyle = '#ffd36b';
  g.lineWidth = u * 1.4;
  g.strokeRect(u * 2.5, u * 2.5, W - u * 5, H - u * 5);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = u;
  const portrait = H > W * 0.9;
  const big = portrait ? W * 0.1 : Math.min(H * 0.2, W * 0.075);
  g.font = `800 ${big}px "Exo 2", system-ui, sans-serif`;
  const l1 = tr('YOUR AD');
  const l2 = tr('COULD BE HERE');
  // shrink the headline until both lines fit inside the frame
  let size = big;
  const fit = () => {
    g.font = `800 ${size}px "Exo 2", system-ui, sans-serif`;
    return Math.max(g.measureText(l1).width, g.measureText(l2).width);
  };
  while (fit() > W * 0.84 && size > 12) size *= 0.92;
  const y = H * (portrait ? 0.4 : 0.36);
  g.fillText(l1, W / 2, y);
  g.fillStyle = '#ffd36b';
  g.fillText(l2, W / 2, y + size * 1.1);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = `700 ${Math.min(big * 0.38, (W * 0.84) / 24)}px "Exo 2", system-ui, sans-serif`;
  g.fillText(`SAI UNIVERSE · ${tr('spot')} ${slot.code} · ${+slot.w.toFixed(1)}×${+slot.h.toFixed(1)} ${tr("m")}`, W / 2, H * (portrait ? 0.62 : 0.8));
  return c;
}

/** Client picture (cropped to fill the spot) or the placeholder. */
function adTexture(slot: AdSlot) {
  let t = cache.get(slot.code);
  if (t) return t;
  const c = adPlaceholderCanvas(slot);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const url = adImage(slot.code);
  if (url) {
    const img = new Image();
    img.onload = () => {
      const g = c.getContext('2d')!;
      const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      t!.needsUpdate = true;
    };
    img.src = url;
  }
  cache.set(slot.code, t);
  return t;
}

const dark = new THREE.MeshStandardMaterial({ color: '#2c2f3d', roughness: 0.6, metalness: 0.3 });

/** The picture itself: unlit, so it glows like a lit poster or LED screen. */
function Picture({ slot, z = 0.06, back }: { slot: AdSlot; z?: number; back?: boolean }) {
  const tex = adTexture(slot);
  return (
    <mesh position={[0, 0, back ? -z : z]} rotation={[0, back ? Math.PI : 0, 0]}>
      <planeGeometry args={[slot.w, slot.h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Frame({ slot, depth = 0.3 }: { slot: AdSlot; depth?: number }) {
  return (
    <mesh material={dark} castShadow>
      <boxGeometry args={[slot.w + 0.4, slot.h + 0.4, depth]} />
    </mesh>
  );
}

function Rooftop({ slot }: { slot: AdSlot }) {
  const base = slot.base ?? 2;
  const legY = -slot.h / 2 - base / 2;
  return (
    <>
      <Frame slot={slot} />
      <Picture slot={slot} z={0.16} />
      {[-0.32, 0.32].map((k) => (
        <mesh key={k} position={[k * slot.w, legY, -0.4]} material={dark} castShadow>
          <boxGeometry args={[0.35, base, 0.35]} />
        </mesh>
      ))}
      {/* catwalk and lamps */}
      <mesh position={[0, -slot.h / 2 - 0.3, 0.6]} material={dark}>
        <boxGeometry args={[slot.w, 0.12, 0.9]} />
      </mesh>
      {[-0.35, 0, 0.35].map((k) => (
        <mesh key={k} position={[k * slot.w, slot.h / 2 + 0.35, 0.6]} rotation={[0.6, 0, 0]} material={M.gold}>
          <boxGeometry args={[0.5, 0.18, 0.3]} />
        </mesh>
      ))}
    </>
  );
}

function Facade({ slot }: { slot: AdSlot }) {
  return (
    <>
      <mesh position={[0, 0, -0.02]} material={dark}>
        <boxGeometry args={[slot.w + 0.3, slot.h + 0.3, 0.1]} />
      </mesh>
      <Picture slot={slot} z={0.05} />
    </>
  );
}

function CityLight({ slot }: { slot: AdSlot }) {
  const base = slot.base ?? 0.8;
  return (
    <>
      <mesh material={M.white} castShadow>
        <boxGeometry args={[slot.w + 0.3, slot.h + 0.3, 0.32]} />
      </mesh>
      <Picture slot={slot} z={0.17} />
      <Picture slot={slot} z={0.17} back />
      <mesh position={[0, -slot.h / 2 - base / 2, 0]} material={M.white}>
        <boxGeometry args={[0.5, base, 0.3]} />
      </mesh>
      <mesh position={[0, slot.h / 2 + 0.2, 0]} material={M.gold}>
        <boxGeometry args={[slot.w + 0.4, 0.1, 0.4]} />
      </mesh>
    </>
  );
}

function Beach({ slot }: { slot: AdSlot }) {
  const base = slot.base ?? 2.4;
  return (
    <>
      <Frame slot={slot} depth={0.15} />
      <Picture slot={slot} z={0.09} />
      {[-0.5, 0.5].map((k) => (
        <mesh key={k} position={[k * (slot.w + 0.3), -slot.h / 2 - base / 2 + 0.2, 0]} material={M.white} castShadow>
          <cylinderGeometry args={[0.14, 0.18, slot.h + base, 8]} />
        </mesh>
      ))}
    </>
  );
}

function Screen({ slot }: { slot: AdSlot }) {
  const base = slot.base ?? 1.4;
  return (
    <>
      <Frame slot={slot} depth={0.45} />
      <Picture slot={slot} z={0.24} />
      <mesh position={[0, -slot.h / 2 - base / 2, -0.1]} material={dark}>
        <boxGeometry args={[1, base, 0.6]} />
      </mesh>
    </>
  );
}

/** Blimp drifting over the beach with the ad on both flanks. */
function Blimp({ slot }: { slot: AdSlot }) {
  const g = useRef<THREE.Group>(null!);
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f5fb', roughness: 0.45 }), []);
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.012;
    const x = Math.sin(t) * 120;
    g.current.position.set(x, slot.pos[1] + Math.sin(t * 9) * 1.5, slot.pos[2]);
    g.current.rotation.y = Math.cos(t) >= 0 ? 0 : Math.PI;
  });
  const L = slot.w * 1.6;
  return (
    <group ref={g}>
      <mesh scale={[L / 2, slot.h * 0.95, slot.h * 0.95]} material={hull} castShadow>
        <sphereGeometry args={[1, 32, 18]} />
      </mesh>
      {/* gondola and fins */}
      <mesh position={[0, -slot.h * 1.05, 0]} material={dark}>
        <boxGeometry args={[L * 0.18, 1.6, 2]} />
      </mesh>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[-L / 2 + 1.5, 0, 0]} rotation={[r, 0, 0]} material={M.gold}>
          <boxGeometry args={[3.5, slot.h * 1.3, 0.25]} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0.2, s * (slot.h * 0.95 + 0.05)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <Picture slot={slot} z={0} />
        </group>
      ))}
    </group>
  );
}

function AdBoard({ slot }: { slot: AdSlot }) {
  const taken = !!AD_CONTENT[slot.code] || !!adImage(slot.code);
  useInteractable(
    {
      id: `ad-${slot.code}`,
      pos: slot.use ?? slot.pos,
      radius: slot.kind === 'citylight' ? 2.4 : 4,
      label: taken ? tr('Advert: {name}', { name: AD_CONTENT[slot.code]?.advertiser ?? slot.code }) : tr('Ad spot {code}: place your ad', { code: slot.code }),
    },
    () => useGame.getState().openPanel('ad', slot.code),
    !!slot.use,
  );
  if (slot.kind === 'blimp') return <Blimp slot={slot} />;
  return (
    <group position={slot.pos} rotation={[0, slot.rot, 0]}>
      {slot.kind === 'rooftop' && <Rooftop slot={slot} />}
      {slot.kind === 'facade' && <Facade slot={slot} />}
      {slot.kind === 'citylight' && <CityLight slot={slot} />}
      {slot.kind === 'beach' && <Beach slot={slot} />}
      {slot.kind === 'screen' && <Screen slot={slot} />}
    </group>
  );
}

export function AdBoards({ slots }: { slots: AdSlot[] }) {
  return (
    <>
      {slots.map((s) => (
        <AdBoard key={s.code} slot={s} />
      ))}
    </>
  );
}

/** Colliders for the boards the player can walk into. */
export function adColliders(slots: AdSlot[]): Box[] {
  const out: Box[] = [];
  for (const s of slots) {
    if (s.kind === 'citylight') out.push(boxAt(s.pos[0], s.pos[2], s.w + 0.4, 0.5, s.pos[1] + s.h / 2 + 0.3));
    if (s.kind === 'screen') out.push(boxAt(s.pos[0], s.pos[2], s.w + 0.4, 0.8, s.h + (s.base ?? 0) + 0.5, s.pos[1] - s.h / 2 - (s.base ?? 0)));
  }
  return out;
}
