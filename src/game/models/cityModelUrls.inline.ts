// Hosts that don't serve .glb files get the city kit embedded as data URIs.
const models = import.meta.glob('../../../public/models/city/*.glb', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const maps = import.meta.glob('../../../public/models/city/Textures/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
export const cityModelUrl = (name: string) => models[`../../../public/models/city/${name}.glb`];
export const PALETTE_URLS: string[] = Object.keys(maps)
  .sort()
  .map((k) => maps[k]);
