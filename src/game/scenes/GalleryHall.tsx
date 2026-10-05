import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { NFTS, type NftArt } from '../../data/art';
import { tr } from '../../i18n';
import { useGame } from '../../store/gameStore';
import { boxAt, type Box } from '../physics';
import { Player } from '../Player';
import { Pet } from '../Pet';
import { useWorld } from '../SceneKit';
import { Label, sharedMaterials as M } from '../models/props';
import { Portal } from '../models/Portal';
import { PhotoZone } from '../models/PhotoZone';
import { KitModel } from '../models/Kit';
import { useInteractable } from '../runtime';
import { coreTexture, nftPlaceholderCanvas, plateTexture } from '../textures';
import { GALLERY, GALLERY_PHOTO, GALLERY_SPAWNS } from './galleryLayout';
import { Alien } from './SaiWorld';

const { R, frames, wallH } = GALLERY;

const loader = new THREE.TextureLoader();
/** The NFT picture (or its placeholder) and its width / height. */
function useNftTexture(nft: NftArt) {
  const [state, setState] = useState<{ tex: THREE.Texture; aspect: number } | null>(() => {
    if (nft.url) return null;
    const t = new THREE.CanvasTexture(nftPlaceholderCanvas(nft.n));
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, aspect: 1 };
  });
  useEffect(() => {
    if (!nft.url) return;
    let alive = true;
    loader.load(nft.url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      const img = t.image as HTMLImageElement;
      if (alive) setState({ tex: t, aspect: img.width / img.height });
    });
    return () => {
      alive = false;
    };
  }, [nft.url]);
  return state;
}

/** One framed NFT on the wall, with a name plate and a soft spotlight. */
function NftFrame({ nft, f }: { nft: NftArt; f: (typeof frames)[number] }) {
  const art = useNftTexture(nft);
  const box = f.size;
  // fit inside a square box, keep the picture's proportions
  const aspect = art?.aspect ?? 1;
  const w = aspect >= 1 ? box : box * aspect;
  const h = aspect >= 1 ? box / aspect : box;
  const plate = useMemo(() => plateTexture(nft.name, { bg: 'rgba(20,16,52,0.92)', rim: 'rgba(255,207,90,0.9)' }), [nft.name]);
  const inX = -Math.sin(f.a) * 2;
  const inZ = -Math.cos(f.a) * 2;
  useInteractable({ id: `nft-${nft.id}`, pos: [f.x + inX, 0, f.z + inZ], radius: 1.9, label: tr('Look closer: {name}', { name: nft.name }) }, () =>
    useGame.getState().openPanel('nft', f.i),
  );
  return (
    <group position={[f.x, f.y, f.z]} rotation={[0, f.a + Math.PI, 0]}>
      {/* gold frame and dark mat */}
      <mesh position={[0, 0, 0.02]} material={M.gold} castShadow>
        <boxGeometry args={[w + 0.34, h + 0.34, 0.08]} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[w + 0.14, h + 0.14]} />
        <meshStandardMaterial color="#14112e" roughness={0.8} />
      </mesh>
      {art && (
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={art.tex} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -h / 2 - 0.45, 0.06]}>
        <planeGeometry args={[0.42 * plate.aspect, 0.42]} />
        <meshBasicMaterial map={plate.tex} transparent toneMapped={false} />
      </mesh>
      {/* spotlight glow on the wall */}
      <mesh position={[0, h / 2 + 0.5, 0.22]} rotation={[0.5, 0, 0]} material={M.gold}>
        <cylinderGeometry args={[0.07, 0.13, 0.26, 10]} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w + 1.4, h + 1.6]} />
        <meshBasicMaterial color="#fff2c4" transparent opacity={0.18} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Hall() {
  const floor = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, '#3a3378');
    grad.addColorStop(1, '#1d1846');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,207,90,0.85)';
    for (const [r, w] of [
      [250, 6],
      [200, 2],
      [70, 4],
      [44, 2],
    ]) {
      g.lineWidth = w;
      g.beginPath();
      g.arc(256, 256, r, 0, Math.PI * 2);
      g.stroke();
    }
    // eight-point star in the middle
    g.fillStyle = 'rgba(94,231,255,0.5)';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 18 : 60;
      g.lineTo(256 + Math.sin(a) * r, 256 + Math.cos(a) * r);
    }
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const dome = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    dome.current.rotation.y += dt * 0.01;
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R + 0.5, 96]} />
        <meshStandardMaterial map={floor} roughness={0.25} metalness={0.1} />
      </mesh>
      {/* wall, gold trims */}
      <mesh position={[0, wallH / 2, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, wallH, 96, 1, true]} />
        <meshStandardMaterial color="#f3effb" roughness={0.85} side={THREE.BackSide} />
      </mesh>
      {[0.25, wallH - 0.15].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.gold}>
          <torusGeometry args={[R - 0.05, 0.12, 6, 96]} />
        </mesh>
      ))}
      {/* starry dome with an open oculus */}
      <mesh ref={dome} position={[0, wallH, 0]}>
        <sphereGeometry args={[R, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#2b2266" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, wallH + R * 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.2, 48]} />
        <meshBasicMaterial color="#ffd0e4" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* the Sai globe floating over the photo spot */}
      <SaiGlobe />
      {/* benches */}
      {[0.9, 2.2, 4.1, 5.4].map((a) => (
        <group key={a} position={[Math.sin(a) * R * 0.55, 0, Math.cos(a) * R * 0.55]} rotation={[0, a + Math.PI / 2, 0]}>
          <mesh position={[0, 0.45, 0]} material={M.white} castShadow>
            <boxGeometry args={[3, 0.18, 0.8]} />
          </mesh>
          {[-1.2, 1.2].map((x) => (
            <mesh key={x} position={[x, 0.2, 0]} material={M.gold}>
              <boxGeometry args={[0.16, 0.4, 0.7]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function SaiGlobe() {
  const g = useRef<THREE.Group>(null!);
  const tex = coreTexture();
  useFrame((s, dt) => {
    g.current.rotation.y += dt * 0.2;
    g.current.position.y = 6.2 + Math.sin(s.clock.elapsedTime) * 0.2;
  });
  return (
    <group ref={g} position={[0, 6.2, -2.5]}>
      <mesh>
        <sphereGeometry args={[1.5, 40, 28]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]} material={M.gold}>
        <torusGeometry args={[2.2, 0.06, 8, 64]} />
      </mesh>
    </group>
  );
}

export default function GalleryHall({ spawnId }: { spawnId: string }) {
  const spawn = GALLERY_SPAWNS[spawnId] ?? GALLERY_SPAWNS.entrance;
  const quality = useGame((s) => s.settings.quality);
  const colliders = useMemo<Box[]>(() => {
    const out: Box[] = [];
    for (const a of [0.9, 2.2, 4.1, 5.4]) out.push(boxAt(Math.sin(a) * R * 0.55, Math.cos(a) * R * 0.55, 2.4, 2.4, 0.55));
    // a ring of boxes just behind the wall keeps the follow camera inside the hall
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push(boxAt(Math.sin(a) * (R + 0.6), Math.cos(a) * (R + 0.6), 4.5, 4.5, wallH + 4));
    }
    // exit portal pillars
    for (const s of [-1, 1]) out.push(boxAt(s * 1.7, R - 1.2, 0.8, 0.8, 5));
    return out;
  }, []);
  const bounds = useMemo(() => ({ type: 'circle' as const, x: 0, z: 0, r: R - 1.3 }), []);
  useWorld(colliders, bounds);

  useInteractable({ id: 'gallery-exit', pos: [0, 0, R - 2.6], radius: 2.4, label: 'Back to the Central Plaza' }, () => useGame.getState().goTo('home', 'gallery', 'fade'));

  return (
    <>
      <color attach="background" args={['#2b2266']} />
      <hemisphereLight args={['#fff6ea', '#5a4aa0', 1.25]} />
      <directionalLight position={[6, 18, 10]} intensity={1.6} color="#fff0e0" castShadow={quality === 'high'} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, wallH - 1, 0]} intensity={60} distance={R * 2.2} color="#ffe7c2" />

      <Hall />
      {NFTS.map((nft, i) => (
        <NftFrame key={nft.id} nft={nft} f={frames[i]} />
      ))}

      <Portal position={[0, 0, R - 1.2]} rotation={Math.PI} scale={0.55} glow="#ffd36b" title={tr('EXIT')} status={tr('CENTRAL PLAZA')} statusColor="#21c26b" />
      <Label text="NFT Gallery" position={[0, wallH - 1.2, -(R - 1.5)]} scale={1.6} sub={tr('{n} pieces in the collection', { n: NFTS.length })} />
      <PhotoZone id="gallery" place="NFT Gallery" pos={GALLERY_PHOTO} bg={Math.PI} pitch={0.12} />

      <Suspense fallback={null}>
        <Alien model={1} position={[-R * 0.45, 0, -R * 0.3]} rotation={0.6} lookAtPlayer />
        <Alien model={3} position={[R * 0.4, 0, R * 0.1]} path={[[R * 0.4, R * 0.1], [R * 0.2, -R * 0.45], [-R * 0.3, -R * 0.4], [-R * 0.1, R * 0.2]]} speed={1} />
        <group position={[R * 0.3, 0, -R * 0.55]}>
          <KitModel kit="space" model="rock_crystalsLargeA" scale={3} />
        </group>
      </Suspense>

      <Player spawn={spawn} cameraDistance={7} />
      <Pet />
    </>
  );
}
