import * as THREE from 'three';
import type { CityArt } from '../data/types';

/**
 * Procedural textures drawn on canvases. They stand in for the baked GLB
 * textures of the final art pipeline (KTX2) and keep the MVP download tiny.
 */
const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function cached(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

function toTex(c: HTMLCanvasElement, repeat?: [number, number], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Knitted wool pattern — Sai is a plush knitted astronaut. Tinted by material colour. */
export function knitTexture(repeat = 6) {
  return cached(`knit${repeat}`, () => {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#d8d8d8';
    g.fillRect(0, 0, 128, 128);
    const cols = 8;
    const rows = 10;
    const cw = 128 / cols;
    const rh = 128 / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * cw + cw / 2;
        const cy = y * rh;
        for (const side of [-1, 1]) {
          const grad = g.createLinearGradient(cx, cy, cx + side * cw * 0.45, cy + rh);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#bdbdbd');
          g.fillStyle = grad;
          g.beginPath();
          g.ellipse(cx + side * cw * 0.22, cy + rh * 0.55, cw * 0.2, rh * 0.62, side * -0.55, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    return toTex(c, [repeat, repeat]);
  });
}

export function labelTexture(
  text: string,
  opts: { color?: string; bg?: string; font?: string; w?: number; h?: number; glow?: string; sub?: string } = {},
) {
  const key = `label:${text}:${JSON.stringify(opts)}`;
  return cached(key, () => {
    const w = opts.w ?? 512;
    const h = opts.h ?? 128;
    const [c, g] = canvas(w, h);
    if (opts.bg) {
      g.fillStyle = opts.bg;
      roundRect(g, 4, 4, w - 8, h - 8, h * 0.25);
      g.fill();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = opts.font ?? `800 ${Math.floor(h * 0.5)}px "Exo 2", system-ui, sans-serif`;
    if (opts.glow) {
      g.shadowColor = opts.glow;
      g.shadowBlur = h * 0.15;
    }
    g.fillStyle = opts.color ?? '#ffffff';
    g.fillText(text, w / 2, opts.sub ? h * 0.38 : h / 2);
    if (opts.sub) {
      g.shadowBlur = 0;
      g.font = `600 ${Math.floor(h * 0.22)}px "Exo 2", system-ui, sans-serif`;
      g.fillStyle = '#cfe8ff';
      g.fillText(opts.sub, w / 2, h * 0.78);
    }
    return toTex(c);
  });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Building facade: white wall (tinted by material) with dark windows. */
export function facadeTexture(lit = false) {
  return cached(`facade${lit}`, () => {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const on = lit && (x * 7 + y * 3) % 5 < 2;
        g.fillStyle = on ? '#ffe9a8' : '#2b3a55';
        g.fillRect(x * 32 + 8, y * 32 + 7, 16, 19);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x * 32 + 8, y * 32 + 7, 16, 3);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.fillRect(x * 32 + 6, y * 32 + 26, 20, 3);
      }
    }
    return toTex(c);
  });
}

/** Emissive mask matching facadeTexture(true): only the lit windows glow. */
export function facadeGlowTexture() {
  return cached('facadeGlow', () => {
    const [c, g] = canvas(128, 128);
    g.fillStyle = '#000000';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if ((x * 7 + y * 3) % 5 < 2) {
          g.fillStyle = '#ffffff';
          g.fillRect(x * 32 + 8, y * 32 + 7, 16, 19);
        } else if ((x + y) % 3 === 0) {
          g.fillStyle = '#7fe6ff';
          g.fillRect(x * 32 + 8, y * 32 + 7, 16, 19);
        }
      }
    }
    return toTex(c);
  });
}

/** Copacabana promenade wave pattern. */
export function copacabanaTexture() {
  return cached('copa', () => {
    const [c, g] = canvas(256, 256);
    g.fillStyle = '#f3efe6';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#2a2a2e';
    for (let band = -1; band < 5; band++) {
      g.beginPath();
      const y0 = band * 64;
      g.moveTo(0, y0);
      for (let x = 0; x <= 256; x += 4) g.lineTo(x, y0 + Math.sin((x / 256) * Math.PI * 2) * 18);
      for (let x = 256; x >= 0; x -= 4) g.lineTo(x, y0 + 30 + Math.sin((x / 256) * Math.PI * 2) * 18);
      g.closePath();
      g.fill();
    }
    return toTex(c, [1, 1]);
  });
}

export function tileTexture(base: string, line: string, cells = 4) {
  return cached(`tile${base}${line}${cells}`, () => {
    const [c, g] = canvas(256, 256);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const s = 256 / cells;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        g.fillStyle = `rgba(255,255,255,${0.04 + ((i * 5 + j * 3) % 4) * 0.03})`;
        g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    }
    g.strokeStyle = line;
    g.lineWidth = 3;
    for (let i = 0; i <= cells; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, 256);
      g.moveTo(0, i * s);
      g.lineTo(256, i * s);
      g.stroke();
    }
    return toTex(c);
  });
}

export function noiseTexture(base: string, speck: string, density = 900) {
  return cached(`noise${base}${speck}${density}`, () => {
    const [c, g] = canvas(256, 256);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = speck;
    for (let i = 0; i < density; i++) {
      g.globalAlpha = 0.15 + rnd() * 0.35;
      g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    g.globalAlpha = 1;
    return toTex(c);
  });
}

// ───────────────────────── City postcard art ─────────────────────────

const artCanvasCache = new Map<string, HTMLCanvasElement>();

/** Painted postcard of a city — shown inside portals and in the portal UI. */
export function cityArtCanvas(art: CityArt, key: string): HTMLCanvasElement {
  const hit = artCanvasCache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 640;
  const [c, g] = canvas(W, H);
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, art.sky[1]);
  sky.addColorStop(1, art.sky[0]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // sun
  const sun = g.createRadialGradient(W * 0.72, H * 0.38, 5, W * 0.72, H * 0.38, 160);
  sun.addColorStop(0, 'rgba(255,250,220,1)');
  sun.addColorStop(0.2, 'rgba(255,230,170,0.7)');
  sun.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

  // clouds
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 6; i++) {
    const x = (i * 97) % W;
    const y = 60 + ((i * 53) % 140);
    g.beginPath();
    g.ellipse(x, y, 60, 14, 0, 0, Math.PI * 2);
    g.fill();
  }

  // far mountains
  g.fillStyle = shade(art.ground, -25);
  g.beginPath();
  g.moveTo(0, H * 0.62);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.55 - Math.abs(Math.sin(x * 0.013)) * 70 - Math.sin(x * 0.05) * 10);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();

  if (art.landmark === 'towers') {
    // snowy Andes
    g.fillStyle = '#e9f1ff';
    for (const [x, h] of [
      [90, 210],
      [260, 250],
      [430, 200],
    ]) {
      g.beginPath();
      g.moveTo(x - 140, H * 0.62);
      g.lineTo(x, H * 0.62 - h);
      g.lineTo(x + 140, H * 0.62);
      g.fill();
    }
  }

  if (art.landmark === 'redeemer') {
    // sea
    const sea = g.createLinearGradient(0, H * 0.62, 0, H);
    sea.addColorStop(0, '#3fb8d8');
    sea.addColorStop(1, '#0b5f8a');
    g.fillStyle = sea;
    g.fillRect(0, H * 0.62, W, H);
    // Sugarloaf
    g.fillStyle = '#2f6f4f';
    g.beginPath();
    g.ellipse(110, H * 0.62, 70, 120, 0, Math.PI, 0);
    g.fill();
    // Corcovado peak
    g.fillStyle = '#245c43';
    g.beginPath();
    g.moveTo(230, H * 0.66);
    g.quadraticCurveTo(360, H * 0.18, 380, H * 0.2);
    g.quadraticCurveTo(420, H * 0.25, 512, H * 0.62);
    g.lineTo(512, H * 0.7);
    g.fill();
    // Statue
    g.fillStyle = '#f4f1ea';
    const sx = 378;
    const sy = H * 0.2;
    g.fillRect(sx - 4, sy - 46, 8, 46);
    g.fillRect(sx - 26, sy - 40, 52, 6);
    g.beginPath();
    g.arc(sx, sy - 50, 5, 0, Math.PI * 2);
    g.fill();
  } else if (art.landmark === 'obelisk') {
    g.fillStyle = '#f2f2f2';
    g.beginPath();
    g.moveTo(W / 2 - 18, H * 0.75);
    g.lineTo(W / 2 - 10, H * 0.22);
    g.lineTo(W / 2, H * 0.18);
    g.lineTo(W / 2 + 10, H * 0.22);
    g.lineTo(W / 2 + 18, H * 0.75);
    g.fill();
  } else if (art.landmark === 'cathedral') {
    g.fillStyle = '#e9d6b0';
    g.fillRect(W / 2 - 110, H * 0.42, 220, H * 0.35);
    for (const dx of [-110, 70]) {
      g.fillRect(W / 2 + dx, H * 0.3, 40, H * 0.47);
      g.beginPath();
      g.moveTo(W / 2 + dx - 4, H * 0.3);
      g.lineTo(W / 2 + dx + 20, H * 0.24);
      g.lineTo(W / 2 + dx + 44, H * 0.3);
      g.fill();
    }
  } else if (art.landmark === 'monserrate') {
    g.fillStyle = '#2f6b3f';
    g.beginPath();
    g.moveTo(80, H * 0.75);
    g.quadraticCurveTo(250, H * 0.12, 420, H * 0.75);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(232, H * 0.21, 36, 26);
    g.beginPath();
    g.moveTo(228, H * 0.21);
    g.lineTo(250, H * 0.17);
    g.lineTo(272, H * 0.21);
    g.fill();
  }

  // skyline
  let seed = key.length * 31 + 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let layer = 0; layer < 2; layer++) {
    const base = H * (0.74 + layer * 0.06);
    for (let x = -10; x < W; ) {
      const w = 26 + rnd() * 40;
      const h = (layer === 0 ? 60 : 30) + rnd() * (art.landmark === 'towers' ? 200 : 110);
      g.fillStyle = layer === 0 ? shade(art.ground, 10) : shade(art.ground, 30);
      g.fillRect(x, base - h, w, h + H);
      g.fillStyle = 'rgba(255,230,160,0.8)';
      for (let wy = base - h + 8; wy < base - 6; wy += 12) {
        for (let wx = x + 5; wx < x + w - 6; wx += 9) if (rnd() < 0.35) g.fillRect(wx, wy, 4, 6);
      }
      x += w + 2;
    }
  }
  // palms
  if (art.landmark === 'redeemer') {
    for (const px of [40, 470]) {
      g.strokeStyle = '#3b2a1a';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(px, H);
      g.quadraticCurveTo(px + 20, H * 0.85, px + 10, H * 0.72);
      g.stroke();
      g.fillStyle = '#1f5a2e';
      for (let a = 0; a < 7; a++) {
        g.save();
        g.translate(px + 10, H * 0.72);
        g.rotate((a / 7) * Math.PI * 2);
        g.beginPath();
        g.ellipse(34, 0, 36, 7, 0.3, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  }
  // vignette
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,30,0.45)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);

  artCanvasCache.set(key, c);
  return c;
}

export function cityArtTexture(art: CityArt, key: string) {
  return cached(`art:${key}`, () => toTex(cityArtCanvas(art, key)));
}

const urlCache = new Map<string, string>();
export function cityArtUrl(art: CityArt, key: string) {
  let u = urlCache.get(key);
  if (!u) {
    u = cityArtCanvas(art, key).toDataURL('image/jpeg', 0.85);
    urlCache.set(key, u);
  }
  return u;
}

function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  const r = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${gg},${b})`;
}

/** Sai Core globe: deep blue ocean, glowing land and a holographic grid. */
export function coreTexture() {
  return cached('core', () => {
    const [c, g] = canvas(1024, 512);
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0a2a7a');
    grad.addColorStop(0.5, '#1450c8');
    grad.addColorStop(1, '#0a2a7a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = 'rgba(120,230,255,0.85)';
    for (let i = 0; i < 9; i++) {
      const cx = rnd() * 1024;
      const cy = 120 + rnd() * 280;
      for (let k = 0; k < 18; k++) {
        g.beginPath();
        g.ellipse(cx + (rnd() - 0.5) * 140, cy + (rnd() - 0.5) * 90, 20 + rnd() * 50, 10 + rnd() * 30, rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = 'rgba(190,240,255,0.5)';
    g.lineWidth = 2;
    for (let x = 0; x <= 1024; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(1024, y);
      g.stroke();
    }
    return toTex(c);
  });
}
