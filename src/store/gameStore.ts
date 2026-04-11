import { create } from 'zustand';
import { GameState, Direction, InfusionChoice, CatalystDef } from '../core/types';
import {
  createInitialState, startGame, processMoveAction,
  selectInfusion, buyFromForge, rerollForge, skipForge
} from '../core/engine';

interface GameStore extends GameState {
  initGame: (seed?: number) => void;
  start: () => void;
  move: (dir: Direction) => void;
  chooseInfusion: (choice: InfusionChoice) => void;
  purchaseCatalyst: (catalyst: CatalystDef, replaceIndex?: number) => void;
  reroll: () => void;
  skipForgePhase: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(Date.now()),

  initGame: (seed?: number) => {
    set(createInitialState(seed ?? Date.now()));
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
}));
