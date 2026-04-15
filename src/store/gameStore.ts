import { create } from 'zustand';
import { GameState, Direction, InfusionChoice, CatalystDef, SignalId, ProtocolId } from '../core/types';
import { ChallengeId } from '../core/challenges';
import { getDailySeed } from '../core/dailyRun';
import {
  createInitialState, startGame, processMoveAction,
  selectInfusion, buyFromForge, rerollForge, skipForge,
  queueSignal, grantSignal, advanceRound, sellCatalyst,
} from '../core/engine';
import { useProfileStore } from './profileStore';

interface GameStore extends GameState {
  initGame: (seed?: number, protocol?: ProtocolId) => void;
  /** Atomically initialise a new run and transition to the playing screen. */
  initAndStart: (seed?: number, protocol?: ProtocolId) => void;
  start: () => void;
  move: (dir: Direction) => void;
  chooseInfusion: (choice: InfusionChoice) => void;
  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => void;
  sellCatalystAt: (index: number) => void;
  reroll: () => void;
  skipForgePhase: () => void;
  activateSignal: (signalId: SignalId) => void;
  addSignal: (signalId: SignalId) => void;
  /** Advance the run into the next round after seeing the round_complete screen. */
  nextRound: () => void;
  /** Navigate to challenge selection screen */
  showChallengeSelect: () => void;
  startChallenge: (challengeId: ChallengeId, seed?: number) => void;
  startDailyRun: () => void;
  dismissMilestone: () => void;
  dismissJackpot: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(Date.now()),

  initGame: (seed?: number, protocol?: ProtocolId) => {
    set(createInitialState(seed ?? Date.now(), protocol));
  },

  initAndStart: (seed?: number, protocol?: ProtocolId) => {
    set(startGame(createInitialState(seed ?? Date.now(), protocol)));
  },

  start: () => {
    set(state => startGame(state));
  },

  move: (dir: Direction) => {
    set(state => processMoveAction(state, dir));
  },

  chooseInfusion: (choice: InfusionChoice) => {
    set(state => selectInfusion(state, choice));
    // Unlock persistence: mark the catalyst as unlocked in the profile
    // immediately when it is acquired via Infusion.
    if (choice.type === 'catalyst') {
      useProfileStore.getState().unlockCatalysts([choice.catalyst.id]);
    }
  },

  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => {
    let shouldUnlock = false;
    set(state => {
      const next = buyFromForge(state, catalyst, replaceIndex);
      shouldUnlock = next !== state && next.activeCatalysts.includes(catalyst.id);
      return next;
    });
    if (shouldUnlock) useProfileStore.getState().unlockCatalysts([catalyst.id]);
  },

  sellCatalystAt: (index: number) => {
    set(state => sellCatalyst(state, index));
  },

  reroll: () => {
    set(state => rerollForge(state));
  },

  skipForgePhase: () => {
    set(state => skipForge(state));
  },

  activateSignal: (signalId: SignalId) => {
    set(state => queueSignal(state, signalId));
  },

  addSignal: (signalId: SignalId) => {
    set(state => grantSignal(state, signalId));
  },

  nextRound: () => {
    set(state => advanceRound(state));
  },

  showChallengeSelect: () => {
    set(state => ({ ...state, screen: 'challenge_select' }));
  },

  startChallenge: (challengeId: ChallengeId, seed?: number) => {
    set(startGame({ ...createInitialState(seed ?? Date.now()), challengeId, isDailyRun: false }));
  },

  startDailyRun: () => {
    const seed = getDailySeed();
    set(startGame({ ...createInitialState(seed), isDailyRun: true, challengeId: null }));
  },

  dismissMilestone: () => {
    set(state => ({
      ...state,
      pendingMilestones: state.pendingMilestones.slice(1),
    }));
  },

  dismissJackpot: () => {
    set(state => ({ ...state, jackpotTriggered: false }));
  },
}));
