import { describe, expect, it } from 'vitest';
import { createInitialState, processMoveAction, sellPattern, sellSignal } from './engine';
import type { GameState } from './types';

function forgingState(): GameState {
  return {
    ...createInitialState(1),
    screen: 'forge',
    energy: 10,
    forgeItems: [],
    activeCatalysts: [],
    activePattern: 'chain',
    patternLevels: { corner: 0, chain: 2, empty_space: 0, high_tier: 0, economy: 0, survival: 0 },
    signals: ['pulse_boost'],
  };
}

describe('unified forge flow', () => {
  it('phase clear transitions directly to forge after onboarding phase', () => {
    const base = createInitialState(1);
    let state: GameState = {
      ...base,
      screen: 'playing',
      phaseIndex: 1,
      stepsRemaining: 1,
      output: 9999,
      phaseTargetOutput: 1,
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('forge');
    expect(state.forgeItems.length).toBeGreaterThan(0);
    expect(state.forgeItems.some(i => i.type !== 'catalyst')).toBe(true);
  });

  it('first phase clear skips forge to keep onboarding focused', () => {
    const base = createInitialState(1);
    let state: GameState = {
      ...base,
      screen: 'playing',
      stepsRemaining: 1,
      output: 9999,
      phaseTargetOutput: 1,
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('playing');
    expect(state.phaseIndex).toBe(1);
    expect(state.forgeItems).toHaveLength(0);
  });

  it('selling pattern removes active pattern and refunds energy', () => {
    const state = forgingState();
    const next = sellPattern(state);
    expect(next.activePattern).toBeNull();
    expect(next.patternLevels.chain).toBe(0);
    expect(next.energy).toBeGreaterThan(state.energy);
  });

  it('selling signal removes it and refunds energy', () => {
    const state = forgingState();
    const next = sellSignal(state, 'pulse_boost');
    expect(next.signals).not.toContain('pulse_boost');
    expect(next.energy).toBeGreaterThan(state.energy);
  });
});
