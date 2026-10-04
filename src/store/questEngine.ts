import type { QuestDef, QuestEvent } from '../data/types';

export interface QuestState {
  status: 'active' | 'completed';
  /** Index of the current objective. */
  step: number;
  /** Progress inside the current objective. */
  count: number;
}

export type QuestStates = Record<string, QuestState>;

export interface QuestContext {
  quests: QuestStates;
  flags: Record<string, boolean>;
}

/** Can the quest be accepted right now? */
export function isQuestAvailable(def: QuestDef, ctx: QuestContext): boolean {
  if (ctx.quests[def.id]) return false;
  if (def.requires?.some((id) => ctx.quests[id]?.status !== 'completed')) return false;
  if (def.requiresFlag && !ctx.flags[def.requiresFlag]) return false;
  return true;
}

export function currentObjective(def: QuestDef, state: QuestState | undefined) {
  if (!state || state.status !== 'active') return undefined;
  return def.objectives[state.step];
}

export interface ApplyResult {
  quests: QuestStates;
  /** Quests whose objective advanced (but did not complete). */
  advanced: string[];
  /** Quests that were completed by this event. */
  completed: string[];
  /** Quests whose counter moved inside the same objective. */
  progressed: string[];
}

/** Pure reducer: feed a gameplay event to every active quest. */
export function applyQuestEvent(defs: QuestDef[], quests: QuestStates, ev: QuestEvent): ApplyResult {
  const next: QuestStates = { ...quests };
  const result: ApplyResult = { quests: next, advanced: [], completed: [], progressed: [] };
  for (const def of defs) {
    const state = quests[def.id];
    const obj = currentObjective(def, state);
    if (!state || !obj) continue;
    if (obj.type !== ev.type || obj.target !== ev.target) continue;
    const need = obj.count ?? 1;
    const count = state.count + (ev.amount ?? 1);
    if (count < need) {
      next[def.id] = { ...state, count };
      result.progressed.push(def.id);
      continue;
    }
    const step = state.step + 1;
    if (step >= def.objectives.length) {
      next[def.id] = { status: 'completed', step, count: 0 };
      result.completed.push(def.id);
    } else {
      next[def.id] = { status: 'active', step, count: 0 };
      result.advanced.push(def.id);
    }
  }
  return result;
}

/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number) => 200 + level * 100;

/** Add XP and roll over levels. */
export function addXp(level: number, xp: number, gained: number) {
  let l = level;
  let x = xp + gained;
  const levelsGained: number[] = [];
  while (x >= xpToNext(l)) {
    x -= xpToNext(l);
    l += 1;
    levelsGained.push(l);
  }
  return { level: l, xp: x, levelsGained };
}
