import { NFTS } from '../../data/art';
import type { Spawn } from '../Player';

/**
 * NFT Gallery: a round hall whose wall holds every NFT of the collection.
 * The hall grows with the collection; past ~44 pieces the frames go on two rows.
 * The exit is in the south (+z).
 */
const SPACING = 3.6; // metres of wall per frame
const EXIT_GAP = 0.5; // radians kept free around the exit

export function galleryLayout(count: number) {
  const rows = count > 44 ? 2 : 1;
  const perRow = Math.ceil(count / rows);
  const R = Math.min(34, Math.max(13, (perRow * SPACING) / (Math.PI * 2 - EXIT_GAP * 2)));
  const span = Math.PI * 2 - EXIT_GAP * 2;
  const heights = rows === 2 ? [2.6, 6.1] : [3.1];
  const frames = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const k = i % perRow;
    const inRow = Math.min(perRow, count - row * perRow);
    // left to right as seen from the centre, starting next to the exit
    const a = EXIT_GAP + ((k + 0.5) / inRow) * span;
    return { i, a, x: Math.sin(a) * (R - 0.25), z: Math.cos(a) * (R - 0.25), y: heights[row], size: rows === 2 ? 2.5 : 2.8 };
  });
  return { R, rows, frames, wallH: rows === 2 ? 9 : 7 };
}

export const GALLERY = galleryLayout(NFTS.length);
/** Photo spot in the middle of the hall; the camera looks north at the far wall. */
export const GALLERY_PHOTO: [number, number, number] = [0, 0, 1.5];

export const GALLERY_SPAWNS: Record<string, Spawn> = {
  entrance: [0, 0, GALLERY.R - 9, Math.PI],
};
