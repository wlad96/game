/** Seeded Park–Miller PRNG so procedural content is identical for every player. */
export function rng(seed: number) {
  let s = Math.floor(Math.abs(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
