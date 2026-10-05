/**
 * Uploaded artwork: NFT images for the gallery and custom portal pictures.
 * Originals go to `art/`; resized copies live in `src/assets/{nft,portals}`
 * and are picked up here automatically (any number of files).
 */
const nftFiles = import.meta.glob('../assets/nft/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
// optional captions: { "07-sao-paulo": "São Paulo" }
const nameFiles = import.meta.glob('../assets/nft/names.json', { eager: true, import: 'default' }) as Record<string, Record<string, string>>;
const captions: Record<string, string> = Object.values(nameFiles)[0] ?? {};
const portalFiles = import.meta.glob('../assets/portals/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;

const base = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');

export interface NftArt {
  id: string;
  /** Caption: the file name without its leading number. */
  name: string;
  url: string | null;
  /** 1-based position in the collection. */
  n: number;
}

/** "007 Sai Astronaut" → "Sai Astronaut"; a bare number keeps the number. */
export function nftName(file: string) {
  const s = file.replace(/[_]+/g, ' ').trim();
  const name = s.replace(/^\d+[\s.\-–—#]*/, '').trim();
  return name || `#${s}`;
}

const uploaded: NftArt[] = Object.keys(nftFiles)
  .sort((a, b) => base(a).localeCompare(base(b), undefined, { numeric: true }))
  .map((path, i) => ({ id: base(path), name: captions[base(path)] ?? nftName(base(path)), url: nftFiles[path], n: i + 1 }));

/** Placeholder count shown until the collection is uploaded. */
const PLACEHOLDERS = 16;

export const NFTS: NftArt[] = uploaded.length
  ? uploaded
  : Array.from({ length: PLACEHOLDERS }, (_, i) => ({ id: `placeholder-${i + 1}`, name: `Sai NFT #${String(i + 1).padStart(2, '0')}`, url: null, n: i + 1 }));
export const HAS_NFTS = uploaded.length > 0;

/** Custom portal picture for a city (art/portals/<city>.png), if one was uploaded. */
export function customPortalArt(city: string): string | undefined {
  const k = Object.keys(portalFiles).find((p) => base(p) === city);
  return k ? portalFiles[k] : undefined;
}
