import { questById } from '../data/quests';
import { HOME_PORTALS } from '../game/scenes/homeLayout';
import { poiById } from '../game/scenes/rioLayout';
import { tr } from '../i18n';
import { activeObjective, type GameState } from '../store/gameStore';

/** What the player should do right now, and where (in the current scene). */
export interface Goal {
  eyebrow: string;
  text: string;
  icon: string;
  pos: [number, number, number] | null;
  /** Gold for story, cyan for navigation/side goals. */
  tone: 'story' | 'side' | 'nav';
}

const ROOM = {
  shelf: [7, 0.8, 0] as [number, number, number],
  station: [-6, 0.8, 3.6] as [number, number, number],
  door: [0, 0.8, 5.2] as [number, number, number],
};

function rioPortalSpot(): [number, number, number] {
  const p = HOME_PORTALS.find((h) => h.city === 'rio')!;
  return [p.x + Math.sin(p.yaw) * 2, 0, p.z + Math.cos(p.yaw) * 2];
}

export function currentGoal(s: GameState): Goal | null {
  const tracked = s.trackedQuest && s.quests[s.trackedQuest]?.status === 'active' ? s.trackedQuest : Object.keys(s.quests).find((k) => s.quests[k].status === 'active');
  const obj = tracked ? activeObjective(s, tracked) : undefined;
  const def = tracked ? questById(tracked) : undefined;
  const crystalToPlace = (s.inventory.rio_energy_crystal ?? 0) > 0 && !s.flags.crystalPlaced;
  const storyNotStarted = !s.quests.rio_energy_01;
  const eyebrow = def ? `${tr(def.type === 'story' ? 'Story' : def.type === 'daily' ? 'Daily' : 'Quest')} · ${tr(def.title)}` : '';
  const tone = def?.type === 'story' ? 'story' : 'side';

  if (s.scene === 'home') {
    if (!s.flags.visitedRio || storyNotStarted)
      return { eyebrow: tr('Your first trip'), text: tr('Go to the glowing Rio portal and press E'), icon: '🌀', pos: rioPortalSpot(), tone: 'nav' };
    if (crystalToPlace)
      return { eyebrow: tr('Story'), text: tr('Use the Home Portal to go to your apartment'), icon: '🏠', pos: [-24, 0, 24], tone: 'story' };
    if (obj && def?.city === 'rio')
      return { eyebrow, text: tr('Travel to Rio: {task}', { task: tr(obj.label) }), icon: '🌀', pos: rioPortalSpot(), tone };
    return null;
  }

  if (s.scene === 'gallery') return null;

  if (s.scene === 'rio-room') {
    if (crystalToPlace) return { eyebrow: tr('Story'), text: tr('Put the Energy Crystal on the Trophy Shelf'), icon: '💎', pos: ROOM.shelf, tone: 'story' };
    if (obj?.target === 'artifact_station') return { eyebrow, text: tr(obj.label), icon: '🔮', pos: ROOM.station, tone };
    if (obj) return { eyebrow, text: tr('Go back to the city: {task}', { task: tr(obj.label) }), icon: '🚪', pos: ROOM.door, tone };
    return null;
  }

  // Rio
  if (storyNotStarted) {
    const p = poiById('technician')!;
    return { eyebrow: tr('Story'), text: tr('Talk to the Rio Technician'), icon: '💬', pos: [p.x, p.y, p.z], tone: 'story' };
  }
  if (crystalToPlace) {
    const p = poiById('apartment')!;
    return { eyebrow: tr('Story'), text: tr('Take the Energy Crystal home to your apartment'), icon: '🏠', pos: [p.x, p.y, p.z], tone: 'story' };
  }
  if (obj) {
    const poiId = obj.target === 'artifact_station' ? 'apartment' : obj.poi;
    const p = poiId ? poiById(poiId) : undefined;
    const count = obj.count && obj.count > 1 ? ` · ${s.quests[tracked!].count}/${obj.count}` : '';
    return { eyebrow, text: tr(obj.label) + count, icon: def?.type === 'daily' ? '☀️' : '⚡', pos: p ? [p.x, p.y, p.z] : null, tone };
  }
  return null;
}
