import { describe, expect, it } from 'vitest';
import { BASELINE_TUNING_CANDIDATE, TUNING_BOUNDS } from './tuning';
import { STARTING_ENERGY } from '../core/config';

describe('YAML-driven benchmark tuning config', () => {
  it('uses YAML starting energy baseline', () => {
    expect(BASELINE_TUNING_CANDIDATE.startingEnergy).toBe(STARTING_ENERGY);
  });

  it('keeps numeric tuning bounds loaded from config', () => {
    expect(TUNING_BOUNDS.stepsMultiplier[0]).toBeLessThan(TUNING_BOUNDS.stepsMultiplier[1]);
    expect(TUNING_BOUNDS.startingEnergy[0]).toBeLessThanOrEqual(BASELINE_TUNING_CANDIDATE.startingEnergy);
  });
});
