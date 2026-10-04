import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { KitModel, Person } from '../models/Kit';
import { rng } from '../rngCore';
import { copacabanaTexture, noiseTexture, tileTexture } from '../textures';
import { PLAZAS, STREET } from './rioLayout';
import { BAY_PEAKS, CORCOVADO, hillHeight, peakProfile } from './rioTerrain';

const flat = (color: string, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });
const repeatTex = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};

function Plane({ x0, x1, z0, z1, y = 0, material }: { x0: number; x1: number; z0: number; z1: number; y?: number; material: THREE.Material }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} material={material} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
    </mesh>
  );
}

/** Pavements, promenade, plazas, sand. */
export function RioGround() {
  const m = useMemo(
    () => ({
      city: new THREE.MeshStandardMaterial({ map: repeatTex(noiseTexture('#a3a9b2', '#7c838d', 1400), 60, 30), roughness: 0.95 }),
      walk: new THREE.MeshStandardMaterial({ map: repeatTex(tileTexture('#dcd8cf', '#bdb7aa', 4), 80, 2), roughness: 0.85 }),
      copa: new THREE.MeshStandardMaterial({ map: repeatTex(copacabanaTexture(), 290, 3.4), roughness: 0.8 }),
      plaza: new THREE.MeshStandardMaterial({ map: repeatTex(tileTexture('#e9e1d0', '#cbbd9f', 6), 8, 5), roughness: 0.7 }),
      sand: new THREE.MeshStandardMaterial({ map: repeatTex(noiseTexture('#f1dca6', '#c9a96a', 1600), 120, 12), roughness: 1 }),
      wet: new THREE.MeshStandardMaterial({ color: '#d2b47c', roughness: 0.5 }),
      park: new THREE.MeshStandardMaterial({ map: repeatTex(noiseTexture('#79a865', '#4f7f45', 1600), 8, 10), roughness: 1 }),
      curb: flat('#f4f1ea', 0.6),
    }),
    [],
  );
  return (
    <group>
      <Plane x0={-700} x1={162} z0={-140} z1={STREET.roadN[0]} y={-0.02} material={m.city} />
      <Plane x0={-700} x1={162} z0={STREET.front} z1={STREET.roadN[0]} y={0.012} material={m.walk} />
      <Plane x0={-700} x1={162} z0={STREET.roadS[1]} z1={STREET.beach} y={0.012} material={m.copa} />
      <Plane x0={PLAZAS.tower.x0} x1={PLAZAS.tower.x1} z0={PLAZAS.tower.z0} z1={PLAZAS.tower.z1} y={0.01} material={m.plaza} />
      <Plane x0={PLAZAS.carnival.x0} x1={PLAZAS.carnival.x1} z0={PLAZAS.carnival.z0} z1={PLAZAS.carnival.z1} y={0.01} material={m.plaza} />
      <Plane x0={116} x1={162} z0={-62} z1={STREET.front} y={0.01} material={m.plaza} />
      <Plane x0={116} x1={162} z0={-140} z1={-62} y={0.01} material={m.park} />
      <Plane x0={-700} x1={170} z0={STREET.beach} z1={STREET.shore - 4} y={0} material={m.sand} />
      {/* wet sand sloping under the water */}
      <mesh rotation={[-Math.PI / 2 + 0.05, 0, 0]} position={[-265, -0.2, STREET.shore + 2]} material={m.wet} receiveShadow>
        <planeGeometry args={[870, 12.1]} />
      </mesh>
      {/* promenade edge towards the sand */}
      <mesh position={[-269, 0.12, STREET.beach + 0.25]} material={m.curb} receiveShadow>
        <boxGeometry args={[862, 0.24, 0.5]} />
      </mesh>
    </group>
  );
}

/** Ocean with a turquoise shallow band and a lapping foam line. */
export function Ocean() {
  const foam = useRef<THREE.Mesh>(null!);
  const foam2 = useRef<THREE.Mesh>(null!);
  const shallowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(110,232,224,0.95)');
    grd.addColorStop(0.35, 'rgba(70,205,215,0.6)');
    grd.addColorStop(1, 'rgba(40,170,210,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    foam.current.position.z = STREET.shore + 0.6 + Math.sin(t * 0.9) * 1.4;
    (foam.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 0.9) * 0.25;
    foam2.current.position.z = STREET.shore + 5 + Math.sin(t * 0.9 + 1.7) * 2;
    (foam2.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 0.9 + 1.7) * 0.15;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[200, -0.35, 300]}>
        <planeGeometry args={[3000, 2400]} />
        <meshStandardMaterial color="#1593c2" roughness={0.12} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-200, -0.3, STREET.shore + 30]}>
        <planeGeometry args={[1400, 60]} />
        <meshBasicMaterial map={shallowTex} transparent depthWrite={false} />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[-265, -0.12, STREET.shore]}>
        <planeGeometry args={[870, 1.6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh ref={foam2} rotation={[-Math.PI / 2, 0, 0]} position={[-265, -0.25, STREET.shore + 5]}>
        <planeGeometry args={[870, 0.9]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

const C = (hex: string) => new THREE.Color(hex);
const GREENS = [C('#4f9a4f'), C('#3f8a46'), C('#5aa556'), C('#467f3e')];
const ROCK = C('#8b7f72');
const URBAN = C('#9aa1ab');

/** Paint a non-indexed geometry face by face. */
function paintFaces(g: THREE.BufferGeometry, pick: (cx: number, cy: number, cz: number, ny: number, i: number) => THREE.Color) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let f = 0; f < pos.count; f += 3) {
    const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
    const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
    const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
    const c = pick(cx, cy, cz, nor.getY(f), f / 3);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (f + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Green hills behind the city (Corcovado among them), sinking into the bay in the east. */
export function Hills() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1500, 680, 150, 68);
    g.rotateX(-Math.PI / 2);
    g.translate(-80, 0, -430);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const bay = x > 150 ? Math.min(1, (x - 150) / 20) * Math.min(1, Math.max(0, (z + 260) / 60)) : 0;
      p.setY(i, hillHeight(x, z) - bay * 8 - 0.05);
    }
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    paintFaces(ng, (x, y, z, ny) => {
      if (y < 2.5) return URBAN;
      if (ny < 0.3 || y > 185) return ROCK;
      // patches of forest shades, a few metres across
      const k = Math.abs(Math.floor(x / 26) * 7 + Math.floor(z / 22) * 13 + Math.floor((x + z) / 41) * 3) % 4;
      return GREENS[k];
    });
    return ng;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
}

/** Sugarloaf, Urca and smaller islands rising from the bay. */
export function BayPeaks() {
  const geos = useMemo(
    () =>
      BAY_PEAKS.map((pk, n) => {
        const r = rng(31 + n);
        const pts: THREE.Vector2[] = [];
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          pts.push(new THREE.Vector2(Math.max(0.01, pk.r * peakProfile(t, pk.rock)), t * pk.h));
        }
        const g = new THREE.LatheGeometry(pts, 20).toNonIndexed();
        const p = g.attributes.position;
        // jitter (deterministic per vertex position so seams stay closed)
        const jit = new Map<string, number>();
        for (let i = 0; i < p.count; i++) {
          const key = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
          let k = jit.get(key);
          if (k === undefined) jit.set(key, (k = 0.88 + r() * 0.24));
          if (p.getY(i) < pk.h - 0.5) {
            p.setX(i, p.getX(i) * k);
            p.setZ(i, p.getZ(i) * k);
          }
        }
        g.computeVertexNormals();
        paintFaces(g, (_x, y, _z, ny, i) => {
          const t = y / pk.h;
          if (pk.rock) return t > 0.28 && (ny < 0.75 || t > 0.85) ? (i % 3 ? ROCK : C('#7a6d61')) : GREENS[i % 4];
          return ny < 0.35 && i % 3 === 0 ? ROCK : GREENS[i % 4];
        });
        return g;
      }),
    [],
  );
  return (
    <group>
      {BAY_PEAKS.map((pk, i) => (
        <mesh key={i} geometry={geos[i]} position={[pk.x, -2, pk.z]}>
          <meshStandardMaterial vertexColors flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Christ the Redeemer on top of Corcovado. */
export function Redeemer() {
  const [x, z] = CORCOVADO;
  const y = hillHeight(x, z);
  const white = useMemo(() => flat('#f3f1ec', 0.6), []);
  const stone = useMemo(() => flat('#bdb6aa'), []);
  return (
    <group position={[x, y - 2, z]} rotation={[0, 0.25, 0]} scale={1.3}>
      <mesh position={[0, 3, 0]} material={stone}>
        <boxGeometry args={[12, 6, 12]} />
      </mesh>
      <mesh position={[0, 8, 0]} material={white}>
        <boxGeometry args={[5, 4, 5]} />
      </mesh>
      <mesh position={[0, 17, 0]} material={white}>
        <cylinderGeometry args={[1.6, 3, 15, 8]} />
      </mesh>
      <mesh position={[0, 24.5, 0]} material={white}>
        <boxGeometry args={[27, 2.4, 2.2]} />
      </mesh>
      <mesh position={[0, 23.5, 0]} material={white}>
        <boxGeometry args={[4, 4, 3]} />
      </mesh>
      <mesh position={[0, 27.6, 0]} material={white}>
        <sphereGeometry args={[1.6, 10, 8]} />
      </mesh>
    </group>
  );
}

/** Cable car from the station roof via Urca to the top of Sugarloaf. */
export function CableCar() {
  const urca = BAY_PEAKS[1];
  const loaf = BAY_PEAKS[0];
  const stops = useMemo(
    () => [new THREE.Vector3(146, 11, -44), new THREE.Vector3(urca.x, urca.h - 1, urca.z), new THREE.Vector3(loaf.x, loaf.h - 1, loaf.z)],
    [urca, loaf],
  );
  const cars = useRef<THREE.Group[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    cars.current.forEach((g, i) => {
      if (!g) return;
      const span = i < 2 ? 0 : 1;
      const k = (Math.sin(t * 0.08 + i * Math.PI) + 1) / 2;
      g.position.lerpVectors(stops[span], stops[span + 1], k).y -= 2.6;
    });
  });
  const cable = (a: THREE.Vector3, b: THREE.Vector3, key: string) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return (
      <mesh key={key} position={mid} quaternion={quat}>
        <cylinderGeometry args={[0.08, 0.08, dir.length(), 4]} />
        <meshBasicMaterial color="#3a3f4a" />
      </mesh>
    );
  };
  const red = useMemo(() => flat('#e8604c', 0.4), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9fdcff', roughness: 0.1, metalness: 0.5 }), []);
  return (
    <group>
      {cable(stops[0], stops[1], 'a')}
      {cable(stops[1], stops[2], 'b')}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} ref={(g) => void (cars.current[i] = g!)}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.6, 4]} />
            <meshBasicMaterial color="#3a3f4a" />
          </mesh>
          <mesh position={[0, -0.6, 0]} material={red}>
            <boxGeometry args={[3, 2.2, 2.4]} />
          </mesh>
          <mesh position={[0, -0.35, 0]} material={glass}>
            <boxGeometry args={[3.1, 1, 2.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Rocky headland closing the west end of the beach. */
export function Headland() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
    const r = rng(9);
    const p = g.attributes.position;
    const jit = new Map<string, number>();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let k = jit.get(key);
      if (k === undefined) jit.set(key, (k = 0.85 + r() * 0.3));
      p.setXYZ(i, p.getX(i) * k, Math.max(-0.1, p.getY(i)) * k, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    paintFaces(g, (_x, y, _z, ny, i) => (y > 0.45 && ny > 0.5 ? GREENS[i % 4] : i % 2 ? ROCK : C('#7a6d61')));
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} position={[-200, -1, 50]} scale={[48, 38, 60]}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <mesh geometry={geo} position={[180, -1, 40]} rotation={[0, 1.2, 0]} scale={[26, 18, 40]}>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
    </group>
  );
}

// ───────────────────────── Beach life ─────────────────────────

const UMBRELLA_COLORS = ['#e15554', '#f2c14e', '#4d9de0', '#3bb273', '#f78154', '#ffffff', '#7768ae'];

/** All beach umbrellas as three instanced meshes (pole, canopy, towel). */
function Umbrellas({ items }: { items: { pos: [number, number, number]; color: string }[] }) {
  const meshes = useMemo(() => {
    const white = flat('#ffffff', 0.6);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4).translate(0, 1.3, 0), white, items.length);
    const top = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 0.7, 10).translate(0, 2.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), items.length);
    const towel = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.9).rotateX(-Math.PI / 2).translate(0.9, 0.04, 0.8), white, items.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    items.forEach((u, i) => {
      m.makeTranslation(u.pos[0], u.pos[1], u.pos[2]);
      pole.setMatrixAt(i, m);
      top.setMatrixAt(i, m);
      towel.setMatrixAt(i, m);
      top.setColorAt(i, c.set(u.color));
    });
    top.castShadow = true;
    for (const x of [pole, top, towel]) x.computeBoundingSphere();
    return [pole, top, towel];
  }, [items]);
  return (
    <>
      {meshes.map((x, i) => (
        <primitive key={i} object={x} />
      ))}
    </>
  );
}

/** White beach tent with a pyramid roof, like the barracas on Copacabana. */
function Barraca({ position }: { position: [number, number, number] }) {
  const white = useMemo(() => flat('#fbfaf6', 0.6), []);
  const wood = useMemo(() => flat('#9a6b47'), []);
  return (
    <group position={position}>
      {[
        [-1.8, -1.8],
        [1.8, -1.8],
        [-1.8, 1.8],
        [1.8, 1.8],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]} material={wood}>
          <boxGeometry args={[0.15, 2.6, 0.15]} />
        </mesh>
      ))}
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]} material={white} castShadow>
        <coneGeometry args={[3.2, 1.2, 4]} />
      </mesh>
      <mesh position={[0, 0.5, -1.2]} material={wood} castShadow>
        <boxGeometry args={[3.2, 1, 0.8]} />
      </mesh>
    </group>
  );
}

function VolleyNet({ position }: { position: [number, number, number] }) {
  const pole = useMemo(() => flat('#f4f6fa', 0.4), []);
  return (
    <group position={position}>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 1.25, 0]} material={pole}>
          <cylinderGeometry args={[0.07, 0.07, 2.5, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0]}>
        <planeGeometry args={[9, 0.8]} />
        <meshBasicMaterial color="#20242c" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function LifeguardTower({ position }: { position: [number, number, number] }) {
  const red = useMemo(() => flat('#e8604c', 0.6), []);
  const white = useMemo(() => flat('#f4f6fa', 0.6), []);
  return (
    <group position={position}>
      {[
        [-0.9, -0.9],
        [0.9, -0.9],
        [-0.9, 0.9],
        [0.9, 0.9],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.5, z]} material={white}>
          <boxGeometry args={[0.15, 3, 0.15]} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, 0]} material={red} castShadow>
        <boxGeometry args={[2.4, 1.6, 2.4]} />
      </mesh>
      <mesh position={[0, 4.6, 0]} material={white}>
        <boxGeometry args={[2.8, 0.2, 2.8]} />
      </mesh>
    </group>
  );
}

/** Umbrellas, tents, nets, lifeguard posts and sunbathers on the sand (scenery). */
export function BeachLife() {
  const items = useMemo(() => {
    const r = rng(512);
    const umbrellas: { pos: [number, number, number]; color: string }[] = [];
    for (let x = -150; x <= 150; x += 7) {
      for (const zr of [40, 50, 61, 70]) {
        if (r() < 0.45) continue;
        umbrellas.push({ pos: [x + (r() - 0.5) * 4, 0, zr + (r() - 0.5) * 4], color: UMBRELLA_COLORS[Math.floor(r() * UMBRELLA_COLORS.length)] });
      }
    }
    const sunbathers: { pos: [number, number, number]; model: number; rot: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const u = umbrellas[Math.floor(r() * umbrellas.length)];
      sunbathers.push({ pos: [u.pos[0] + 1.2, 0, u.pos[2] + 1.4], model: i, rot: Math.PI + (r() - 0.5) });
    }
    return { umbrellas, sunbathers };
  }, []);
  return (
    <group>
      <Umbrellas items={items.umbrellas} />
      {[-135, -95, -15, 25, 115].map((x) => (
        <Barraca key={x} position={[x, 0, 33]} />
      ))}
      {[-60, 110].map((x) => (
        <VolleyNet key={x} position={[x, 0, 46]} />
      ))}
      {[-110, -20, 130].map((x) => (
        <LifeguardTower key={x} position={[x, 0, 78]} />
      ))}
      <Suspense fallback={null}>
        {items.sunbathers.map((s, i) => (
          <Person key={i} model={s.model} position={s.pos} pose="sit" rotation={s.rot} />
        ))}
      </Suspense>
    </group>
  );
}

const BOATS: { model: string; pos: [number, number, number]; rot: number; scale: number }[] = [
  { model: 'boat-sail-a', pos: [-60, 0, 150], rot: 1.2, scale: 2.4 },
  { model: 'boat-sail-b', pos: [40, 0, 190], rot: -0.6, scale: 2.4 },
  { model: 'boat-sail-a', pos: [140, 0, 140], rot: 2.4, scale: 2.2 },
  { model: 'boat-sail-b', pos: [230, 0, -20], rot: 0.4, scale: 2.4 },
  { model: 'boat-sail-a', pos: [280, 0, 30], rot: -1.4, scale: 2.4 },
  { model: 'boat-speed-a', pos: [-20, 0, 120], rot: 1.57, scale: 2 },
  { model: 'boat-speed-e', pos: [90, 0, 112], rot: -1.4, scale: 2 },
  { model: 'boat-fishing-small', pos: [-150, 0, 170], rot: 0.8, scale: 2.2 },
  { model: 'ship-ocean-liner-small', pos: [120, 0, 560], rot: 1.57, scale: 5 },
  { model: 'buoy', pos: [-80, 0, 104], rot: 0, scale: 1.6 },
  { model: 'buoy', pos: [20, 0, 104], rot: 0, scale: 1.6 },
  { model: 'buoy', pos: [120, 0, 104], rot: 0, scale: 1.6 },
];

/** Boats bobbing in the bay; speedboats cruise slowly along the coast. */
export function Boats() {
  const refs = useRef<THREE.Group[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const b = BOATS[i];
      g.position.y = -0.3 + Math.sin(t * 1.1 + i) * 0.18;
      g.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.04;
      g.rotation.x = Math.sin(t * 0.7 + i) * 0.03;
      if (b.model.startsWith('boat-speed')) g.position.x = b.pos[0] + Math.sin(t * 0.05 + i) * 120;
    });
  });
  return (
    <Suspense fallback={null}>
      {BOATS.map((b, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g!)} position={b.pos}>
          <KitModel kit="boats" model={b.model} rotation={[0, b.rot, 0]} scale={b.scale} shadows={false} />
        </group>
      ))}
    </Suspense>
  );
}
