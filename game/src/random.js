// A small seeded random number generator (mulberry32): the same seed gives the
// same city, the same traffic and the same screenshot scenes, which is what
// makes the staged screenshots repeatable. Written fresh for Sunset Bay.
export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return random;
}

/** Pick one item from an array using the seeded random. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** A random number in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}
