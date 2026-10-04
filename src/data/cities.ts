import type { CityId, PortalDef } from './types';

/** Portal definitions (TZ §55). Data, not code: add a city by adding an entry. */
export const PORTALS: PortalDef[] = [
  {
    city: 'rio',
    name: 'Rio de Janeiro',
    country: 'Brazil',
    requiresNFT: true,
    visitorAccess: true,
    scene: 'rio',
    status: 'open',
    tagline: 'City of energy, beaches and hills',
    description:
      'A stylized, futuristic Rio. The city energy grid has failed — the beacons on the square, the favela rooftops and the cable station are dark.',
    dailyQuests: 2,
    rewards: ['Rio Energy Crystal', 'Rio Decoration', 'Passport Stamp'],
    art: { sky: ['#ffb36b', '#3a7bd5'], ground: '#1f6f78', accent: '#ffd36b', landmark: 'redeemer' },
  },
  {
    city: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    requiresNFT: true,
    visitorAccess: true,
    scene: null,
    status: 'soon',
    tagline: 'Tango streets and wide avenues',
    description: 'Opens later in the South America season.',
    dailyQuests: 0,
    rewards: ['Obelisk Trophy'],
    art: { sky: ['#ffd1a1', '#5b7fd6'], ground: '#5a6d8a', accent: '#9fd3ff', landmark: 'obelisk' },
  },
  {
    city: 'lima',
    name: 'Lima',
    country: 'Peru',
    requiresNFT: true,
    visitorAccess: false,
    scene: null,
    status: 'soon',
    tagline: 'Cliffs above the Pacific',
    description: 'Opens later in the South America season.',
    dailyQuests: 0,
    rewards: ['Andean Artifact'],
    art: { sky: ['#f6c38b', '#7a8fb8'], ground: '#a07a50', accent: '#ffe08a', landmark: 'cathedral' },
  },
  {
    city: 'santiago',
    name: 'Santiago',
    country: 'Chile',
    requiresNFT: true,
    visitorAccess: true,
    scene: null,
    status: 'soon',
    tagline: 'Skyline under the Andes',
    description: 'Opens later in the South America season.',
    dailyQuests: 0,
    rewards: ['Andes Hoverboard Skin'],
    art: { sky: ['#ffc6a8', '#4f6fb8'], ground: '#40506a', accent: '#c6e4ff', landmark: 'towers' },
  },
  {
    city: 'bogota',
    name: 'Bogotá',
    country: 'Colombia',
    requiresNFT: true,
    visitorAccess: false,
    scene: null,
    status: 'soon',
    tagline: 'Mountain capital of colour',
    description: 'Opens later in the South America season.',
    dailyQuests: 0,
    rewards: ['Monserrate Lantern'],
    art: { sky: ['#ffd9a0', '#3f8f7a'], ground: '#3d6b4a', accent: '#ffe7a3', landmark: 'monserrate' },
  },
];

export const portalByCity = (city: CityId) => PORTALS.find((p) => p.city === city)!;

/** NFT contract → city access mapping (TZ §7). Resolved by the backend in production. */
export const NFT_COLLECTIONS: Record<string, CityId> = {
  'sai-city-rio': 'rio',
  'sai-city-buenos-aires': 'buenos-aires',
  'sai-city-lima': 'lima',
  'sai-city-santiago': 'santiago',
  'sai-city-bogota': 'bogota',
};

export const SEASON = {
  id: 'season-1-south-america',
  name: 'South America Season',
  endsAt: '2026-12-31T23:59:59Z',
};
