import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE,
  calculateRunReward,
  applyRunReward,
  unlockCatalyst,
  unlockSignal,
  unlockProtocol,
  unlockAnomaly,
  unlockAscensionLevel,
  canAffordCatalyst,
  canAffordSignal,
  canAffordProtocol,
  canAffordAscension,
  getLockedCatalysts,
  getMaxPlayableAscension,
} from './profile';
import type { ProfileState, GameState } from './types';
import { createInitialState, startGame } from './engine';

function richProfile(metaCurrency: number): ProfileState {
  return { ...DEFAULT_PROFILE, metaCurrency };
}

function fakeCompletedState(): GameState {
  const state = startGame(createInitialState(1));
  return {
    ...state,
    screen: 'run_complete',
    phaseIndex: 5,
    totalOutput: 600,
  };
}

function fakeGameOverState(): GameState {
  const state = startGame(createInitialState(1));
  return {
    ...state,
    screen: 'game_over',
    phaseIndex: 2,
    totalOutput: 150,
  };
}

describe('DEFAULT_PROFILE', () => {
  it('starts with 8 legacy catalysts unlocked', () => {
    expect(DEFAULT_PROFILE.unlockedCatalysts).toHaveLength(8);
  });

  it('starts with no signals', () => {
    expect(DEFAULT_PROFILE.unlockedSignals).toHaveLength(0);
  });

  it('starts at ascension level 0', () => {
    expect(DEFAULT_PROFILE.unlockedAscensionLevel).toBe(0);
  });

  it('starts with 0 meta currency', () => {
    expect(DEFAULT_PROFILE.metaCurrency).toBe(0);
  });
});

describe('calculateRunReward', () => {
  it('awards base reward for any run', () => {
    const reward = calculateRunReward(fakeGameOverState(), 0);
    expect(reward.metaCurrencyEarned).toBeGreaterThanOrEqual(10);
  });

  it('awards more for a completed run vs a game over', () => {
    const win  = calculateRunReward(fakeCompletedState(), 1);
    const loss = calculateRunReward(fakeGameOverState(), 0);
    expect(win.metaCurrencyEarned).toBeGreaterThan(loss.metaCurrencyEarned);
  });

  it('includes anomaly bonus when survival rate > 0', () => {
    const withAnomaly    = calculateRunReward(fakeGameOverState(), 1);
    const withoutAnomaly = calculateRunReward(fakeGameOverState(), 0);
    expect(withAnomaly.metaCurrencyEarned).toBeGreaterThan(withoutAnomaly.metaCurrencyEarned);
  });

  it('awards high-output bonus above threshold', () => {
    const highOutput = calculateRunReward(
      { ...fakeCompletedState(), totalOutput: 700 },
      1,
    );
    const lowOutput = calculateRunReward(
      { ...fakeCompletedState(), totalOutput: 200 },
      1,
    );
    expect(highOutput.metaCurrencyEarned).toBeGreaterThan(lowOutput.metaCurrencyEarned);
  });

  it('returns a breakdown with correct fields', () => {
    const { breakdown } = calculateRunReward(fakeCompletedState(), 1);
    expect(breakdown).toHaveProperty('base');
    expect(breakdown).toHaveProperty('phasesBonus');
    expect(breakdown).toHaveProperty('anomalyBonus');
    expect(breakdown).toHaveProperty('outputBonus');
  });
});

describe('applyRunReward', () => {
  it('adds metaCurrencyEarned to profile', () => {
    const profile = richProfile(50);
    const reward = { metaCurrencyEarned: 25, breakdown: { base: 10, phasesBonus: 10, anomalyBonus: 5, outputBonus: 0 } };
    const updated = applyRunReward(profile, reward);
    expect(updated.metaCurrency).toBe(75);
  });
});

describe('unlockCatalyst', () => {
  it('returns the profile unchanged when already unlocked', () => {
    const profile = richProfile(100);
    const result = unlockCatalyst(profile, 'corner_crown'); // already in base set
    expect(result).toEqual(profile);
  });

  it('deducts cost and adds the catalyst', () => {
    const profile = richProfile(100);
    const result = unlockCatalyst(profile, 'chain_reactor'); // rare → cost 25
    expect(result).not.toBeNull();
    expect(result!.unlockedCatalysts).toContain('chain_reactor');
    expect(result!.metaCurrency).toBeLessThan(100);
  });

  it('returns null when insufficient currency', () => {
    const profile = richProfile(0);
    const result = unlockCatalyst(profile, 'chain_reactor');
    expect(result).toBeNull();
  });
});

describe('unlockSignal', () => {
  it('returns null when insufficient currency', () => {
    const profile = richProfile(0);
    expect(unlockSignal(profile, 'pulse_boost')).toBeNull();
  });

  it('adds the signal and deducts cost', () => {
    const profile = richProfile(100);
    const result = unlockSignal(profile, 'pulse_boost');
    expect(result).not.toBeNull();
    expect(result!.unlockedSignals).toContain('pulse_boost');
  });

  it('returns unchanged profile if already unlocked', () => {
    const profile = { ...richProfile(100), unlockedSignals: ['pulse_boost'] as any };
    const result = unlockSignal(profile, 'pulse_boost');
    expect(result!.metaCurrency).toBe(100); // no cost deducted
  });
});

describe('unlockProtocol', () => {
  it('adds the protocol when affordable', () => {
    const profile = richProfile(100);
    const result = unlockProtocol(profile, 'sparse_protocol');
    expect(result).not.toBeNull();
    expect(result!.unlockedProtocols).toContain('sparse_protocol');
  });

  it('returns null when insufficient currency', () => {
    expect(unlockProtocol(richProfile(5), 'sparse_protocol')).toBeNull();
  });
});

describe('unlockAnomaly', () => {
  it('returns unchanged profile if already unlocked', () => {
    const profile = richProfile(100);
    const result = unlockAnomaly(profile, 'entropy_tax');
    expect(result!.metaCurrency).toBe(100);
  });

  it('deducts cost and adds the anomaly when not unlocked', () => {
    const profile: ProfileState = { ...richProfile(100), unlockedAnomalies: [] };
    const result = unlockAnomaly(profile, 'entropy_tax');
    expect(result!.unlockedAnomalies).toContain('entropy_tax');
    expect(result!.metaCurrency).toBeLessThan(100);
  });
});

describe('unlockAscensionLevel', () => {
  it('returns unchanged profile when already unlocked', () => {
    const profile: ProfileState = { ...richProfile(200), unlockedAscensionLevel: 3 };
    const result = unlockAscensionLevel(profile, 2); // 2 < 3
    expect(result!.unlockedAscensionLevel).toBe(3);
    expect(result!.metaCurrency).toBe(200);
  });

  it('deducts cost × level and sets the ascension level', () => {
    const profile = richProfile(200);
    const result = unlockAscensionLevel(profile, 3); // cost = 20 × 3 = 60
    expect(result).not.toBeNull();
    expect(result!.unlockedAscensionLevel).toBe(3);
    expect(result!.metaCurrency).toBe(140);
  });

  it('returns null when insufficient currency', () => {
    expect(unlockAscensionLevel(richProfile(10), 5)).toBeNull();
  });
});

describe('canAfford helpers', () => {
  it('canAffordCatalyst returns true when able to pay', () => {
    expect(canAffordCatalyst(richProfile(100), 'chain_reactor')).toBe(true);
  });

  it('canAffordCatalyst returns false when broke', () => {
    expect(canAffordCatalyst(richProfile(0), 'chain_reactor')).toBe(false);
  });

  it('canAffordSignal', () => {
    expect(canAffordSignal(richProfile(20))).toBe(true);
    expect(canAffordSignal(richProfile(19))).toBe(false);
  });

  it('canAffordProtocol', () => {
    expect(canAffordProtocol(richProfile(30))).toBe(true);
    expect(canAffordProtocol(richProfile(29))).toBe(false);
  });

  it('canAffordAscension', () => {
    // level 3 costs 60
    expect(canAffordAscension(richProfile(60), 3)).toBe(true);
    expect(canAffordAscension(richProfile(59), 3)).toBe(false);
  });
});

describe('getLockedCatalysts', () => {
  it('returns catalysts not in the unlocked list', () => {
    const locked = getLockedCatalysts(DEFAULT_PROFILE);
    for (const id of DEFAULT_PROFILE.unlockedCatalysts) {
      expect(locked).not.toContain(id);
    }
    expect(locked.length).toBeGreaterThan(0);
  });
});

describe('getMaxPlayableAscension', () => {
  it('returns 0 for a fresh profile', () => {
    expect(getMaxPlayableAscension(DEFAULT_PROFILE)).toBe(0);
  });

  it('returns the unlocked ascension level', () => {
    const profile: ProfileState = { ...richProfile(200), unlockedAscensionLevel: 5 };
    expect(getMaxPlayableAscension(profile)).toBe(5);
  });
});
