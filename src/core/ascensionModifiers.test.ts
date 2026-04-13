import { describe, it, expect } from 'vitest';
import { ASCENSION_MODIFIER_DEFS, ALL_ASCENSION_LEVELS } from './ascensionModifiers';
import type { AscensionLevel } from './types';

describe('ASCENSION_MODIFIER_DEFS', () => {
  it('has entries for all 9 ascension levels (0–8)', () => {
    for (let lvl = 0; lvl <= 8; lvl++) {
      expect(ASCENSION_MODIFIER_DEFS[lvl as AscensionLevel]).toBeDefined();
    }
  });

  it('level 0 has no penalties', () => {
    const mod = ASCENSION_MODIFIER_DEFS[0];
    expect(mod.stepsReduction).toBe(0);
    expect(mod.targetOutputScale).toBe(1.0);
    expect(mod.collapseFieldPeriodReduction).toBe(0);
    expect(mod.forgeCostBonus).toBe(0);
    expect(mod.spawnFourBonus).toBe(0);
    expect(mod.startingEnergyFactor).toBe(1.0);
    expect(mod.infusionChoiceCount).toBe(4);
  });

  it('level 8 is harder than level 0', () => {
    const mod0 = ASCENSION_MODIFIER_DEFS[0];
    const mod8 = ASCENSION_MODIFIER_DEFS[8];
    expect(mod8.stepsReduction).toBeGreaterThan(mod0.stepsReduction);
    expect(mod8.targetOutputScale).toBeGreaterThan(mod0.targetOutputScale);
    expect(mod8.startingEnergyFactor).toBeLessThan(mod0.startingEnergyFactor);
    expect(mod8.forgeCostBonus).toBeGreaterThan(mod0.forgeCostBonus);
  });

  it('all levels have a description string', () => {
    for (const level of ALL_ASCENSION_LEVELS) {
      expect(typeof ASCENSION_MODIFIER_DEFS[level].description).toBe('string');
      expect(ASCENSION_MODIFIER_DEFS[level].description.length).toBeGreaterThan(0);
    }
  });

  it('ALL_ASCENSION_LEVELS covers 0 through 8', () => {
    expect(ALL_ASCENSION_LEVELS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
