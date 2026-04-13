import { GameState, Direction, CatalystDef, InfusionChoice, CatalystId, Grid, Position, SignalId, ProtocolId } from './types';
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
import { PROTOCOL_DEFS, DEFAULT_PROTOCOL } from './protocols';
import {
  MAX_CATALYSTS,
  MOMENTUM_CONFIG,
  SIGNAL_CAPACITY,
  GRID_CLEAN_COUNT,
  CATALYST_MULTIPLIERS,
  STARTING_ENERGY,
} from './config';

const MAX_LOG = 10;

function makeInitialGrid(rngSeed: number, startTiles: number): { grid: Grid; idCounter: number } {
  const rng = createRng(rngSeed);
  let grid = createEmptyGrid();
  let idCounter = 0;

  for (let i = 0; i < startTiles; i++) {
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

export function createInitialState(seed: number, protocol: ProtocolId = DEFAULT_PROTOCOL): GameState {
  const rngSeed = seed;
  const protocolDef = PROTOCOL_DEFS[protocol];
  const { grid, idCounter } = makeInitialGrid(rngSeed, protocolDef.startTiles);
  const phase = PHASES[0];

  const stepsForPhase = Math.max(1, phase.steps - protocolDef.stepsReduction);

  return {
    screen: 'start',
    grid,
    phaseIndex: 0,
    stepsRemaining: stepsForPhase,
    energy: STARTING_ENERGY,
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
    signals: [],
    pendingSignal: null,
    protocol,
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    delayedSpawnCount: 0,
    stabilityCount: 0,
    shieldCharge: 0,
    echoOutputLast: 0,
  };
}

export function startGame(state: GameState): GameState {
  return { ...state, screen: 'playing' };
}

/** Queue a signal to be consumed on the next move */
export function queueSignal(state: GameState, signalId: SignalId): GameState {
  if (!state.signals.includes(signalId)) return state;
  return { ...state, pendingSignal: signalId };
}

/** Remove a signal from the player's inventory (called after use) */
function consumeSignal(state: GameState): GameState {
  const { pendingSignal } = state;
  if (!pendingSignal) return state;
  return {
    ...state,
    signals: state.signals.filter(s => s !== pendingSignal),
    pendingSignal: null,
  };
}

/** Grant a signal to the player (via Infusion or other reward) */
export function grantSignal(state: GameState, signalId: SignalId): GameState {
  if (state.signals.length >= SIGNAL_CAPACITY) return state;
  if (state.signals.includes(signalId)) return state;
  return { ...state, signals: [...state.signals, signalId] };
}

export function processMoveAction(state: GameState, dir: Direction): GameState {
  if (state.screen !== 'playing') return state;
  if (state.stepsRemaining <= 0) return state;

  const rng = createRng(state.rngSeed + state.reactionLog.length + 1);
  const gridBefore = cloneGrid(state.grid);
  const protocolDef = PROTOCOL_DEFS[state.protocol];

  // ── Pending signal: Freeze Step ───────────────────────────────────────────
  const freezeStepActive = state.pendingSignal === 'freeze_step';

  let entropyBlockedCell: Position | null = null;
  let anomalyEffectPre = '';
  let anomalyTriggered = false;
  const currentPhase = PHASES[state.phaseIndex];
  if (currentPhase.anomaly === 'entropy_tax') {
    const { blockedCell, description } = applyEntropyTax(state.grid, rng);
    entropyBlockedCell = blockedCell;
    anomalyEffectPre = description;
    anomalyTriggered = true;
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
      anomalyTriggered = true;
    }
  }

  // ── Grid Clean signal ─────────────────────────────────────────────────────
  let signalEffect: string | null = null;
  const usedSignal: SignalId | null = state.pendingSignal;

  if (state.pendingSignal === 'grid_clean') {
    // Remove the GRID_CLEAN_COUNT lowest-value tiles
    const allTiles: Array<{ value: number; row: number; col: number }> = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = newGrid[r][c];
        if (cell) allTiles.push({ value: cell.value, row: r, col: c });
      }
    }
    allTiles.sort((a, b) => a.value - b.value);
    const toRemove = allTiles.slice(0, GRID_CLEAN_COUNT);
    newGrid = cloneGrid(newGrid);
    for (const t of toRemove) newGrid[t.row][t.col] = null;
    signalEffect = `Grid Clean removed ${toRemove.length} tile(s)`;
  }

  // ── Momentum update ───────────────────────────────────────────────────────
  const newConsecutiveValidMoves = state.consecutiveValidMoves + 1;
  const newMomentumMultiplier = Math.min(
    1.0 + newConsecutiveValidMoves * MOMENTUM_CONFIG.growthRate,
    MOMENTUM_CONFIG.maxMultiplier
  );

  // ── Stability counter ─────────────────────────────────────────────────────
  const newStabilityCount = state.stabilityCount + 1;

  // ── Diagonal move counter ─────────────────────────────────────────────────
  const diagonalMoveCount = (state.reactionLog.length + 1);

  const comboWireActive = state.activeCatalysts.includes('combo_wire') && state.comboWireCount >= 2;
  const emptyCells = getEmptyCells(newGrid).length;

  const scoreResult = computeScore({
    merges: moveResult.merges,
    activeCatalysts: state.activeCatalysts,
    globalMultiplier: state.globalMultiplier * protocolDef.outputScale,
    comboWireActive,
    emptyCells,
    phaseIndex: state.phaseIndex,
    echoOutputLast: state.echoOutputLast,
    consecutiveValidMoves: newConsecutiveValidMoves,
    anomalyTriggered,
    stabilityCount: newStabilityCount,
    diagonalMoveCount,
  });

  // ── Pulse Boost signal ────────────────────────────────────────────────────
  let finalOutputAdjusted = scoreResult.finalOutput;
  if (state.pendingSignal === 'pulse_boost') {
    finalOutputAdjusted = Math.floor(scoreResult.finalOutput * 2.0);
    signalEffect = `Pulse Boost ×2 → ${finalOutputAdjusted}`;
  }

  let newComboCount = state.comboWireCount;
  if (state.activeCatalysts.includes('combo_wire')) {
    if (scoreResult.base > 0) {
      newComboCount = Math.min(newComboCount + 1, 3);
    } else {
      newComboCount = 0;
    }
  }

  // ── Energy from Rich Merge / Energy Loop ──────────────────────────────────
  let energyGain = 0;
  if (state.activeCatalysts.includes('rich_merge') && moveResult.merges.length > 0) {
    energyGain += moveResult.merges.length * CATALYST_MULTIPLIERS.rich_merge_energy_per_merge;
  }
  if (state.activeCatalysts.includes('energy_loop') && finalOutputAdjusted > 0) {
    energyGain += Math.floor(finalOutputAdjusted * CATALYST_MULTIPLIERS.energy_loop_fraction);
  }

  // ── Spawn logic ───────────────────────────────────────────────────────────
  let spawnPos: Position | null = null;
  let newDelayedSpawnCount = state.delayedSpawnCount;

  // Buffer Zone: block row 0 from spawning
  const bufferZoneActive = state.activeCatalysts.includes('buffer_zone');

  const emptyAfterMove = getEmptyCells(newGrid).filter(p => {
    if (entropyBlockedCell && p.row === entropyBlockedCell.row && p.col === entropyBlockedCell.col) return false;
    if (state.frozenCell && p.row === state.frozenCell.row && p.col === state.frozenCell.col) return false;
    if (bufferZoneActive && p.row === 0) return false;
    return true;
  });

  // Delay Spawn catalyst: skip spawn now, double later
  const delaySpawnActive = state.activeCatalysts.includes('delay_spawn');
  if (freezeStepActive || (delaySpawnActive && newDelayedSpawnCount === 0 && rng.next() < CATALYST_MULTIPLIERS.delay_spawn_probability)) {
    // Skip spawn this turn; note the debt
    if (!freezeStepActive) newDelayedSpawnCount = 1;
    if (freezeStepActive) signalEffect = 'Freeze Step: no spawn this turn';
  } else {
    // Number of tiles to spawn
    const spawnsOwed = newDelayedSpawnCount > 0 ? newDelayedSpawnCount + 1 : 1;
    newDelayedSpawnCount = 0;

    // Double Spawn: 25% chance to add +1 spawn (additive with spawnsOwed)
    const doubleSpawnBonus = (state.activeCatalysts.includes('double_spawn') && rng.next() < CATALYST_MULTIPLIERS.double_spawn_probability) ? 1 : 0;
    const totalSpawns = spawnsOwed + doubleSpawnBonus;

    let spawnableEmpty = [...emptyAfterMove];
    for (let s = 0; s < totalSpawns; s++) {
      if (spawnableEmpty.length === 0) break;
      const spawnIdx = Math.floor(rng.next() * spawnableEmpty.length);
      const sp = spawnableEmpty[spawnIdx];
      if (s === 0) spawnPos = sp;
      const spawnValue = state.activeCatalysts.includes('lucky_seed')
        ? (rng.next() < 0.75 ? 2 : 4)
        : (rng.next() < 0.9 ? 2 : 4);
      const spawnResult = spawnTile(newGrid, spawnValue, sp, newIdCounter);
      newGrid = spawnResult.grid;
      newIdCounter = spawnResult.id;
      spawnableEmpty = spawnableEmpty.filter((_, i) => i !== spawnIdx);
    }
  }

  newGrid = resetMergedFlags(newGrid);

  const newSteps = state.stepsRemaining - 1;
  const newOutput = state.output + finalOutputAdjusted;
  const newTotalOutput = state.totalOutput + finalOutputAdjusted;

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
    finalOutput: finalOutputAdjusted,
    triggeredCatalysts: scoreResult.triggeredCatalysts,
    synergyMultiplier: scoreResult.synergyMultiplier,
    triggeredSynergies: scoreResult.triggeredSynergies,
    momentumMultiplier: scoreResult.momentumMultiplier,
    signalUsed: usedSignal,
    signalEffect,
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
    consecutiveValidMoves: newConsecutiveValidMoves,
    momentumMultiplier: newMomentumMultiplier,
    stabilityCount: newStabilityCount,
    delayedSpawnCount: newDelayedSpawnCount,
    echoOutputLast: finalOutputAdjusted,
    energy: state.energy + energyGain,
    pendingSignal: null,
    signals: usedSignal
      ? state.signals.filter(s => s !== usedSignal)
      : state.signals,
  };

  if (newOutput >= currentPhase.targetOutput || newSteps <= 0) {
    newState = handlePhaseEnd(newState);
  }

  // Chain Trigger signal: force re-processing after a move
  if (usedSignal === 'chain_trigger' && newState.screen === 'playing') {
    const chainResult = applyMove(newState.grid, dir, newState.tileIdCounter);
    if (chainResult.changed) {
      newState = {
        ...newState,
        grid: resetMergedFlags(chainResult.grid),
        tileIdCounter: chainResult.newTileIdCounter,
      };
    }
  }

  return newState;
}

function handlePhaseEnd(state: GameState): GameState {
  const currentPhase = PHASES[state.phaseIndex];
  const protocolDef = PROTOCOL_DEFS[state.protocol];
  let energy = state.energy;
  let output = state.output;

  if (state.activeCatalysts.includes('bankers_edge')) {
    energy += CATALYST_MULTIPLIERS.bankers_edge_energy;
  }

  if (state.activeCatalysts.includes('reserve')) {
    output += state.stepsRemaining * CATALYST_MULTIPLIERS.reserve_bonus;
  }

  if (state.activeCatalysts.includes('reserve_bank')) {
    energy += (PHASES[state.phaseIndex].steps - state.stepsRemaining) * CATALYST_MULTIPLIERS.reserve_bank_energy_per_step;
  }

  const succeeded = output >= currentPhase.targetOutput;

  if (!succeeded) {
    return { ...state, screen: 'game_over', output, energy };
  }

  if (state.phaseIndex >= PHASES.length - 1) {
    return { ...state, screen: 'run_complete', output, energy };
  }

  const nextPhaseIndex = state.phaseIndex + 1;
  const nextPhase = PHASES[nextPhaseIndex];
  const nextSteps = Math.max(1, nextPhase.steps - protocolDef.stepsReduction);

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
      stepsRemaining: nextSteps,
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
    stepsRemaining: nextSteps,
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
  // Reset momentum on new phase
  newState.consecutiveValidMoves = 0;
  newState.momentumMultiplier = 1.0;
  newState.stabilityCount = 0;

  const rng = createRng(newState.rngSeed + 300);
  let grid = createEmptyGrid();
  let idCounter = newState.tileIdCounter;
  const protocolDef = PROTOCOL_DEFS[newState.protocol];
  const startTiles = protocolDef.startTiles;
  for (let i = 0; i < startTiles; i++) {
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
  const protocolDef = PROTOCOL_DEFS[state.protocol];
  let grid = createEmptyGrid();
  let idCounter = state.tileIdCounter;
  for (let i = 0; i < protocolDef.startTiles; i++) {
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
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    stabilityCount: 0,
  };
}

export { consumeSignal };
