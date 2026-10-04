import { Sky } from '@react-three/drei';
import { tr } from '../../i18n';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { play } from '../../audio/sfx';
import { questById } from '../../data/quests';
import { activeObjective, useGame } from '../../store/gameStore';
import { isQuestAvailable } from '../../store/questEngine';
import { cityAccess } from '../../services/nftAccess';
import { boxAt, world, type Box } from '../physics';
import { Player } from '../Player';
import { Pet } from '../Pet';
import { blockCollider, Blocks, FollowSun, matFor, setCityGlow, useWorld, type BlockDef } from '../SceneKit';
import { Beacon, Label, Npc, Orb, Palm, QuestMarker, SaiRobot, sharedMaterials as M, Token } from '../models/props';
import { Portal } from '../models/Portal';
import { CityKit, placementCollider } from '../models/CityKit';
import { buildRioCity } from './cityKit';
import { collectibles, useInteractable, useTrigger } from '../runtime';
import { copacabanaTexture, coreTexture, labelTexture, noiseTexture, tileTexture } from '../textures';
import {
  buildRioBlocks,
  poiById,
  RIO_BOUNDS,
  RIO_FAST_TRAVEL_POINTS,
  RIO_ORBS,
  RIO_SPAWNS,
  RIO_TOKENS,
  RIO_VIEWPOINTS,
  RIO_WALKERS,
  SUMMIT,
  SUMMIT_PATH,
} from './rioLayout';

const STATION: BlockDef = { x: 70, z: -70, w: 18, d: 14, h: 8, color: '#e8eef5', kind: 'facadeLit', roof: '#9fb6c9' };
const STAIRS: BlockDef[] = Array.from({ length: 20 }, (_, i) => ({
  x: 43.45 + i * 0.9,
  z: -71,
  w: 0.92,
  d: 4,
  h: 0.4 * (i + 1),
  color: '#cfd8e3',
}));
const SUMMIT_ROCK: BlockDef = { x: SUMMIT[0], z: SUMMIT[2], w: 9, d: 9, h: SUMMIT[1], color: '#6f7d6a' };
const APARTMENT: BlockDef = { x: -31, z: 40, w: 22, d: 16, h: 14, color: '#f4f1ea', kind: 'facadeLit', roof: '#4d9de0' };
const STAGE: BlockDef = { x: 85, z: 46, w: 20, d: 10, h: 1.5, color: '#2b2f45' };
const CARNIVAL_WALLS: BlockDef[] = [
  { x: 130, z: -32, w: 28, d: 1, h: 4, color: '#f5c542' },
  { x: 130, z: -4, w: 28, d: 1, h: 4, color: '#f5c542' },
  { x: 144, z: -18, w: 1, d: 28, h: 4, color: '#f5c542' },
  { x: 116, z: -27, w: 1, d: 10, h: 4, color: '#f5c542' },
  { x: 116, z: -8.5, w: 1, d: 9, h: 4, color: '#f5c542' },
];
const GATE: Box = boxAt(116, -17, 1.2, 6, 4, 0, { noCamera: true });

function FountainAndSquare() {
  const tex = useMemo(() => {
    const t = tileTexture('#e9e1d0', '#cbbd9f', 6).clone();
    t.repeat.set(10, 10);
    t.needsUpdate = true;
    return t;
  }, []);
  const water = useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    water.current.position.y = 0.7 + Math.sin(s.clock.elapsedTime * 2) * 0.03;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, 0]} material={M.white} castShadow receiveShadow>
        <cylinderGeometry args={[4, 4.3, 0.8, 32]} />
      </mesh>
      <mesh ref={water} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[3.6, 3.6, 0.1, 32]} />
        <meshStandardMaterial color="#3fb8d8" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.8, 0]} material={M.gold} castShadow>
        <cylinderGeometry args={[0.35, 0.6, 2.4, 12]} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <sphereGeometry args={[0.6, 20, 14]} />
        <meshStandardMaterial color="#59e6ff" emissive="#59e6ff" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function EnergyTower({ restored }: { restored: boolean }) {
  const rings = useRef<THREE.Group>(null!);
  const coreMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a3550', emissive: '#59e6ff', emissiveIntensity: 0.05 }), []);
  useFrame((s, dt) => {
    rings.current.rotation.y += dt * (restored ? 1.2 : 0.1);
    coreMat.emissiveIntensity += ((restored ? 3 : 0.05) - coreMat.emissiveIntensity) * Math.min(1, dt * 2);
    rings.current.position.y = 26 + Math.sin(s.clock.elapsedTime) * 0.4;
  });
  return (
    <group position={[0, 0, -46]}>
      <mesh position={[0, 2, 0]} material={M.white} castShadow receiveShadow>
        <boxGeometry args={[6, 4, 6]} />
      </mesh>
      <mesh position={[0, 16, 0]} material={M.white} castShadow>
        <cylinderGeometry args={[0.9, 2.2, 24, 16]} />
      </mesh>
      <mesh position={[0, 16, 0]} material={coreMat}>
        <cylinderGeometry args={[0.95, 2.25, 2, 16]} />
      </mesh>
      <mesh position={[0, 29, 0]} material={coreMat}>
        <octahedronGeometry args={[2.2, 1]} />
      </mesh>
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.gold}>
          <torusGeometry args={[3.4, 0.15, 8, 48]} />
        </mesh>
        <mesh rotation={[Math.PI / 2 + 0.4, 0, 0]} material={M.gold}>
          <torusGeometry args={[4.2, 0.1, 8, 48]} />
        </mesh>
      </group>
      {restored && (
        <mesh position={[0, 80, 0]}>
          <cylinderGeometry args={[0.6, 1.6, 100, 16, 1, true]} />
          <meshBasicMaterial color="#59e6ff" transparent opacity={0.3} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Label text="ENERGY TOWER" position={[0, 6, 3.4]} scale={0.8} />
    </group>
  );
}

function Gondola() {
  const g = useRef<THREE.Group>(null!);
  const a = new THREE.Vector3(72, 9, -66);
  const b = new THREE.Vector3(150, 46, -150);
  useFrame((s) => {
    const t = (Math.sin(s.clock.elapsedTime * 0.12) + 1) / 2;
    g.current.position.lerpVectors(a, b, t);
  });
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const dir = b.clone().sub(a).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <>
      <mesh position={[mid.x, mid.y + 2.5, mid.z]} quaternion={quat}>
        <cylinderGeometry args={[0.06, 0.06, len, 4]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <group ref={g}>
        <mesh position={[0, 1.2, 0]} material={M.dark}>
          <cylinderGeometry args={[0.05, 0.05, 2.4, 4]} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[2.6, 2, 2.2]} />
          <meshStandardMaterial color="#e8604c" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[2.7, 0.9, 2.0]} />
          <meshStandardMaterial color="#9fdcff" roughness={0.1} metalness={0.5} />
        </mesh>
      </group>
    </>
  );
}

function Backdrop() {
  return (
    <group>
      {/* Corcovado with the Redeemer */}
      <mesh position={[-60, 0, -280]} scale={[1, 1, 0.8]}>
        <coneGeometry args={[90, 150, 10]} />
        <meshStandardMaterial color="#2f6b4a" roughness={1} />
      </mesh>
      <group position={[-60, 150, -280]}>
        <mesh position={[0, 8, 0]} material={M.white}>
          <boxGeometry args={[3, 16, 3]} />
        </mesh>
        <mesh position={[0, 13, 0]} material={M.white}>
          <boxGeometry args={[18, 2.2, 2.4]} />
        </mesh>
        <mesh position={[0, 17.5, 0]} material={M.white}>
          <sphereGeometry args={[1.6, 12, 10]} />
        </mesh>
      </group>
      {/* Sugarloaf in the bay */}
      <mesh position={[150, 0, 210]} scale={[1, 1.8, 1]}>
        <sphereGeometry args={[40, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3f7a52" roughness={1} />
      </mesh>
      <mesh position={[95, 0, 230]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[30, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#356b48" roughness={1} />
      </mesh>
      {/* Mountain behind the summit */}
      <mesh position={[150, 0, -165]}>
        <coneGeometry args={[60, 110, 9]} />
        <meshStandardMaterial color="#4a7a52" roughness={1} />
      </mesh>
    </group>
  );
}

function StreetLamp({ position, on }: { position: [number, number, number]; on: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.5, 0]} material={M.dark}>
        <cylinderGeometry args={[0.08, 0.12, 5, 6]} />
      </mesh>
      <mesh position={[0, 5.1, 0]} material={on ? matFor('#bff4ff', 'glow') : M.dark}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
    </group>
  );
}

function MarketStall({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} material={matFor('#8a5a3a')} castShadow>
        <boxGeometry args={[3, 1, 1.6]} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0.2, 0, 0]} material={matFor(color)} castShadow>
        <boxGeometry args={[3.4, 0.1, 2.2]} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.3, 0.7]} material={M.dark}>
          <cylinderGeometry args={[0.05, 0.05, 2.6, 4]} />
        </mesh>
      ))}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={x} position={[x, 1.15, 0]} material={matFor(['#f2c14e', '#e15554', '#3bb273'][i])}>
          <sphereGeometry args={[0.25, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Umbrella({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} material={M.white}>
        <cylinderGeometry args={[0.05, 0.05, 2.6, 4]} />
      </mesh>
      <mesh position={[0, 2.5, 0]} material={matFor(color)} castShadow>
        <coneGeometry args={[1.8, 0.7, 10]} />
      </mesh>
      <mesh position={[0.9, 0.12, 0.8]} rotation={[-Math.PI / 2, 0, 0.3]} material={matFor('#ffffff')}>
        <planeGeometry args={[0.9, 1.9]} />
      </mesh>
    </group>
  );
}

function OrbPickup({ i, pos }: { i: number; pos: [number, number, number] }) {
  const key = `orb:${i}`;
  const taken = useGame((s) => !!s.collected[key]);
  useEffect(() => {
    if (taken) return;
    collectibles.set(key, new THREE.Vector3(...pos));
    return () => {
      collectibles.delete(key);
    };
  }, [taken, key, pos]);
  useTrigger(
    { id: key, pos: [pos[0], pos[1] - 1, pos[2]], radius: 1.6, heightTolerance: 1.6 },
    () => {
      play('collect');
      useGame.getState().collect(key, { energy: 5, event: { type: 'collect', target: 'orb' } });
    },
    !taken,
  );
  if (taken) return null;
  return <Orb position={pos} />;
}

function TokenPickup({ id, pos }: { id: string; pos: [number, number, number] }) {
  const key = `secret:${id}`;
  const taken = useGame((s) => !!s.collected[key]);
  useTrigger(
    { id: key, pos: [pos[0], pos[1] - 1, pos[2]], radius: 1.6, heightTolerance: 1.6 },
    () => {
      const g = useGame.getState();
      play('crystal');
      if (!g.quests.rio_secrets) g.acceptQuest('rio_secrets');
      g.collect(key, { xp: 25, energy: 20, item: 'sai_token', toast: 'Secret found: Golden Sai Token!', icon: '🪙', event: { type: 'collect', target: 'sai_token' } });
    },
    !taken,
  );
  if (taken) return null;
  return <Token position={pos} />;
}

function Viewpoint({ id, pos, name }: { id: string; pos: [number, number, number]; name: string }) {
  const seen = useGame((s) => !!s.collected[`vp:${id}`]);
  useTrigger({ id: `vp-${id}`, pos, radius: 4, heightTolerance: 2 }, () => {
    const g = useGame.getState();
    if (g.collected[`vp:${id}`]) return;
    g.setFlag(`vpever:${id}`);
    play('collect');
    g.collect(`vp:${id}`, { xp: 15, toast: tr('Viewpoint: {name}', { name: tr(name) }), icon: '📷', event: { type: 'visit', target: 'viewpoint' } });
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2, 32]} />
        <meshBasicMaterial color={seen ? '#6f7d95' : '#ffd36b'} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <Label text={`📷 ${tr(name)}`} position={[0, 2.6, 0]} scale={0.6} />
    </group>
  );
}

function FastTravelPillar({ id, name, x, z }: { id: string; name: string; x: number; z: number }) {
  const found = useGame((s) => s.fastTravel.includes(id));
  useTrigger({ id: `ft-${id}`, pos: [x, 0, z], radius: 4 }, () => useGame.getState().discoverFastTravel(id, name));
  return (
    <group position={[x + 2.5, 0, z]}>
      <mesh position={[0, 1.2, 0]} material={M.white}>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 2.7, 0]} material={found ? matFor('#59e6ff', 'glow') : M.gold}>
        <octahedronGeometry args={[0.4, 0]} />
      </mesh>
    </group>
  );
}

export default function RioCity({ spawnId }: { spawnId: string }) {
  const spawn = RIO_SPAWNS[spawnId] ?? RIO_SPAWNS.portal;
  const quality = useGame((s) => s.settings.quality);
  const shadows = quality === 'high';
  const flags = useGame((s) => s.flags);
  const quests = useGame((s) => s.quests);
  const collections = useGame((s) => s.wallet.collections);
  const trackedQuest = useGame((s) => s.trackedQuest);
  const hasMask = useGame((s) => !!s.collected['nft:carnival_mask']);
  const fullAccess = cityAccess('rio', collections) === 'full';
  const restored = !!flags.rioRestored;

  const { blocks, parkour } = useMemo(() => buildRioBlocks(), []);
  const city = useMemo(() => buildRioCity(), []);
  const solid = useMemo<BlockDef[]>(
    () => [...blocks, ...parkour, STATION, ...STAIRS, SUMMIT_ROCK, APARTMENT, STAGE, ...CARNIVAL_WALLS],
    [blocks, parkour],
  );
  const colliders = useMemo<Box[]>(() => {
    const boxes = solid.map(blockCollider);
    for (const p of city) if (p.solid) boxes.push(placementCollider(p));
    boxes.push(boxAt(0, 0, 7.6, 7.6, 0.8)); // fountain
    boxes.push(boxAt(0, -46, 6, 6, 4)); // tower base
    boxes.push(boxAt(-14, -8, 3, 3, 0.6)); // beacon 1
    boxes.push(boxAt(58, -46, 3, 3, 0.6)); // beacon 3
    for (const s of [-1, 1]) boxes.push(boxAt(s * 3.05, 34, 1.3, 1.3, 9)); // arrival portal
    boxes.push(boxAt(0, 34, 5.2, 0.4, 9.5, 0.5)); // portal surface: keeps the camera out of it
    for (const [x, y, z] of SUMMIT_PATH) boxes.push(boxAt(x, z, 3.4, 3.4, 0.5, y - 0.5));
    boxes.push(boxAt(40, 102, 4, 20, 0.6)); // pier
    return boxes;
  }, [solid, city]);
  const bounds = useMemo(() => ({ type: 'rect' as const, ...RIO_BOUNDS }), []);
  useWorld(colliders, bounds);

  // NFT gate (no hard lock on the city itself — only this plaza, TZ §6)
  useEffect(() => {
    if (fullAccess) return;
    return world.add(GATE);
  }, [fullAccess, colliders]);

  useEffect(() => {
    setCityGlow(restored ? 0.9 : 0);
  }, [restored]);

  const groundTex = useMemo(() => {
    const t = noiseTexture('#8d8f96', '#5d6068', 1400).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 40);
    t.needsUpdate = true;
    return t;
  }, []);
  const sandTex = useMemo(() => {
    const t = noiseTexture('#f0d9a0', '#c9a96a', 1600).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 8);
    t.needsUpdate = true;
    return t;
  }, []);
  const copaTex = useMemo(() => {
    const t = copacabanaTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 1);
    t.needsUpdate = true;
    return t;
  }, []);

  // ── quest helpers
  const story = quests.rio_energy_01;
  const obj1 = activeObjective({ quests }, 'rio_energy_01');
  const obj2 = activeObjective({ quests }, 'rio_story_02');
  const storyDone = story?.status === 'completed';
  const ch2Available = isQuestAvailable(questById('rio_story_02'), { quests, flags });

  const markerPoi = (() => {
    const id = trackedQuest ?? (story?.status === 'active' ? 'rio_energy_01' : null);
    if (!id) return null;
    const o = activeObjective({ quests }, id);
    return o?.poi ? poiById(o.poi) : null;
  })();

  useInteractable({ id: 'home-portal', pos: [0, 0, 32], radius: 4, label: 'Portal: Home Planet' }, () =>
    useGame.getState().goTo('home', 'rio', 'warp'),
  );

  useInteractable({ id: 'technician', pos: [7, 0, 12], radius: 3.2, label: 'Talk to Rio Technician' }, () => {
    const g = useGame.getState();
    const st = g.quests.rio_energy_01;
    const o = activeObjective(g, 'rio_energy_01');
    if (!st) {
      g.showDialog({
        name: 'Rio Technician',
        portrait: '🧑‍🔧',
        lines: [
          'Sai! Thank the stars you are here.',
          'The energy towers stopped working — the whole Rio network is dark.',
          'Three Energy Beacons feed the grid: one right here on the square, one on the Favela rooftops and one at the Cable Car Station. Can you bring them back online?',
        ],
        actions: [
          { label: 'Accept quest', primary: true, onClick: () => { g.acceptQuest('rio_energy_01'); g.showDialog(null); } },
          { label: 'Later', onClick: () => g.showDialog(null) },
        ],
      });
    } else if (o?.type === 'talk') {
      g.showDialog(null);
      g.questEvent({ type: 'talk', target: 'technician' });
    } else if (st.status === 'active') {
      g.showDialog({ name: 'Rio Technician', portrait: '🧑‍🔧', lines: [tr('Next: {task}.', { task: tr(o?.label ?? '') }), 'Use M to open the map — the target is marked.'] });
    } else {
      g.showDialog({
        name: 'Rio Technician',
        portrait: '🧑‍🔧',
        lines: g.flags.crystalPlaced
          ? ['The crystal in your apartment is resonating with the mountain. Climb the floating path above the Cable Station!']
          : ['Rio is shining again thanks to you!', 'Take the Energy Crystal home and put it on your Trophy Shelf — I have a feeling it is more than a trophy.'],
      });
    }
  });

  const beacon = (n: 1 | 2 | 3) => () => {
    const g = useGame.getState();
    const o = activeObjective(g, 'rio_energy_01');
    const target = `beacon${n}`;
    if (g.flags[target]) {
      g.toast(tr('Beacon #{n} is online', { n }), '⚡', 'quest');
      return;
    }
    if (!o) {
      g.showDialog({ name: tr('Energy Beacon #{n}', { n }), portrait: '⚡', lines: ['The beacon is offline.', 'Talk to the Rio Technician on Central Square.'] });
      return;
    }
    if (o.type === 'reach' && o.target === target) g.questEvent({ type: 'reach', target });
    const now = activeObjective(useGame.getState(), 'rio_energy_01');
    if (now?.type === 'activate' && now.target === target) {
      g.questEvent({ type: 'activate', target });
      g.setFlag(target);
      play('beacon');
    } else if (now?.type === 'puzzle' && now.target === target) {
      g.openPanel('puzzle', { target, title: 'Energy Network — Beacon #3', size: 4, seed: 7 });
    } else {
      g.toast(tr('Restore the beacons in order: {task}', { task: tr(now?.label ?? '') }), '⚡', 'warn');
    }
  };
  useInteractable({ id: 'beacon1', pos: [-14, 0, -8], radius: 4.5, label: flags.beacon1 ? 'Beacon #1 · Online' : 'Activate Beacon #1' }, beacon(1));
  useInteractable({ id: 'beacon2', pos: [-111, 11.4, -46], radius: 4.5, label: flags.beacon2 ? 'Beacon #2 · Online' : 'Activate Beacon #2', heightTolerance: 1.5 }, beacon(2));
  useInteractable({ id: 'beacon3', pos: [58, 0, -46], radius: 4.5, label: flags.beacon3 ? 'Beacon #3 · Online' : 'Repair Beacon #3' }, beacon(3));
  useTrigger({ id: 'reach-b1', pos: [-14, 0, -8], radius: 8 }, () => useGame.getState().questEvent({ type: 'reach', target: 'beacon1' }));
  useTrigger({ id: 'reach-b3', pos: [58, 0, -46], radius: 9 }, () => useGame.getState().questEvent({ type: 'reach', target: 'beacon3' }));
  useTrigger({ id: 'reach-summit', pos: SUMMIT, radius: 5, heightTolerance: 2 }, () =>
    useGame.getState().questEvent({ type: 'reach', target: 'summit' }),
  );

  const showArtifact = obj2?.target === 'ancient_artifact';
  useInteractable(
    { id: 'artifact', pos: [SUMMIT[0], SUMMIT[1], SUMMIT[2]], radius: 3, label: 'Take the Strange Artifact', heightTolerance: 2 },
    () => {
      const g = useGame.getState();
      play('crystal');
      g.collect('artifact:ancient', { item: 'ancient_artifact', toast: 'Strange Artifact obtained', icon: '🔮', event: { type: 'collect', target: 'ancient_artifact' } });
    },
    showArtifact,
  );

  useInteractable({ id: 'apartment-door', pos: [-31, 0, 30.5], radius: 3, label: 'Enter Rio Apartment' }, () =>
    useGame.getState().goTo('rio-room', 'door', 'fade'),
  );
  useInteractable({ id: 'merchant', pos: [70, 0, -5], radius: 3.5, label: 'Market Merchant · Shop' }, () => useGame.getState().openPanel('shop'));
  useInteractable({ id: 'dj', pos: [85, 1.5, 46], radius: 4, label: 'Talk to DJ Bot', heightTolerance: 3 }, () =>
    useGame.getState().showDialog({
      name: 'DJ Bot',
      portrait: '🎧',
      lines: ['Beep-boop! The SAI FEST RIO stage is almost ready.', 'When the festival starts, the whole city changes: music, lights, decorations and limited-time quests!'],
    }),
  );
  useInteractable(
    { id: 'gate', pos: [114, 0, -17], radius: 3.5, label: fullAccess ? 'Carnival Plaza' : 'Carnival Plaza · NFT access' },
    () => {
      const g = useGame.getState();
      if (cityAccess('rio', g.wallet.collections) === 'full') return;
      g.showDialog({
        name: 'Carnival Plaza',
        portrait: '🎭',
        lines: ['VISITOR ACCESS — LIMITED AREA', 'This plaza is reserved for Rio NFT holders: exclusive Rio Sai skin, Carnival Mask trophy and NFT-only events.', 'Everything else in Rio is open for every explorer.'],
        actions: [
          { label: 'Connect wallet', primary: true, onClick: () => g.openPanel('wallet') },
          { label: 'Close', onClick: () => g.showDialog(null) },
        ],
      });
    },
    !fullAccess,
  );
  useInteractable(
    { id: 'mask', pos: [134, 0, -18], radius: 3, label: 'Take the Carnival Mask' },
    () => {
      play('crystal');
      useGame.getState().collect('nft:carnival_mask', { item: 'carnival_mask', xp: 50, toast: 'NFT trophy: Carnival Mask', icon: '🎭' });
    },
    fullAccess && !hasMask,
  );

  const lamps = useMemo(() => {
    const l: [number, number, number][] = [];
    for (let x = 30; x < 112; x += 14) l.push([x, 0, 8.5], [x + 7, 0, -8.5]);
    for (let x = -70; x < 140; x += 16) l.push([x, 0, 66]);
    for (let a = 0; a < 8; a++) l.push([Math.sin((a / 8) * Math.PI * 2) * 24, 0, Math.cos((a / 8) * Math.PI * 2) * 24]);
    return l;
  }, []);

  const palms = useMemo(() => {
    const p: [number, number, number][] = [];
    for (let x = -74; x < 146; x += 12) p.push([x, 0, 68 + ((x / 12) % 2 ? 1.5 : 0)]);
    p.push([-18, 0, 18], [18, 0, 14], [-22, 0, -4], [22, 0, -2], [-8, 0, 24], [12, 0, 24]);
    return p;
  }, []);

  return (
    <>
      <Sky sunPosition={restored ? [100, 18, 160] : [100, 60, 120]} turbidity={restored ? 8 : 4} rayleigh={restored ? 2.5 : 1} />
      <fog attach="fog" args={[restored ? '#f2c9a8' : '#cfe3f2', 120, 420]} />
      <hemisphereLight args={['#e6f3ff', '#c9b48f', restored ? 0.9 : 1.1]} />
      <FollowSun intensity={restored ? 2.0 : 2.6} color={restored ? '#ffd2a0' : '#fff4e0'} offset={[35, 55, 45]} />

      {/* ground layers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[300, 260]} />
        <meshStandardMaterial map={groundTex} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[70, 0.01, 0]} receiveShadow>
        <planeGeometry args={[90, 10]} />
        <meshStandardMaterial color="#c4b39a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 45]} receiveShadow>
        <planeGeometry args={[10, 40]} />
        <meshStandardMaterial color="#c4b39a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[34, 0.015, 63]} receiveShadow>
        <planeGeometry args={[228, 6]} />
        <meshStandardMaterial map={copaTex} roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[34, 0.012, 87]} receiveShadow>
        <planeGeometry args={[228, 42]} />
        <meshStandardMaterial map={sandTex} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 330]}>
        <planeGeometry args={[1400, 450]} />
        <meshStandardMaterial color="#2aa3c4" roughness={0.05} metalness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-97, 0.012, -23]} receiveShadow>
        <planeGeometry args={[98, 106]} />
        <meshStandardMaterial color="#b98a66" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[116, 0.012, -114]} receiveShadow>
        <planeGeometry args={[60, 64]} />
        <meshStandardMaterial color="#6f9a6a" roughness={1} />
      </mesh>

      <FountainAndSquare />
      <EnergyTower restored={restored} />
      <Blocks blocks={solid} shadows={shadows} />
      <Suspense fallback={null}>
        <CityKit placements={city} shadows={shadows} />
      </Suspense>
      <Backdrop />
      <Gondola />

      {/* summit path */}
      {SUMMIT_PATH.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, -0.25, 0]} material={M.white} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.5, 3.4]} />
          </mesh>
          <mesh position={[0, -0.52, 0]} material={matFor('#59e6ff', 'glow')}>
            <boxGeometry args={[2.6, 0.05, 2.6]} />
          </mesh>
        </group>
      ))}
      <Label text="SUMMIT" position={[SUMMIT[0], SUMMIT[1] + 4, SUMMIT[2]]} scale={0.9} />
      {showArtifact && <Orb position={[SUMMIT[0], SUMMIT[1] + 1.2, SUMMIT[2]]} color="#c77dff" size={0.5} />}

      {/* pier */}
      <mesh position={[40, 0.3, 102]} material={matFor('#8a5a3a')} receiveShadow castShadow>
        <boxGeometry args={[4, 0.6, 20]} />
      </mesh>

      {/* beacons */}
      <Beacon position={[-14, 0, -8]} active={!!flags.beacon1} highlight={obj1?.target === 'beacon1'} />
      <Beacon position={[-111, 11.4, -46]} active={!!flags.beacon2} highlight={obj1?.target === 'beacon2'} />
      <Beacon position={[58, 0, -46]} active={!!flags.beacon3} highlight={obj1?.target === 'beacon3'} />
      <Label text="BEACON #1" position={[-14, 4, -8]} scale={0.6} />
      <Label text="BEACON #2" position={[-111, 15.4, -46]} scale={0.6} />
      <Label text="BEACON #3" position={[58, 4, -46]} scale={0.6} />

      {/* return portal */}
      <Portal position={[0, 0, 34]} rotation={Math.PI} image={coreTexture()} title="HOME PLANET" status="RETURN" glow="#59e6ff" />

      {/* apartment door */}
      <mesh position={[-31, 2, 31.9]}>
        <planeGeometry args={[3, 4]} />
        <meshStandardMaterial color="#2a3550" emissive="#59e6ff" emissiveIntensity={0.25} />
      </mesh>
      <Label text="🏠 RIO APARTMENT" position={[-31, 5, 31.5]} scale={0.8} />

      {/* NPCs */}
      <Npc position={[7, 0, 12]} shirt="#f78154" vest="#ff8a1f" hat="#ffd24a" skin={1} lookAtPlayer />
      <Label text="Rio Technician" position={[7, 2.9, 12]} scale={0.6} />
      {(!story || obj1?.type === 'talk') && <QuestMarker position={[7, 3.8, 12]} color={!story ? '#ffc94a' : '#59e6ff'} />}
      {storyDone && ch2Available && !quests.rio_story_02 && <QuestMarker position={[7, 3.8, 12]} color="#c77dff" />}
      <Npc position={[70, 0, -5]} shirt="#3bb273" skin={3} hat="#e15554" lookAtPlayer />
      <Label text="Merchant" position={[70, 2.9, -5]} scale={0.6} />
      <SaiRobot position={[85, 1.5, 46]} />
      <Label text="DJ Bot" position={[85, 4.2, 46]} scale={0.6} />
      {RIO_WALKERS.map((w, i) => (
        <Npc key={i} position={[w.path[0][0], 0, w.path[0][1]]} path={w.path} shirt={w.shirt} skin={i} seed={i} speed={1.4 + (i % 3) * 0.3} hat={i % 3 === 0 ? '#f2f2f2' : undefined} />
      ))}
      <SaiRobot position={[30, 0, 0]} path={[[30, 0], [100, 0]]} />
      <SaiRobot position={[-40, 0, 70]} path={[[-40, 70], [110, 70]]} speed={2.6} />
      {[
        [-30, 80],
        [8, 90],
        [70, 84],
        [110, 92],
      ].map(([x, z], i) => (
        <Npc key={`t${i}`} position={[x + 1, 0, z + 1]} sitting shirt={['#ff6b6b', '#4ecdc4', '#ffe66d', '#a06cd5'][i]} skin={i + 2} />
      ))}

      {/* props */}
      {palms.map((p, i) => (
        <Palm key={i} position={p} scale={0.9 + (i % 3) * 0.1} rot={i} />
      ))}
      {lamps.map((p, i) => (
        <StreetLamp key={i} position={p} on={restored} />
      ))}
      {[
        [40, '#e15554'],
        [56, '#f2c14e'],
        [64, '#3bb273'],
        [84, '#4d9de0'],
        [100, '#f78154'],
      ].map(([x, c], i) => (
        <MarketStall key={i} position={[x as number, 0, i % 2 ? 7 : -7]} color={c as string} />
      ))}
      {[
        [-30, 80, '#e15554'],
        [8, 90, '#f2c14e'],
        [70, 84, '#4d9de0'],
        [110, 92, '#3bb273'],
        [-50, 92, '#f78154'],
        [40, 78, '#7768ae'],
      ].map(([x, z, c], i) => (
        <Umbrella key={i} position={[x as number, 0, z as number]} color={c as string} />
      ))}

      {/* event zone */}
      <mesh position={[85, 6, 51.2]}>
        <planeGeometry args={[18, 6]} />
        <meshBasicMaterial map={labelTexture('SAI FEST RIO', { bg: 'rgba(80,20,120,0.92)', color: '#ffd36b', sub: tr('COMING SOON'), w: 512, h: 192 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* carnival plaza */}
      {!fullAccess && (
        <mesh position={[116, 2, -17]}>
          <boxGeometry args={[0.4, 4, 6]} />
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      )}
      <Label text={fullAccess ? '🎭 CARNIVAL PLAZA · NFT FULL ACCESS' : '🎭 CARNIVAL PLAZA · NFT ONLY'} position={[114, 5.5, -17]} scale={0.8} />
      <mesh position={[134, 1.5, -18]} material={M.gold} castShadow>
        <cylinderGeometry args={[1.2, 1.6, 3, 16]} />
      </mesh>
      {!hasMask && <Orb position={[134, 4, -18]} color="#ffd36b" size={0.5} />}

      {/* collectibles, secrets, viewpoints, fast travel */}
      {RIO_ORBS.map((p, i) => (
        <OrbPickup key={i} i={i} pos={p} />
      ))}
      {RIO_TOKENS.map((t) => (
        <TokenPickup key={t.id} id={t.id} pos={t.pos} />
      ))}
      {RIO_VIEWPOINTS.map((v) => (
        <Viewpoint key={v.id} {...v} />
      ))}
      {RIO_FAST_TRAVEL_POINTS.map((f) => (
        <FastTravelPillar key={f.id} {...f} />
      ))}

      {markerPoi && <QuestMarker position={[markerPoi.x, markerPoi.y + 5.5, markerPoi.z]} />}

      <Player spawn={spawn} />
      <Pet />
    </>
  );
}
