import { describe, it, expect } from 'vitest';
import { createRunState, finalizeRun } from './runAdapter';
import { DEFAULT_PROFILE } from './profile';
import type { ProfileState } from './types';

function richProfile(metaCurrency: number): ProfileState {
  return { ...DEFAULT_PROFILE, metaCurrency };
}

describe('createRunState', () => {
  it('creates a game state in the playing screen', () => {
    const state = createRunState(DEFAULT_PROFILE, { seed: 1 });
    expect(state.screen).toBe('playing');
  });

  it('uses the default protocol when none specified', () => {
    const state = createRunState(DEFAULT_PROFILE, { seed: 1 });
    expect(state.protocol).toBe('corner_protocol');
  });

  it('applies the requested protocol', () => {
    const state = createRunState(DEFAULT_PROFILE, {
      seed: 1,
      protocol: 'overload_protocol',
    });
    expect(state.protocol).toBe('overload_protocol');
  });

  it('caps ascension to the profile unlock level', () => {
    // Default profile has unlockedAscensionLevel = 0
    const state = createRunState(DEFAULT_PROFILE, { seed: 1, ascensionLevel: 5 });
    expect(state.ascensionLevel).toBe(0);
  });

  it('uses the requested ascension level when within unlock', () => {
    const profile: ProfileState = { ...richProfile(200), unlockedAscensionLevel: 3 };
    const state = createRunState(profile, { seed: 1, ascensionLevel: 3 });
    expect(state.ascensionLevel).toBe(3);
  });

  it('sets unlockedCatalysts to undefined when ignoreUnlocks=true', () => {
    const state = createRunState(DEFAULT_PROFILE, { seed: 1, ignoreUnlocks: true });
    expect(state.unlockedCatalysts).toBeUndefined();
  });

  it('sets unlockedCatalysts from profile when ignoreUnlocks is not set', () => {
    const state = createRunState(DEFAULT_PROFILE, { seed: 1 });
    expect(state.unlockedCatalysts).toEqual(DEFAULT_PROFILE.unlockedCatalysts);
  });
});

describe('finalizeRun', () => {
  it('returns a reward and an updated profile', () => {
    const state = createRunState(DEFAULT_PROFILE, { seed: 1 });
    const { reward, updatedProfile } = finalizeRun(DEFAULT_PROFILE, state, 0);
    expect(reward.metaCurrencyEarned).toBeGreaterThan(0);
    expect(updatedProfile.metaCurrency).toBe(reward.metaCurrencyEarned);
  });

  it('updated profile has increased meta currency', () => {
    const profile = richProfile(50);
    const state = createRunState(profile, { seed: 1 });
    const { updatedProfile } = finalizeRun(profile, state, 0);
    expect(updatedProfile.metaCurrency).toBeGreaterThan(50);
  });
});
