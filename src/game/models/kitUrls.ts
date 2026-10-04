/** Kenney kit model + palette URLs. The `artifact` build swaps this for kitUrls.inline.ts. */
export type KitId = 'city' | 'roads' | 'cars' | 'nature' | 'boats' | 'people' | 'suburb';
const base = `${import.meta.env.BASE_URL}models/`;
export const kitModelUrl = (kit: KitId, name: string) => `${base}${kit}/${name}.glb`;
/** City-kit colour palettes (Textures/<name>.png). */
export const kitPaletteUrl = (name: string) => `${base}city/Textures/${name}.png`;
