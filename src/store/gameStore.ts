import { create } from 'zustand';
import { GameState, Direction, InfusionChoice, CatalystDef, SignalId, ProtocolId } from '../core/types';
import {
  createInitialState, startGame, processMoveAction,
  selectInfusion, buyFromForge, rerollForge, skipForge,
  queueSignal, grantSignal,
} from '../core/engine';

interface GameStore extends GameState {
  initGame: (seed?: number, protocol?: ProtocolId) => void;
  /** Atomically initialise a new run and transition to the playing screen. */
  initAndStart: (seed?: number, protocol?: ProtocolId) => void;
  start: () => void;
  move: (dir: Direction) => void;
  chooseInfusion: (choice: InfusionChoice) => void;
  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => void;
  reroll: () => void;
  skipForgePhase: () => void;
  activateSignal: (signalId: SignalId) => void;
  addSignal: (signalId: SignalId) => void;
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
  },

  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => {
    set(state => buyFromForge(state, catalyst, replaceIndex));
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
}));
