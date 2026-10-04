import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { portalByCity } from '../../data/cities';
import { itemById } from '../../data/items';
import { activeObjective, useGame } from '../../store/gameStore';
import { cityAccess } from '../../services/nftAccess';
import { boxAt, type Box } from '../physics';
import { Player } from '../Player';
import { Pet } from '../Pet';
import { matFor, useWorld } from '../SceneKit';
import { Label, sharedMaterials as M } from '../models/props';
import { useInteractable } from '../runtime';
import { ROOM_SLOTS, ROOM_SPAWNS, TROPHY_SLOTS } from '../../data/room';
import { cityArtTexture, copacabanaTexture, labelTexture, tileTexture } from '../textures';

const W = 8;
const D = 6;
const H = 4.6;

/** Furniture & trophy visuals by item id. */
export function FurnitureModel({ id }: { id: string }) {
  switch (id) {
    case 'sofa':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} material={matFor('#7fb3e6')} castShadow>
            <boxGeometry args={[2.2, 0.6, 0.9]} />
          </mesh>
          <mesh position={[0, 0.75, -0.35]} material={matFor('#6aa2d8')} castShadow>
            <boxGeometry args={[2.2, 0.8, 0.25]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 1.05, 0.55, 0]} material={matFor('#6aa2d8')}>
              <boxGeometry args={[0.2, 0.5, 0.9]} />
            </mesh>
          ))}
        </group>
      );
    case 'plant':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} material={M.white}>
            <cylinderGeometry args={[0.3, 0.22, 0.6, 12]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.sin(i * 1.3) * 0.2, 0.9 + i * 0.12, Math.cos(i * 1.3) * 0.2]} rotation={[0.4, i * 1.3, 0.3]} material={M.leaf}>
              <coneGeometry args={[0.25, 0.9, 5]} />
            </mesh>
          ))}
        </group>
      );
    case 'lamp':
      return (
        <group>
          <mesh position={[0, 0.8, 0]} material={M.gold}>
            <cylinderGeometry args={[0.04, 0.12, 1.6, 8]} />
          </mesh>
          <mesh position={[0, 1.75, 0]} material={matFor('#bff4ff', 'glow')}>
            <sphereGeometry args={[0.28, 16, 12]} />
          </mesh>
          <pointLight position={[0, 1.75, 0]} color="#9feaff" intensity={4} distance={6} />
        </group>
      );
    case 'rug':
      return (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 1.8]} />
          <meshStandardMaterial map={copacabanaTexture()} />
        </mesh>
      );
    case 'rio_decoration':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} material={M.white}>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
          </mesh>
          <mesh position={[0, 1.2, 0]} material={M.white}>
            <boxGeometry args={[0.16, 0.8, 0.16]} />
          </mesh>
          <mesh position={[0, 1.45, 0]} material={M.white}>
            <boxGeometry args={[0.8, 0.1, 0.12]} />
          </mesh>
          <mesh position={[0, 1.7, 0]} material={M.white}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
        </group>
      );
    case 'arcade':
      return (
        <group>
          <mesh position={[0, 0.9, 0]} material={matFor('#7768ae')} castShadow>
            <boxGeometry args={[0.9, 1.8, 0.8]} />
          </mesh>
          <mesh position={[0, 1.25, 0.41]}>
            <planeGeometry args={[0.7, 0.5]} />
            <meshBasicMaterial color="#59e6ff" toneMapped={false} />
          </mesh>
        </group>
      );
    case 'rio_energy_crystal':
      return <Spinning><mesh material={matFor('#59e6ff', 'glow')}><octahedronGeometry args={[0.32, 0]} /></mesh></Spinning>;
    case 'restored_artifact':
      return <Spinning><mesh material={matFor('#c77dff', 'glow')}><icosahedronGeometry args={[0.28, 0]} /></mesh></Spinning>;
    case 'carnival_mask':
      return <Spinning><mesh material={M.gold} scale={[1, 0.6, 0.3]}><sphereGeometry args={[0.3, 16, 10]} /></mesh></Spinning>;
    default:
      return (
        <mesh position={[0, 0.3, 0]} material={M.gold}>
          <boxGeometry args={[0.5, 0.6, 0.5]} />
        </mesh>
      );
  }
}

function Spinning({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    g.current.rotation.y = s.clock.elapsedTime;
    g.current.position.y = 0.35 + Math.sin(s.clock.elapsedTime * 2) * 0.05;
  });
  return <group ref={g}>{children}</group>;
}

function HoloMap() {
  const holo = useRef<THREE.Group>(null!);
  useFrame((s) => {
    holo.current.rotation.y = s.clock.elapsedTime * 0.4;
  });
  return (
    <group position={[0, 0, -2.2]}>
      <mesh position={[0, 0.45, 0]} material={M.white} castShadow>
        <cylinderGeometry args={[1.1, 1.2, 0.9, 24]} />
      </mesh>
      <mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 24]} />
        <meshBasicMaterial color="#59e6ff" toneMapped={false} transparent opacity={0.6} />
      </mesh>
      <group ref={holo} position={[0, 1.6, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshBasicMaterial color="#59e6ff" wireframe transparent opacity={0.6} toneMapped={false} />
        </mesh>
        <mesh position={[0.25, 0.1, 0.42]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      </group>
      <Label text="Holographic Map" position={[0, 2.6, 0]} scale={0.5} />
    </group>
  );
}

export default function RioRoom({ spawnId }: { spawnId: string }) {
  const spawn = ROOM_SPAWNS[spawnId] ?? ROOM_SPAWNS.door;
  const room = useGame((s) => s.room);
  const collections = useGame((s) => s.wallet.collections);
  const quests = useGame((s) => s.quests);
  const nftFull = cityAccess('rio', collections) === 'full';
  const decodePending = activeObjective({ quests }, 'rio_story_02')?.target === 'artifact_station';

  const colliders = useMemo<Box[]>(
    () => [
      boxAt(0, -D - 0.5, W * 2 + 2, 1, H + 1),
      boxAt(-1.5 - 3.5, D + 0.5, 7, 1, H + 1),
      boxAt(1.5 + 3.5, D + 0.5, 7, 1, H + 1),
      boxAt(-W - 0.5, 0, 1, D * 2 + 2, H + 1),
      boxAt(W + 0.5, 0, 1, D * 2 + 2, H + 1),
      boxAt(0, D + 0.5, 3, 1, H + 1, 0, { noCamera: true }), // closed door
      boxAt(0, 0, W * 2, D * 2, 1, H),
      boxAt(0, -2.2, 2.2, 2.2, 0.9), // holo table
      boxAt(-6, -4.8, 1.4, 1, 1.6), // terminal
      boxAt(6.6, -4.9, 2.2, 1.6, 3), // wardrobe
      boxAt(7.5, 0, 1, 4, 3.4), // shelf
      boxAt(-6, 3.6, 1.6, 1.6, 1), // artifact station
    ],
    [],
  );
  useWorld(colliders, null, { killY: -10 });

  const floorTex = useMemo(() => {
    const t = tileTexture('#d9c3a0', '#b89c74', 4).clone();
    t.repeat.set(4, 3);
    t.needsUpdate = true;
    return t;
  }, []);
  const viewTex = useMemo(() => {
    const t = cityArtTexture(portalByCity('rio').art, 'rio').clone();
    t.repeat.set(1, 0.45);
    t.offset.set(0, 0.25);
    t.needsUpdate = true;
    return t;
  }, []);

  useInteractable({ id: 'door', pos: [0, 0, 5.2], radius: 1.8, label: 'Exit to Rio streets' }, () => useGame.getState().goTo('rio', 'apartment', 'fade'));
  useInteractable({ id: 'terminal', pos: [-6, 0, -3.8], radius: 1.8, label: 'Quest Terminal' }, () => useGame.getState().openPanel('terminal'));
  useInteractable({ id: 'holomap', pos: [0, 0, -0.6], radius: 1.6, label: 'Holographic Map' }, () => useGame.getState().openPanel('map'));
  useInteractable({ id: 'wardrobe', pos: [6.4, 0, -3.6], radius: 1.8, label: 'Wardrobe' }, () => useGame.getState().openPanel('wardrobe'));
  useInteractable({ id: 'shelf', pos: [6.4, 0, 0], radius: 2, label: 'Trophy Shelf' }, () => useGame.getState().openPanel('slot', { kind: 'trophy' }));
  useInteractable({ id: 'gallery', pos: [-6.8, 0, 0], radius: 1.8, label: 'NFT Gallery' }, () => useGame.getState().openPanel('wallet'));
  useInteractable({ id: 'portal-device', pos: [5.6, 0, 3.8], radius: 1.8, label: 'Portal Device · Home Planet' }, () =>
    useGame.getState().goTo('home', 'home', 'warp'),
  );
  useInteractable({ id: 'artifact-station', pos: [-6, 0, 2.4], radius: 1.8, label: 'Artifact Station' }, () => {
    const g = useGame.getState();
    if (activeObjective(g, 'rio_story_02')?.target === 'artifact_station' && (g.inventory.ancient_artifact ?? 0) > 0) {
      g.openPanel('puzzle', { target: 'artifact_station', title: 'Artifact Decoding', size: 5, seed: 31 });
    } else {
      g.showDialog({
        name: 'Artifact Station',
        portrait: '🔮',
        lines: g.quests.rio_story_02?.status === 'completed'
          ? ['The relic is decoded. New lore unlocked — check your Passport.']
          : ['Bring strange artifacts here to decode them.', 'Each artifact hides a piece of Sai’s story.'],
      });
    }
  });

  const level = room.level;
  const slots = ROOM_SLOTS.filter((s) => s.minLevel <= level);
  for (const s of ROOM_SLOTS) {
    const placed = room.slots[s.id];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useInteractable(
      { id: `slot-${s.id}`, pos: [s.x, 0, s.z], radius: 1.1, label: placed ? `${itemById(placed.item)?.name ?? 'Item'} · edit` : 'Empty furniture slot' },
      () => useGame.getState().openPanel('slot', { kind: 'furniture', slot: s.id }),
      s.minLevel <= level,
    );
  }

  return (
    <>
      <color attach="background" args={['#0b1530']} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff4e0', '#8a6a4a', 0.7]} />
      <pointLight position={[0, 4, 0]} intensity={18} distance={18} color="#ffe8c8" />
      <pointLight position={[0, 3, -5]} intensity={10} distance={10} color="#ffc68a" />

      {/* floor, walls, ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial map={floorTex} roughness={0.6} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial color="#f4efe6" />
      </mesh>
      {/* north wall with panoramic window */}
      <mesh position={[0, 0.5, -D]} material={matFor('#efe6d6')}>
        <boxGeometry args={[W * 2, 1, 0.2]} />
      </mesh>
      <mesh position={[0, H - 0.4, -D]} material={matFor('#efe6d6')}>
        <boxGeometry args={[W * 2, 0.8, 0.2]} />
      </mesh>
      <mesh position={[0, (H - 1.8 + 1.0) / 2 + 0.4, -D - 0.3]}>
        <planeGeometry args={[W * 2, H - 1.8]} />
        <meshBasicMaterial map={viewTex} toneMapped={false} />
      </mesh>
      {[-4, 0, 4].map((x) => (
        <mesh key={x} position={[x, H / 2, -D]} material={M.white}>
          <boxGeometry args={[0.15, H, 0.25]} />
        </mesh>
      ))}
      <mesh position={[-W, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={matFor('#e9dfcf')}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh position={[W, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={matFor('#e9dfcf')}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 5, H / 2, D]} rotation={[0, Math.PI, 0]} material={matFor('#e9dfcf')}>
          <planeGeometry args={[7, H]} />
        </mesh>
      ))}
      <mesh position={[0, H - 0.5, D]} rotation={[0, Math.PI, 0]} material={matFor('#e9dfcf')}>
        <planeGeometry args={[3, 1]} />
      </mesh>
      <mesh position={[0, 1.8, D + 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 3.6]} />
        <meshStandardMaterial color="#2a3550" emissive="#59e6ff" emissiveIntensity={0.2} />
      </mesh>
      {level >= 3 && (
        <mesh position={[0, H - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.gold}>
          <ringGeometry args={[3, 3.2, 48]} />
        </mesh>
      )}
      {level >= 2 &&
        [-W + 0.05, W - 0.05].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]} rotation={[0, Math.PI / 2, 0]} material={matFor('#59e6ff', 'glow')}>
            <planeGeometry args={[D * 2, 0.05]} />
          </mesh>
        ))}

      {/* quest terminal */}
      <group position={[-6, 0, -4.8]}>
        <mesh position={[0, 0.8, 0]} material={M.white} castShadow>
          <boxGeometry args={[1.4, 1.6, 1]} />
        </mesh>
        <mesh position={[0, 1.9, 0.1]} rotation={[-0.3, 0, 0]}>
          <planeGeometry args={[1.5, 0.9]} />
          <meshBasicMaterial map={labelTexture('QUESTS', { bg: 'rgba(20,80,160,0.9)', color: '#bff4ff', w: 256, h: 128 })} toneMapped={false} />
        </mesh>
        <Label text="Quest Terminal" position={[0, 2.9, 0]} scale={0.5} />
      </group>

      <HoloMap />

      {/* wardrobe */}
      <group position={[6.6, 0, -4.9]}>
        <mesh position={[0, 1.5, 0]} material={matFor('#8a5a3a')} castShadow>
          <boxGeometry args={[2.2, 3, 1.4]} />
        </mesh>
        <mesh position={[0, 1.5, 0.71]} material={M.gold}>
          <boxGeometry args={[0.05, 2.6, 0.02]} />
        </mesh>
        <Label text="Wardrobe" position={[0, 3.4, 0]} scale={0.5} />
      </group>

      {/* trophy shelf */}
      <group position={[7.5, 0, 0]}>
        <mesh position={[0, 1.7, 0]} material={M.white}>
          <boxGeometry args={[0.8, 3.4, 4]} />
        </mesh>
        {[0.9, 2.0, 3.1].map((y) => (
          <mesh key={y} position={[-0.42, y, 0]} material={M.gold}>
            <boxGeometry args={[0.1, 0.06, 3.8]} />
          </mesh>
        ))}
        {TROPHY_SLOTS.map((t, i) => {
          const item = room.trophies[t];
          return (
            <group key={t} position={[-0.7, 0.95, -1.2 + i * 1.2]}>
              {item ? <FurnitureModel id={item} /> : (
                <mesh position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
                  <meshBasicMaterial color="#59e6ff" transparent opacity={0.35} toneMapped={false} />
                </mesh>
              )}
            </group>
          );
        })}
        <Label text="Trophy Shelf" position={[-0.6, 3.8, 0]} scale={0.5} />
      </group>

      {/* NFT gallery */}
      <group position={[-7.9, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={nftFull ? M.gold : M.dark}>
          <boxGeometry args={[2.4, 2.9, 0.08]} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[2.1, 2.6]} />
          <meshBasicMaterial map={cityArtTexture(portalByCity('rio').art, 'rio')} color={nftFull ? '#ffffff' : '#555e75'} toneMapped={false} />
        </mesh>
        <Label text={nftFull ? 'Rio NFT · Owned' : 'NFT frame · empty'} position={[0, 1.8, 0.2]} scale={0.45} />
      </group>

      {/* artifact station */}
      <group position={[-6, 0, 3.6]}>
        <mesh position={[0, 0.5, 0]} material={M.white} castShadow>
          <cylinderGeometry args={[0.8, 0.9, 1, 6]} />
        </mesh>
        <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 6]} />
          <meshBasicMaterial color={decodePending ? '#c77dff' : '#59e6ff'} toneMapped={false} />
        </mesh>
        {decodePending && (
          <group position={[0, 0.9, 0]}>
            <FurnitureModel id="restored_artifact" />
          </group>
        )}
        <Label text="Artifact Station" position={[0, 2.2, 0]} scale={0.5} />
      </group>

      {/* portal device */}
      <group position={[5.6, 0, 4.6]}>
        <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0]} material={M.white}>
          <torusGeometry args={[1.1, 0.15, 10, 32]} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color="#59e6ff" transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <Label text="Portal Device" position={[0, 2.9, 0]} scale={0.5} />
      </group>

      {/* furniture slots */}
      {slots.map((s) => {
        const placed = room.slots[s.id];
        return (
          <group key={s.id} position={[s.x, 0, s.z]}>
            {placed ? (
              <group rotation={[0, (placed.rot * Math.PI) / 2, 0]}>
                <FurnitureModel id={placed.item} />
              </group>
            ) : (
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.7, 24]} />
                <meshBasicMaterial color="#59e6ff" transparent opacity={0.5} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}

      <Player spawn={spawn} cameraDistance={5} />
      <Pet />
    </>
  );
}
