export type KitId = 'city' | 'roads' | 'cars' | 'nature' | 'boats' | 'people' | 'suburb' | 'space' | 'platformer';
// Hosts that don't serve .glb files get the kits embedded as data URIs.
const models = import.meta.glob('../../../public/models/*/*.glb', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const maps = import.meta.glob('../../../public/models/city/Textures/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
export const kitModelUrl = (kit: KitId, name: string) => models[`../../../public/models/${kit}/${name}.glb`];
export const kitPaletteUrl = (name: string) => maps[`../../../public/models/city/Textures/${name}.png`];
