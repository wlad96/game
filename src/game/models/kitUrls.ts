/** Kenney kit model + palette URLs. The `artifact` build swaps this for kitUrls.inline.ts. */
export type KitId = 'city' | 'roads' | 'cars' | 'nature' | 'boats' | 'people' | 'suburb' | 'space' | 'platformer';
const base = `${import.meta.env.BASE_URL}models/`;
export const kitModelUrl = (kit: KitId, name: string) => `${base}${kit}/${name}.glb`;
/** Kit colour palettes (models/city/Textures/<name>.png): Rio city palettes and the Sai platformer palette. */
export const kitPaletteUrl = (name: string) => `${base}city/Textures/${name}.png`;
