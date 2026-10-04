import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Mutable per-frame state shared between the 3D scene and the HTML HUD
 * (minimap, pet, NPCs). Kept outside React/Zustand to avoid re-renders at 60 fps.
 */
export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'doubleJump'
  | 'fall'
  | 'land'
  | 'dash'
  | 'interact'
  | 'wave'
  | 'celebrate'
  | 'sit'
  | 'dance'
  | 'board';

export const player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  facing: 0,
  grounded: true,
  anim: 'idle' as AnimState,
  animTime: 0,
  camYaw: 0,
  /** Seconds the current emote stays active. */
  emoteTimer: 0,
};

export const playerCommands: {
  teleport: { x: number; y: number; z: number; yaw?: number } | null;
  emote: AnimState | null;
} = { teleport: null, emote: null };

// ───────────────────────── Interactables ─────────────────────────

export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  label: string;
  /** Key hint shown in the prompt. */
  key?: string;
  /** Vertical tolerance: player feet must be within this many metres of pos.y. */
  heightTolerance?: number;
  onInteract: () => void;
}

export const interactables = new Map<string, Interactable>();

export interface Trigger {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  heightTolerance?: number;
  once?: boolean;
  onEnter: () => void;
}

export const triggers = new Map<string, Trigger>();

function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

export function useInteractable(
  def: Omit<Interactable, 'onInteract' | 'pos'> & { pos: [number, number, number] },
  onInteract: () => void,
  enabled = true,
) {
  const cb = useLatest(onInteract);
  const [x, y, z] = def.pos;
  useEffect(() => {
    if (!enabled) return;
    const it: Interactable = {
      ...def,
      pos: new THREE.Vector3(x, y, z),
      onInteract: () => cb.current(),
    };
    interactables.set(def.id, it);
    return () => {
      if (interactables.get(def.id) === it) interactables.delete(def.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.label, def.radius, x, y, z, enabled, def.key, def.heightTolerance]);
}

export function useTrigger(
  def: Omit<Trigger, 'onEnter' | 'pos'> & { pos: [number, number, number] },
  onEnter: () => void,
  enabled = true,
) {
  const cb = useLatest(onEnter);
  const [x, y, z] = def.pos;
  useEffect(() => {
    if (!enabled) return;
    const t: Trigger = { ...def, pos: new THREE.Vector3(x, y, z), onEnter: () => cb.current() };
    triggers.set(def.id, t);
    return () => {
      if (triggers.get(def.id) === t) triggers.delete(def.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, def.radius, x, y, z, enabled, def.heightTolerance]);
}

export function inRange(p: THREE.Vector3, target: THREE.Vector3, radius: number, heightTol = 3) {
  const dx = p.x - target.x;
  const dz = p.z - target.z;
  if (dx * dx + dz * dz > radius * radius) return false;
  return Math.abs(p.y - target.y) <= heightTol;
}

/** Uncollected collectibles in the current scene — pets use this to hint (TZ §29). */
export const collectibles = new Map<string, THREE.Vector3>();
