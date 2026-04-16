import { describe, it, expect } from 'vitest';
import { generateForgeOffers } from './forge';
import { ALL_CATALYSTS } from './catalysts';
import { createRng } from './rng';

describe('generateForgeOffers', () => {
  it('returns the requested number of offers', () => {
    const rng = createRng(1);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), undefined, 3);
    expect(offers).toHaveLength(3);
  });

  it('returns at most pool size offers when pool is small', () => {
    const rng = createRng(1);
    // Pool of only 2 unlocked catalysts
    const twoIds = ALL_CATALYSTS.slice(0, 2).map(c => c.id);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), twoIds, 3);
    expect(offers.length).toBeLessThanOrEqual(2);
  });

  it('restricts offers to the catalyst pool when provided', () => {
    const rng = createRng(1);
    const allowed = ALL_CATALYSTS.slice(0, 4).map(c => c.id);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), allowed, 3);
    for (const offer of offers) {
      expect(allowed).toContain(offer.id);
    }
  });

  it('uses the full pool when no catalystPool is provided', () => {
    const rng = createRng(1);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), undefined, 3);
    expect(offers).toHaveLength(3);
    for (const offer of offers) {
      expect(ALL_CATALYSTS.map(c => c.id)).toContain(offer.id);
    }
  });

  it('returns CatalystDef objects with required fields', () => {
    const rng = createRng(2);
    const offers = generateForgeOffers([], 2, rng.next.bind(rng), undefined, 3);
    for (const offer of offers) {
      expect(offer).toHaveProperty('id');
      expect(offer).toHaveProperty('name');
      expect(offer).toHaveProperty('cost');
      expect(offer).toHaveProperty('rarity');
    }
  });

  it('does not repeat catalysts in the same offer', () => {
    const rng = createRng(5);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), undefined, 3);
    const ids = offers.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes already-active catalysts from offers', () => {
    const rng = createRng(1);
    // All catalysts active except the last one
    const activeIds = ALL_CATALYSTS.slice(0, -1).map(c => c.id);
    const offers = generateForgeOffers(activeIds, 3, rng.next.bind(rng), undefined, 3);
    for (const offer of offers) {
      expect(activeIds).not.toContain(offer.id);
    }
  });

  it('returns empty array when pool is exhausted (empty array)', () => {
    const rng = createRng(1);
    const offers = generateForgeOffers([], 3, rng.next.bind(rng), [], 3);
    expect(offers).toHaveLength(0);
  });

  it('returns empty array when all pool catalysts are already active', () => {
    const rng = createRng(1);
    const pool = ALL_CATALYSTS.slice(0, 3).map(c => c.id);
    const offers = generateForgeOffers(pool, 3, rng.next.bind(rng), pool, 3);
    expect(offers).toHaveLength(0);
  });

  it('heavily favors common rarity in early rounds', () => {
    let common = 0;
    let rare = 0;
    let epic = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const offers = generateForgeOffers([], 3, rng.next.bind(rng), undefined, 1);
      for (const offer of offers) {
        if (offer.rarity === 'common') common++;
        if (offer.rarity === 'rare') rare++;
        if (offer.rarity === 'epic') epic++;
      }
    }
    expect(common).toBeGreaterThan(rare);
    expect(epic).toBe(0);
  });

  it('allows scarce epic offers in later rounds', () => {
    let epic = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const rng = createRng(seed + 1000);
      const offers = generateForgeOffers([], 3, rng.next.bind(rng), undefined, 7);
      epic += offers.filter(o => o.rarity === 'epic').length;
    }
    expect(epic).toBeGreaterThan(0);
    expect(epic).toBeLessThan(300);
  });
});
