import { GameState, Direction, CatalystDef, InfusionChoice, CatalystId, Grid, Position } from './types';
import { applyMove } from './move';
import { computeScore } from './score';
import { createRng } from './rng';
import {
  cloneGrid, createEmptyGrid, getEmptyCells,
  spawnTile, resetMergedFlags
} from './board';
import { applyEntropyTax, applyCollapseField } from './anomalies';
import { PHASES, FORGE_AFTER_PHASE_INDEX } from './phases';
import { generateForgeOffers } from './forge';
import { generateInfusionOptions } from './infusion';
import { ReactionLogEntry } from './types';

const MAX_LOG = 10;
const MAX_CATALYSTS = 3;

function makeInitialGrid(rngSeed: number): { grid: Grid; idCounter: number } {
  const rng = createRng(rngSeed);
  let grid = createEmptyGrid();
  let idCounter = 0;

  for (let i = 0; i < 2; i++) {
    const empty = getEmptyCells(grid);
    if (empty.length === 0) break;
    const pos = rng.pick(empty);
    const value = rng.next() < 0.9 ? 2 : 4;
    const result = spawnTile(grid, value, pos, idCounter);
    grid = result.grid;
    idCounter = result.id;
  }

  return { grid, idCounter };
}

export function createInitialState(seed: number): GameState {
  const rngSeed = seed;
  const { grid, idCounter } = makeInitialGrid(rngSeed);
  const phase = PHASES[0];

  return {
    screen: 'start',
    grid,
    phaseIndex: 0,
    stepsRemaining: phase.steps,
    energy: 10,
    output: 0,
    totalOutput: 0,
    activeCatalysts: [],
    globalMultiplier: 1.0,
    comboWireCount: 0,
    frozenCell: null,
    collapseFieldCounter: 0,
    entropyBlockedCell: null,
    reactionLog: [],
    forgeOffers: [],
    infusionOptions: [],
    tileIdCounter: idCounter,
    rngSeed,
  };
}

export function startGame(state: GameState): GameState {
  return { ...state, screen: 'playing' };
}

export function processMoveAction(state: GameState, dir: Direction): GameState {
  if (state.screen !== 'playing') return state;
  if (state.stepsRemaining <= 0) return state;

  const rng = createRng(state.rngSeed + state.reactionLog.length + 1);
  const gridBefore = cloneGrid(state.grid);

  let entropyBlockedCell: Position | null = null;
  let anomalyEffectPre = '';
  const currentPhase = PHASES[state.phaseIndex];
  if (currentPhase.anomaly === 'entropy_tax') {
    const { blockedCell, description } = applyEntropyTax(state.grid, rng);
    entropyBlockedCell = blockedCell;
    anomalyEffectPre = description;
  }

  const moveResult = applyMove(state.grid, dir, state.tileIdCounter);
  if (!moveResult.changed) {
    return state;
  }

  let newGrid = moveResult.grid;
  let newIdCounter = moveResult.newTileIdCounter;

  let newCollapseCounter = state.collapseFieldCounter;
  let anomalyEffectPost = anomalyEffectPre;
  if (currentPhase.anomaly === 'collapse_field') {
    newCollapseCounter++;
    const collapseResult = applyCollapseField(newGrid, newCollapseCounter);
    if (collapseResult.triggered) {
      newGrid = collapseResult.grid;
      anomalyEffectPost = collapseResult.description;
    }
  }

  const comboWireActive = state.activeCatalysts.includes('combo_wire') && state.comboWireCount >= 2;
  const scoreResult = computeScore({
    merges: moveResult.merges,
    activeCatalysts: state.activeCatalysts,
    globalMultiplier: state.globalMultiplier,
    comboWireActive,
  });

  let newComboCount = state.comboWireCount;
  if (state.activeCatalysts.includes('combo_wire')) {
    if (scoreResult.base > 0) {
      newComboCount = Math.min(newComboCount + 1, 3);
    } else {
      newComboCount = 0;
    }
  }

  let spawnPos: Position | null = null;
  const emptyAfterMove = getEmptyCells(newGrid).filter(p => {
    if (entropyBlockedCell && p.row === entropyBlockedCell.row && p.col === entropyBlockedCell.col) return false;
    if (state.frozenCell && p.row === state.frozenCell.row && p.col === state.frozenCell.col) return false;
    return true;
  });

  if (emptyAfterMove.length > 0) {
    spawnPos = rng.pick(emptyAfterMove);
    const spawnValue = state.activeCatalysts.includes('lucky_seed')
      ? (rng.next() < 0.75 ? 2 : 4)
      : (rng.next() < 0.9 ? 2 : 4);
    const spawnResult = spawnTile(newGrid, spawnValue, spawnPos, newIdCounter);
    newGrid = spawnResult.grid;
    newIdCounter = spawnResult.id;
  }

  newGrid = resetMergedFlags(newGrid);

  const newSteps = state.stepsRemaining - 1;
  const newOutput = state.output + scoreResult.finalOutput;
  const newTotalOutput = state.totalOutput + scoreResult.finalOutput;

  const logEntry: ReactionLogEntry = {
    step: PHASES[state.phaseIndex].steps - newSteps,
    action: dir,
    gridBefore,
    gridAfter: cloneGrid(newGrid),
    merges: moveResult.merges,
    spawn: spawnPos,
    anomalyEffect: anomalyEffectPost || null,
    base: scoreResult.base,
    multipliers: scoreResult.multipliers,
    finalOutput: scoreResult.finalOutput,
    triggeredCatalysts: scoreResult.triggeredCatalysts,
  };

  const newLog = [logEntry, ...state.reactionLog].slice(0, MAX_LOG);

  let newState: GameState = {
    ...state,
    grid: newGrid,
    stepsRemaining: newSteps,
    output: newOutput,
    totalOutput: newTotalOutput,
    comboWireCount: newComboCount,
    collapseFieldCounter: newCollapseCounter,
    entropyBlockedCell,
    reactionLog: newLog,
    tileIdCounter: newIdCounter,
    rngSeed: state.rngSeed + 1,
  };

  if (newOutput >= currentPhase.targetOutput || newSteps <= 0) {
    newState = handlePhaseEnd(newState);
  }

  return newState;
}

function handlePhaseEnd(state: GameState): GameState {
  const currentPhase = PHASES[state.phaseIndex];
  let energy = state.energy;
  let output = state.output;

  if (state.activeCatalysts.includes('bankers_edge')) {
    energy += 2;
  }

  if (state.activeCatalysts.includes('reserve')) {
    output += state.stepsRemaining * 20;
  }

  const succeeded = output >= currentPhase.targetOutput;

  if (!succeeded) {
    return { ...state, screen: 'game_over', output, energy };
  }

  if (state.phaseIndex >= PHASES.length - 1) {
    return { ...state, screen: 'run_complete', output, energy };
  }

  const nextPhaseIndex = state.phaseIndex + 1;
  if (state.phaseIndex === FORGE_AFTER_PHASE_INDEX) {
    const rng = createRng(state.rngSeed + 100);
    const forgeOffers = generateForgeOffers(state.activeCatalysts, 3, rng.next.bind(rng));

    return {
      ...state,
      screen: 'forge',
      output,
      energy,
      forgeOffers,
      phaseIndex: nextPhaseIndex,
      stepsRemaining: PHASES[nextPhaseIndex].steps,
    };
  }

  const rng = createRng(state.rngSeed + 200);
  const infusionOptions = generateInfusionOptions(state.activeCatalysts, rng.next.bind(rng));

  return {
    ...state,
    screen: 'infusion',
    output,
    energy,
    infusionOptions,
    phaseIndex: nextPhaseIndex,
    stepsRemaining: PHASES[nextPhaseIndex].steps,
  };
}

export function selectInfusion(state: GameState, choice: InfusionChoice): GameState {
  let newState = { ...state };

  switch (choice.type) {
    case 'catalyst':
      if (newState.activeCatalysts.length < MAX_CATALYSTS) {
        newState.activeCatalysts = [...newState.activeCatalysts, choice.catalyst.id];
        if (choice.catalyst.id === 'frozen_cell' && !newState.frozenCell) {
          newState.frozenCell = { row: 1, col: 1 };
        }
      }
      break;
    case 'energy':
      newState.energy += 3;
      break;
    case 'steps':
      newState.stepsRemaining += 2;
      break;
    case 'multiplier':
      newState.globalMultiplier = Math.round((newState.globalMultiplier + 0.1) * 100) / 100;
      break;
  }

  newState.output = 0;
  newState.screen = 'playing';

  const rng = createRng(newState.rngSeed + 300);
  let grid = createEmptyGrid();
  let idCounter = newState.tileIdCounter;
  for (let i = 0; i < 2; i++) {
    const empty = getEmptyCells(grid);
    if (empty.length > 0) {
      const pos = rng.pick(empty);
      const val = rng.next() < 0.9 ? 2 : 4;
      const r = spawnTile(grid, val, pos, idCounter);
      grid = r.grid;
      idCounter = r.id;
    }
  }
  newState.grid = grid;
  newState.tileIdCounter = idCounter;
  newState.reactionLog = [];

  return newState;
}

export function buyFromForge(state: GameState, catalyst: CatalystDef, replaceIndex?: number): GameState {
  if (state.energy < catalyst.cost) return state;

  const newCatalysts: CatalystId[] = [...state.activeCatalysts];
  const energy = state.energy - catalyst.cost;

  if (newCatalysts.length < MAX_CATALYSTS) {
    newCatalysts.push(catalyst.id);
  } else if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < newCatalysts.length) {
    newCatalysts[replaceIndex] = catalyst.id;
  } else {
    return state;
  }

  let frozenCell = state.frozenCell;
  if (catalyst.id === 'frozen_cell' && !frozenCell) {
    frozenCell = { row: 1, col: 1 };
  }

  return { ...state, activeCatalysts: newCatalysts, energy, frozenCell };
}

export function rerollForge(state: GameState): GameState {
  if (state.energy < 1) return state;
  const rng = createRng(state.rngSeed + state.forgeOffers.length + 500);
  const forgeOffers = generateForgeOffers(state.activeCatalysts, 3, rng.next.bind(rng));
  return { ...state, energy: state.energy - 1, forgeOffers };
}

export function skipForge(state: GameState): GameState {
  const rng = createRng(state.rngSeed + 600);
  let grid = createEmptyGrid();
  let idCounter = state.tileIdCounter;
  for (let i = 0; i < 2; i++) {
    const empty = getEmptyCells(grid);
    if (empty.length > 0) {
      const pos = rng.pick(empty);
      const val = rng.next() < 0.9 ? 2 : 4;
      const r = spawnTile(grid, val, pos, idCounter);
      grid = r.grid;
      idCounter = r.id;
    }
  }

  return {
    ...state,
    screen: 'playing',
    output: 0,
    grid,
    tileIdCounter: idCounter,
    reactionLog: [],
  };
}
