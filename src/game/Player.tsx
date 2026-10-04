import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { play } from '../audio/sfx';
import { useGame } from '../store/gameStore';
import { input } from './input';
import { SaiModel, type AnimSource } from './models/SaiModel';
import { raycastWorld, stepBody, world } from './physics';
import { interactables, inRange, player, playerCommands, triggers, type AnimState } from './runtime';

const GRAVITY = -28;
const WALK = 6;
const RUN = 10;
const BOARD = 16;
const JUMP_V = 10.2;
const DOUBLE_JUMP_V = 9.2;
const DASH_SPEED = 22;
const DASH_TIME = 0.18;
const DASH_COOLDOWN = 0.7;

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
function dampAngle(a: number, b: number, k: number, dt: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-k * dt));
}

export type Spawn = [number, number, number, number];

/**
 * Third-person Sai controller (TZ §3–4): movement, jump / double jump, dash,
 * hoverboard, emotes, interaction prompts, triggers and the follow camera.
 */
export function Player({ spawn, cameraDistance = 7 }: { spawn: Spawn; cameraDistance?: number }) {
  const skin = useGame((s) => s.equippedSkin);
  const riding = useGame((s) => s.riding);
  const quality = useGame((s) => s.settings.quality);
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null!);

  const body = useRef({ x: spawn[0], y: spawn[1], z: spawn[2], vx: 0, vy: 0, vz: 0, grounded: true });
  const st = useRef({
    jumps: 0,
    dashT: 0,
    dashCd: 0,
    landT: 0,
    coyote: 0,
    interactT: 0,
    camYaw: spawn[3],
    camPitch: 0.32,
    dist: cameraDistance,
    safe: new THREE.Vector3(spawn[0], spawn[1], spawn[2]),
    safeT: 0,
    stepT: 0,
    inside: new Set<string>(),
    nearest: null as string | null,
    airTime: 0,
  });
  const animSrc = useRef<AnimSource>({ anim: 'idle', animTime: 0, speed: 0 });

  useEffect(() => {
    player.pos.set(spawn[0], spawn[1], spawn[2]);
    player.facing = spawn[3];
    player.camYaw = spawn[3];
    player.anim = 'idle';
    group.current.position.copy(player.pos);
    group.current.rotation.y = spawn[3];
    const s = st.current;
    const target = new THREE.Vector3(spawn[0], spawn[1] + 1.5, spawn[2]);
    camera.position.set(
      target.x - Math.sin(s.camYaw) * Math.cos(s.camPitch) * s.dist,
      target.y + Math.sin(s.camPitch) * s.dist,
      target.z - Math.cos(s.camYaw) * Math.cos(s.camPitch) * s.dist,
    );
    camera.lookAt(target);
    return () => {
      useGame.getState().setPrompt(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const b = body.current;
    const s = st.current;
    const game = useGame.getState();
    const paused = !!(game.panel || game.dialog || game.reward || game.transition);

    if (playerCommands.teleport) {
      const t = playerCommands.teleport;
      b.x = t.x;
      b.y = t.y;
      b.z = t.z;
      b.vx = b.vy = b.vz = 0;
      if (t.yaw !== undefined) {
        player.facing = t.yaw;
        s.camYaw = t.yaw;
      }
      playerCommands.teleport = null;
    }
    if (playerCommands.emote) {
      player.anim = playerCommands.emote;
      player.animTime = 0;
      player.emoteTimer = playerCommands.emote === 'sit' || playerCommands.emote === 'dance' ? 999 : 2.2;
      playerCommands.emote = null;
    }

    // ── input → desired velocity
    const fx = Math.sin(s.camYaw);
    const fz = Math.cos(s.camYaw);
    let mx = 0;
    let mz = 0;
    if (!paused) {
      mx = input.right + input.joyX;
      mz = input.forward + input.joyY;
    }
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1) {
      mx /= mlen;
      mz /= mlen;
    }
    const wishX = fx * mz - fz * mx;
    const wishZ = fz * mz + fx * mx;
    const moving = mlen > 0.08;
    const runHeld = input.run || Math.hypot(input.joyX, input.joyY) > 0.92;
    const speed = riding ? BOARD : runHeld ? RUN : WALK;

    s.dashCd -= dt;
    if (s.dashT > 0) {
      s.dashT -= dt;
    } else {
      const accel = b.grounded ? (riding ? 6 : 14) : 4.5;
      b.vx = damp(b.vx, wishX * speed, accel, dt);
      b.vz = damp(b.vz, wishZ * speed, accel, dt);
    }

    if (!paused) {
      if (input.jump) {
        if (b.grounded || s.coyote > 0) {
          b.vy = JUMP_V;
          b.grounded = false;
          s.jumps = 1;
          s.coyote = 0;
          setAnim('jump');
          play('jump');
          game.flags.jumped || game.setFlag('jumped');
        } else if (s.jumps < 2) {
          b.vy = DOUBLE_JUMP_V;
          s.jumps = 2;
          setAnim('doubleJump');
          play('doubleJump');
        }
      }
      if (input.dash && s.dashCd <= 0) {
        let dx = wishX;
        let dz = wishZ;
        if (!moving) {
          dx = Math.sin(player.facing);
          dz = Math.cos(player.facing);
        }
        const l = Math.hypot(dx, dz) || 1;
        b.vx = (dx / l) * DASH_SPEED;
        b.vz = (dz / l) * DASH_SPEED;
        if (!b.grounded) b.vy = Math.max(b.vy, 1.5);
        s.dashT = DASH_TIME;
        s.dashCd = DASH_COOLDOWN;
        setAnim('dash');
        play('dash');
      }
      if (input.action) {
        if ((game.inventory.hoverboard ?? 0) > 0) {
          game.setRiding(!game.riding);
          play('board');
        } else {
          game.toast('Get a Hoverboard in the Shop to ride (F)', '🛹');
        }
      }
      if (input.interact && s.nearest) {
        const it = interactables.get(s.nearest);
        if (it) {
          s.interactT = 0.45;
          setAnim('interact');
          it.onInteract();
          game.flags.interacted || game.setFlag('interacted');
        }
      }
    }
    input.jump = input.dash = input.interact = input.action = false;

    // ── physics (sub-stepped)
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    let landed = false;
    const prevVy = b.vy;
    for (let i = 0; i < steps; i++) landed = stepBody(world, b, h, s.dashT > 0 ? GRAVITY * 0.3 : GRAVITY) || landed;
    if (landed) {
      s.jumps = 0;
      if (prevVy < -9 || s.airTime > 0.45) {
        s.landT = 0.2;
        play('land');
      }
    }
    s.airTime = b.grounded ? 0 : s.airTime + dt;
    s.coyote = b.grounded ? 0.12 : s.coyote - dt;

    if (b.y < world.killY) {
      b.x = s.safe.x;
      b.y = s.safe.y + 0.5;
      b.z = s.safe.z;
      b.vx = b.vy = b.vz = 0;
      game.toast('Whoa! Sai teleported back to safety', '✨');
    }
    s.safeT -= dt;
    if (b.grounded && s.safeT <= 0) {
      s.safe.set(b.x, b.y, b.z);
      s.safeT = 0.5;
    }

    // ── facing & animation
    const hs = Math.hypot(b.vx, b.vz);
    if (hs > 0.6 && s.dashT <= 0) player.facing = dampAngle(player.facing, Math.atan2(b.vx, b.vz), 12, dt);
    s.landT -= dt;
    s.interactT -= dt;
    player.emoteTimer -= dt;
    player.animTime += dt;

    let anim: AnimState;
    const emoting = player.emoteTimer > 0 && !moving && b.grounded;
    if (!emoting) player.emoteTimer = 0;
    if (s.dashT > 0) anim = 'dash';
    else if (!b.grounded && s.airTime > 0.08) {
      if (player.anim === 'doubleJump' && player.animTime < 0.4) anim = 'doubleJump';
      else anim = b.vy > 0 ? 'jump' : 'fall';
    } else if (emoting) anim = player.anim;
    else if (s.interactT > 0 && !moving) anim = 'interact';
    else if (riding) anim = 'board';
    else if (s.landT > 0 && hs < 2) anim = 'land';
    else if (hs > 7.5) anim = 'run';
    else if (hs > 0.5) anim = 'walk';
    else anim = 'idle';
    if (anim !== player.anim) {
      // keep emote/jump timers when re-entering the same state
      player.anim = anim;
      if (anim !== 'doubleJump') player.animTime = 0;
    }

    function setAnim(a: AnimState) {
      player.anim = a;
      player.animTime = 0;
      player.emoteTimer = 0;
    }

    // footsteps
    if (b.grounded && hs > 1 && !riding) {
      s.stepT -= dt;
      if (s.stepT <= 0) {
        play('step');
        s.stepT = hs > 7.5 ? 0.27 : 0.38;
      }
    }

    group.current.position.set(b.x, b.y, b.z);
    group.current.rotation.y = player.facing;
    player.pos.set(b.x, b.y, b.z);
    player.vel.set(b.vx, b.vy, b.vz);
    player.grounded = b.grounded;
    animSrc.current.anim = player.anim;
    animSrc.current.animTime = player.animTime;
    animSrc.current.speed = hs;

    // ── camera
    if (!paused) {
      s.camYaw -= input.lookX * 0.0055;
      s.camPitch = Math.max(-0.15, Math.min(1.25, s.camPitch + input.lookY * 0.0045));
      s.dist = Math.max(3.5, Math.min(14, s.dist + input.zoom * 0.8));
    }
    input.lookX = input.lookY = input.zoom = 0;
    player.camYaw = s.camYaw;

    const tx = b.x;
    const ty = b.y + 1.5;
    const tz = b.z;
    const dx = -Math.sin(s.camYaw) * Math.cos(s.camPitch);
    const dy = Math.sin(s.camPitch);
    const dz = -Math.cos(s.camYaw) * Math.cos(s.camPitch);
    const hit = raycastWorld(world, tx, ty, tz, dx, dy, dz, s.dist);
    const d = Math.max(1.2, hit - 0.35);
    const cx = tx + dx * d;
    const cy = Math.max(ty - 1.3, ty + dy * d);
    const cz = tz + dz * d;
    const k = 1 - Math.exp(-14 * dt);
    const cur = camera.position;
    const curDist = Math.hypot(cur.x - tx, cur.y - ty, cur.z - tz);
    if (d < curDist - 0.5) cur.set(cx, cy, cz); // snap in front of walls
    else cur.set(cur.x + (cx - cur.x) * k, cur.y + (cy - cur.y) * k, cur.z + (cz - cur.z) * k);
    camera.lookAt(tx, ty, tz);

    // ── interactables & triggers
    let best: string | null = null;
    let bestD = Infinity;
    for (const it of interactables.values()) {
      if (!inRange(player.pos, it.pos, it.radius, it.heightTolerance ?? 3)) continue;
      const dd = player.pos.distanceToSquared(it.pos);
      if (dd < bestD) {
        bestD = dd;
        best = it.id;
      }
    }
    if (best !== s.nearest) {
      s.nearest = best;
      const it = best ? interactables.get(best) : null;
      game.setPrompt(it ? { label: it.label, key: it.key ?? 'E' } : null);
    } else if (best) {
      const it = interactables.get(best)!;
      if (game.prompt?.label !== it.label) game.setPrompt({ label: it.label, key: it.key ?? 'E' });
    }
    for (const t of triggers.values()) {
      const inside = inRange(player.pos, t.pos, t.radius, t.heightTolerance ?? 4);
      if (inside && !s.inside.has(t.id)) {
        s.inside.add(t.id);
        t.onEnter();
      } else if (!inside) s.inside.delete(t.id);
    }
  });

  return (
    <group ref={group}>
      <SaiModel skin={skin} source={() => animSrc.current} riding={riding} castShadow={quality === 'high'} />
    </group>
  );
}
