import type { ItemDef, SkinDef } from './types';

export const ITEMS: ItemDef[] = [
  // Quest items / artifacts / trophies
  {
    id: 'rio_energy_crystal',
    name: 'Rio Energy Crystal',
    category: 'trophy',
    icon: '💎',
    rarity: 'epic',
    description: 'The heart of the restored Rio energy network. Place it on your Trophy Shelf.',
  },
  {
    id: 'ancient_artifact',
    name: 'Strange Artifact',
    category: 'artifact',
    icon: '🔮',
    rarity: 'rare',
    description: 'Found on the mountain summit. Decode it at the Artifact Station in your apartment.',
  },
  {
    id: 'restored_artifact',
    name: 'Restored Sai Relic',
    category: 'trophy',
    icon: '🏺',
    rarity: 'epic',
    description: 'An ancient Sai relic. It hums with the memory of the first voyage to Earth.',
  },
  {
    id: 'sai_token',
    name: 'Golden Sai Token',
    category: 'collectible',
    icon: '🪙',
    rarity: 'rare',
    description: 'Hidden secrets of Rio. Collect all five.',
  },
  {
    id: 'carnival_mask',
    name: 'Carnival Mask',
    category: 'trophy',
    icon: '🎭',
    rarity: 'legendary',
    description: 'NFT holder trophy from the Carnival Rooftop.',
    nftOnly: true,
  },
  // Furniture
  { id: 'sofa', name: 'Cloud Sofa', category: 'furniture', icon: '🛋️', rarity: 'common', price: 120, description: 'Soft as Sai’s home planet clouds.' },
  { id: 'plant', name: 'Tropical Plant', category: 'furniture', icon: '🪴', rarity: 'common', price: 60, description: 'A small piece of Rio jungle.' },
  { id: 'lamp', name: 'Energy Lamp', category: 'furniture', icon: '💡', rarity: 'common', price: 80, description: 'Glows with cyan Sai energy.' },
  { id: 'rug', name: 'Copacabana Rug', category: 'furniture', icon: '🟫', rarity: 'common', price: 90, description: 'The famous wave pattern, under your feet.' },
  { id: 'rio_decoration', name: 'Redeemer Statuette', category: 'furniture', icon: '🗽', rarity: 'rare', description: 'Daily quest reward. A tiny guardian for your room.' },
  { id: 'arcade', name: 'Retro Arcade', category: 'furniture', icon: '🕹️', rarity: 'rare', price: 260, description: 'For long nights between expeditions.' },
  // Pets
  { id: 'pet_drone', name: 'Mini Drone', category: 'pet', icon: '🛸', rarity: 'rare', price: 250, description: 'Follows Sai and beeps when an Energy Orb is nearby.' },
  { id: 'pet_orb', name: 'Energy Orb', category: 'pet', icon: '🔵', rarity: 'common', price: 150, description: 'A friendly ball of pure energy.' },
  // Vehicles
  { id: 'hoverboard', name: 'Skateboard', category: 'vehicle', icon: '🛹', rarity: 'rare', price: 400, description: 'Press F to ride. Faster travel through the city.' },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

/** One skeleton, many materials (TZ §27). */
export const SKINS: SkinDef[] = [
  { id: 'classic', name: 'Classic Sai', suit: '#efe6d6', trim: '#d9b26a', gloves: '#1d2f6b', head: '#d8c3a0', visor: '#c9a35a', source: 'Default' },
  { id: 'ocean', name: 'Ocean Sai', suit: '#d6f1f5', trim: '#27b5c9', gloves: '#0d5c7a', head: '#bfe3e8', visor: '#3fd0e0', price: 250, source: 'Shop' },
  { id: 'cyber', name: 'Cyber Sai', suit: '#2a2f45', trim: '#36e3ff', gloves: '#111522', head: '#4a5068', visor: '#36e3ff', emissive: '#36e3ff', price: 450, source: 'Shop' },
  { id: 'golden', name: 'Golden Sai', suit: '#f3d27a', trim: '#fff1b8', gloves: '#8a5a12', head: '#e8c66a', visor: '#fff0a6', emissive: '#ffcf4a', price: 900, minLevel: 4, source: 'Shop · Level 4' },
  { id: 'explorer', name: 'Explorer Sai', suit: '#c9b48a', trim: '#e07a2f', gloves: '#5a3a1e', head: '#cdb894', visor: '#e07a2f', source: 'Story: Secret on the Mountain' },
  { id: 'rio', name: 'Rio Sai', suit: '#ffe066', trim: '#1fa95b', gloves: '#1a4fa0', head: '#f2d27a', visor: '#1fa95b', source: 'Rio NFT holders', nftOnly: true },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];

export const RARITY_COLOR: Record<string, string> = {
  common: '#9fb4d0',
  rare: '#4fc3ff',
  epic: '#b57bff',
  legendary: '#ffc94a',
};
