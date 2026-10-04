import { QUESTS } from '../data/quests';
import type { CityId } from '../data/types';
import type { QuestStates } from './questEngine';

export interface CityProgress {
  percent: number;
  storyDone: number;
  storyTotal: number;
  questsDone: number;
  questsTotal: number;
  secrets: number;
  secretsTotal: number;
  viewpoints: number;
  viewpointsTotal: number;
  fastTravel: number;
  fastTravelTotal: number;
  artifact: boolean;
  completed: boolean;
}

export const RIO_SECRETS = ['token1', 'token2', 'token3', 'token4', 'token5'];
export const RIO_VIEWPOINTS = ['pier', 'favela', 'cable'];
export const RIO_FAST_TRAVEL = ['plaza', 'beach', 'favela', 'cable', 'apartment'];

interface Input {
  quests: QuestStates;
  collected: Record<string, boolean>;
  flags: Record<string, boolean>;
  fastTravel: string[];
}

/** Passport / completion rules (TZ §30–31). */
export function cityProgress(city: CityId, s: Input): CityProgress {
  if (city !== 'rio') {
    return {
      percent: 0,
      storyDone: 0,
      storyTotal: 0,
      questsDone: 0,
      questsTotal: 0,
      secrets: 0,
      secretsTotal: 0,
      viewpoints: 0,
      viewpointsTotal: 0,
      fastTravel: 0,
      fastTravelTotal: 0,
      artifact: false,
      completed: false,
    };
  }
  const cityQuests = QUESTS.filter((q) => q.city === city);
  const story = cityQuests.filter((q) => q.type === 'story');
  const storyDone = story.filter((q) => s.quests[q.id]?.status === 'completed').length;
  const questsDone = cityQuests.filter((q) => s.quests[q.id]?.status === 'completed' || s.flags[`done:${q.id}`]).length;
  const secrets = RIO_SECRETS.filter((t) => s.collected[`secret:${t}`]).length;
  const viewpoints = RIO_VIEWPOINTS.filter((v) => s.flags[`vpever:${v}`]).length;
  const fastTravel = RIO_FAST_TRAVEL.filter((f) => s.fastTravel.includes(f)).length;
  const artifact = s.quests['rio_story_02']?.status === 'completed';

  const exploration =
    (secrets / RIO_SECRETS.length) * 0.4 +
    (viewpoints / RIO_VIEWPOINTS.length) * 0.3 +
    (fastTravel / RIO_FAST_TRAVEL.length) * 0.3;

  const percent = Math.round((storyDone / story.length) * 50 + exploration * 40 + (artifact ? 10 : 0));
  const completed = storyDone === story.length && exploration >= 0.7 && artifact;
  return {
    percent,
    storyDone,
    storyTotal: story.length,
    questsDone,
    questsTotal: cityQuests.length,
    secrets,
    secretsTotal: RIO_SECRETS.length,
    viewpoints,
    viewpointsTotal: RIO_VIEWPOINTS.length,
    fastTravel,
    fastTravelTotal: RIO_FAST_TRAVEL.length,
    artifact,
    completed,
  };
}

/** City level derived from city XP. */
export const cityLevel = (xp: number) => 1 + Math.floor(xp / 150);

/** Community progress (TZ §40). Global number would come from the backend. */
export const COMMUNITY_GOAL = 1_000_000;
export const COMMUNITY_BASE = 718_420;
