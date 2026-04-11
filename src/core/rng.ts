// Simple seeded PRNG (xorshift32)
export function createRng(seed: number) {
  let state = seed >>> 0 || 1;

  function next(): number {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    state = state >>> 0;
    return state / 0xffffffff;
  }

  function nextInt(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function pick<T>(arr: T[]): T {
    return arr[nextInt(0, arr.length - 1)];
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { next, nextInt, pick, shuffle };
}

export type Rng = ReturnType<typeof createRng>;
