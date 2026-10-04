import { describe, expect, it } from 'vitest';
import { QUESTS, questById } from '../data/quests';
import { addXp, applyQuestEvent, isQuestAvailable, xpToNext, type QuestStates } from './questEngine';

describe('quest engine', () => {
  it('walks the Energy of Rio story in order', () => {
    let quests: QuestStates = { rio_energy_01: { status: 'active', step: 0, count: 0 } };
    const steps = [
      { type: 'reach', target: 'beacon1' },
      { type: 'activate', target: 'beacon1' },
      { type: 'activate', target: 'beacon2' },
      { type: 'reach', target: 'beacon3' },
      { type: 'puzzle', target: 'beacon3' },
    ] as const;
    for (const ev of steps) {
      const r = applyQuestEvent(QUESTS, quests, ev);
      expect(r.advanced).toEqual(['rio_energy_01']);
      quests = r.quests;
    }
    const done = applyQuestEvent(QUESTS, quests, { type: 'talk', target: 'technician' });
    expect(done.completed).toEqual(['rio_energy_01']);
    expect(done.quests.rio_energy_01.status).toBe('completed');
  });

  it('ignores events for objectives that are not current', () => {
    const quests: QuestStates = { rio_energy_01: { status: 'active', step: 0, count: 0 } };
    const r = applyQuestEvent(QUESTS, quests, { type: 'activate', target: 'beacon2' });
    expect(r.quests).toEqual(quests);
    expect(r.advanced).toHaveLength(0);
  });

  it('counts collect objectives', () => {
    let quests: QuestStates = { rio_daily_orbs: { status: 'active', step: 0, count: 0 } };
    for (let i = 0; i < 9; i++) quests = applyQuestEvent(QUESTS, quests, { type: 'collect', target: 'orb' }).quests;
    expect(quests.rio_daily_orbs).toEqual({ status: 'active', step: 0, count: 9 });
    const r = applyQuestEvent(QUESTS, quests, { type: 'collect', target: 'orb' });
    expect(r.completed).toEqual(['rio_daily_orbs']);
  });

  it('gates chapter 2 behind chapter 1 and the placed crystal', () => {
    const def = questById('rio_story_02');
    expect(isQuestAvailable(def, { quests: {}, flags: {} })).toBe(false);
    const done: QuestStates = { rio_energy_01: { status: 'completed', step: 6, count: 0 } };
    expect(isQuestAvailable(def, { quests: done, flags: {} })).toBe(false);
    expect(isQuestAvailable(def, { quests: done, flags: { crystalPlaced: true } })).toBe(true);
  });

  it('rolls XP over multiple levels', () => {
    const r = addXp(1, 0, xpToNext(1) + xpToNext(2) + 10);
    expect(r).toEqual({ level: 3, xp: 10, levelsGained: [2, 3] });
  });

  it('every quest objective has a label and positive count', () => {
    for (const q of QUESTS) for (const o of q.objectives) expect(o.label.length > 0 && (o.count ?? 1) > 0).toBe(true);
  });
});
