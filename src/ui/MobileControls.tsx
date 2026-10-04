import { useRef, useState } from 'react';
import { input } from '../game/input';

/** Virtual joystick + action buttons for touch devices (TZ §3). */
export function MobileControls() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      dx /= d;
      dy /= d;
    }
    input.joyX = dx;
    input.joyY = -dy;
    setKnob({ x: dx * 37, y: dy * 37 });
  };
  const end = () => {
    pid.current = null;
    input.joyX = input.joyY = 0;
    setKnob({ x: 0, y: 0 });
  };

  const btn = (label: string, onDown: () => void, big = false) => (
    <button
      className={big ? 'big' : ''}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown();
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        ref={base}
        className="joystick"
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => e.pointerId === pid.current && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="mobile-buttons">
        {btn('🛹', () => (input.action = true))}
        {btn('✋', () => (input.interact = true))}
        {btn('💨', () => (input.dash = true))}
        {btn('⤒', () => (input.jump = true), true)}
      </div>
    </>
  );
}
