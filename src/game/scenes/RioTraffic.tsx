import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { KitModel } from '../models/Kit';
import { player } from '../runtime';
import { STREET } from './rioLayout';

const CARS = ['taxi', 'sedan', 'suv', 'taxi', 'van', 'hatchback-sports', 'police', 'taxi', 'delivery', 'sedan'];
const CAR_SCALE = 1.6;
const X0 = -175;
const X1 = 175;

interface Car {
  model: string;
  lane: number;
  x: number;
  v: number;
  vMax: number;
}

/**
 * Two carriageways, two lanes each: eastbound on the ocean side, westbound on
 * the city side. Cars keep their distance and stop for Sai.
 */
function buildLanes() {
  const zN = (STREET.roadN[0] + STREET.roadN[1]) / 2;
  const zS = (STREET.roadS[0] + STREET.roadS[1]) / 2;
  return [
    { z: zN - 2.2, dir: -1 },
    { z: zN + 2.2, dir: -1 },
    { z: zS - 2.2, dir: 1 },
    { z: zS + 2.2, dir: 1 },
  ];
}

export function Traffic() {
  const lanes = useMemo(buildLanes, []);
  const cars = useMemo<Car[]>(() => {
    const out: Car[] = [];
    let k = 0;
    lanes.forEach((_, lane) => {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const vMax = 9 + ((k * 7) % 5);
        out.push({ model: CARS[k++ % CARS.length], lane, x: X0 + ((X1 - X0) / n) * (i + (lane % 2) * 0.5), v: vMax, vMax });
      }
    });
    return out;
  }, [lanes]);
  const refs = useRef<THREE.Group[]>([]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const span = X1 - X0;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      const { z, dir } = lanes[c.lane];
      // distance to the nearest obstacle ahead: another car in the lane, or Sai on the road
      let gap = Infinity;
      for (const o of cars) {
        if (o === c || o.lane !== c.lane) continue;
        let d = (o.x - c.x) * dir;
        if (d < 0) d += span;
        gap = Math.min(gap, d - 6);
      }
      if (Math.abs(player.pos.z - z) < 2.6 && player.pos.y < 3) {
        const d = (player.pos.x - c.x) * dir;
        if (d > 0) gap = Math.min(gap, d - 4);
      }
      const target = gap < 0.5 ? 0 : Math.min(c.vMax, gap * 1.2);
      c.v += (target - c.v) * Math.min(1, dt * (target < c.v ? 6 : 1.2));
      c.x += c.v * dir * dt;
      if (c.x > X1) c.x -= span;
      if (c.x < X0) c.x += span;
      const g = refs.current[i];
      if (g) {
        g.position.set(c.x, 0, z);
        g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
  });

  return (
    <Suspense fallback={null}>
      {cars.map((c, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g!)}>
          <KitModel kit="cars" model={c.model} scale={CAR_SCALE} />
        </group>
      ))}
    </Suspense>
  );
}
