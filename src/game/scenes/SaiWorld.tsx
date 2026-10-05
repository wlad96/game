import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import light1 from "../../assets/planets/light1.png?inline";
import light3 from "../../assets/planets/light3.png?inline";
import noise08 from "../../assets/planets/noise08.png?inline";
import planet00 from "../../assets/planets/planet00.png?inline";
import planet05 from "../../assets/planets/planet05.png?inline";
import planet07 from "../../assets/planets/planet07.png?inline";
import planet09 from "../../assets/planets/planet09.png?inline";
import { KitInstances, KitModel, Person } from "../models/Kit";
import { rng } from "../rngCore";
import type { Placement } from "./cityKit";
import { ISLAND_R, MONORAIL, PLAZA_R } from "./homeLayout";

/**
 * Planet Sai: the home plaza is a floating island over a sea of lavender
 * clouds, under a violet sky with Kenney planets. Everything here is scenery
 * outside the walkable plaza (Kenney Space, Platformer and Planets kits, CC0).
 */

export const SAI = {
  fog: "#cdb9f2",
  skyTop: "#1d1757",
  skyMid: "#6a4fc0",
  horizon: "#ffb9d2",
  below: "#c7b2f2",
  grass: "#c99bff",
  rock: "#4f3f97",
};

const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
function tex(url: string) {
  let t = texCache.get(url);
  if (!t) {
    t = texLoader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(url, t);
  }
  return t;
}

// ───────────────────────── Sky ─────────────────────────

function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(SAI.skyTop) },
          mid: { value: new THREE.Color(SAI.skyMid) },
          horizon: { value: new THREE.Color(SAI.horizon) },
          below: { value: new THREE.Color(SAI.below) },
        },
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 below; varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 c = h > 0.0
              ? mix(mix(horizon, mid, smoothstep(0.0, 0.28, h)), top, smoothstep(0.28, 0.85, h))
              : mix(horizon, below, smoothstep(0.0, -0.12, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
}

/** A Kenney planet: base sphere, drifting cloud layer and a shading overlay, always facing the plaza. */
function Planet({
  dir,
  dist,
  size,
  base,
  clouds,
  shade,
  ring,
  spin = 0.01,
}: {
  dir: [number, number, number];
  dist: number;
  size: number;
  base: string;
  clouds?: string;
  shade: string;
  ring?: string;
  spin?: number;
}) {
  const g = useRef<THREE.Group>(null!);
  const cl = useRef<THREE.Mesh>(null!);
  const pos = useMemo(
    () => new THREE.Vector3(...dir).normalize().multiplyScalar(dist),
    [dir, dist],
  );
  useFrame((s, dt) => {
    g.current.lookAt(s.camera.position);
    if (cl.current) cl.current.rotation.z += dt * spin;
  });
  const m = (map: string, opacity = 1) => (
    <meshBasicMaterial
      map={tex(map)}
      transparent
      opacity={opacity}
      depthWrite={false}
      fog={false}
      toneMapped={false}
    />
  );
  return (
    <group ref={g} position={pos}>
      {ring && (
        <mesh rotation={[0.2, 0, 0.35]} renderOrder={-8}>
          <ringGeometry args={[size * 0.62, size * 0.98, 96]} />
          <meshBasicMaterial
            color={ring}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh renderOrder={-7}>
        <planeGeometry args={[size, size]} />
        {m(base)}
      </mesh>
      {clouds && (
        <mesh ref={cl} position={[0, 0, 0.1]} renderOrder={-6}>
          <circleGeometry args={[size * 0.47, 64]} />
          <meshBasicMaterial
            map={tex(clouds)}
            transparent
            opacity={0.4}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh position={[0, 0, 0.2]} renderOrder={-5}>
        <planeGeometry args={[size, size]} />
        {m(shade, 0.85)}
      </mesh>
    </group>
  );
}

export function SaiSky() {
  // planet clouds texture repeats around the disc as it spins
  useMemo(() => {
    const t = tex(noise08);
    t.center.set(0.5, 0.5);
  }, []);
  return (
    <>
      <SkyDome />
      <Stars
        radius={520}
        depth={120}
        count={2500}
        factor={7}
        saturation={0.4}
        fade
        speed={0.4}
      />
      <Planet
        dir={[-0.55, 0.42, -1]}
        dist={700}
        size={330}
        base={planet09}
        clouds={noise08}
        shade={light1}
        ring="#ffd9a8"
        spin={0.004}
      />
      <Planet
        dir={[0.95, 0.55, -0.5]}
        dist={720}
        size={90}
        base={planet00}
        shade={light3}
      />
      <Planet
        dir={[1, 0.2, 0.65]}
        dist={700}
        size={46}
        base={planet05}
        shade={light3}
      />
      <Planet
        dir={[-1, 0.7, 0.55]}
        dist={720}
        size={64}
        base={planet07}
        shade={light3}
      />
    </>
  );
}

// ───────────────────────── The island ─────────────────────────

function softTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rocky underside of the floating plaza, lavender grass on the rim around it. */
function IslandBody() {
  const geo = useMemo(() => {
    const r = rng(5);
    const pts: THREE.Vector2[] = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -0.4 - t * 78;
      const rad =
        (ISLAND_R + 1) * Math.pow(1 - t, 0.75) * (0.92 + r() * 0.12) +
        (i === steps ? 0 : 1.5);
      pts.push(new THREE.Vector2(i === steps ? 0 : rad, y));
    }
    const g = new THREE.LatheGeometry(pts, 28);
    // jagged rock: push vertices around a little, darker towards the tip
    const p = g.attributes.position;
    const col: number[] = [];
    const top = new THREE.Color("#7a63c9");
    const bot = new THREE.Color("#2a2163");
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k =
        1 +
        Math.sin(p.getX(i) * 0.31 + y * 0.7) * 0.05 +
        Math.cos(p.getZ(i) * 0.27 - y) * 0.05;
      if (y < -1) p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
      const c = top.clone().lerp(bot, Math.min(1, -y / 70));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* lavender grass rim outside the railing */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.3, 0]}
        receiveShadow
      >
        <ringGeometry args={[PLAZA_R - 0.5, ISLAND_R + 2.5, 96]} />
        <meshStandardMaterial color={SAI.grass} roughness={1} />
      </mesh>
      {/* hanging rocks under the island */}
      {[
        [30, -30, 12, 9],
        [-26, -38, 20, 7],
        [8, -52, -30, 6],
        [-40, -22, -18, 8],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI, i, 0]}>
          <coneGeometry args={[s, s * 2.6, 6]} />
          <meshStandardMaterial color="#4a3b8f" flatShading roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

/** Sea of clouds far below. */
function CloudSea() {
  const soft = useMemo(() => softTexture(), []);
  const puffs = useMemo(() => {
    const r = rng(23);
    return Array.from({ length: 70 }, () => {
      const a = r() * Math.PI * 2;
      const d = 70 + r() * 520;
      return {
        p: [Math.sin(a) * d, -55 - r() * 25, Math.cos(a) * d] as [
          number,
          number,
          number,
        ],
        s: 60 + r() * 110,
        o: 0.5 + r() * 0.4,
      };
    });
  }, []);
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.004;
  });
  return (
    <group ref={g}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -70, 0]}>
        <circleGeometry args={[1400, 48]} />
        <meshBasicMaterial color="#d9c8f7" />
      </mesh>
      {puffs.map((c, i) => (
        <sprite key={i} position={c.p} scale={[c.s, c.s * 0.45, 1]}>
          <spriteMaterial
            map={soft}
            color={i % 3 ? "#f4eaff" : "#ffd6e6"}
            transparent
            opacity={c.o}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

// ───────────────────────── Kenney placements ─────────────────────────

const P = (
  kit: "space" | "platformer",
  model: string,
  x: number,
  y: number,
  z: number,
  scale: number,
  rot = 0,
): Placement => ({ kit, model, x, y, z, rot, scale, solid: false });

/** Railing, monorail track, crystals and alien trees on the rim. */
function rimPlacements() {
  const out: Placement[] = [];
  // railing along the plaza edge
  const n = 96;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({
      ...P(
        "space",
        "rail_middle",
        Math.sin(a) * (PLAZA_R + 0.3),
        0,
        Math.cos(a) * (PLAZA_R + 0.3),
        3.05,
      ),
      rot: a,
      shadow: false,
    });
  }
  // monorail ring on pillars over the rim
  const { r, y, segments } = MONORAIL;
  const len = (2 * Math.PI * r) / segments;
  for (let i = 0; i < segments; i++) {
    const a = ((i + 0.5) / segments) * Math.PI * 2;
    out.push({
      ...P(
        "space",
        "monorail_trackStraight",
        Math.sin(a) * r,
        y,
        Math.cos(a) * r,
        len,
      ),
      rot: a + Math.PI / 2,
    });
  }
  // crystals and alien trees between the pillars
  const rr = rng(9);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rr() * 0.15;
    const d = PLAZA_R + 3 + rr() * (ISLAND_R - PLAZA_R - 4);
    const x = Math.sin(a) * d;
    const z = Math.cos(a) * d;
    const pick = i % 3;
    if (pick === 0)
      out.push(
        P(
          "space",
          i % 2 ? "rock_crystalsLargeA" : "rock_crystalsLargeB",
          x,
          -0.3,
          z,
          5 + rr() * 2,
          rr() * 6,
        ),
      );
    else if (pick === 1)
      out.push(
        P(
          "platformer",
          i % 2 ? "tree" : "tree-pine",
          x,
          -0.3,
          z,
          3.4 + rr() * 1.4,
          rr() * 6,
        ),
      );
    else
      out.push(
        P("platformer", "mushrooms", x, -0.3, z, 4 + rr() * 2, rr() * 6),
      );
  }
  return out;
}

interface Islet {
  x: number;
  y: number;
  z: number;
  base: string;
  s: number;
  deco: [
    kit: "space" | "platformer",
    model: string,
    dx: number,
    dz: number,
    scale: number,
    rot?: number,
    dy?: number,
  ][];
}

/** Floating islets around the plaza; `y` is the top of the islet. */
const ISLETS: Islet[] = [
  // spaceport: glass hangar, dishes and a parked cargo ship
  {
    x: -84,
    y: -2,
    z: -34,
    base: "block-grass-overhang-large",
    s: 15,
    deco: [
      ["space", "hangar_roundGlass", -2, -3, 5.2],
      ["space", "satelliteDish_large", 9, 9, 6, 2.4],
      ["space", "machine_generatorLarge", -10, 9, 4, 0.6],
      ["space", "craft_cargoA", 8, -8, 4, 2.2],
    ],
  },
  // launch pad with a white-and-gold rocket
  {
    x: 78,
    y: -1,
    z: -52,
    base: "block-grass-overhang-hexagon",
    s: 13,
    deco: [
      ["space", "rocket_baseA", 0, 0, 5],
      ["space", "rocket_fuelA", 0, 0, 5, 0, 8],
      ["space", "rocket_sidesA", 0, 0, 5, 0, 10.5],
      ["space", "rocket_topA", 0, 0, 5, 0, 15.5],
      ["space", "structure_detailed", 6, -2, 4, 0.4],
    ],
  },
  // observatory dish
  {
    x: 96,
    y: 14,
    z: 18,
    base: "block-grass-overhang-low-hexagon",
    s: 10,
    deco: [
      ["space", "satelliteDish_detailed", 0, 0, 7, -0.8],
      ["platformer", "mushrooms", -3, 3, 4],
    ],
  },
  // crystal islets
  {
    x: -66,
    y: 18,
    z: 42,
    base: "block-grass-overhang-low-hexagon",
    s: 9,
    deco: [
      ["space", "rock_crystalsLargeA", 0, 0, 9],
      ["platformer", "grass", 3, 2, 5],
    ],
  },
  {
    x: 40,
    y: 26,
    z: -92,
    base: "block-grass-overhang-hexagon",
    s: 8,
    deco: [["space", "rock_crystalsLargeB", 0, 0, 8]],
  },
  {
    x: -18,
    y: 34,
    z: -110,
    base: "block-grass-overhang-low-large",
    s: 9,
    deco: [
      ["space", "rock_crystals", -3, 0, 10],
      ["platformer", "tree", 5, 2, 5],
    ],
  },
  // gardens with alien trees
  {
    x: 70,
    y: 6,
    z: 70,
    base: "block-grass-overhang-large",
    s: 10,
    deco: [
      ["platformer", "tree", -4, -3, 5.5],
      ["platformer", "tree-pine", 5, 4, 5],
      ["platformer", "flowers-tall", 2, -5, 5],
    ],
  },
  {
    x: -98,
    y: 4,
    z: 18,
    base: "block-grass-overhang-large-tall",
    s: 8,
    deco: [
      ["platformer", "tree-pine", -2, 0, 5],
      ["platformer", "plant", 3, 3, 5],
    ],
  },
  {
    x: -40,
    y: 12,
    z: 92,
    base: "block-grass-overhang-low",
    s: 12,
    deco: [
      ["platformer", "tree", 0, 0, 6],
      ["space", "machine_wireless", 4, 4, 5],
    ],
  },
  {
    x: 120,
    y: -6,
    z: -10,
    base: "block-grass-overhang-low-large",
    s: 11,
    deco: [["space", "hangar_smallA", 0, 0, 5, -1.2]],
  },
  {
    x: 20,
    y: -14,
    z: 98,
    base: "block-grass-overhang-hexagon",
    s: 9,
    deco: [["platformer", "tree-pine", 0, 0, 5]],
  },
  {
    x: -120,
    y: 26,
    z: -70,
    base: "block-grass-overhang-low-hexagon",
    s: 12,
    deco: [
      ["space", "meteor_detailed", 0, 0, 8],
      ["platformer", "grass", 4, 4, 5],
    ],
  },
];

/** Measured platformer block heights (kit units, base at y=0). */
const BLOCK_H: Record<string, number> = {
  "block-grass-overhang-large": 1.0,
  "block-grass-overhang-hexagon": 1.0,
  "block-grass-overhang-low-hexagon": 0.5,
  "block-grass-overhang-low-large": 0.5,
  "block-grass-overhang-large-tall": 2.0,
  "block-grass-overhang-low": 0.5,
};

function isletPlacements() {
  const out: Placement[] = [];
  for (const i of ISLETS) {
    const h = BLOCK_H[i.base] * i.s;
    out.push(P("platformer", i.base, i.x, i.y - h, i.z, i.s));
    for (const [kit, model, dx, dz, scale, rot = 0, dy = 0] of i.deco)
      out.push(P(kit, model, i.x + dx, i.y + dy, i.z + dz, scale, rot));
  }
  return out;
}

export function SaiPlacements({ shadows }: { shadows: boolean }) {
  const rim = useMemo(rimPlacements, []);
  const islets = useMemo(isletPlacements, []);
  return (
    <>
      <KitInstances placements={rim} shadows={shadows} />
      <KitInstances placements={islets} shadows={false} />
    </>
  );
}

// ───────────────────────── Things that move ─────────────────────────

/** A little train running round the monorail ring. */
export function Monorail() {
  const g = useRef<THREE.Group>(null!);
  const { r, y, segments } = MONORAIL;
  const top = y + 0.13 * ((2 * Math.PI * r) / segments);
  useFrame((_, dt) => {
    g.current.rotation.y += dt * 0.07;
  });
  const cars = [
    "monorail_trainFront",
    "monorail_trainPassenger",
    "monorail_trainPassenger",
    "monorail_trainFront",
  ];
  const S = 4.2;
  return (
    <>
      <MonorailPillars />
      <group ref={g}>
        {cars.map((m, i) => {
          const a = -i * ((S * 1.08) / r);
          return (
            <group
              key={i}
              position={[Math.sin(a) * r, top, Math.cos(a) * r]}
              rotation={[
                0,
                a + (i === cars.length - 1 ? -Math.PI / 2 : Math.PI / 2),
                0,
              ]}
            >
              <Suspense fallback={null}>
                <KitModel kit="space" model={m} scale={S} />
              </Suspense>
            </group>
          );
        })}
      </group>
    </>
  );
}

/** Slim white pillars with gold collars under the monorail ring. */
function MonorailPillars() {
  const { r, y, segments } = MONORAIL;
  const n = segments / 4;
  const meshes = useMemo(() => {
    const white = new THREE.MeshStandardMaterial({
      color: "#f4f5fb",
      roughness: 0.4,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: "#f2c14e",
      roughness: 0.35,
      metalness: 0.35,
    });
    const post = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.32, 0.45, y + 0.3, 10),
      white,
      n,
    );
    const cap = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.75, 0.55, 0.45, 10),
      gold,
      n,
    );
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = ((i * 4) / segments) * Math.PI * 2;
      d.position.set(Math.sin(a) * r, (y - 0.3) / 2, Math.cos(a) * r);
      d.updateMatrix();
      post.setMatrixAt(i, d.matrix);
      d.position.y = y - 0.2;
      d.updateMatrix();
      cap.setMatrixAt(i, d.matrix);
    }
    post.castShadow = cap.castShadow = true;
    post.computeBoundingSphere();
    cap.computeBoundingSphere();
    return [post, cap];
  }, [r, y, segments, n]);
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

/** Small ships circling the island. */
export function Ships() {
  const ships = useMemo(
    () => [
      { model: "craft_speederA", r: 85, y: 22, speed: 0.12, phase: 0, s: 3.2 },
      { model: "craft_racer", r: 110, y: 34, speed: -0.09, phase: 2, s: 3.6 },
      { model: "craft_speederB", r: 70, y: 40, speed: 0.07, phase: 4, s: 3 },
      { model: "craft_cargoA", r: 140, y: 12, speed: -0.04, phase: 1, s: 5 },
    ],
    [],
  );
  const refs = useRef<THREE.Group[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    ships.forEach((sh, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = sh.phase + t * sh.speed;
      g.position.set(
        Math.sin(a) * sh.r,
        sh.y + Math.sin(t * 0.7 + i) * 2,
        Math.cos(a) * sh.r,
      );
      // nose along the direction of travel, banked into the turn
      g.rotation.set(0, a + (sh.speed > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
      g.rotateZ(sh.speed > 0 ? -0.35 : 0.35);
    });
  });
  return (
    <>
      {ships.map((sh, i) => (
        <group key={sh.model} ref={(g) => void (refs.current[i] = g!)}>
          <Suspense fallback={null}>
            <KitModel
              kit="space"
              model={sh.model}
              scale={sh.s}
              shadows={false}
            />
          </Suspense>
        </group>
      ))}
    </>
  );
}

export const ALIENS = [
  "character-oobi",
  "character-oodi",
  "character-ooli",
  "character-oopi",
  "character-oozi",
];
/** Sai's neighbours: the little aliens of the Platformer kit, ~1.4 m tall. */
export function Alien(
  props: Omit<Parameters<typeof Person>[0], "kit" | "scale" | "model"> & {
    model: number;
  },
) {
  return (
    <Person
      {...props}
      kit="platformer"
      model={ALIENS[props.model % ALIENS.length]}
      scale={1.6}
    />
  );
}

/** The floating island under the plaza and the clouds below it. */
export function SaiIsland() {
  return (
    <>
      <IslandBody />
      <CloudSea />
    </>
  );
}
