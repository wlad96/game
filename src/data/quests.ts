import type { QuestDef } from './types';

/**
 * Quests are data (TZ §54). The engine in store/questEngine.ts advances them
 * from generic events, so new quests need no new code.
 */
export const QUESTS: QuestDef[] = [
  {
    id: 'rio_energy_01',
    city: 'rio',
    type: 'story',
    title: 'Energy of Rio',
    description: 'The Rio energy network is down. Restore the three Energy Beacons.',
    giver: 'technician',
    objectives: [
      { id: 'find1', type: 'reach', target: 'beacon1', label: 'Find Beacon #1 on the beach promenade', poi: 'beacon1' },
      { id: 'act1', type: 'activate', target: 'beacon1', label: 'Activate Beacon #1', poi: 'beacon1' },
      { id: 'act2', type: 'activate', target: 'beacon2', label: 'Climb the rooftops across the avenue to Beacon #2', poi: 'beacon2' },
      { id: 'find3', type: 'reach', target: 'beacon3', label: 'Reach Beacon #3 at the Cable Car Station', poi: 'beacon3' },
      { id: 'puzzle3', type: 'puzzle', target: 'beacon3', label: 'Reconnect the energy network', poi: 'beacon3' },
      { id: 'report', type: 'talk', target: 'technician', label: 'Report to the Rio Technician', poi: 'technician' },
    ],
    reward: {
      xp: 500,
      energy: 250,
      cityXp: 300,
      cityProgress: 5,
      items: [{ id: 'rio_energy_crystal' }],
    },
    lore: 'With the beacons restored the whole city glows again. The crystal remembers a path up the mountain…',
  },
  {
    id: 'rio_daily_orbs',
    city: 'rio',
    type: 'daily',
    repeat: 'daily',
    title: 'Orb Hunter',
    description: 'Energy Orbs float all around Rio. Collect 10 of them.',
    objectives: [{ id: 'orbs', type: 'collect', target: 'orb', count: 10, label: 'Collect Energy Orbs' }],
    reward: { xp: 50, energy: 100, cityXp: 40 },
  },
  {
    id: 'rio_daily_viewpoints',
    city: 'rio',
    type: 'daily',
    repeat: 'daily',
    title: 'Postcards from Rio',
    description: 'Visit three viewpoints: the beach lookout, the rooftops and the cable station roof.',
    objectives: [{ id: 'views', type: 'visit', target: 'viewpoint', count: 3, label: 'Visit viewpoints' }],
    reward: { xp: 80, energy: 60, cityXp: 40, items: [{ id: 'rio_decoration' }] },
  },
  {
    id: 'rio_secrets',
    city: 'rio',
    type: 'secret',
    title: 'Secrets of the Rooftops',
    description: 'Five Golden Sai Tokens are hidden around Rio. Explore every corner.',
    objectives: [{ id: 'tokens', type: 'collect', target: 'sai_token', count: 5, label: 'Find Golden Sai Tokens' }],
    reward: { xp: 300, energy: 200, cityXp: 150, cityProgress: 5 },
  },
  {
    id: 'rio_story_02',
    city: 'rio',
    type: 'story',
    title: 'Secret on the Mountain',
    description: 'The Energy Crystal points towards the mountain. Climb the floating path above the Cable Station.',
    requires: ['rio_energy_01'],
    requiresFlag: 'crystalPlaced',
    objectives: [
      { id: 'summit', type: 'reach', target: 'summit', label: 'Climb to the mountain summit', poi: 'summit' },
      { id: 'artifact', type: 'collect', target: 'ancient_artifact', label: 'Take the Strange Artifact', poi: 'summit' },
      { id: 'decode', type: 'puzzle', target: 'artifact_station', label: 'Decode it at the Artifact Station (apartment)', poi: 'apartment' },
    ],
    reward: {
      xp: 400,
      energy: 150,
      cityXp: 250,
      cityProgress: 5,
      items: [{ id: 'restored_artifact' }, { id: 'skin_explorer' }],
    },
    lore: 'The relic shows Sai’s first landing on Earth — and a second signal, far to the south, in Buenos Aires…',
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id)!;
