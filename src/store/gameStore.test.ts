import { describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import { createInitialState } from '../core/engine';

describe('secondary mode guards', () => {
  it('keeps challenge selection disabled', () => {
    useGameStore.setState(createInitialState(1));
    useGameStore.getState().showChallengeSelect();
    const state = useGameStore.getState();
    expect(state.screen).toBe('start');
    expect(state.challengeId).toBeNull();
    expect(state.isDailyRun).toBe(false);
  });

  it('prevents challenge and daily starts', () => {
    useGameStore.setState(createInitialState(2));
    useGameStore.getState().startChallenge('no_corners', 1234);
    let state = useGameStore.getState();
    expect(state.screen).toBe('start');
    expect(state.challengeId).toBeNull();
    expect(state.isDailyRun).toBe(false);

    useGameStore.getState().startDailyRun();
    state = useGameStore.getState();
    expect(state.screen).toBe('start');
    expect(state.challengeId).toBeNull();
    expect(state.isDailyRun).toBe(false);
  });

  it('still starts standard runs normally', () => {
    useGameStore.setState(createInitialState(3));
    useGameStore.getState().initAndStart(999, 'corner_protocol');
    const state = useGameStore.getState();
    expect(state.screen).toBe('playing');
    expect(state.challengeId).toBeNull();
    expect(state.isDailyRun).toBe(false);
  });
});
