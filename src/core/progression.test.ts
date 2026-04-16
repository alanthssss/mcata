import { describe, expect, it } from 'vitest';
import { PHASE_CONFIG, PROGRESSION_SCALING, STARTING_ENERGY } from './config';
import { getPhasesForRound, PHASES_PER_ROUND } from './phases';
import { createInitialState } from './engine';

describe('progression pacing model', () => {
  it('keeps six phases in centralized config', () => {
    expect(PHASE_CONFIG).toHaveLength(PHASES_PER_ROUND);
  });

  it('increases base step budget by at least +5 from old 12-step floor', () => {
    const minBaseSteps = Math.min(...PHASE_CONFIG.map(p => p.steps));
    expect(minBaseSteps).toBeGreaterThanOrEqual(17);
  });

  it('steps scale with phase and round', () => {
    const round1 = getPhasesForRound(1);
    const round3 = getPhasesForRound(3);
    expect(round1[5].steps).toBeGreaterThan(round1[0].steps);
    expect(round3[0].steps).toBeGreaterThan(round1[0].steps);
    expect(PROGRESSION_SCALING.stepRoundScale).toBeGreaterThan(0);
  });

  it('target output scales with phase and round', () => {
    const round1 = getPhasesForRound(1);
    const round4 = getPhasesForRound(4);
    expect(round1[5].targetOutput).toBeGreaterThan(round1[0].targetOutput);
    expect(round4[0].targetOutput).toBeGreaterThan(round1[0].targetOutput);
    expect(PROGRESSION_SCALING.targetRoundScale).toBeGreaterThan(0);
  });

  it('no longer depends on round templates', () => {
    const configAny = PHASE_CONFIG as unknown as Record<string, unknown>;
    expect(configAny.ROUND_TEMPLATES).toBeUndefined();
  });
});

describe('energy start value', () => {
  it('starts with 5 energy', () => {
    expect(STARTING_ENERGY).toBe(5);
    expect(createInitialState(1).energy).toBe(5);
  });
});
