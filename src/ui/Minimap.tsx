import { useEffect, useRef } from 'react';
import { player } from '../game/runtime';
import { poiById, RIO_POIS, RIO_ZONES } from '../game/scenes/rioLayout';
import { activeObjective, useGame } from '../store/gameStore';

const SCALE = 0.75; // px per metre (canvas is 2x)

/** Circular minimap for city scenes (screen 4). North-up, arrow shows facing. */
export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const open = useGame((s) => s.openPanel);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = ref.current;
      if (c) {
        const g = c.getContext('2d')!;
        const S = c.width;
        const k = SCALE * (S / 168);
        const px = player.pos.x;
        const pz = player.pos.z;
        const tx = (x: number) => S / 2 + (x - px) * k;
        const tz = (z: number) => S / 2 + (z - pz) * k;
        g.fillStyle = '#5e6670';
        g.fillRect(0, 0, S, S);
        // ocean
        g.fillStyle = '#2aa3c4';
        g.fillRect(0, tz(106), S, S);
        for (const z of RIO_ZONES) {
          g.fillStyle = z.color;
          g.globalAlpha = 0.8;
          g.fillRect(tx(z.x0), tz(z.z0), (z.x1 - z.x0) * k, (z.z1 - z.z0) * k);
        }
        g.globalAlpha = 1;
        const st = useGame.getState();
        const tracked = st.trackedQuest ?? 'rio_energy_01';
        const target = activeObjective(st, tracked)?.poi;
        g.font = `${Math.round(S / 12)}px system-ui`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (const p of RIO_POIS) {
          if (p.kind === 'viewpoint') continue;
          g.fillText(p.icon, tx(p.x), tz(p.z));
        }
        if (target) {
          const p = poiById(target);
          if (p) {
            let x = tx(p.x);
            let y = tz(p.z);
            const dx = x - S / 2;
            const dy = y - S / 2;
            const d = Math.hypot(dx, dy);
            const max = S / 2 - 14;
            if (d > max) {
              x = S / 2 + (dx / d) * max;
              y = S / 2 + (dy / d) * max;
            }
            g.strokeStyle = '#ffcf5a';
            g.lineWidth = 4;
            g.beginPath();
            g.arc(x, y, 10 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2);
            g.stroke();
          }
        }
        // player arrow
        g.save();
        g.translate(S / 2, S / 2);
        g.rotate(-player.facing + Math.PI);
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#0b1530';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, -14);
        g.lineTo(10, 10);
        g.lineTo(0, 5);
        g.lineTo(-10, 10);
        g.closePath();
        g.stroke();
        g.fill();
        g.restore();
        // north marker
        g.fillStyle = '#fff';
        g.font = `bold ${Math.round(S / 14)}px system-ui`;
        g.fillText('N', S / 2, 16);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="minimap" onClick={() => open('map')} title="Open map (M)">
      <canvas ref={ref} width={336} height={336} />
    </div>
  );
}
