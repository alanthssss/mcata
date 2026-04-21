import { create } from 'zustand';
import { GameState, Direction, CatalystDef, ForgeShopItem, SignalId, ProtocolId, CatalystId } from '../core/types';
import { ChallengeId } from '../core/challenges';
import { getDailySeed } from '../core/dailyRun';
import { ENABLE_SECONDARY_MODES } from '../core/features';
import {
  createInitialState, startGame, processMoveAction,
  buyForgeItem, buyFromForge, rerollForge, skipForge,
  queueSignal, grantSignal, advanceRound, sellCatalyst, sellPattern, sellSignal,
} from '../core/engine';
import { useProfileStore } from './profileStore';
import { appendRunLog, buildRunLog } from './runLogStore';
import { downloadRunLogs } from '../scripts/exportRunLogs';

interface GameStore extends GameState {
  initGame: (seed?: number, protocol?: ProtocolId) => void;
  /** Atomically initialise a new run and transition to the playing screen. */
  initAndStart: (seed?: number, protocol?: ProtocolId) => void;
  start: () => void;
  move: (dir: Direction) => void;
  purchaseForgeItem: (item: ForgeShopItem, replaceIndex?: number) => void;
  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => void;
  sellCatalystAt: (index: number) => void;
  sellPatternActive: () => void;
  sellSignalById: (signalId: SignalId) => void;
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

  purchaseForgeItem: (item: ForgeShopItem, replaceIndex?: number) => {
    let unlockedCatalystId: CatalystId | null = null;
    set(state => {
      const next = buyForgeItem(state, item, replaceIndex);
      if (item.type === 'catalyst' && next !== state && next.activeCatalysts.includes(item.catalyst.id)) {
        unlockedCatalystId = item.catalyst.id;
      }
      return next;
    });
    if (unlockedCatalystId) useProfileStore.getState().unlockCatalysts([unlockedCatalystId]);
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

  sellPatternActive: () => {
    set(state => sellPattern(state));
  },

  sellSignalById: (signalId: SignalId) => {
    set(state => sellSignal(state, signalId));
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
    if (!ENABLE_SECONDARY_MODES) {
      set(state => ({ ...state, screen: 'start', challengeId: null, isDailyRun: false }));
      return;
    }
    set(state => ({ ...state, screen: 'challenge_select' }));
  },

  startChallenge: (challengeId: ChallengeId, seed?: number) => {
    if (!ENABLE_SECONDARY_MODES) {
      set(createInitialState(seed ?? Date.now()));
      return;
    }
    set(startGame({ ...createInitialState(seed ?? Date.now()), challengeId, isDailyRun: false }));
  },

  startDailyRun: () => {
    if (!ENABLE_SECONDARY_MODES) {
      set(createInitialState(Date.now()));
      return;
    }
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

// ─── Run-log side effect ──────────────────────────────────────────────────────
// Save a completed run log to localStorage whenever the screen transitions
// to 'game_over' or 'run_complete'.  This is fire-and-forget and does not
// affect game logic.
// In dev mode, also auto-download the run log as a JSON file for analysis.
useGameStore.subscribe((state, prevState) => {
  if (
    prevState.screen !== state.screen &&
    (state.screen === 'game_over' || state.screen === 'run_complete')
  ) {
    const log = buildRunLog(state);
    appendRunLog(log);
    if (import.meta.env.DEV) {
      downloadRunLogs(`run-${log.runId}.json`, { scope: 'current' });
    }
  }
});
