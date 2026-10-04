/** City kit model + palette URLs. The `artifact` build swaps this for cityModelUrls.inline.ts. */
const base = `${import.meta.env.BASE_URL}models/city/`;
export const cityModelUrl = (name: string) => `${base}${name}.glb`;
/** Kenney colour palettes; buildings alternate between them. */
export const PALETTE_URLS: string[] = [`${base}Textures/variation-a.png`, `${base}Textures/variation-b.png`];
