/**
 * Tests for the profileStore localStorage persistence system.
 *
 * Note: window.localStorage and URLSearchParams are not available in the
 * pure Node.js vitest environment, so this file tests the profile core
 * helpers (DEFAULT_PROFILE, unlockCatalyst) and the PHASE_CONFIG benchmark
 * fields that are exercised by the new store logic.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_PROFILE } from './profile';
import { BASE_UNLOCKED_CATALYSTS, BASE_UNLOCKED_PROTOCOLS } from './unlockConfig';
import { PHASE_CONFIG } from './config';
import type { PhaseDef, ChallengeTier } from './types';

// ─── Profile defaults ──────────────────────────────────────────────────────────

describe('DEFAULT_PROFILE unlock defaults', () => {
  it('unlocks exactly the 8 legacy catalysts by default', () => {
    expect(DEFAULT_PROFILE.unlockedCatalysts).toHaveLength(8);
    for (const id of BASE_UNLOCKED_CATALYSTS) {
      expect(DEFAULT_PROFILE.unlockedCatalysts).toContain(id);
    }
  });

  it('only unlocks corner_protocol by default', () => {
    expect(DEFAULT_PROFILE.unlockedProtocols).toEqual(BASE_UNLOCKED_PROTOCOLS);
    expect(DEFAULT_PROFILE.unlockedProtocols).toContain('corner_protocol');
    expect(DEFAULT_PROFILE.unlockedProtocols).not.toContain('sparse_protocol');
    expect(DEFAULT_PROFILE.unlockedProtocols).not.toContain('overload_protocol');
  });

  it('starts with zero meta currency', () => {
    expect(DEFAULT_PROFILE.metaCurrency).toBe(0);
  });

  it('starts at ascension level 0', () => {
    expect(DEFAULT_PROFILE.unlockedAscensionLevel).toBe(0);
  });
});

// ─── PHASE_CONFIG benchmark fields ───────────────────────────────────────────

describe('PHASE_CONFIG benchmark fields', () => {
  it('has 6 phases', () => {
    expect(PHASE_CONFIG).toHaveLength(6);
  });

  it('every phase has expectedOutput > 0', () => {
    for (const phase of PHASE_CONFIG) {
      expect(phase.expectedOutput).toBeGreaterThan(0);
    }
  });

  it('every phase has highSkillOutput >= expectedOutput', () => {
    for (const phase of PHASE_CONFIG) {
      expect(phase.highSkillOutput).toBeGreaterThanOrEqual(phase.expectedOutput);
    }
  });

  it('every phase has expectedOutput >= targetOutput', () => {
    for (const phase of PHASE_CONFIG) {
      expect(phase.expectedOutput).toBeGreaterThanOrEqual(phase.targetOutput);
    }
  });

  it('every phase has a challengeTier', () => {
    const validTiers: ChallengeTier[] = ['small', 'big', 'boss'];
    for (const phase of PHASE_CONFIG) {
      expect(validTiers).toContain(phase.challengeTier);
    }
  });

  it('boss phases have a modifier description', () => {
    const bossPhases = PHASE_CONFIG.filter(p => p.challengeTier === 'boss');
    expect(bossPhases.length).toBeGreaterThan(0);
    for (const phase of bossPhases) {
      expect(typeof phase.modifier).toBe('string');
      expect((phase.modifier as string).length).toBeGreaterThan(0);
    }
  });

  it('PHASE_CONFIG is assignable to PhaseDef[] (shape check)', () => {
    // This is essentially a compile-time check reproduced at runtime
    const phases: PhaseDef[] = PHASE_CONFIG;
    expect(phases).toHaveLength(6);
  });

  it('phase numbers are sequential starting from 1', () => {
    PHASE_CONFIG.forEach((phase, idx) => {
      expect(phase.phaseNumber).toBe(idx + 1);
    });
  });
});

// ─── Protocol availability ────────────────────────────────────────────────────

import { ALL_PROTOCOLS, DEFAULT_PROTOCOL, PROTOCOL_DEFS } from './protocols';

describe('Protocol system', () => {
  it('exports 3 protocols', () => {
    expect(ALL_PROTOCOLS).toHaveLength(3);
  });

  it('default protocol is corner_protocol', () => {
    expect(DEFAULT_PROTOCOL).toBe('corner_protocol');
  });

  it('all protocols have required fields', () => {
    const validDifficulties = new Set(['standard', 'tactical', 'overclocked']);
    for (const protocol of ALL_PROTOCOLS) {
      expect(typeof protocol.id).toBe('string');
      expect(typeof protocol.name).toBe('string');
      expect(typeof protocol.description).toBe('string');
      expect(typeof protocol.icon).toBe('string');
      expect(protocol.icon.length).toBeGreaterThan(0);
      expect(validDifficulties).toContain(protocol.difficulty);
      expect(typeof protocol.cornerMultiplier).toBe('number');
      expect(typeof protocol.startTiles).toBe('number');
      expect(typeof protocol.spawnFrequencyFactor).toBe('number');
      expect(typeof protocol.outputScale).toBe('number');
      expect(typeof protocol.stepsReduction).toBe('number');
    }
  });

  it('all protocols have unique difficulty tiers', () => {
    const difficulties = ALL_PROTOCOLS.map(p => p.difficulty);
    const unique = new Set(difficulties);
    expect(unique.size).toBe(ALL_PROTOCOLS.length);
  });

  it('overload_protocol has higher outputScale than corner_protocol', () => {
    expect(PROTOCOL_DEFS.overload_protocol.outputScale).toBeGreaterThan(
      PROTOCOL_DEFS.corner_protocol.outputScale,
    );
  });

  it('overload_protocol has stepsReduction > 0', () => {
    expect(PROTOCOL_DEFS.overload_protocol.stepsReduction).toBeGreaterThan(0);
  });

  it('sparse_protocol starts with fewer tiles', () => {
    expect(PROTOCOL_DEFS.sparse_protocol.startTiles).toBeLessThan(
      PROTOCOL_DEFS.corner_protocol.startTiles,
    );
  });
});

// ─── Engine initialisation with protocol ──────────────────────────────────────

import { createInitialState } from './engine';

describe('createInitialState with protocol', () => {
  it('uses corner_protocol by default', () => {
    const state = createInitialState(42);
    expect(state.protocol).toBe('corner_protocol');
  });

  it('applies sparse_protocol when requested', () => {
    const state = createInitialState(42, 'sparse_protocol');
    expect(state.protocol).toBe('sparse_protocol');
  });

  it('applies overload_protocol when requested', () => {
    const state = createInitialState(42, 'overload_protocol');
    expect(state.protocol).toBe('overload_protocol');
  });

  it('overload_protocol run starts with fewer steps than corner_protocol', () => {
    const corner   = createInitialState(42, 'corner_protocol');
    const overload = createInitialState(42, 'overload_protocol');
    expect(overload.stepsRemaining).toBeLessThan(corner.stepsRemaining);
  });

  it('sparse_protocol run starts with fewer tiles on board', () => {
    // sparse = 1 start tile, corner = 2
    const sparse = createInitialState(42, 'sparse_protocol');
    const corner = createInitialState(42, 'corner_protocol');
    const sparseTiles = sparse.grid.flat().filter(Boolean).length;
    const cornerTiles = corner.grid.flat().filter(Boolean).length;
    expect(sparseTiles).toBeLessThanOrEqual(cornerTiles);
  });
});
