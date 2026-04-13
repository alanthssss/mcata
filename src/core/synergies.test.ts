import { describe, it, expect } from 'vitest';
import { getActiveSynergies, computeSynergyMultiplier, SYNERGY_DEFS } from './synergies';

describe('getActiveSynergies', () => {
  it('returns empty array when no synergy conditions are met', () => {
    expect(getActiveSynergies(['lucky_seed'])).toEqual([]);
    expect(getActiveSynergies([])).toEqual([]);
  });

  it('detects corner_empire (corner_crown + empty_amplifier)', () => {
    const active = getActiveSynergies(['corner_crown', 'empty_amplifier']);
    expect(active).toContain('corner_empire');
  });

  it('does not detect synergy with only one of the pair', () => {
    expect(getActiveSynergies(['corner_crown'])).not.toContain('corner_empire');
    expect(getActiveSynergies(['empty_amplifier'])).not.toContain('corner_empire');
  });

  it('detects chain_echo (chain_reactor + echo_multiplier)', () => {
    const active = getActiveSynergies(['chain_reactor', 'echo_multiplier']);
    expect(active).toContain('chain_echo');
  });

  it('detects generator_surplus (double_spawn + rich_merge)', () => {
    const active = getActiveSynergies(['double_spawn', 'rich_merge']);
    expect(active).toContain('generator_surplus');
  });

  it('detects amplified_stability (stability_field + threshold_surge)', () => {
    const active = getActiveSynergies(['stability_field', 'threshold_surge']);
    expect(active).toContain('amplified_stability');
  });

  it('detects phase_reactor (phase_resonance + energy_loop)', () => {
    const active = getActiveSynergies(['phase_resonance', 'energy_loop']);
    expect(active).toContain('phase_reactor');
  });

  it('detects multiple synergies simultaneously', () => {
    const active = getActiveSynergies([
      'corner_crown', 'empty_amplifier',
      'chain_reactor', 'echo_multiplier',
    ]);
    expect(active).toContain('corner_empire');
    expect(active).toContain('chain_echo');
  });
});

describe('computeSynergyMultiplier', () => {
  it('returns 1.0 with no active synergies', () => {
    expect(computeSynergyMultiplier([])).toBe(1.0);
  });

  it('returns the synergy multiplier for one synergy', () => {
    const expected = SYNERGY_DEFS['corner_empire'].multiplier;
    expect(computeSynergyMultiplier(['corner_empire'])).toBe(expected);
  });

  it('multiplies together multiple synergies', () => {
    const expected =
      SYNERGY_DEFS['corner_empire'].multiplier *
      SYNERGY_DEFS['chain_echo'].multiplier;
    const result = computeSynergyMultiplier(['corner_empire', 'chain_echo']);
    expect(result).toBeCloseTo(expected, 10);
  });
});
