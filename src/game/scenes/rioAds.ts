import adsConfig from '../../data/ads.json';
import { buildRioBuildings, footprint, type Placement } from './cityKit';
import { ROUTE_BUILDINGS, SIDE_STREETS, STATION, STREET } from './rioLayout';

/**
 * Advertising spots in Rio. Each spot shows the client's picture
 * (src/assets/ads/<code>.webp|png|jpg) and card (src/data/ads.json → ads[code]),
 * or a "your ad here" placeholder while it is free.
 */
export type AdKind = 'rooftop' | 'facade' | 'citylight' | 'beach' | 'screen' | 'blimp';

export interface AdSlot {
  code: string;
  kind: AdKind;
  /** What the spot is, for the card. */
  name: string;
  /** Size of the picture in metres. */
  w: number;
  h: number;
  /** Centre of the picture and the direction it faces (yaw, normal = (sin, cos)). */
  pos: [number, number, number];
  rot: number;
  /** Where the player stands to open the card (none for the blimp). */
  use?: [number, number, number];
  /** Height of the structure under the picture (rooftop legs, posts). */
  base?: number;
}

export interface AdContent {
  advertiser?: string;
  title?: string;
  text?: string;
  url?: string;
  promo?: string;
}

export const AD_CONTACT: { email?: string; telegram?: string; site?: string } = adsConfig.contact;
export const AD_CONTENT: Record<string, AdContent> = adsConfig.ads;

const images = import.meta.glob('../../assets/ads/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
/** The client's picture for a spot, if one was uploaded. */
export function adImage(code: string): string | undefined {
  const k = Object.keys(images).find((p) => p.slice(p.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') === code);
  return k ? images[k] : undefined;
}

/** Row A (the avenue frontage) buildings we may put billboards on: not the quest route, not the apartment. */
function frontage(): Placement[] {
  const route = ROUTE_BUILDINGS.map((b) => b.x);
  return buildRioBuildings().filter(
    (p) =>
      p.kit === 'city' &&
      p.solid &&
      p.z > STREET.backFront &&
      Math.abs(p.x + 60) > 14 && // apartment
      !route.some((x) => Math.abs(p.x - x) < 10) &&
      ![SIDE_STREETS.carnival, SIDE_STREETS.tower].some(([a, b]) => p.x > a - 12 && p.x < b + 12),
  );
}

export function buildAdSlots(): AdSlot[] {
  const row = frontage();
  const slots: AdSlot[] = [];
  const used = new Set<Placement>();

  // F-1: a big portrait wrap on the tallest wide tower of the avenue
  const tower = row.filter((p) => footprint(p).w >= 10).sort((a, b) => footprint(b).h - footprint(a).h)[0];
  if (tower) {
    used.add(tower);
    const { w, h } = footprint(tower);
    const bw = Math.min(10, w - 1.5);
    const bh = bw * 1.25;
    slots.push({ code: 'F-1', kind: 'facade', name: 'Facade banner · Avenida Atlântica', w: bw, h: bh, pos: [tower.x, Math.min(h - bh / 2 - 2, 8 + bh / 2), STREET.front + 0.12], rot: 0, use: [tower.x, 0, STREET.front + 2.5] });
  }

  // R-1..R-4: rooftop billboards spread along the avenue, on buildings wide enough to carry them
  const targets = [-148, -43, 22, 93];
  targets.forEach((tx, i) => {
    const p = row.filter((b) => !used.has(b) && footprint(b).w >= 9).sort((a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx))[0];
    if (!p) return;
    used.add(p);
    const { w, h, d } = footprint(p);
    const bw = Math.min(16, w - 1);
    const bh = bw * 0.42;
    const base = 2.2;
    slots.push({ code: `R-${i + 1}`, kind: 'rooftop', name: 'Rooftop billboard · Avenida Atlântica', w: bw, h: bh, pos: [p.x, h + base + bh / 2, STREET.front - Math.min(4, d / 3)], rot: 0, use: [p.x, 0, STREET.front + 2.5], base });
  });

  // C-1..C-4: lit two-sided city-light panels on the promenade (between the palms)
  [-105, -30, 60, 105].forEach((x, i) =>
    slots.push({ code: `C-${i + 1}`, kind: 'citylight', name: 'City-light · Copacabana Promenade', w: 1.8, h: 2.6, pos: [x, 2.1, STREET.roadS[1] + 2.8], rot: 0, use: [x, 0, STREET.roadS[1] + 4.6], base: 0.8 }),
  );

  // B-1, B-2: large banners on the sand, facing the promenade
  [-70, 45].forEach((x, i) =>
    slots.push({ code: `B-${i + 1}`, kind: 'beach', name: 'Beach banner · Copacabana Beach', w: 14, h: 4, pos: [x, 4.4, STREET.beach + 7], rot: Math.PI, use: [x, 0, STREET.beach - 1], base: 2.4 }),
  );

  // S-1: LED screen on the cable-car station roof, facing the street
  slots.push({
    code: 'S-1',
    kind: 'screen',
    name: 'LED screen · Cable Car Station',
    w: 7.4,
    h: 4.2,
    pos: [STATION.x - STATION.w / 2 + 4.2, STATION.h + 1.4 + 2.1, STATION.z - STATION.d / 2 + 2],
    rot: 0,
    use: [STATION.x - STATION.w / 2 + 4.2, STATION.h, STATION.z + 1],
    base: 1.4,
  });

  // Z-1: the blimp over the beach (both sides)
  slots.push({ code: 'Z-1', kind: 'blimp', name: 'Blimp over Copacabana', w: 18, h: 5, pos: [0, 46, STREET.beach + 45], rot: 0 });
  return slots;
}

export const AD_SLOTS = buildAdSlots();
export const adByCode = (code: string) => AD_SLOTS.find((s) => s.code === code);
