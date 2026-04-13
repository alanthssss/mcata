import { describe, it, expect } from 'vitest';
import { computeScore } from './score';
import type { MergeInfo } from './types';

function merge(value: number, isCorner = false, isHighest = false): MergeInfo {
  return {
    from: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    to: { row: 0, col: 0 },
    value,
    isCorner,
    isHighest,
  };
}

describe('computeScore', () => {
  it('returns zeros for no merges', () => {
    const result = computeScore({
      merges: [],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.base).toBe(0);
    expect(result.finalOutput).toBe(0);
    expect(result.triggeredCatalysts).toEqual([]);
  });

  it('computes base as sum of merge values', () => {
    const result = computeScore({
      merges: [merge(4), merge(8)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.base).toBe(12);
  });

  it('applies chain multiplier for 2 merges', () => {
    const result = computeScore({
      merges: [merge(4), merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    // chain for 2 merges = 1.2, base = 8 → floor(8 * 1.2) = 9
    expect(result.finalOutput).toBe(9);
  });

  it('applies chain multiplier for 3 merges', () => {
    const result = computeScore({
      merges: [merge(4), merge(4), merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    // chain=1.5, base=12 → floor(12*1.5)=18
    expect(result.finalOutput).toBe(18);
  });

  it('applies chain multiplier for 4+ merges', () => {
    const result = computeScore({
      merges: [merge(4), merge(4), merge(4), merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    // chain=2.0, base=16 → floor(16*2.0)=32
    expect(result.finalOutput).toBe(32);
  });

  it('applies corner_crown catalyst for corner merges', () => {
    const result = computeScore({
      merges: [merge(4, true)],
      activeCatalysts: ['corner_crown'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('corner_crown');
    // corner_crown mult=2.0, corner condition=1.2, base=4
    // finalOutput = floor(4 * 1.0 * 1.2 * 2.0 * 1.0 * 1.0 * 1.0) = floor(9.6) = 9
    expect(result.finalOutput).toBe(9);
  });

  it('does not trigger corner_crown without corner merge', () => {
    const result = computeScore({
      merges: [merge(4, false)],
      activeCatalysts: ['corner_crown'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).not.toContain('corner_crown');
  });

  it('applies twin_burst for ≥2 merges', () => {
    const result = computeScore({
      merges: [merge(4), merge(4)],
      activeCatalysts: ['twin_burst'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('twin_burst');
  });

  it('does not trigger twin_burst for 1 merge', () => {
    const result = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['twin_burst'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).not.toContain('twin_burst');
  });

  it('applies combo_wire when comboWireActive=true', () => {
    const result = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['combo_wire'],
      globalMultiplier: 1.0,
      comboWireActive: true,
    });
    expect(result.triggeredCatalysts).toContain('combo_wire');
  });

  it('applies high_tribute for highest tile merge', () => {
    const result = computeScore({
      merges: [merge(8, false, true)],
      activeCatalysts: ['high_tribute'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('high_tribute');
  });

  it('applies global multiplier', () => {
    const base = computeScore({
      merges: [merge(8)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    const scaled = computeScore({
      merges: [merge(8)],
      activeCatalysts: [],
      globalMultiplier: 2.0,
      comboWireActive: false,
    });
    expect(scaled.finalOutput).toBe(base.finalOutput * 2);
  });

  it('applies empty_amplifier based on empty cell count', () => {
    const noCells = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['empty_amplifier'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      emptyCells: 0,
    });
    const withCells = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['empty_amplifier'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      emptyCells: 8,
    });
    expect(withCells.finalOutput).toBeGreaterThan(noCells.finalOutput);
    expect(noCells.triggeredCatalysts).not.toContain('empty_amplifier');
    expect(withCells.triggeredCatalysts).toContain('empty_amplifier');
  });

  it('applies echo_multiplier when echoOutputLast > 0', () => {
    const noEcho = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['echo_multiplier'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      echoOutputLast: 0,
    });
    const withEcho = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['echo_multiplier'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      echoOutputLast: 20,
    });
    expect(withEcho.finalOutput).toBeGreaterThan(noEcho.finalOutput);
    expect(withEcho.triggeredCatalysts).toContain('echo_multiplier');
    expect(noEcho.triggeredCatalysts).not.toContain('echo_multiplier');
  });

  it('applies threshold_surge when base exceeds threshold', () => {
    // threshold is 30; base here = 32
    const result = computeScore({
      merges: [merge(32)],
      activeCatalysts: ['threshold_surge'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('threshold_surge');
  });

  it('does not apply threshold_surge below threshold', () => {
    // base = 16 < 30
    const result = computeScore({
      merges: [merge(16)],
      activeCatalysts: ['threshold_surge'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).not.toContain('threshold_surge');
  });

  it('applies phase_resonance for phaseIndex > 0', () => {
    const phase0 = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['phase_resonance'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      phaseIndex: 0,
    });
    const phase3 = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['phase_resonance'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      phaseIndex: 3,
    });
    expect(phase3.finalOutput).toBeGreaterThan(phase0.finalOutput);
    expect(phase3.triggeredCatalysts).toContain('phase_resonance');
    expect(phase0.triggeredCatalysts).not.toContain('phase_resonance');
  });

  it('applies gravity_well for corner merges', () => {
    const result = computeScore({
      merges: [merge(8, true)],
      activeCatalysts: ['gravity_well'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('gravity_well');
  });

  it('applies inversion_field unconditionally when active', () => {
    const result = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['inversion_field'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(result.triggeredCatalysts).toContain('inversion_field');
  });

  it('applies anomaly_sync when anomalyTriggered=true', () => {
    const noAnomaly = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['anomaly_sync'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      anomalyTriggered: false,
    });
    const withAnomaly = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['anomaly_sync'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      anomalyTriggered: true,
    });
    expect(noAnomaly.triggeredCatalysts).not.toContain('anomaly_sync');
    expect(withAnomaly.triggeredCatalysts).toContain('anomaly_sync');
    expect(withAnomaly.finalOutput).toBeGreaterThan(noAnomaly.finalOutput);
  });

  it('applies momentum multiplier for consecutive valid moves', () => {
    const noMomentum = computeScore({
      merges: [merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
      consecutiveValidMoves: 0,
    });
    const withMomentum = computeScore({
      merges: [merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
      consecutiveValidMoves: 10,
    });
    expect(withMomentum.momentumMultiplier).toBeGreaterThan(noMomentum.momentumMultiplier);
    expect(withMomentum.finalOutput).toBeGreaterThan(noMomentum.finalOutput);
  });

  it('caps momentum multiplier at max', () => {
    // growthRate=0.05, maxMultiplier=2.0 → reaches cap at 20 moves
    const result = computeScore({
      merges: [merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
      consecutiveValidMoves: 100,
    });
    expect(result.momentumMultiplier).toBe(2.0);
  });

  it('applies stability_field after required consecutive moves', () => {
    // stability_field_period = 3
    const notReady = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['stability_field'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      stabilityCount: 2,
    });
    const ready = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['stability_field'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      stabilityCount: 3,
    });
    expect(notReady.triggeredCatalysts).not.toContain('stability_field');
    expect(ready.triggeredCatalysts).toContain('stability_field');
  });

  it('applies diagonal_merge on the correct period', () => {
    // diagonal_merge_period = 4
    const offPeriod = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['diagonal_merge'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      diagonalMoveCount: 5,
    });
    const onPeriod = computeScore({
      merges: [merge(4)],
      activeCatalysts: ['diagonal_merge'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      diagonalMoveCount: 4,
    });
    expect(offPeriod.triggeredCatalysts).not.toContain('diagonal_merge');
    expect(onPeriod.triggeredCatalysts).toContain('diagonal_merge');
  });

  it('activates synergy between corner_crown and empty_amplifier', () => {
    const result = computeScore({
      merges: [merge(4, true)],
      activeCatalysts: ['corner_crown', 'empty_amplifier'],
      globalMultiplier: 1.0,
      comboWireActive: false,
      emptyCells: 4,
    });
    expect(result.triggeredSynergies).toContain('corner_empire');
    expect(result.synergyMultiplier).toBeGreaterThan(1.0);
  });

  it('chain_reactor scales differently from base chain', () => {
    const base = computeScore({
      merges: [merge(4), merge(4)],
      activeCatalysts: [],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    const withReactor = computeScore({
      merges: [merge(4), merge(4)],
      activeCatalysts: ['chain_reactor'],
      globalMultiplier: 1.0,
      comboWireActive: false,
    });
    expect(withReactor.triggeredCatalysts).toContain('chain_reactor');
    // chain_reactor: 1.0 + (2-1)*(1.0+0.2) = 2.2; base chain for 2 = 1.2
    expect(withReactor.finalOutput).toBeGreaterThan(base.finalOutput);
  });
});
