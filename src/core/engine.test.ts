import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  startGame,
  processMoveAction,
  selectInfusion,
  buyFromForge,
  rerollForge,
  skipForge,
  queueSignal,
  grantSignal,
  advanceRound,
} from './engine';
import { createEmptyGrid, spawnTile } from './board';
import type { GameState, Grid, CatalystTag } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Replace the engine's grid with a custom one so we can craft deterministic
 * scenarios without relying on the RNG seeding.
 */
function withGrid(state: GameState, grid: Grid): GameState {
  return { ...state, grid };
}

/** Build a Grid from a row-major array (0 → null). */
function makeGrid(values: number[][]): Grid {
  let grid = createEmptyGrid();
  let id = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (values[r][c] !== 0) {
        const res = spawnTile(grid, values[r][c], { row: r, col: c }, id++);
        grid = res.grid;
      }
    }
  }
  return grid;
}

/** A state that is fully playable (screen='playing', stepsRemaining high). */
function playingState(seed = 1): GameState {
  return startGame(createInitialState(seed));
}

// ─── createInitialState ───────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('starts on screen=start', () => {
    const state = createInitialState(1);
    expect(state.screen).toBe('start');
  });

  it('creates a non-empty grid', () => {
    const state = createInitialState(1);
    const occupied = state.grid.flat().filter(Boolean);
    // corner_protocol startTiles=2
    expect(occupied).toHaveLength(2);
  });

  it('defaults to corner_protocol', () => {
    const state = createInitialState(1);
    expect(state.protocol).toBe('corner_protocol');
  });

  it('respects a custom protocol', () => {
    const sparse = createInitialState(1, 'sparse_protocol');
    const occupied = sparse.grid.flat().filter(Boolean);
    expect(occupied).toHaveLength(1); // sparse starts with 1 tile
  });

  it('ascension level defaults to 0', () => {
    const state = createInitialState(1);
    expect(state.ascensionLevel).toBe(0);
  });

  it('passes unlockedCatalysts through', () => {
    const state = createInitialState(1, 'corner_protocol', {
      unlockedCatalysts: ['corner_crown'],
    });
    expect(state.unlockedCatalysts).toEqual(['corner_crown']);
  });

  it('initialises all required state fields', () => {
    const state = createInitialState(1);
    expect(state).toHaveProperty('energy');
    expect(state).toHaveProperty('output');
    expect(state).toHaveProperty('totalOutput');
    expect(state).toHaveProperty('activeCatalysts');
    expect(state).toHaveProperty('reactionLog');
    expect(state.momentumMultiplier).toBe(1.0);
    expect(state.consecutiveValidMoves).toBe(0);
  });
});

// ─── startGame ───────────────────────────────────────────────────────────────

describe('startGame', () => {
  it('transitions screen from start to playing', () => {
    const state = createInitialState(1);
    expect(startGame(state).screen).toBe('playing');
  });
});

// ─── processMoveAction ────────────────────────────────────────────────────────

describe('processMoveAction', () => {
  it('returns the same state when screen is not playing', () => {
    const state = createInitialState(1); // screen=start
    const result = processMoveAction(state, 'left');
    expect(result).toBe(state);
  });

  it('returns the same state when stepsRemaining is 0', () => {
    const state = { ...playingState(), stepsRemaining: 0 };
    expect(processMoveAction(state, 'left')).toBe(state);
  });

  it('returns the same state when the move does not change the grid', () => {
    // Tiles already packed to the left — a 'left' move changes nothing
    const grid = makeGrid([
      [2, 4, 8, 16],
      [0, 0, 0,  0],
      [0, 0, 0,  0],
      [0, 0, 0,  0],
    ]);
    const state = withGrid(playingState(), grid);
    const result = processMoveAction(state, 'left');
    expect(result).toBe(state);
  });

  it('decrements stepsRemaining by 1 on a valid move', () => {
    const grid = makeGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const state = withGrid(playingState(), grid);
    const before = state.stepsRemaining;
    const result = processMoveAction(state, 'left');
    expect(result.stepsRemaining).toBe(before - 1);
  });

  it('increments consecutiveValidMoves and momentumMultiplier', () => {
    const grid = makeGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const state = withGrid(playingState(), grid);
    const result = processMoveAction(state, 'left');
    expect(result.consecutiveValidMoves).toBeGreaterThan(0);
    expect(result.momentumMultiplier).toBeGreaterThanOrEqual(1.0);
  });

  it('accumulates output from merges', () => {
    const grid = makeGrid([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const state = withGrid(playingState(), grid);
    const result = processMoveAction(state, 'left');
    expect(result.output).toBeGreaterThan(0);
    expect(result.totalOutput).toBeGreaterThan(0);
  });

  it('adds a log entry', () => {
    const grid = makeGrid([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const state = withGrid(playingState(), grid);
    const result = processMoveAction(state, 'left');
    expect(result.reactionLog.length).toBeGreaterThan(0);
    expect(result.reactionLog[0].action).toBe('left');
  });

  it('transitions to game_over when phase target is not met and steps run out', () => {
    // Force steps to 1 and output to 0 with no chance to score enough
    const grid = makeGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    // targetOutput for phase 1 = 70; give only 1 step → game_over
    const state: GameState = {
      ...withGrid(playingState(), grid),
      stepsRemaining: 1,
      output: 0,
    };
    const result = processMoveAction(state, 'left');
    // Steps run out → phase end → output (tiny) < 70 → game_over
    expect(result.screen).toBe('game_over');
  });

  describe('signals', () => {
    it('grantSignal adds a signal to inventory', () => {
      const state = playingState();
      const updated = grantSignal(state, 'pulse_boost');
      expect(updated.signals).toContain('pulse_boost');
    });

    it('grantSignal respects SIGNAL_CAPACITY (2)', () => {
      let state = playingState();
      state = grantSignal(state, 'pulse_boost');
      state = grantSignal(state, 'freeze_step');
      // Third grant is ignored
      state = grantSignal(state, 'grid_clean');
      expect(state.signals).toHaveLength(2);
    });

    it('grantSignal does not duplicate an already-held signal', () => {
      let state = playingState();
      state = grantSignal(state, 'pulse_boost');
      state = grantSignal(state, 'pulse_boost');
      expect(state.signals.filter(s => s === 'pulse_boost')).toHaveLength(1);
    });

    it('queueSignal queues a signal that the player owns', () => {
      let state = playingState();
      state = grantSignal(state, 'pulse_boost');
      state = queueSignal(state, 'pulse_boost');
      expect(state.pendingSignal).toBe('pulse_boost');
    });

    it('queueSignal ignores a signal the player does not own', () => {
      const state = playingState();
      const result = queueSignal(state, 'pulse_boost');
      expect(result.pendingSignal).toBeNull();
    });

    it('pulse_boost doubles output for that move', () => {
      const grid = makeGrid([
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      let state = withGrid(playingState(), grid);
      const baseline = processMoveAction(state, 'left');

      // Now use pulse_boost
      state = withGrid(playingState(), grid);
      state = grantSignal(state, 'pulse_boost');
      state = queueSignal(state, 'pulse_boost');
      const boosted = processMoveAction(state, 'left');

      expect(boosted.output).toBe(baseline.output * 2);
    });

    it('freeze_step prevents tile spawn', () => {
      const grid = makeGrid([
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      let state = withGrid(playingState(), grid);
      state = grantSignal(state, 'freeze_step');
      state = queueSignal(state, 'freeze_step');
      const result = processMoveAction(state, 'left');
      // With freeze_step only the moved tile should be on the board
      const occupiedCount = result.grid.flat().filter(Boolean).length;
      // Before move: 1 tile; no new spawn → still 1
      expect(occupiedCount).toBe(1);
      expect(result.reactionLog[0].signalUsed).toBe('freeze_step');
    });

    it('grid_clean removes the 2 lowest-value tiles after a move', () => {
      const grid = makeGrid([
        [2, 4, 8, 16],
        [0, 0, 0,  0],
        [0, 0, 0,  0],
        [0, 0, 0,  0],
      ]);
      let state = withGrid(playingState(), grid);
      state = grantSignal(state, 'grid_clean');
      state = queueSignal(state, 'grid_clean');
      const result = processMoveAction(state, 'down');
      // grid_clean removes 2 lowest tiles after the move
      expect(result.reactionLog[0].signalUsed).toBe('grid_clean');
      expect(result.reactionLog[0].signalEffect).toMatch(/Grid Clean/i);
    });
  });
});

// ─── selectInfusion ───────────────────────────────────────────────────────────

describe('selectInfusion', () => {
  function infusionState(): GameState {
    return { ...playingState(), screen: 'infusion' };
  }

  it('adding a catalyst puts it in activeCatalysts', () => {
    const state = infusionState();
    const result = selectInfusion(state, {
      type: 'catalyst',
      catalyst: { id: 'twin_burst', name: 'Twin Burst', description: '', rarity: 'common', cost: 3, category: 'legacy', trigger: 'on_merge', effectParams: {}, tags: ['combo' as CatalystTag], unlockCondition: '' },
    });
    expect(result.activeCatalysts).toContain('twin_burst');
    // selectInfusion now opens the intermission forge before playing
    expect(result.screen).toBe('forge');
  });

  it('energy reward adds 3 energy', () => {
    const state = infusionState();
    const before = state.energy;
    const result = selectInfusion(state, { type: 'energy' });
    expect(result.energy).toBe(before + 3);
  });

  it('steps reward adds 2 stepsRemaining', () => {
    const state = infusionState();
    const before = state.stepsRemaining;
    const result = selectInfusion(state, { type: 'steps' });
    expect(result.stepsRemaining).toBe(before + 2);
  });

  it('multiplier reward increases globalMultiplier by 0.1', () => {
    const state = infusionState();
    const before = state.globalMultiplier;
    const result = selectInfusion(state, { type: 'multiplier' });
    expect(result.globalMultiplier).toBeCloseTo(before + 0.1, 5);
  });

  it('resets output to 0 on new phase', () => {
    const state = { ...infusionState(), output: 100 };
    const result = selectInfusion(state, { type: 'energy' });
    expect(result.output).toBe(0);
  });

  it('resets momentum on new phase', () => {
    const state = { ...infusionState(), consecutiveValidMoves: 15, momentumMultiplier: 1.75 };
    const result = selectInfusion(state, { type: 'energy' });
    expect(result.consecutiveValidMoves).toBe(0);
    expect(result.momentumMultiplier).toBe(1.0);
  });
});

// ─── buyFromForge ─────────────────────────────────────────────────────────────

describe('buyFromForge', () => {
  const catalystDef = {
    id: 'lucky_seed' as const,
    name: 'Lucky Seed',
    description: '',
    rarity: 'common' as const,
    cost: 3,
    category: 'legacy' as const,
    trigger: 'on_spawn' as const,
    effectParams: {},
    tags: ['spawn' as CatalystTag],
    unlockCondition: '',
  };

  it('adds a catalyst and deducts energy', () => {
    const state = { ...playingState(), energy: 10, activeCatalysts: [] };
    const result = buyFromForge(state, catalystDef);
    expect(result.activeCatalysts).toContain('lucky_seed');
    expect(result.energy).toBe(7);
  });

  it('returns unchanged state when energy is insufficient', () => {
    const state = { ...playingState(), energy: 2, activeCatalysts: [] };
    const result = buyFromForge(state, catalystDef);
    expect(result).toBe(state);
  });

  it('replaces a catalyst at replaceIndex when at MAX_CATALYSTS', () => {
    const state = {
      ...playingState(),
      energy: 20,
      // Fill all 6 slots
      activeCatalysts: ['corner_crown', 'twin_burst', 'high_tribute', 'lucky_seed', 'bankers_edge', 'reserve'] as const,
    };
    const newCatalyst = {
      id: 'combo_wire' as const,
      name: 'Combo Wire',
      description: '',
      rarity: 'common' as const,
      cost: 3,
      category: 'legacy' as const,
      trigger: 'on_merge' as const,
      effectParams: {},
      tags: ['combo' as CatalystTag],
      unlockCondition: '',
    };
    const result = buyFromForge(state as unknown as GameState, newCatalyst, 1);
    expect(result.activeCatalysts[1]).toBe('combo_wire');
  });

  it('returns unchanged state when at MAX_CATALYSTS with no replaceIndex', () => {
    const state = {
      ...playingState(),
      energy: 20,
      // Fill all 6 slots
      activeCatalysts: ['corner_crown', 'twin_burst', 'high_tribute', 'lucky_seed', 'bankers_edge', 'reserve'] as const,
    };
    const result = buyFromForge(state as unknown as GameState, catalystDef);
    expect(result).toBe(state);
  });

  it('sets frozenCell when buying frozen_cell catalyst', () => {
    const frozenDef = {
      id: 'frozen_cell' as const,
      name: 'Frozen Cell',
      description: '',
      rarity: 'common' as const,
      cost: 3,
      category: 'legacy' as const,
      trigger: 'on_move' as const,
      effectParams: {},
      tags: ['board' as CatalystTag],
      unlockCondition: '',
    };
    const state = { ...playingState(), energy: 10, activeCatalysts: [], frozenCell: null };
    const result = buyFromForge(state, frozenDef);
    expect(result.frozenCell).not.toBeNull();
  });
});

// ─── rerollForge ─────────────────────────────────────────────────────────────

describe('rerollForge', () => {
  it('deducts 1 energy and produces new offers', () => {
    const state = {
      ...playingState(),
      screen: 'forge' as const,
      energy: 5,
      forgeOffers: [],
    };
    const result = rerollForge(state);
    expect(result.energy).toBe(4);
    expect(result.forgeOffers.length).toBeGreaterThan(0);
  });

  it('returns unchanged state when energy is 0', () => {
    const state = { ...playingState(), screen: 'forge' as const, energy: 0 };
    expect(rerollForge(state)).toBe(state);
  });
});

// ─── skipForge ───────────────────────────────────────────────────────────────

describe('skipForge', () => {
  it('returns to playing screen', () => {
    const state = { ...playingState(), screen: 'forge' as const, output: 99 };
    const result = skipForge(state);
    expect(result.screen).toBe('playing');
  });

  it('resets output and reactionLog', () => {
    const state = {
      ...playingState(),
      screen: 'forge' as const,
      output: 99,
      reactionLog: [{ step: 1 }] as any,
    };
    const result = skipForge(state);
    expect(result.output).toBe(0);
    expect(result.reactionLog).toHaveLength(0);
  });

  it('resets momentum', () => {
    const state = {
      ...playingState(),
      screen: 'forge' as const,
      consecutiveValidMoves: 10,
      momentumMultiplier: 1.5,
    };
    const result = skipForge(state);
    expect(result.consecutiveValidMoves).toBe(0);
    expect(result.momentumMultiplier).toBe(1.0);
  });
});

// ─── Round-based progression ──────────────────────────────────────────────────

describe('round progression', () => {
  it('initial state starts at roundNumber 1', () => {
    const state = createInitialState(42);
    expect(state.roundNumber).toBe(1);
  });

  it('advanceRound increments roundNumber', () => {
    const state = { ...playingState(), screen: 'round_complete' as const, roundNumber: 1 };
    const next = advanceRound(state);
    expect(next.roundNumber).toBe(2);
  });

  it('advanceRound resets phaseIndex to 0', () => {
    const state = { ...playingState(), screen: 'round_complete' as const, roundNumber: 1, phaseIndex: 5 };
    const next = advanceRound(state);
    expect(next.phaseIndex).toBe(0);
  });

  it('advanceRound transitions to playing screen', () => {
    const state = { ...playingState(), screen: 'round_complete' as const, roundNumber: 1 };
    const next = advanceRound(state);
    expect(next.screen).toBe('playing');
  });

  it('advanceRound resets per-round state (momentum, output, log)', () => {
    const state = {
      ...playingState(),
      screen: 'round_complete' as const,
      roundNumber: 1,
      output: 500,
      consecutiveValidMoves: 8,
      momentumMultiplier: 1.8,
    };
    const next = advanceRound(state);
    expect(next.output).toBe(0);
    expect(next.consecutiveValidMoves).toBe(0);
    expect(next.momentumMultiplier).toBe(1.0);
    expect(next.reactionLog).toHaveLength(0);
  });
});

// ─── Catalyst 6-slot system ───────────────────────────────────────────────────

describe('6-slot catalyst system', () => {
  it('can acquire up to 6 catalysts via infusion', () => {
    let state = playingState();
    const catalysts = [
      'corner_crown', 'twin_burst', 'high_tribute', 'lucky_seed', 'bankers_edge', 'reserve'
    ] as const;
    for (const id of catalysts) {
      state = selectInfusion({ ...state, screen: 'infusion', infusionOptions: [] }, {
        type: 'catalyst',
        catalyst: { id, name: id, description: '', rarity: 'common', cost: 3, category: 'legacy', trigger: 'on_merge', effectParams: {}, tags: ['combo' as CatalystTag], unlockCondition: '' },
      });
      // After infusion, state is on 'forge' — skip to playing
      state = skipForge(state);
    }
    expect(state.activeCatalysts).toHaveLength(6);
  });

  it('does not add 7th catalyst via infusion when 6 are active', () => {
    let state = playingState();
    const catalysts = [
      'corner_crown', 'twin_burst', 'high_tribute', 'lucky_seed', 'bankers_edge', 'reserve'
    ] as const;
    state = { ...state, activeCatalysts: [...catalysts] };
    const result = selectInfusion({ ...state, screen: 'infusion', infusionOptions: [] }, {
      type: 'catalyst',
      catalyst: { id: 'combo_wire', name: 'Combo Wire', description: '', rarity: 'common', cost: 3, category: 'legacy', trigger: 'on_merge', effectParams: {}, tags: ['combo' as CatalystTag], unlockCondition: '' },
    });
    expect(result.activeCatalysts).toHaveLength(6);
    expect(result.activeCatalysts).not.toContain('combo_wire');
  });

  it('replaces catalyst at replaceIndex when 6 slots are full via forge', () => {
    const state = {
      ...playingState(),
      energy: 20,
      activeCatalysts: ['corner_crown', 'twin_burst', 'high_tribute', 'lucky_seed', 'bankers_edge', 'reserve'] as const,
    };
    const newCatalyst = {
      id: 'combo_wire' as const,
      name: 'Combo Wire', description: '', rarity: 'common' as const, cost: 3,
      category: 'legacy' as const, trigger: 'on_merge' as const,
      effectParams: {}, tags: ['combo' as CatalystTag], unlockCondition: '',
    };
    const result = buyFromForge(state as unknown as GameState, newCatalyst, 2);
    expect(result.activeCatalysts[2]).toBe('combo_wire');
    expect(result.activeCatalysts).toHaveLength(6);
  });
});

// ─── Intermission flow (infusion → forge) ────────────────────────────────────

describe('intermission flow', () => {
  it('selectInfusion transitions to forge screen (not playing)', () => {
    const state = { ...playingState(), screen: 'infusion' as const, infusionOptions: [] };
    const result = selectInfusion(state, { type: 'energy' });
    expect(result.screen).toBe('forge');
  });

  it('selectInfusion generates forge offers', () => {
    const state = { ...playingState(), screen: 'infusion' as const, infusionOptions: [] };
    const result = selectInfusion(state, { type: 'energy' });
    expect(result.forgeOffers.length).toBeGreaterThan(0);
  });

  it('skipForge after infusion transitions to playing', () => {
    const state = { ...playingState(), screen: 'infusion' as const, infusionOptions: [] };
    const afterInfusion = selectInfusion(state, { type: 'energy' });
    const afterForge = skipForge(afterInfusion);
    expect(afterForge.screen).toBe('playing');
  });
});

// ─── Catalyst pool system ─────────────────────────────────────────────────────

describe('catalystPool (run-level unique-per-run enforcement)', () => {
  const makeDef = (id: 'lucky_seed' | 'corner_crown' | 'combo_wire') => ({
    id,
    name: id,
    description: '',
    rarity: 'common' as const,
    cost: 3,
    category: 'legacy' as const,
    trigger: 'on_merge' as const,
    effectParams: {},
    tags: ['combo' as CatalystTag],
    unlockCondition: '',
  });

  it('initialises catalystPool equal to unlockedCatalysts', () => {
    const unlocked = ['lucky_seed', 'corner_crown'] as const;
    const state = createInitialState(1, 'corner_protocol', {
      unlockedCatalysts: [...unlocked],
    });
    expect(state.catalystPool).toEqual(expect.arrayContaining([...unlocked]));
    expect(state.catalystPool).toHaveLength(unlocked.length);
  });

  it('catalystPool is undefined when unlockedCatalysts is undefined (full pool)', () => {
    const state = createInitialState(1);
    expect(state.catalystPool).toBeUndefined();
  });

  it('buyFromForge removes acquired catalyst from catalystPool', () => {
    const unlocked = ['lucky_seed', 'corner_crown', 'combo_wire'] as const;
    const state = {
      ...startGame(createInitialState(1, 'corner_protocol', { unlockedCatalysts: [...unlocked] })),
      energy: 20,
    };
    const result = buyFromForge(state, makeDef('lucky_seed'));
    expect(result.activeCatalysts).toContain('lucky_seed');
    expect(result.catalystPool).not.toContain('lucky_seed');
    // Other catalysts remain in pool
    expect(result.catalystPool).toContain('corner_crown');
  });

  it('selectInfusion with catalyst removes it from catalystPool', () => {
    const unlocked = ['lucky_seed', 'corner_crown', 'combo_wire'] as const;
    const state = {
      ...startGame(createInitialState(1, 'corner_protocol', { unlockedCatalysts: [...unlocked] })),
      screen: 'infusion' as const,
      infusionOptions: [],
    };
    const result = selectInfusion(state, { type: 'catalyst', catalyst: makeDef('lucky_seed') });
    expect(result.activeCatalysts).toContain('lucky_seed');
    expect(result.catalystPool).not.toContain('lucky_seed');
    expect(result.catalystPool).toContain('corner_crown');
  });

  it('pool catalysts are not re-offered after being acquired via forge', () => {
    const unlocked = ['lucky_seed', 'corner_crown', 'combo_wire'] as const;
    const state = {
      ...startGame(createInitialState(1, 'corner_protocol', { unlockedCatalysts: [...unlocked] })),
      energy: 30,
      forgeOffers: [],
    };
    // Acquire lucky_seed
    const after = buyFromForge(state, makeDef('lucky_seed'));
    // Pool no longer includes lucky_seed
    expect(after.catalystPool).not.toContain('lucky_seed');
  });

  it('unpurchased forge items stay in pool (return-to-pool behavior)', () => {
    const unlocked = ['lucky_seed', 'corner_crown', 'combo_wire'] as const;
    const initialPool = [...unlocked];
    const state = {
      ...startGame(createInitialState(1, 'corner_protocol', { unlockedCatalysts: [...unlocked] })),
      energy: 0, // not enough to buy
      forgeOffers: [makeDef('lucky_seed'), makeDef('corner_crown')],
    };
    // Skipping forge (or failing to buy) must not shrink the pool
    const afterSkip = skipForge(state);
    expect(afterSkip.catalystPool).toEqual(expect.arrayContaining(initialPool));
    expect(afterSkip.catalystPool).toHaveLength(initialPool.length);
  });

  it('catalystPool is undefined when full-pool mode (no unlockedCatalysts)', () => {
    const state = startGame(createInitialState(42));
    const result = buyFromForge({ ...state, energy: 20 }, makeDef('lucky_seed'));
    expect(result.catalystPool).toBeUndefined();
  });
});
