import { Sparkles } from '@react-three/drei';
import { tr } from '../../i18n';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CORE, HOME_PORTALS, HOME_SPAWNS, PLAZA_R } from './homeLayout';
import { Alien, Monorail, SAI, SaiIsland, SaiPlacements, SaiSky, Ships } from './SaiWorld';
import { KitInstances, KitModel } from '../models/Kit';
import type { Placement } from './cityKit';
import { useGame } from '../../store/gameStore';
import { cityAccess } from '../../services/nftAccess';
import { boxAt, type Box } from '../physics';
import { Player } from '../Player';
import { Pet } from '../Pet';
import { FollowSun, useWorld } from '../SceneKit';
import { Label, SaiRobot, sharedMaterials as M } from '../models/props';
import { Portal } from '../models/Portal';
import { useInteractable, useTrigger } from '../runtime';
import { cityArtTexture, coreTexture, labelTexture, nftPlaceholderCanvas, tileTexture } from '../textures';
import { NFTS } from '../../data/art';
import { PhotoZone } from '../models/PhotoZone';

function SaiCore() {
  const globe = useRef<THREE.Mesh>(null!);
  const rings = useRef<THREE.Group>(null!);
  const tex = coreTexture();
  useFrame((s, dt) => {
    globe.current.rotation.y += dt * 0.15;
    rings.current.rotation.y -= dt * 0.25;
    rings.current.position.y = 14 + Math.sin(s.clock.elapsedTime) * 0.3;
  });
  return (
    <group position={[CORE[0], 0, CORE[1]]}>
      {/* pedestal */}
      <mesh position={[0, 0.5, 0]} material={M.white} receiveShadow castShadow>
        <cylinderGeometry args={[9, 9.6, 1, 48]} />
      </mesh>
      <mesh position={[0, 1.6, 0]} material={M.white} receiveShadow castShadow>
        <cylinderGeometry args={[6, 6.6, 1.2, 48]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.gold}>
        <ringGeometry args={[8.6, 8.9, 48]} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.6, 2.5, 8, 24, 1, true]} />
        <meshBasicMaterial color="#59e6ff" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={globe} position={[0, 14, 0]}>
        <sphereGeometry args={[6, 64, 48]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.9} roughness={0.25} metalness={0.2} />
      </mesh>
      <mesh position={[0, 14, 0]} scale={1.08}>
        <sphereGeometry args={[6, 48, 32]} />
        <meshBasicMaterial color="#7fdcff" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite position={[0, 14, 7]} scale={[7, 3.5, 1]}>
        <spriteMaterial map={labelTexture('Sai', { color: '#ffffff', glow: '#7fdcff', font: 'italic 800 110px "Exo 2", system-ui', w: 512, h: 256 })} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      <group ref={rings} position={[0, 14, 0]}>
        <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]} material={M.gold}>
          <torusGeometry args={[8.5, 0.18, 8, 96]} />
        </mesh>
        <mesh rotation={[Math.PI / 2 - 0.4, 0.3, 0]}>
          <torusGeometry args={[9.6, 0.08, 8, 96]} />
          <meshBasicMaterial color="#59e6ff" toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.white}>
          <torusGeometry args={[11, 0.25, 8, 96]} />
        </mesh>
      </group>
    </group>
  );
}

/** Glowing paths from the core to each portal, with energy pulses running outwards. */
function EnergyPaths() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 8;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(94,231,255,0.55)');
    grad.addColorStop(0.7, 'rgba(94,231,255,0.55)');
    grad.addColorStop(0.92, 'rgba(220,250,255,1)');
    grad.addColorStop(1, 'rgba(94,231,255,0.55)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 8);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame((_, dt) => {
    tex.offset.x -= dt * 0.35;
  });
  return (
    <>
      {HOME_PORTALS.map((p) => {
        const open = p.status === 'open';
        const dx = p.x - CORE[0];
        const dz = p.z - CORE[1];
        const full = Math.hypot(dx, dz);
        const from = 9.4;
        const to = full - 3;
        const len = to - from;
        const mid = (from + to) / 2;
        const ang = Math.atan2(dx, dz);
        const t = tex.clone();
        t.repeat.set(len / 8, 1);
        return (
          <mesh key={p.city} position={[CORE[0] + (dx / full) * mid, 0.03, CORE[1] + (dz / full) * mid]} rotation={[-Math.PI / 2, 0, ang + Math.PI / 2]}>
            <planeGeometry args={[len, open ? 1.1 : 0.5]} />
            {open ? (
              <PulseMaterial map={t} src={tex} />
            ) : (
              <meshBasicMaterial color="#8d86b8" transparent opacity={0.55} toneMapped={false} />
            )}
          </mesh>
        );
      })}
    </>
  );
}

/** Basic material whose (cloned) map follows the shared texture's scroll. */
function PulseMaterial({ map, src }: { map: THREE.Texture; src: THREE.Texture }) {
  useFrame(() => {
    map.offset.x = src.offset.x;
  });
  return <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />;
}

function Kiosk({ position, rotation = 0, title, icon, color }: { position: [number, number, number]; rotation?: number; title: string; icon: string; color: string }) {
  const screen = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    screen.current.position.y = 2.6 + Math.sin(s.clock.elapsedTime * 2) * 0.06;
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.2, 0]} material={M.white} receiveShadow>
        <cylinderGeometry args={[1.6, 1.8, 0.4, 24]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={M.white} castShadow>
        <boxGeometry args={[0.9, 1.8, 0.6]} />
      </mesh>
      <mesh position={[0, 1.2, 0.31]} material={M.gold}>
        <boxGeometry args={[0.6, 1.2, 0.02]} />
      </mesh>
      <mesh ref={screen} position={[0, 2.6, 0]}>
        <planeGeometry args={[2.4, 1.4]} />
        <meshBasicMaterial map={labelTexture(icon, { w: 256, h: 160, font: '96px system-ui', bg: color })} transparent opacity={0.92} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Label text={title} position={[0, 3.8, 0]} scale={0.9} />
    </group>
  );
}

/** Entrance to the NFT Gallery hall: a wall showing the first pieces of the collection. */
function NftGallery() {
  const shown = NFTS.slice(0, 5);
  const texs = useMemo(
    () =>
      shown.map((n) => {
        if (n.url) {
          const t = new THREE.TextureLoader().load(n.url);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        }
        const t = new THREE.CanvasTexture(nftPlaceholderCanvas(n.n));
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <group position={[-34, 0, 6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 2.5, -0.3]} material={M.white} castShadow receiveShadow>
        <boxGeometry args={[16, 5, 0.6]} />
      </mesh>
      <mesh position={[0, 5.05, -0.3]} material={M.gold}>
        <boxGeometry args={[16.2, 0.1, 0.7]} />
      </mesh>
      {texs.map((t, i) => (
        <group key={i} position={[-6 + i * 3, 2.7, 0.02]}>
          <mesh material={M.gold}>
            <boxGeometry args={[2.5, 2.5, 0.1]} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[2.2, 2.2]} />
            <meshBasicMaterial map={t} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <Label text="NFT Gallery" position={[0, 6, 0.4]} scale={1} sub={tr('{n} pieces · press E to enter', { n: NFTS.length })} />
    </group>
  );
}

function SeasonBoard() {
  return (
    <group position={[24, 0, 24]} rotation={[0, -0.6, 0]}>
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} material={M.white}>
          <boxGeometry args={[0.3, 3.2, 0.3]} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, 0]}>
        <planeGeometry args={[5, 2.6]} />
        <meshBasicMaterial map={labelTexture(tr('SEASON 1'), { bg: 'rgba(10,30,80,0.92)', color: '#ffd36b', sub: tr('South America'), w: 512, h: 256 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}


export default function HomePlanet({ spawnId }: { spawnId: string }) {
  const spawn = HOME_SPAWNS[spawnId] ?? HOME_SPAWNS.start;
  const quality = useGame((s) => s.settings.quality);
  const collections = useGame((s) => s.wallet.collections);
  const visitedRio = useGame((s) => !!s.flags.visitedRio);

  const colliders = useMemo<Box[]>(() => {
    const boxes: Box[] = [boxAt(CORE[0], CORE[1], 17, 17, 1), boxAt(CORE[0], CORE[1], 11.5, 11.5, 2.2)];
    for (const p of HOME_PORTALS) {
      for (const s of [-1, 1]) {
        const lx = s * 3.05;
        boxes.push(boxAt(p.x + Math.cos(p.yaw) * lx, p.z - Math.sin(p.yaw) * lx, 1.3, 1.3, 9));
      }
    }
    // kiosks
    for (const [x, z] of [
      [-12, 12],
      [13, 12],
    ]) boxes.push(boxAt(x, z, 1.2, 1.2, 2.2));
    boxes.push(boxAt(-34, 6, 1.2, 16, 5)); // gallery wall
    // planters
    for (const [x, z] of PLANTERS) boxes.push(boxAt(x, z, 3, 3, 0.8));
    // jump practice platforms
    for (const p of PLATFORMS) boxes.push(boxAt(p[0], p[2], 3.2, 3.2, 0.4, p[1] - 0.4));
    return boxes;
  }, []);
  const bounds = useMemo(() => ({ type: 'circle' as const, x: 0, z: 0, r: 45 }), []);
  useWorld(colliders, bounds);

  const plazaTex = useMemo(() => {
    const t = tileTexture('#f4f1fb', '#d6cdee', 4).clone();
    t.repeat.set(18, 18);
    t.needsUpdate = true;
    return t;
  }, []);

  // ── interactions
  for (const p of HOME_PORTALS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useInteractable(
      { id: `portal-${p.city}`, pos: [p.x + Math.sin(p.yaw) * 2, 0, p.z + Math.cos(p.yaw) * 2], radius: 4.5, label: tr('Portal: {name}', { name: tr(p.name) }) },
      () => useGame.getState().openPanel('portal', p.city),
    );
  }
  useTrigger({ id: 'near-rio', pos: [HOME_PORTALS[0].x, 0, HOME_PORTALS[0].z], radius: 9 }, () => {
    const g = useGame.getState();
    if (!g.flags.reachedPortal) g.setFlag('reachedPortal');
  });
  useInteractable({ id: 'terminal', pos: [-12, 0, 12], radius: 3, label: 'Quest Terminal' }, () => useGame.getState().openPanel('terminal'));
  useInteractable({ id: 'shop', pos: [13, 0, 12], radius: 3, label: 'Shop' }, () => useGame.getState().openPanel('shop'));
  useInteractable({ id: 'gallery', pos: [-32, 0, 6], radius: 6, label: 'Enter the NFT Gallery' }, () => useGame.getState().goTo('gallery', 'entrance', 'fade'));
  useInteractable({ id: 'season', pos: [24, 0, 24], radius: 4, label: 'Season Board' }, () => useGame.getState().openPanel('season'));
  useInteractable({ id: 'event', pos: [34, 0, 6], radius: 4, label: 'Event Portal: SAI FEST' }, () =>
    useGame.getState().showDialog({
      name: 'Event Portal',
      portrait: '🎉',
      lines: [
        'SAI FEST RIO is coming soon!',
        'When the event starts this portal opens a festival version of Rio — new music, lights, NPCs and limited-time quests.',
      ],
    }),
  );
  useInteractable({ id: 'homeportal', pos: [-24, 0, 24], radius: 4, label: visitedRio ? 'Home Portal: Rio Apartment' : 'Home Portal (locked)' }, () => {
    const g = useGame.getState();
    if (g.flags.visitedRio) g.goTo('rio-room', 'portal', 'warp');
    else
      g.showDialog({
        name: 'Home Portal',
        portrait: '🏠',
        lines: ['This portal leads to your personal residences.', 'Visit Rio de Janeiro first to unlock your Rio Apartment.'],
      });
  });
  useInteractable({ id: 'guide', pos: [5, 0, 22], radius: 3, label: 'Talk to Sai Guide' }, () => {
    const g = useGame.getState();
    g.showDialog({
      name: 'Sai Guide',
      portrait: '🤖',
      lines: g.flags.visitedRio
        ? ['Welcome back, explorer!', 'Check the Quest Terminal for daily quests, or hop into the Home Portal to visit your apartment.']
        : [
            'Welcome to Sai Universe!',
            'This is your Home Planet. Each portal leads to a city on Earth. This season: South America.',
            'Walk with WASD, jump with Space (twice for a double jump) and interact with E.',
            'Rio de Janeiro is open — its energy network needs you. Head to the glowing Rio portal on the left!',
          ],
    });
  });

  return (
    <>
      <SaiSky />
      <fog attach="fog" args={[SAI.fog, 120, 520]} />
      <hemisphereLight args={['#efe4ff', '#d8c4f2', 1.15]} />
      <FollowSun intensity={2.3} offset={[-25, 45, -30]} color="#ffe9dc" />

      {/* plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[PLAZA_R + 0.5, 96]} />
        <meshStandardMaterial map={plazaTex} roughness={0.35} metalness={0.05} />
      </mesh>
      {[14, 24, 38].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]} material={M.gold}>
          <ringGeometry args={[r, r + 0.25, 96]} />
        </mesh>
      ))}
      <SaiIsland />
      <EnergyPaths />
      <Suspense fallback={null}>
        <SaiPlacements shadows={quality !== 'low'} />
        <Monorail />
        <Ships />
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[45.5, 46.5, 96]} />
        <meshBasicMaterial color="#fff6dc" />
      </mesh>

      <SaiCore />

      {HOME_PORTALS.map((p) => {
        const access = cityAccess(p.city, collections);
        const open = p.status === 'open';
        return (
          <Portal
            key={p.city}
            position={[p.x, 0, p.z]}
            rotation={p.yaw}
            image={cityArtTexture(p.art, p.city)}
            locked={!open}
            title={tr(p.name).toUpperCase()}
            status={!open ? 'SOON' : access === 'full' ? 'FULL ACCESS' : 'OPEN'}
            statusColor={!open ? '#5a6478' : access === 'full' ? '#d9a531' : '#21c26b'}
            glow={open ? '#59e6ff' : '#7d8aa8'}
          />
        );
      })}

      <Kiosk position={[-12, 0, 12]} rotation={0.4} title="Quest Terminal" icon="📜" color="rgba(20,80,160,0.85)" />
      <Kiosk position={[13, 0, 12]} rotation={-0.4} title="Shop" icon="🛍️" color="rgba(160,110,20,0.85)" />
      <NftGallery />
      <SeasonBoard />
      <Portal position={[34, 0, 6]} rotation={-Math.PI / 2} scale={0.55} glow="#c06bff" title="EVENT" status="SOON" statusColor="#8a4fd0" image={undefined} />
      <Portal
        position={[-24, 0, 24]}
        rotation={Math.PI * 0.75}
        scale={0.55}
        glow="#ffd36b"
        title="HOME"
        status={visitedRio ? 'RIO APARTMENT' : 'LOCKED'}
        statusColor={visitedRio ? '#21c26b' : '#5a6478'}
        locked={!visitedRio}
      />

      {PLANTERS.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.4, z]} material={M.white} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.3, 0.8, 16]} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <KitInstances placements={DECOR} shadows={quality !== 'low'} />
        <SpinningStar position={[PLATFORMS[2][0], PLATFORMS[2][1] + 1.3, PLATFORMS[2][2]]} />
      </Suspense>

      <PhotoZone id="hub-core" place="Sai Home Planet" pos={[0, 0, 13]} bg={Math.PI} pitch={0.3} />
      <PhotoZone id="hub-portal" place="Portal to Rio de Janeiro" pos={RIO_PHOTO.pos} bg={RIO_PHOTO.bg} pitch={0.15} />
      <SaiRobot position={[5, 0, 22]} />
      <Label text="Sai Guide" position={[5, 2.6, 22]} scale={0.7} />
      <SaiRobot position={[-6, 0, 2]} path={[[-6, 2], [6, 2], [10, 16], [-10, 16]]} />
      <Suspense fallback={null}>
        {ALIEN_WALKS.map((path, i) => (
          <Alien key={i} model={i} position={[path[0][0], 0, path[0][1]]} path={path} speed={1.2 + (i % 3) * 0.25} />
        ))}
        <Alien model={4} position={[-17, 0, 9]} rotation={1.2} pose="emote-yes" />
        <Alien model={2} position={[9, 0, 33]} rotation={Math.PI} lookAtPlayer />
      </Suspense>

      {quality === 'high' && <Sparkles count={140} scale={[100, 24, 100]} position={[0, 8, 0]} size={4} speed={0.3} color="#efe0ff" />}

      <Player spawn={spawn} cameraDistance={8} />
      <Pet />
    </>
  );
}

const PLANTERS: [number, number][] = [
  [-20, 30],
  [20, 30],
  [-40, -6],
  [40, -6],
  [-8, 36],
  [8, 36],
];

const PLATFORMS: [number, number, number][] = [
  [-38, 1.2, 18],
  [-34, 2.6, 24],
  [-29, 4.0, 29],
];

/** Alien neighbours stroll around the plaza rings. */
const ALIEN_WALKS: [number, number][][] = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (i / 6) * Math.PI * 2;
  const r = 18 + (i % 3) * 5;
  return Array.from({ length: 6 }, (_, k) => {
    const b = a + (k / 6) * Math.PI * 2 * (i % 2 ? 1 : -1);
    return [Math.sin(b) * r, Math.cos(b) * r - 2] as [number, number];
  });
});

/** Alien trees in the planters and lavender blocks for the jump practice steps. */
const DECOR: Placement[] = [
  ...PLANTERS.map(([x, z], i): Placement => ({ kit: 'platformer', model: i % 2 ? 'tree' : 'tree-pine', x, z, y: 0.8, rot: i * 1.3, scale: 2.6, solid: false })),
  // platform tops sit at p[1]; the low hexagon block is 0.5 units tall
  ...PLATFORMS.map((p, i): Placement => ({ kit: 'platformer', model: 'block-grass-low-hexagon', x: p[0], z: p[2], y: p[1] - 1.45, rot: i * 0.7, scale: 2.9, solid: false })),
  { kit: 'platformer', model: 'spring', x: -40, z: 13.5, rot: 0, scale: 2, solid: false },
  { kit: 'platformer', model: 'flag', x: PLATFORMS[2][0] + 1.6, z: PLATFORMS[2][2] - 0.6, y: PLATFORMS[2][1], rot: 0.6, scale: 3, solid: false },
];

function SpinningStar({ position }: { position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s, dt) => {
    g.current.rotation.y += dt * 1.6;
    g.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 2) * 0.15;
  });
  return (
    <group ref={g} position={position}>
      <KitModel kit="platformer" model="star" scale={2.4} />
    </group>
  );
}

/** Photo spot in front of the Rio portal: the portal (and the sky planet) behind Sai. */
const RIO_PHOTO = (() => {
  const p = HOME_PORTALS[0];
  // in front of the portal and a little to the side, so its marker doesn't hide the portal's name plates
  const x = p.x + Math.sin(p.yaw) * 8 + Math.cos(p.yaw) * 3.5;
  const z = p.z + Math.cos(p.yaw) * 8 - Math.sin(p.yaw) * 3.5;
  return { pos: [x, 0, z] as [number, number, number], bg: Math.atan2(p.x - x, p.z - z) };
})();
