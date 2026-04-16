import { GameState, Direction, CatalystDef, InfusionChoice, CatalystId, Grid, Position, SignalId, ProtocolId, AscensionLevel, PatternId } from './types';
import { applyMove } from './move';
import { computeScore } from './score';
import { createRng } from './rng';
import {
  cloneGrid, createEmptyGrid, getEmptyCells,
  spawnTile, resetMergedFlags
} from './board';
import { applyEntropyTax, applyCollapseField } from './anomalies';
import { getPhasesForRound, PHASES_PER_ROUND, getBuildAwareTargetScale } from './phases';
import { generateForgeOffers } from './forge';
import { generateInfusionOptions } from './infusion';
import { ReactionLogEntry } from './types';
import { PROTOCOL_DEFS, DEFAULT_PROTOCOL } from './protocols';
import { ASCENSION_MODIFIER_DEFS } from './ascensionModifiers';
import {
  MAX_CATALYSTS,
  MOMENTUM_CONFIG,
  SIGNAL_CAPACITY,
  GRID_CLEAN_COUNT,
  CATALYST_MULTIPLIERS,
  STARTING_ENERGY,
  COLLAPSE_FIELD_PERIOD,
  SPAWN_4_PROBABILITY,
  STREAK_MIN_OUTPUT, STREAK_BONUS_THRESHOLD, STREAK_ENERGY_BONUS,
  JACKPOT_PROBABILITY, JACKPOT_MIN_OUTPUT, JACKPOT_OUTPUT_BONUS, JACKPOT_ENERGY_BONUS,
  ROUND_COMPLETE_ENERGY_BONUS, ROUND_COMPLETE_MULTIPLIER_BONUS,
  CATALYST_SELL_REFUND_BY_RARITY,
  INFUSION_ENERGY_BONUS,
  INFUSION_MULTIPLIER_BONUS,
  INFUSION_STEPS_BONUS,
  PATTERN_BONUS_BY_LEVEL,
  PATTERN_EMPTY_SPACE_CAP,
} from './config';
import { checkMilestones, MILESTONE_DEFS, MilestoneId } from './milestones';
import { CATALYST_DEFS } from './catalysts';

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

export function createInitialState(
  seed: number,
  protocol: ProtocolId = DEFAULT_PROTOCOL,
  runConfig?: { ascensionLevel?: AscensionLevel; unlockedCatalysts?: CatalystId[] }
): GameState {
  const rngSeed = seed;
  const ascensionLevel: AscensionLevel = runConfig?.ascensionLevel ?? 0;
  const unlockedCatalysts = runConfig?.unlockedCatalysts;
  const ascMod = ASCENSION_MODIFIER_DEFS[ascensionLevel];
  const protocolDef = PROTOCOL_DEFS[protocol];
  const { grid, idCounter } = makeInitialGrid(rngSeed, protocolDef.startTiles);
  const roundNumber = 1;
  const phases = getPhasesForRound(roundNumber);
  const phase = phases[0];

  const stepsForPhase = Math.max(1, phase.steps - protocolDef.stepsReduction - ascMod.stepsReduction);
  const startingEnergy = Math.floor(STARTING_ENERGY * ascMod.startingEnergyFactor);
  // At run start there are no active catalysts and no multiplier yet — factor = 1.0
  const initialPhaseTargetOutput = Math.ceil(phase.targetOutput * ascMod.targetOutputScale);

  return {
    screen: 'start',
    grid,
    phaseIndex: 0,
    stepsRemaining: stepsForPhase,
    energy: startingEnergy,
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
    activePattern: null,
    patternLevels: {
      corner: 0,
      chain: 0,
      empty_space: 0,
      high_tier: 0,
      economy: 0,
      survival: 0,
    },
    lastIntermissionMessage: null,
    protocol,
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    delayedSpawnCount: 0,
    stabilityCount: 0,
    shieldCharge: 0,
    echoOutputLast: 0,
    ascensionLevel,
    unlockedCatalysts,
    catalystPool: unlockedCatalysts ? [...unlockedCatalysts] : undefined,
    roundNumber,
    roundOutput: 0,
    bestMoveOutput: 0,
    streakCount: 0,
    bestStreak: 0,
    triggeredMilestones: [],
    pendingMilestones: [],
    jackpotTriggered: false,
    challengeId: null,
    isDailyRun: false,
    phaseTargetOutput: initialPhaseTargetOutput,
  };
}

function getPatternMultiplier(
  state: GameState,
  pattern: PatternId | null,
  merges: ReturnType<typeof applyMove>['merges'],
  emptyCells: number
): number {
  if (!pattern) return 1;
  const level = state.patternLevels[pattern];
  if (level <= 0) return 1;
  const perLevel = PATTERN_BONUS_BY_LEVEL[pattern];
  switch (pattern) {
    case 'corner':
      return merges.some(m => m.isCorner) ? 1 + perLevel * level : 1;
    case 'chain':
      return merges.length >= 2 ? 1 + perLevel * level : 1;
    case 'empty_space':
      return Math.min(1 + perLevel * level * emptyCells, PATTERN_EMPTY_SPACE_CAP);
    case 'high_tier':
      return merges.some(m => m.value >= 64) ? 1 + perLevel * level : 1;
    case 'survival':
      return state.stepsRemaining <= 3 ? 1 + perLevel * level : 1;
    case 'economy':
      return 1;
  }
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
  const ascMod = ASCENSION_MODIFIER_DEFS[state.ascensionLevel];

  // ── Pending signal: Freeze Step ───────────────────────────────────────────
  const freezeStepActive = state.pendingSignal === 'freeze_step';

  let entropyBlockedCell: Position | null = null;
  let anomalyEffectPre = '';
  let anomalyTriggered = false;
  const phases = getPhasesForRound(state.roundNumber);
  const currentPhase = phases[state.phaseIndex];
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
    const effectivePeriod = Math.max(
      1,
      COLLAPSE_FIELD_PERIOD - ascMod.collapseFieldPeriodReduction
    );
    const collapseResult = applyCollapseField(newGrid, newCollapseCounter, effectivePeriod);
    if (collapseResult.triggered) {
      newGrid = collapseResult.grid;
      anomalyEffectPost = collapseResult.description;
      anomalyTriggered = true;
    }
  }

  // ── Grid Clean signal ─────────────────────────────────────────────────────
  let signalEffect: GameState['reactionLog'][number]['signalEffect'] = null;
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
    signalEffect = {
      key: 'ui.signal_effect_grid_clean',
      params: { count: toRemove.length },
    };
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
    signalEffect = {
      key: 'ui.signal_effect_pulse_boost',
      params: { output: finalOutputAdjusted },
    };
  }
  const patternMultiplier = getPatternMultiplier(state, state.activePattern, moveResult.merges, emptyCells);
  if (patternMultiplier > 1) {
    finalOutputAdjusted = Math.floor(finalOutputAdjusted * patternMultiplier);
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
  if (state.activePattern === 'economy' && state.patternLevels.economy > 0 && moveResult.merges.length > 0) {
    energyGain += state.patternLevels.economy * PATTERN_BONUS_BY_LEVEL.economy;
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
    if (freezeStepActive) {
      signalEffect = { key: 'ui.signal_effect_freeze_step' };
    }
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
      const base4Prob = SPAWN_4_PROBABILITY + ascMod.spawnFourBonus;
      const spawnValue = state.activeCatalysts.includes('lucky_seed')
        ? (rng.next() < 0.75 ? 2 : 4)
        : (rng.next() < (1 - base4Prob) ? 2 : 4);
      const spawnResult = spawnTile(newGrid, spawnValue, sp, newIdCounter);
      newGrid = spawnResult.grid;
      newIdCounter = spawnResult.id;
      spawnableEmpty = spawnableEmpty.filter((_, i) => i !== spawnIdx);
    }
  }

  newGrid = resetMergedFlags(newGrid);

  const newSteps = state.stepsRemaining - 1;

  // ── Streak system ─────────────────────────────────────────────────────────
  let newStreakCount = state.streakCount;
  let newBestStreak = state.bestStreak;
  let streakEnergyBonus = 0;
  if (finalOutputAdjusted >= STREAK_MIN_OUTPUT) {
    newStreakCount++;
    if (newStreakCount > newBestStreak) newBestStreak = newStreakCount;
    if (newStreakCount > 0 && newStreakCount % STREAK_BONUS_THRESHOLD === 0) {
      streakEnergyBonus = STREAK_ENERGY_BONUS;
    }
  } else {
    newStreakCount = 0;
  }

  // ── Jackpot system ────────────────────────────────────────────────────────
  let jackpotOutputBonus = 0;
  let jackpotEnergyBonus = 0;
  let jackpotTriggered = false;
  if (finalOutputAdjusted >= JACKPOT_MIN_OUTPUT && rng.next() < JACKPOT_PROBABILITY) {
    jackpotOutputBonus = JACKPOT_OUTPUT_BONUS;
    jackpotEnergyBonus = JACKPOT_ENERGY_BONUS;
    jackpotTriggered = true;
  }
  const finalOutputWithBonuses = finalOutputAdjusted + jackpotOutputBonus;

  const newOutput = state.output + finalOutputWithBonuses;
  const newTotalOutput = state.totalOutput + finalOutputWithBonuses;

  const multipliers = [...scoreResult.multipliers];
  if (patternMultiplier > 1 && state.activePattern) {
    multipliers.push({ name: `Pattern (${state.activePattern})`, value: Number(patternMultiplier.toFixed(2)) });
  }

  const logEntry: ReactionLogEntry = {
    step: phases[state.phaseIndex].steps - newSteps,
    action: dir,
    gridBefore,
    gridAfter: cloneGrid(newGrid),
    merges: moveResult.merges,
    spawn: spawnPos,
    anomalyEffect: anomalyEffectPost || null,
    base: scoreResult.base,
    multipliers,
    finalOutput: finalOutputWithBonuses,
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
    echoOutputLast: finalOutputWithBonuses,
    energy: state.energy + energyGain + streakEnergyBonus + jackpotEnergyBonus,
    pendingSignal: null,
    signals: usedSignal
      ? state.signals.filter(s => s !== usedSignal)
      : state.signals,
    roundOutput: state.roundOutput + finalOutputWithBonuses,
    bestMoveOutput: Math.max(state.bestMoveOutput, finalOutputWithBonuses),
    streakCount: newStreakCount,
    bestStreak: newBestStreak,
    jackpotTriggered,
  };

  if (newOutput >= state.phaseTargetOutput || newSteps <= 0) {
    newState = handlePhaseEnd(newState);
  }

  // ── Milestone check ───────────────────────────────────────────────────────
  if (newState.screen === 'playing') {
    const maxTileOnBoard = getMaxTile(newState.grid);
    const newMilestones = checkMilestones(
      newState.totalOutput,
      newState.roundNumber,
      maxTileOnBoard,
      newState.triggeredMilestones
    );
    if (newMilestones.length > 0) {
      let milestoneEnergy = 0;
      let milestoneMultiplier = 0;
      for (const mid of newMilestones) {
        const def = MILESTONE_DEFS[mid];
        if (def.reward.type === 'energy') milestoneEnergy += def.reward.amount;
        if (def.reward.type === 'multiplier') milestoneMultiplier += def.reward.amount;
      }
      newState = {
        ...newState,
        triggeredMilestones: [...newState.triggeredMilestones, ...newMilestones],
        pendingMilestones: [...newState.pendingMilestones, ...newMilestones],
        energy: newState.energy + milestoneEnergy,
        globalMultiplier: Math.round((newState.globalMultiplier + milestoneMultiplier) * 100) / 100,
      };
    }
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

function getMaxTile(grid: Grid): number {
  let max = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell.value > max) max = cell.value;
    }
  }
  return max;
}

function handlePhaseEnd(state: GameState): GameState {
  const phases = getPhasesForRound(state.roundNumber);
  const currentPhase = phases[state.phaseIndex];
  const protocolDef = PROTOCOL_DEFS[state.protocol];
  const ascMod = ASCENSION_MODIFIER_DEFS[state.ascensionLevel];
  let energy = state.energy;
  let output = state.output;

  if (state.activeCatalysts.includes('bankers_edge')) {
    energy += CATALYST_MULTIPLIERS.bankers_edge_energy;
  }

  if (state.activeCatalysts.includes('reserve')) {
    output += state.stepsRemaining * CATALYST_MULTIPLIERS.reserve_bonus;
  }

  if (state.activeCatalysts.includes('reserve_bank')) {
    energy += (phases[state.phaseIndex].steps - state.stepsRemaining) * CATALYST_MULTIPLIERS.reserve_bank_energy_per_step;
  }

  // Use the pre-computed effective target stored in state (includes build-aware factor)
  const succeeded = output >= state.phaseTargetOutput;

  if (!succeeded) {
    return { ...state, screen: 'game_over', output, energy };
  }

  // Last phase of the round cleared — transition to round_complete
  if (state.phaseIndex >= PHASES_PER_ROUND - 1) {
    const roundCompleteEnergy = energy + ROUND_COMPLETE_ENERGY_BONUS;
    const roundCompleteMultiplier = Math.round((state.globalMultiplier + ROUND_COMPLETE_MULTIPLIER_BONUS) * 100) / 100;
    return {
      ...state,
      screen: 'round_complete',
      output,
      energy: roundCompleteEnergy,
      globalMultiplier: roundCompleteMultiplier,
    };
  }

  // Not the last phase — advance to next phase via infusion (intermission).
  // Compute the build-aware effective target for the NEXT phase now, using the
  // player's current build (catalysts + global multiplier after any bonus).
  const nextPhaseIndex = state.phaseIndex + 1;
  const nextPhase = phases[nextPhaseIndex];
  const nextSteps = Math.max(1, nextPhase.steps - protocolDef.stepsReduction - ascMod.stepsReduction);
  const buildFactor = getBuildAwareTargetScale(
    state.activeCatalysts.length,
    state.globalMultiplier,
  );
  const nextPhaseTargetOutput = Math.ceil(nextPhase.targetOutput * ascMod.targetOutputScale * buildFactor);

  const rng = createRng(state.rngSeed + 200);
  const infusionOptions = generateInfusionOptions(
    state.activeCatalysts, rng.next.bind(rng),
    state.catalystPool, ascMod.infusionChoiceCount, state.roundNumber
  );

  return {
    ...state,
    screen: 'infusion',
    output,
    energy,
    infusionOptions,
    phaseIndex: nextPhaseIndex,
    stepsRemaining: nextSteps,
    phaseTargetOutput: nextPhaseTargetOutput,
    lastIntermissionMessage: null,
  };
}

export function selectInfusion(state: GameState, choice: InfusionChoice): GameState {
  let newState: GameState = { ...state, lastIntermissionMessage: null };

  switch (choice.type) {
    case 'catalyst':
      if (newState.activeCatalysts.includes(choice.catalyst.id)) {
        newState.lastIntermissionMessage = {
          key: 'ui.infusion_blocked_owned',
          params: { name: choice.catalyst.id },
        };
      } else if (newState.activeCatalysts.length < MAX_CATALYSTS) {
        newState.activeCatalysts = [...newState.activeCatalysts, choice.catalyst.id];
        // Remove the acquired catalyst from the run-level pool so it cannot be
        // offered again later in the same run.
        if (newState.catalystPool !== undefined) {
          newState.catalystPool = newState.catalystPool.filter(id => id !== choice.catalyst.id);
        }
        if (choice.catalyst.id === 'frozen_cell' && !newState.frozenCell) {
          newState.frozenCell = { row: 1, col: 1 };
        }
      } else {
        // Deterministic full-slot handling for direct catalyst infusions.
        newState.energy += INFUSION_ENERGY_BONUS;
        newState.lastIntermissionMessage = {
          key: 'ui.infusion_catalyst_slot_full',
          params: { name: choice.catalyst.id, energy: INFUSION_ENERGY_BONUS },
        };
      }
      break;
    case 'energy':
      newState.energy += INFUSION_ENERGY_BONUS;
      break;
    case 'steps':
      newState.stepsRemaining += INFUSION_STEPS_BONUS;
      break;
    case 'multiplier':
      newState.globalMultiplier = Math.round((newState.globalMultiplier + INFUSION_MULTIPLIER_BONUS) * 100) / 100;
      break;
    case 'signal':
      if (!newState.signals.includes(choice.signal) && newState.signals.length < SIGNAL_CAPACITY) {
        newState.signals = [...newState.signals, choice.signal];
      }
      newState.lastIntermissionMessage = {
        key: 'ui.infusion_granted_signal',
        params: { name: choice.signal },
      };
      break;
    case 'catalyst_upgrade':
      newState.globalMultiplier = Math.round((newState.globalMultiplier + 0.05) * 100) / 100;
      newState.lastIntermissionMessage = { key: 'ui.infusion_catalyst_upgrade_applied' };
      break;
    case 'pool_reroll': {
      newState.rngSeed += 17;
      newState.lastIntermissionMessage = { key: 'ui.infusion_pool_rerolled' };
      break;
    }
    case 'pool_convert':
      newState.energy += 2;
      newState.lastIntermissionMessage = { key: 'ui.infusion_pool_converted', params: { energy: 2 } };
      break;
    case 'pattern':
      const isUpgrade = newState.activePattern === choice.pattern;
      const previousPattern = newState.activePattern;
      const nextLevel = isUpgrade ? newState.patternLevels[choice.pattern] + 1 : 1;
      newState.activePattern = choice.pattern;
      newState.patternLevels = {
        ...newState.patternLevels,
        [choice.pattern]: nextLevel,
      };
      if (isUpgrade) {
        newState.lastIntermissionMessage = {
          key: 'ui.infusion_pattern_growth',
          params: { name: choice.pattern, level: nextLevel },
        };
      } else if (previousPattern) {
        newState.lastIntermissionMessage = {
          key: 'ui.infusion_pattern_replaced',
          params: { from: previousPattern, to: choice.pattern, level: nextLevel },
        };
      } else {
        newState.lastIntermissionMessage = {
          key: 'ui.infusion_pattern_acquired',
          params: { name: choice.pattern, level: nextLevel },
        };
      }
      break;
  }

  newState.output = 0;
  // Reset momentum on new phase
  newState.consecutiveValidMoves = 0;
  newState.momentumMultiplier = 1.0;
  newState.stabilityCount = 0;

  // After infusion, always enter the intermission forge
  const rng = createRng(newState.rngSeed + 100);
  const forgeOffers = generateForgeOffers(
    newState.activeCatalysts, 3, rng.next.bind(rng), newState.catalystPool, newState.roundNumber
  );
  newState.forgeOffers = forgeOffers;
  newState.screen = 'forge';

  return newState;
}

export function buyFromForge(state: GameState, catalyst: CatalystDef, replaceIndex?: number): GameState {
  const ascMod = ASCENSION_MODIFIER_DEFS[state.ascensionLevel];
  const effectiveCost = catalyst.cost + ascMod.forgeCostBonus;
  if (state.activeCatalysts.includes(catalyst.id)) return state;
  if (state.energy < effectiveCost) return state;

  const newCatalysts: CatalystId[] = [...state.activeCatalysts];
  const energy = state.energy - effectiveCost;

  if (newCatalysts.length < MAX_CATALYSTS) {
    newCatalysts.push(catalyst.id);
  } else if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < newCatalysts.length) {
    // No-op replacement (same catalyst in same slot) should be blocked without spending energy.
    if (newCatalysts[replaceIndex] === catalyst.id) return state;
    // Prevent introducing duplicate ownership when the catalyst exists in another slot.
    if (newCatalysts.some((id, idx) => id === catalyst.id && idx !== replaceIndex)) return state;
    newCatalysts[replaceIndex] = catalyst.id;
  } else {
    return state;
  }

  let frozenCell = state.frozenCell;
  if (catalyst.id === 'frozen_cell' && !frozenCell) {
    frozenCell = { row: 1, col: 1 };
  }

  // Remove the acquired catalyst from the run-level pool so it cannot
  // be offered again later in the same run.
  const catalystPool = state.catalystPool !== undefined
    ? state.catalystPool.filter(id => id !== catalyst.id)
    : undefined;

  return {
    ...state,
    activeCatalysts: newCatalysts,
    energy,
    frozenCell,
    catalystPool,
    forgeOffers: state.forgeOffers.filter(c => c.id !== catalyst.id),
  };
}

export function rerollForge(state: GameState): GameState {
  if (state.energy < 1) return state;
  const rng = createRng(state.rngSeed + state.forgeOffers.length + 500);
  const forgeOffers = generateForgeOffers(
    state.activeCatalysts, 3, rng.next.bind(rng), state.catalystPool, state.roundNumber
  );
  return { ...state, energy: state.energy - 1, forgeOffers };
}

export function sellCatalyst(state: GameState, index: number): GameState {
  if (index < 0 || index >= state.activeCatalysts.length) return state;
  const id = state.activeCatalysts[index];
  const def = CATALYST_DEFS[id];
  if (!def) return state;
  const refundRate = CATALYST_SELL_REFUND_BY_RARITY[def.rarity];
  const refund = Math.max(1, Math.floor(def.cost * refundRate));
  const next = [...state.activeCatalysts];
  next.splice(index, 1);
  return {
    ...state,
    activeCatalysts: next,
    energy: state.energy + refund,
    lastIntermissionMessage: {
      key: 'ui.forge_sold_catalyst',
      params: { name: def.id, energy: refund },
    },
  };
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
    lastIntermissionMessage: null,
  };
}

/**
 * Advance the run into the next round.
 * Called when the player acknowledges the round_complete screen.
 * Increments roundNumber, picks the next template, scales targets,
 * and resets phase state to begin phase 1 of the new round.
 */
export function advanceRound(state: GameState): GameState {
  const nextRound = state.roundNumber + 1;
  const protocolDef = PROTOCOL_DEFS[state.protocol];
  const ascMod = ASCENSION_MODIFIER_DEFS[state.ascensionLevel];
  const phases = getPhasesForRound(nextRound);
  const firstPhase = phases[0];
  const nextSteps = Math.max(1, firstPhase.steps - protocolDef.stepsReduction - ascMod.stepsReduction);
  // Build-aware target for the first phase of the new round, using the player's
  // current build accumulated across previous rounds.
  const buildFactor = getBuildAwareTargetScale(
    state.activeCatalysts.length,
    state.globalMultiplier,
  );
  const nextPhaseTargetOutput = Math.ceil(firstPhase.targetOutput * ascMod.targetOutputScale * buildFactor);

  const rng = createRng(state.rngSeed + nextRound * 1000);
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
    grid,
    tileIdCounter: idCounter,
    phaseIndex: 0,
    stepsRemaining: nextSteps,
    output: 0,
    reactionLog: [],
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    stabilityCount: 0,
    collapseFieldCounter: 0,
    entropyBlockedCell: null,
    roundNumber: nextRound,
    roundOutput: 0,
    pendingMilestones: [],
    jackpotTriggered: false,
    streakCount: 0,
    phaseTargetOutput: nextPhaseTargetOutput,
    lastIntermissionMessage: null,
  };
}

export { consumeSignal };
