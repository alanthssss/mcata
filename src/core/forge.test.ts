import { describe, it, expect } from 'vitest';
import { generateForgeOffers } from './forge';
import { ALL_CATALYSTS } from './catalysts';
import { createRng } from './rng';

describe('generateForgeOffers', () => {
  it('returns the requested number of offers', () => {
    const rng = createRng(1);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng));
    expect(offers).toHaveLength(3);
  });

  it('returns at most pool size offers when pool is small', () => {
    const rng = createRng(1);
    // Pool of only 2 unlocked catalysts
    const twoIds = ALL_CATALYSTS.slice(0, 2).map(c => c.id);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), twoIds);
    expect(offers.length).toBeLessThanOrEqual(2);
  });

  it('restricts offers to the unlocked pool when provided', () => {
    const rng = createRng(1);
    const allowed = ALL_CATALYSTS.slice(0, 4).map(c => c.id);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), allowed);
    for (const offer of offers) {
      expect(allowed).toContain(offer.id);
    }
  });

  it('uses the full pool when no unlockedCatalysts list is provided', () => {
    const rng = createRng(1);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng));
    expect(offers).toHaveLength(3);
    for (const offer of offers) {
      expect(ALL_CATALYSTS.map(c => c.id)).toContain(offer.id);
    }
  });

  it('returns CatalystDef objects with required fields', () => {
    const rng = createRng(2);
    const offers = generateForgeOffers([], 2, rng.next.bind(rng));
    for (const offer of offers) {
      expect(offer).toHaveProperty('id');
      expect(offer).toHaveProperty('name');
      expect(offer).toHaveProperty('cost');
      expect(offer).toHaveProperty('rarity');
    }
  });

  it('does not repeat catalysts in the same offer', () => {
    const rng = createRng(5);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng));
    const ids = offers.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
