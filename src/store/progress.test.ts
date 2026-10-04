import { describe, expect, it } from 'vitest';
import { cityProgress } from './progress';
import { cityAccess } from '../services/nftAccess';

describe('passport progress', () => {
  it('starts at zero', () => {
    const p = cityProgress('rio', { quests: {}, collected: {}, flags: {}, fastTravel: [] });
    expect(p.percent).toBe(0);
    expect(p.completed).toBe(false);
  });

  it('awards the stamp only with story + 70% exploration + artifact', () => {
    const quests = {
      rio_energy_01: { status: 'completed' as const, step: 6, count: 0 },
      rio_story_02: { status: 'completed' as const, step: 3, count: 0 },
    };
    const almost = cityProgress('rio', { quests, collected: {}, flags: {}, fastTravel: ['plaza'] });
    expect(almost.completed).toBe(false);
    const full = cityProgress('rio', {
      quests,
      collected: { 'secret:token1': true, 'secret:token2': true, 'secret:token3': true, 'secret:token4': true },
      flags: { 'vpever:pier': true, 'vpever:favela': true, 'vpever:cable': true },
      fastTravel: ['plaza', 'beach', 'favela', 'cable'],
    });
    expect(full.completed).toBe(true);
    expect(full.percent).toBeGreaterThanOrEqual(90);
  });
});

describe('NFT access', () => {
  it('never hard-locks Rio for visitors', () => {
    expect(cityAccess('rio', [])).toBe('visitor');
    expect(cityAccess('rio', ['sai-city-rio'])).toBe('full');
  });
});
