import { describe, it, expect } from 'vitest';
import { generateInfusionOptions } from './infusion';
import { ALL_CATALYSTS } from './catalysts';
import { createRng } from './rng';

describe('generateInfusionOptions', () => {
  it('always includes core non-catalyst rewards', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng));
    const types = options.map(o => o.type);
    expect(types).toContain('energy');
    expect(types).toContain('steps');
    expect(types).toContain('multiplier');
  });

  it('direct catalyst rewards are rare and explicit', () => {
    let catalystCount = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const rng = createRng(seed);
      const options = generateInfusionOptions([], rng.next.bind(rng), undefined, 6, 1);
      if (options.some(o => o.type === 'catalyst')) catalystCount++;
    }
    expect(catalystCount).toBeLessThan(30);
  });

  it('respects rarity gates for direct catalyst rewards', () => {
    let sawEpicEarly = false;
    let sawEpicLate = false;
    for (let seed = 1; seed <= 200; seed++) {
      const rngEarly = createRng(seed);
      const early = generateInfusionOptions([], rngEarly.next.bind(rngEarly), undefined, 6, 1);
      const earlyCat = early.find(o => o.type === 'catalyst');
      if (earlyCat?.catalyst.rarity === 'epic') sawEpicEarly = true;

      const rngLate = createRng(seed + 500);
      const late = generateInfusionOptions([], rngLate.next.bind(rngLate), undefined, 6, 6);
      const lateCat = late.find(o => o.type === 'catalyst');
      if (lateCat?.catalyst.rarity === 'epic') sawEpicLate = true;
    }
    expect(sawEpicEarly).toBe(false);
    expect(sawEpicLate).toBe(true);
  });

  it('restricts catalyst choices to the unlocked pool', () => {
    const allowed = ALL_CATALYSTS.slice(0, 3).map(c => c.id);
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng), allowed, 6, 5);
    for (const opt of options) {
      if (opt.type === 'catalyst') {
        expect(allowed).toContain(opt.catalyst.id);
      }
    }
  });

  it('respects maxChoices limit', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng), undefined, 2, 3);
    expect(options).toHaveLength(2);
  });
});
