import { describe, it, expect } from 'vitest';
import { generateInfusionOptions } from './infusion';
import { ALL_CATALYSTS } from './catalysts';
import { createRng } from './rng';

describe('generateInfusionOptions', () => {
  it('always includes energy, steps and multiplier options', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng));
    const types = options.map(o => o.type);
    expect(types).toContain('energy');
    expect(types).toContain('steps');
    expect(types).toContain('multiplier');
  });

  it('includes a catalyst option when the pool is non-empty', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng));
    expect(options.some(o => o.type === 'catalyst')).toBe(true);
  });

  it('does not offer catalysts already active', () => {
    const rng = createRng(1);
    const active = ALL_CATALYSTS.map(c => c.id); // everything active
    const options = generateInfusionOptions(active, rng.next.bind(rng));
    expect(options.some(o => o.type === 'catalyst')).toBe(false);
  });

  it('respects the maxChoices limit', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng), undefined, 2);
    expect(options).toHaveLength(2);
  });

  it('restricts catalyst choices to the unlocked pool', () => {
    const allowed = ALL_CATALYSTS.slice(0, 3).map(c => c.id);
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng), allowed);
    for (const opt of options) {
      if (opt.type === 'catalyst') {
        expect(allowed).toContain(opt.catalyst.id);
      }
    }
  });

  it('returns up to 4 choices by default', () => {
    const rng = createRng(1);
    const options = generateInfusionOptions([], rng.next.bind(rng));
    expect(options.length).toBeLessThanOrEqual(4);
  });
});
