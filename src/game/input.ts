/**
 * Unified input state. Keyboard, mouse and the mobile virtual joystick all
 * write here; the player controller reads it once per frame.
 */
export const input = {
  forward: 0,
  right: 0,
  run: false,
  /** Edge-triggered flags, consumed by the controller. */
  jump: false,
  dash: false,
  interact: false,
  action: false,
  /** Accumulated camera deltas in pixels, consumed by the camera rig. */
  lookX: 0,
  lookY: 0,
  zoom: 0,
  /** Virtual joystick (mobile), -1..1. */
  joyX: 0,
  joyY: 0,
  enabled: true,
};

const held = new Set<string>();

function recompute() {
  input.forward = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
  input.right = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
  input.run = held.has('ShiftLeft') || held.has('ShiftRight');
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

export function attachKeyboard(onKey: (code: string) => void) {
  const down = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    if (!e.repeat) {
      if (input.enabled) {
        if (e.code === 'Space') input.jump = true;
        if (e.code === 'KeyE') input.interact = true;
        if (e.code === 'KeyF') input.action = true;
        if (e.code === 'KeyQ' || e.code === 'ControlLeft') input.dash = true;
      }
      onKey(e.code);
    }
    held.add(e.code);
    recompute();
  };
  const up = (e: KeyboardEvent) => {
    held.delete(e.code);
    recompute();
  };
  const blur = () => {
    held.clear();
    recompute();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}

/** Mouse-drag / touch-swipe camera control on the canvas element. */
export function attachLook(el: HTMLElement) {
  let active: number | null = null;
  let lx = 0;
  let ly = 0;
  const down = (e: PointerEvent) => {
    if (active !== null) return;
    active = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    input.lookX += e.clientX - lx;
    input.lookY += e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId === active) active = null;
  };
  const wheel = (e: WheelEvent) => {
    input.zoom += Math.sign(e.deltaY);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: true });
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('wheel', wheel);
  };
}

export function resetInput() {
  held.clear();
  recompute();
  input.jump = input.dash = input.interact = input.action = false;
  input.joyX = input.joyY = 0;
  input.lookX = input.lookY = 0;
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
