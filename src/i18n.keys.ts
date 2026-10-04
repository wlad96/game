import { PORTALS, SEASON } from './data/cities';
import { ITEMS, SKINS } from './data/items';
import { QUESTS } from './data/quests';
import { ROOM_LEVELS } from './data/room';
import { HOME_POIS } from './game/scenes/homeLayout';
import { RIO_FAST_TRAVEL_POINTS, RIO_POIS, RIO_VIEWPOINTS, RIO_ZONES } from './game/scenes/rioLayout';

/** Every data-driven string the UI passes through tr(). Used by the i18n coverage test. */
export function dataKeys(): string[] {
  const k: string[] = [SEASON.name];
  for (const q of QUESTS) {
    k.push(q.title, q.description, q.type, q.city);
    if (q.lore) k.push(q.lore);
    for (const o of q.objectives) k.push(o.label);
  }
  for (const i of ITEMS) k.push(i.name, i.description, i.rarity, i.category);
  for (const s of SKINS) k.push(s.name, s.source);
  for (const p of PORTALS) k.push(p.name, p.country, p.tagline, p.description, ...p.rewards);
  for (const z of RIO_ZONES) k.push(z.name);
  for (const p of RIO_POIS) k.push(p.label, ...(p.description ? [p.description] : []));
  for (const f of RIO_FAST_TRAVEL_POINTS) k.push(f.name);
  for (const v of RIO_VIEWPOINTS) k.push(v.name);
  for (const l of ROOM_LEVELS) k.push(l.name);
  for (const h of HOME_POIS) k.push(h.label);
  return k;
}
