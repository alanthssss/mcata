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
      forgeVisitCount: 0,
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('forge');
    // First forge visit (forgeVisitCount was 0): exactly 3 items — 2 catalysts + 1 signal.
    // This is the onboarding-simplified shop shown in the screenshot (Stage 3 background,
    // all panels empty). Before the fix this returned 6 items regardless of visit index.
    expect(state.forgeItems).toHaveLength(3);
    expect(state.forgeItems.filter(i => i.type === 'catalyst')).toHaveLength(2);
    expect(state.forgeItems.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(state.forgeItems.some(i => i.type === 'pattern')).toBe(false);
    expect(state.forgeItems.some(i => i.type === 'utility')).toBe(false);
    // forgeVisitCount is incremented to 1 when the forge screen is entered
    expect(state.forgeVisitCount).toBe(1);
  });

  it('second forge visit (forgeVisitCount=1) produces 4 items: 2 catalysts + 1 signal + 1 pattern, no utility', () => {
    const base = createInitialState(1);
    let state: GameState = {
      ...base,
      screen: 'playing',
      phaseIndex: 1,
      stepsRemaining: 1,
      output: 9999,
      phaseTargetOutput: 1,
      forgeVisitCount: 1,   // forgeVisitIndex=1 → early shop
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('forge');
    expect(state.forgeItems.filter(i => i.type === 'catalyst')).toHaveLength(2);
    expect(state.forgeItems.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(state.forgeItems.filter(i => i.type === 'pattern')).toHaveLength(1);
    expect(state.forgeItems.some(i => i.type === 'utility')).toBe(false);
    expect(state.forgeVisitCount).toBe(2);
  });

  it('third forge visit (forgeVisitCount=2) is still early: same 4-item shape as second visit, no utility', () => {
    // This is the scenario from the user screenshot: visit 3 is NOT the full shop —
    // it looks identical to visit 2 (forgeVisitIndex <= 2 → EARLY_FORGE_ITEM_COUNTS).
    const base = createInitialState(1);
    let state: GameState = {
      ...base,
      screen: 'playing',
      phaseIndex: 1,
      stepsRemaining: 1,
      output: 9999,
      phaseTargetOutput: 1,
      forgeVisitCount: 2,   // forgeVisitIndex=2 → still early shop
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('forge');
    // Same shape as second visit: 2 catalysts + 1 signal + 1 pattern = 4 items
    expect(state.forgeItems.filter(i => i.type === 'catalyst')).toHaveLength(2);
    expect(state.forgeItems.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(state.forgeItems.filter(i => i.type === 'pattern')).toHaveLength(1);
    expect(state.forgeItems.some(i => i.type === 'utility')).toBe(false);
    expect(state.forgeVisitCount).toBe(3);
  });

  it('fourth forge visit (forgeVisitCount=3) is the first full shop: 6 items including a utility', () => {
    // First time forgeVisitIndex reaches 3, unlocking the complete shop layout:
    // 3 catalysts + 1 pattern + 1 signal + 1 utility. Confirmed by user screenshot.
    const base = createInitialState(1);
    let state: GameState = {
      ...base,
      screen: 'playing',
      phaseIndex: 1,
      stepsRemaining: 1,
      output: 9999,
      phaseTargetOutput: 1,
      forgeVisitCount: 3,   // forgeVisitIndex=3 → first full shop
      grid: [
        [null, null, null, null],
        [null, null, null, null],
        [{ id: 1, value: 2, merged: false }, null, null, null],
        [null, null, null, null],
      ],
    };
    state = processMoveAction(state, 'up');
    expect(state.screen).toBe('forge');
    expect(state.forgeItems).toHaveLength(6);
    expect(state.forgeItems.filter(i => i.type === 'catalyst')).toHaveLength(3);
    expect(state.forgeItems.filter(i => i.type === 'pattern')).toHaveLength(1);
    expect(state.forgeItems.filter(i => i.type === 'signal')).toHaveLength(1);
    expect(state.forgeItems.filter(i => i.type === 'utility')).toHaveLength(1);
    expect(state.forgeVisitCount).toBe(4);
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
