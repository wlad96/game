export type CityId = 'rio' | 'buenos-aires' | 'lima' | 'santiago' | 'bogota';

/** Scenes that can be mounted. Only one is alive at a time (see App.tsx). */
export type SceneId = 'home' | 'rio' | 'rio-room' | 'gallery';

export type QuestType =
  | 'story'
  | 'daily'
  | 'weekly'
  | 'exploration'
  | 'parkour'
  | 'puzzle'
  | 'collect'
  | 'delivery'
  | 'race'
  | 'secret'
  | 'community';

export type ObjectiveType = 'talk' | 'reach' | 'activate' | 'puzzle' | 'collect' | 'visit' | 'place';

export interface Objective {
  id: string;
  type: ObjectiveType;
  /** Matched against QuestEvent.target. */
  target: string;
  /** How many matching events are required (defaults to 1). */
  count?: number;
  label: string;
  /** Map POI to highlight while this objective is current. */
  poi?: string;
}

export interface RewardItem {
  id: string;
  count?: number;
}

export interface Reward {
  xp?: number;
  energy?: number;
  cityXp?: number;
  items?: RewardItem[];
  /** Displayed as "City Progress +N%". */
  cityProgress?: number;
}

export interface QuestDef {
  id: string;
  city: CityId;
  type: QuestType;
  title: string;
  description: string;
  giver?: string;
  objectives: Objective[];
  reward: Reward;
  /** Quest ids that must be completed first. */
  requires?: string[];
  /** Progress flag that must be set first. */
  requiresFlag?: string;
  repeat?: 'daily' | 'weekly';
  /** Lore text unlocked on completion. */
  lore?: string;
}

export interface QuestEvent {
  type: ObjectiveType;
  target: string;
  amount?: number;
}

export type ItemCategory =
  | 'quest'
  | 'artifact'
  | 'furniture'
  | 'cosmetic'
  | 'pet'
  | 'vehicle'
  | 'collectible'
  | 'trophy';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  rarity: Rarity;
  description: string;
  /** SAI Energy price in the shop. Undefined = not sold. */
  price?: number;
  /** Account level needed to buy. */
  minLevel?: number;
  nftOnly?: boolean;
}

export interface SkinDef {
  id: string;
  name: string;
  suit: string;
  trim: string;
  gloves: string;
  head: string;
  visor: string;
  emissive?: string;
  price?: number;
  minLevel?: number;
  source: string;
  nftOnly?: boolean;
}

export interface PortalDef {
  city: CityId;
  name: string;
  country: string;
  requiresNFT: boolean;
  visitorAccess: boolean;
  scene: SceneId | null;
  status: 'open' | 'soon';
  tagline: string;
  description: string;
  dailyQuests: number;
  rewards: string[];
  art: CityArt;
}

export interface CityArt {
  sky: [string, string];
  ground: string;
  accent: string;
  landmark: 'redeemer' | 'obelisk' | 'cathedral' | 'towers' | 'monserrate';
}
