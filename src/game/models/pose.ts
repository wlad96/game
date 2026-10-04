import type { AnimState } from '../runtime';

/** Target joint angles for one frame. Shared by every Sai body (primitive and rigged GLB). */
export interface Pose {
  bodyY: number;
  lean: number;
  spin: number;
  squash: number;
  /** Arm swing (x) and outward raise (z, positive = outward for both sides). */
  aL: number;
  aR: number;
  aLz: number;
  aRz: number;
  lL: number;
  lR: number;
  headTilt: number;
}

/**
 * Procedural animation for every TZ §4 state. `phase` carries the gait cycle
 * between frames. Sign conventions (model faces +z): negative arm/leg x swings
 * the limb forward; aLz / aRz raise the arm away from the body.
 */
export function computePose(anim: AnimState, animTime: number, speed: number, t: number, dt: number, phase: { current: number }): Pose {
  let bodyY = 0;
  let lean = 0;
  let spin = 0;
  let squash = 1;
  let aL = 0;
  let aR = 0;
  let aLz = 0.15;
  let aRz = -0.15;
  let lL = 0;
  let lR = 0;
  let headTilt = 0;

  const gait = (freq: number, amp: number) => {
    phase.current += dt * freq;
    const p = Math.sin(phase.current);
    lL = p * amp;
    lR = -p * amp;
    aL = -p * amp * 0.8;
    aR = p * amp * 0.8;
    bodyY = Math.abs(Math.cos(phase.current)) * 0.06;
  };

  switch (anim) {
    case 'idle':
      bodyY = Math.sin(t * 2) * 0.015;
      aLz = 0.15 + Math.sin(t * 2) * 0.03;
      aRz = -aLz;
      headTilt = Math.sin(t * 0.7) * 0.05;
      break;
    case 'walk':
      gait(Math.max(6, speed * 1.5), 0.6);
      break;
    case 'run':
      gait(Math.max(10, speed * 1.35), 0.95);
      lean = 0.18;
      break;
    case 'jump':
      aL = aR = -2.4;
      aLz = 0.5;
      aRz = -0.5;
      lL = -0.7;
      lR = 0.3;
      break;
    case 'doubleJump':
      aL = aR = -2.8;
      lL = lR = -0.9;
      spin = Math.min(1, animTime / 0.38) * Math.PI * 2;
      break;
    case 'fall':
      aL = aR = -1.3;
      aLz = 0.9;
      aRz = -0.9;
      lL = 0.25;
      lR = -0.2;
      break;
    case 'land':
      squash = 1 - Math.max(0, 0.18 - animTime) * 1.2;
      aLz = 0.5;
      aRz = -0.5;
      break;
    case 'dash':
      lean = 0.6;
      aL = aR = 1.2;
      lL = 0.5;
      lR = -0.4;
      break;
    case 'interact':
      aR = -1.4;
      aL = -0.2;
      headTilt = 0.15;
      break;
    case 'wave':
      aRz = -2.6 + Math.sin(t * 12) * 0.35;
      aR = -0.2;
      headTilt = -0.1;
      break;
    case 'celebrate':
      aL = aR = -2.9 + Math.sin(t * 14) * 0.2;
      aLz = 0.3;
      aRz = -0.3;
      bodyY = Math.abs(Math.sin(t * 7)) * 0.35;
      break;
    case 'sit':
      bodyY = -0.42;
      lL = lR = -1.45;
      aL = aR = -0.5;
      break;
    case 'dance':
      bodyY = Math.abs(Math.sin(t * 8)) * 0.1;
      lean = Math.sin(t * 4) * 0.1;
      aL = -1.5 + Math.sin(t * 8) * 1;
      aR = -1.5 - Math.sin(t * 8) * 1;
      lL = Math.sin(t * 8) * 0.3;
      lR = -lL;
      headTilt = Math.sin(t * 8) * 0.15;
      break;
    case 'board':
      bodyY = -0.12 + Math.sin(t * 3) * 0.02;
      lL = -0.35;
      lR = 0.3;
      aLz = 1.1;
      aRz = -1.1;
      lean = 0.12 + Math.min(0.2, speed * 0.01);
      break;
  }


  // aRz is authored negative-outward above; normalise both sides to positive = outward
  return { bodyY, lean, spin, squash, aL, aR, aLz, aRz: -aRz, lL, lR, headTilt };
}
