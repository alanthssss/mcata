import { describe, it, expect } from 'vitest';
import { generateForgeItems, generateForgeOffers } from './forge';
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

describe('generateForgeItems progression', () => {
  it('first forge visit offers exactly 3 items (2 boosts + 1 skill)', () => {
    const rng = createRng(11);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 0);
    expect(items).toHaveLength(3);
    expect(items.filter(i => i.type === 'catalyst')).toHaveLength(2);
    expect(items.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(items.some(i => i.type === 'pattern')).toBe(false);
    expect(items.some(i => i.type === 'utility')).toBe(false);
  });

  it('first forge visit: curated boosts are empty_amplifier and rich_merge', () => {
    const rng = createRng(11);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 0);
    const catIds = items.filter(i => i.type === 'catalyst').map(i => (i as any).catalyst.id as string);
    expect(catIds).toContain('empty_amplifier');
    expect(catIds).toContain('rich_merge');
  });

  it('first forge visit: curated skill is grid_clean when not already owned', () => {
    const rng = createRng(11);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 0);
    const sig = items.find(i => i.type === 'signal') as any;
    expect(sig.signal).toBe('grid_clean');
  });

  it('first forge visit: falls back to random skill when grid_clean already owned', () => {
    const rng = createRng(11);
    const items = generateForgeItems([], null, ['grid_clean'], rng.next.bind(rng), undefined, 1, 0);
    const sig = items.find(i => i.type === 'signal') as any;
    // Any other signal is acceptable; grid_clean must NOT appear
    if (sig) expect(sig.signal).not.toBe('grid_clean');
  });

  it('first forge visit: falls back to random catalyst when curated one is already owned', () => {
    const rng = createRng(11);
    const items = generateForgeItems(['empty_amplifier', 'rich_merge'], null, [], rng.next.bind(rng), undefined, 1, 0);
    const catIds = items.filter(i => i.type === 'catalyst').map(i => (i as any).catalyst.id as string);
    expect(catIds).not.toContain('empty_amplifier');
    expect(catIds).not.toContain('rich_merge');
  });

  it('second and third forge visits introduce pattern offers', () => {
    const rngA = createRng(12);
    const second = generateForgeItems([], null, [], rngA.next.bind(rngA), undefined, 1, 1);
    const rngB = createRng(13);
    const third = generateForgeItems([], null, [], rngB.next.bind(rngB), undefined, 1, 2);
    expect(second.some(i => i.type === 'pattern')).toBe(true);
    expect(third.some(i => i.type === 'pattern')).toBe(true);
    expect(second.some(i => i.type === 'utility')).toBe(false);
    expect(third.some(i => i.type === 'utility')).toBe(false);
  });

  it('early visits (1-2) do not expose utility items', () => {
    for (const visitIndex of [1, 2]) {
      const rng = createRng(visitIndex * 7);
      const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, visitIndex);
      expect(items.some(i => i.type === 'utility')).toBe(false);
    }
  });
});

// ─── Full shop (visit 3+) ─────────────────────────────────────────────────────

describe('generateForgeItems full shop (forgeVisitIndex >= 3, i.e. fourth+ player visit)', () => {
  it('generates exactly 6 items: 3 catalysts + 1 pattern + 1 signal + 1 utility', () => {
    const rng = createRng(42);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    expect(items).toHaveLength(6);
    expect(items.filter(i => i.type === 'catalyst')).toHaveLength(3);
    expect(items.filter(i => i.type === 'pattern')).toHaveLength(1);
    expect(items.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(items.filter(i => i.type === 'utility')).toHaveLength(1);
  });

  it('catalyst items have "cat:" id prefix', () => {
    const rng = createRng(1);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    for (const item of items.filter(i => i.type === 'catalyst')) {
      expect(item.id).toMatch(/^cat:/);
    }
  });

  it('pattern item has "pattern:" id prefix and price 4', () => {
    const rng = createRng(1);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    const pattern = items.find(i => i.type === 'pattern')!;
    expect(pattern.id).toMatch(/^pattern:/);
    expect(pattern.price).toBe(4);
  });

  it('signal item has "signal:" id prefix and price 3', () => {
    const rng = createRng(1);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    const signal = items.find(i => i.type === 'signal')!;
    expect(signal.id).toMatch(/^signal:/);
    expect(signal.price).toBe(3);
  });

  it('utility item has "util:" id prefix', () => {
    const rng = createRng(1);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    const utility = items.find(i => i.type === 'utility')!;
    expect(utility.id).toMatch(/^util:/);
  });

  it('no two catalyst items share the same catalyst id', () => {
    const rng = createRng(7);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    const catIds = items.filter(i => i.type === 'catalyst').map(i => (i as any).catalyst.id);
    expect(new Set(catIds).size).toBe(3);
  });

  it('excludes already-owned signal from the signal pool', () => {
    const ownedSignals = ['grid_clean'] as const;
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const items = generateForgeItems([], null, [...ownedSignals], rng.next.bind(rng), undefined, 1, 3);
      const signal = items.find(i => i.type === 'signal') as any;
      if (signal) expect(signal.signal).not.toBe('grid_clean');
    }
  });

  it('pattern offered differs from the currently active pattern', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const items = generateForgeItems([], 'corner', [], rng.next.bind(rng), undefined, 1, 3);
      const pattern = items.find(i => i.type === 'pattern') as any;
      if (pattern) expect(pattern.pattern).not.toBe('corner');
    }
  });

  it('generates full mix on visits 4 and 5 as well', () => {
    for (const visitIndex of [4, 5]) {
      const rng = createRng(visitIndex * 10);
      const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, visitIndex);
      expect(items.filter(i => i.type === 'catalyst')).toHaveLength(3);
      expect(items.some(i => i.type === 'utility')).toBe(true);
    }
  });

  it('catalyst items each have a valid CatalystDef with required fields', () => {
    const rng = createRng(3);
    const items = generateForgeItems([], null, [], rng.next.bind(rng), undefined, 1, 3);
    for (const item of items.filter(i => i.type === 'catalyst')) {
      const cat = (item as any).catalyst;
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('rarity');
      expect(cat).toHaveProperty('cost');
      expect(cat.cost).toBe(item.price);
    }
  });

  it('active catalysts are excluded from full-shop catalyst offers', () => {
    const allIds = ALL_CATALYSTS.map(c => c.id);
    // Block all but the last 3 from offers
    const active = allIds.slice(0, -3);
    const rng = createRng(1);
    const items = generateForgeItems(active, null, [], rng.next.bind(rng), undefined, 1, 3);
    for (const item of items.filter(i => i.type === 'catalyst')) {
      expect(active).not.toContain((item as any).catalyst.id);
    }
  });
});
