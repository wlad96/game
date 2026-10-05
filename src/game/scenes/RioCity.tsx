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
import { Beacon, Label, Orb, QuestMarker, SaiRobot, sharedMaterials as M, Token } from '../models/props';
import { Portal } from '../models/Portal';
import { PhotoZone } from '../models/PhotoZone';
import { AdBoards, adColliders } from '../models/AdBoards';
import { AD_SLOTS } from './rioAds';
import { KitInstances, Person, placementCollider } from '../models/Kit';
import { buildRioBuildings, buildRioScenery, buildRioStreet, CROSSINGS } from './cityKit';
import { collectibles, useInteractable, useTrigger } from '../runtime';
import { coreTexture, labelTexture } from '../textures';
import { BayPeaks, BeachLife, Boats, CableCar, Headland, Hills, Ocean, Redeemer, RioGround } from './RioScenery';
import { Traffic } from './RioTraffic';
import {
  APARTMENT_DOOR,
  BEACON1,
  BEACON2,
  BEACON3,
  KIOSKS,
  PLAZAS,
  PORTAL_POS,
  poiById,
  RIO_BOUNDS,
  RIO_FAST_TRAVEL_POINTS,
  RIO_ORBS,
  RIO_SPAWNS,
  RIO_TOKENS,
  RIO_VIEWPOINTS,
  RIO_WALKERS,
  ROOF_ROUTE,
  SECRET_ROOF,
  SIDE_STREETS,
  STATION,
  STATION_STAIRS,
  STREET,
  SUMMIT,
  SUMMIT_PATH,
  TOWER_POS,
} from './rioLayout';

const SUMMIT_ROCK: BlockDef = { x: SUMMIT[0], z: SUMMIT[2], w: 9, d: 9, h: SUMMIT[1], color: '#7d7466' };
const STAGE: BlockDef = { x: 70, z: 34, w: 22, d: 8, h: 1.5, color: '#2b2f45' };
const KIOSK_BLOCKS: BlockDef[] = KIOSKS.map(([x, h]) => ({ x, z: 21, w: 4, d: 3, h, color: '#f4f1ea' }));

/** Raised planters with grass between the carriageways, broken at the crossings. */
const MEDIAN: BlockDef[] = (() => {
  const cuts = [...CROSSINGS, -108, 0].sort((a, b) => a - b);
  const out: BlockDef[] = [];
  let x = -170;
  for (const c of [...cuts, 175]) {
    const x1 = c - 5;
    if (x1 > x) out.push({ x: (x + x1) / 2, z: (STREET.median[0] + STREET.median[1]) / 2, w: x1 - x, d: STREET.median[1] - STREET.median[0], h: 0.35, color: '#62a85a' });
    x = c + 5;
  }
  return out;
})();

/** Yellow walls around the NFT plaza; the gate closes the side street. */
const C = PLAZAS.carnival;
const [gx0, gx1] = SIDE_STREETS.carnival;
const CARNIVAL_WALLS: BlockDef[] = [
  { x: (C.x0 + gx0) / 2, z: C.z1, w: gx0 - C.x0, d: 1, h: 4, color: '#f5c542' },
  { x: (gx1 + C.x1) / 2, z: C.z1, w: C.x1 - gx1, d: 1, h: 4, color: '#f5c542' },
  { x: C.x0, z: (C.z0 + C.z1) / 2, w: 1, d: C.z1 - C.z0, h: 4, color: '#f5c542' },
  { x: C.x1, z: (C.z0 + C.z1) / 2, w: 1, d: C.z1 - C.z0, h: 4, color: '#f5c542' },
];
const GATE: Box = boxAt((gx0 + gx1) / 2, C.z1, gx1 - gx0, 1.2, 4, 0, { noCamera: true });
const MASK_POS: [number, number, number] = [-108, 0, -52];

/** Invisible walls: behind the city blocks, and between the blocks and the station park. */
const WALLS: Box[] = [
  boxAt(-28, STREET.north - 1, 290, 2, 80, 0, { noCamera: true }),
  boxAt(115, (STREET.north + RIO_BOUNDS.minZ) / 2, 2, STREET.north - RIO_BOUNDS.minZ, 80, 0, { noCamera: true }),
];

function Kiosk({ x, h }: { x: number; h: number }) {
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9fdcff', roughness: 0.1, metalness: 0.4 }), []);
  return (
    <group position={[x, 0, 21]}>
      <mesh position={[0, h / 2 - 0.15, 0]} material={glass} castShadow>
        <boxGeometry args={[3.6, h - 0.3, 2.6]} />
      </mesh>
      <mesh position={[0, h - 0.15, 0]} material={matFor('#f4f1ea')} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.3, 3.4]} />
      </mesh>
      <mesh position={[0, 0.5, -1.35]} material={matFor('#3bb273')}>
        <boxGeometry args={[3.7, 1, 0.12]} />
      </mesh>
    </group>
  );
}

function StationSign() {
  return (
    <mesh position={[STATION.x - STATION.w / 2 - 0.05, 6, STATION.z]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[10, 2.4]} />
      <meshBasicMaterial map={labelTexture(tr('CABLE CAR'), { bg: 'rgba(20,40,80,0.92)', color: '#ffffff', sub: tr('SUGARLOAF'), w: 512, h: 128 })} toneMapped={false} />
    </mesh>
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
    <group position={TOWER_POS}>
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

  const buildings = useMemo(() => buildRioBuildings(), []);
  const street = useMemo(() => buildRioStreet(), []);
  const scenery = useMemo(() => buildRioScenery(), []);
  const solid = useMemo<BlockDef[]>(
    () => [...ROOF_ROUTE, SECRET_ROOF, STATION, ...STATION_STAIRS, SUMMIT_ROCK, STAGE, ...KIOSK_BLOCKS, ...MEDIAN, ...CARNIVAL_WALLS],
    [],
  );
  const colliders = useMemo<Box[]>(() => {
    const boxes = solid.map(blockCollider);
    for (const p of buildings) if (p.solid) boxes.push(placementCollider(p));
    boxes.push(...WALLS);
    boxes.push(boxAt(TOWER_POS[0], TOWER_POS[2], 6, 6, 4)); // tower base
    boxes.push(boxAt(BEACON1[0], BEACON1[2], 3, 3, 0.6));
    boxes.push(boxAt(BEACON3[0], BEACON3[2], 3, 3, 0.6));
    for (const s of [-1, 1]) boxes.push(boxAt(PORTAL_POS[0], PORTAL_POS[2] + s * 3.05, 1.3, 1.3, 9)); // arrival portal (faces east)
    boxes.push(boxAt(PORTAL_POS[0], PORTAL_POS[2], 0.4, 5.2, 9.5, 0.5)); // portal surface: keeps the camera out of it
    for (const [x, y, z] of SUMMIT_PATH) boxes.push(boxAt(x, z, 3.4, 3.4, 0.5, y - 0.5));
    boxes.push(...adColliders(AD_SLOTS));
    return boxes;
  }, [solid, buildings]);
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

  // ── quest helpers
  const story = quests.rio_energy_01;
  const obj1 = activeObjective({ quests }, 'rio_energy_01');
  const obj2 = activeObjective({ quests }, 'rio_story_02');
  const storyDone = story?.status === 'completed';
  const ch2Available = isQuestAvailable(questById('rio_story_02'), { quests, flags });
  const tech = poiById('technician')!;
  const merchant = poiById('merchant')!;

  const markerPoi = (() => {
    const id = trackedQuest ?? (story?.status === 'active' ? 'rio_energy_01' : null);
    if (!id) return null;
    const o = activeObjective({ quests }, id);
    return o?.poi ? poiById(o.poi) : null;
  })();

  useInteractable({ id: 'home-portal', pos: [PORTAL_POS[0] + 2, 0, PORTAL_POS[2]], radius: 4, label: 'Portal: Home Planet' }, () =>
    useGame.getState().goTo('home', 'rio', 'warp'),
  );

  useInteractable({ id: 'technician', pos: [tech.x, 0, tech.z], radius: 3.2, label: 'Talk to Rio Technician' }, () => {
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
          'Three Energy Beacons feed the grid: one here on the promenade, one on the rooftops across the avenue and one at the Cable Car Station at the end of the beach. Can you bring them back online?',
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
      g.showDialog({ name: tr('Energy Beacon #{n}', { n }), portrait: '⚡', lines: ['The beacon is offline.', 'Talk to the Rio Technician next to the portal on the promenade.'] });
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
  useInteractable({ id: 'beacon1', pos: BEACON1, radius: 4.5, label: flags.beacon1 ? 'Beacon #1 · Online' : 'Activate Beacon #1' }, beacon(1));
  useInteractable({ id: 'beacon2', pos: BEACON2, radius: 4.5, label: flags.beacon2 ? 'Beacon #2 · Online' : 'Activate Beacon #2', heightTolerance: 1.5 }, beacon(2));
  useInteractable({ id: 'beacon3', pos: BEACON3, radius: 4.5, label: flags.beacon3 ? 'Beacon #3 · Online' : 'Repair Beacon #3' }, beacon(3));
  useTrigger({ id: 'reach-b1', pos: BEACON1, radius: 8 }, () => useGame.getState().questEvent({ type: 'reach', target: 'beacon1' }));
  useTrigger({ id: 'reach-b3', pos: BEACON3, radius: 9 }, () => useGame.getState().questEvent({ type: 'reach', target: 'beacon3' }));
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

  useInteractable({ id: 'apartment-door', pos: [APARTMENT_DOOR[0], 0, APARTMENT_DOOR[2] + 1.5], radius: 3, label: 'Enter Rio Apartment' }, () =>
    useGame.getState().goTo('rio-room', 'door', 'fade'),
  );
  useInteractable({ id: 'merchant', pos: [merchant.x, 0, merchant.z], radius: 3.5, label: 'Beach Kiosk · Shop' }, () => useGame.getState().openPanel('shop'));
  useInteractable({ id: 'dj', pos: [STAGE.x, 1.5, 30.5], radius: 4.5, label: 'Talk to DJ Bot', heightTolerance: 3 }, () =>
    useGame.getState().showDialog({
      name: 'DJ Bot',
      portrait: '🎧',
      lines: ['Beep-boop! The SAI FEST RIO stage is almost ready.', 'When the festival starts, the whole city changes: music, lights, decorations and limited-time quests!'],
    }),
  );
  useInteractable(
    { id: 'gate', pos: [(gx0 + gx1) / 2, 0, C.z1 + 2], radius: 3.5, label: fullAccess ? 'Carnival Plaza' : 'Carnival Plaza · NFT access' },
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
    { id: 'mask', pos: MASK_POS, radius: 3, label: 'Take the Carnival Mask' },
    () => {
      play('crystal');
      useGame.getState().collect('nft:carnival_mask', { item: 'carnival_mask', xp: 50, toast: 'NFT trophy: Carnival Mask', icon: '🎭' });
    },
    fullAccess && !hasMask,
  );

  return (
    <>
      <Sky sunPosition={restored ? [100, 18, 160] : [100, 60, 120]} turbidity={restored ? 8 : 4} rayleigh={restored ? 2.5 : 1} />
      <fog attach="fog" args={[restored ? '#f2c9a8' : '#cfe3f2', 160, 900]} />
      <hemisphereLight args={['#e6f3ff', '#c9b48f', restored ? 0.9 : 1.1]} />
      <FollowSun intensity={restored ? 2.0 : 2.6} color={restored ? '#ffd2a0' : '#fff4e0'} offset={[35, 55, 45]} />

      <RioGround />
      <Ocean />
      <Hills />
      <BayPeaks />
      <Redeemer />
      <Headland />
      <CableCar />
      <BeachLife />
      <Boats />
      <Traffic />

      <EnergyTower restored={restored} />
      <Blocks blocks={solid.filter((b) => !KIOSK_BLOCKS.includes(b))} shadows={shadows} />
      {KIOSKS.map(([x, h]) => (
        <Kiosk key={x} x={x} h={h} />
      ))}
      <StationSign />
      <KitInstances placements={buildings} shadows={shadows} />
      <KitInstances placements={street} shadows={shadows} />
      <KitInstances placements={scenery} shadows={shadows} />

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

      {/* beacons */}
      <Beacon position={BEACON1} active={!!flags.beacon1} highlight={obj1?.target === 'beacon1'} />
      <Beacon position={BEACON2} active={!!flags.beacon2} highlight={obj1?.target === 'beacon2'} />
      <Beacon position={BEACON3} active={!!flags.beacon3} highlight={obj1?.target === 'beacon3'} />
      <Label text="BEACON #1" position={[BEACON1[0], 4, BEACON1[2]]} scale={0.6} />
      <Label text="BEACON #2" position={[BEACON2[0], BEACON2[1] + 4, BEACON2[2]]} scale={0.6} />
      <Label text="BEACON #3" position={[BEACON3[0], 4, BEACON3[2]]} scale={0.6} />

      {/* return portal */}
      <Portal position={PORTAL_POS} rotation={Math.PI / 2} image={coreTexture()} title="HOME PLANET" status="RETURN" glow="#59e6ff" />

      {/* apartment door */}
      <mesh position={[APARTMENT_DOOR[0], 2, STREET.front + 0.06]}>
        <planeGeometry args={[3, 4]} />
        <meshStandardMaterial color="#2a3550" emissive="#59e6ff" emissiveIntensity={0.25} />
      </mesh>
      <Label text="🏠 RIO APARTMENT" position={[APARTMENT_DOOR[0], 5, STREET.front + 0.6]} scale={0.8} />

      {/* NPCs and people */}
      <Suspense fallback={null}>
        <Person model="character-male-c" position={[tech.x, 0, tech.z]} lookAtPlayer rotation={Math.PI} />
        <Person model="character-female-b" position={[merchant.x, 0, merchant.z]} lookAtPlayer rotation={Math.PI} />
        {RIO_WALKERS.map((w, i) => (
          <Person key={i} model={w.model} position={[w.path[0][0], 0, w.path[0][1]]} path={w.path} speed={1.3 + (i % 3) * 0.25} />
        ))}
      </Suspense>
      <Label text="Rio Technician" position={[tech.x, 2.6, tech.z]} scale={0.6} />
      {(!story || obj1?.type === 'talk') && <QuestMarker position={[tech.x, 3.5, tech.z]} color={!story ? '#ffc94a' : '#59e6ff'} />}
      {storyDone && ch2Available && !quests.rio_story_02 && <QuestMarker position={[tech.x, 3.5, tech.z]} color="#c77dff" />}
      <Label text="Merchant" position={[merchant.x, 2.6, merchant.z]} scale={0.6} />
      <SaiRobot position={[STAGE.x, 1.5, 31]} />
      <Label text="DJ Bot" position={[STAGE.x, 4.2, 31]} scale={0.6} />
      <SaiRobot position={[-30, 0, -10]} path={[[-30, -10], [-90, -10]]} />

      {/* event zone */}
      <mesh position={[STAGE.x, 6, STAGE.z + 3.8]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[18, 6]} />
        <meshBasicMaterial map={labelTexture('SAI FEST RIO', { bg: 'rgba(80,20,120,0.92)', color: '#ffd36b', sub: tr('COMING SOON'), w: 512, h: 192 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* carnival plaza */}
      {!fullAccess && (
        <mesh position={[(gx0 + gx1) / 2, 2, C.z1]}>
          <boxGeometry args={[gx1 - gx0, 4, 0.4]} />
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      )}
      <Label text={fullAccess ? '🎭 CARNIVAL PLAZA · NFT FULL ACCESS' : '🎭 CARNIVAL PLAZA · NFT ONLY'} position={[(gx0 + gx1) / 2, 5.5, C.z1 + 1]} scale={0.8} />
      <mesh position={[MASK_POS[0], 1.5, MASK_POS[2]]} material={M.gold} castShadow>
        <cylinderGeometry args={[1.2, 1.6, 3, 16]} />
      </mesh>
      {!hasMask && <Orb position={[MASK_POS[0], 4, MASK_POS[2]]} color="#ffd36b" size={0.5} />}

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
      <AdBoards slots={AD_SLOTS} />
      <PhotoZone id="rio-beach" place="Copacabana · Rio de Janeiro" pos={[7.5, 0, 25.5]} bg={-2.53} pitch={0.25} />
      {RIO_FAST_TRAVEL_POINTS.map((f) => (
        <FastTravelPillar key={f.id} {...f} />
      ))}

      {markerPoi && <QuestMarker position={[markerPoi.x, markerPoi.y + 5.5, markerPoi.z]} />}

      <Player spawn={spawn} />
      <Pet />
    </>
  );
}
