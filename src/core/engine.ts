import { GameState, Direction, CatalystDef, CatalystId, Grid, Position, SignalId, ProtocolId, AscensionLevel, PatternId, ForgeShopItem, InfusionChoice } from './types';
import { applyMove } from './move';
import { computeScore } from './score';
import { createRng } from './rng';
import {
  cloneGrid, createEmptyGrid, getEmptyCells,
  spawnTile, resetMergedFlags
} from './board';
import { applyEntropyTax, applyCollapseField } from './anomalies';
import { getPhasesForRound, PHASES_PER_ROUND, getBuildAwareTargetScale } from './phases';
import { generateForgeItems } from './forge';
import { ReactionLogEntry, SlimReactionEntry, PhaseLog } from './types';
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
  PATTERN_SELL_REFUND,
  SIGNAL_SELL_REFUND,
  FORGE_PATTERN_PRICE,
  FORGE_SIGNAL_PRICE,
  PATTERN_BONUS_BY_LEVEL,
  PATTERN_EMPTY_SPACE_CAP,
  FORGE_UTILITY_VALUES,
  INFINITE_MODE_CONFIG,
} from './config';
import { checkMilestones, MILESTONE_DEFS, MilestoneId } from './milestones';
import { CATALYST_DEFS } from './catalysts';

const MAX_LOG = 10;
const FIRST_MERGE_FEEDBACK_MULTIPLIER = 1.25;
const SECOND_MERGE_FEEDBACK_MULTIPLIER = 1.1;
// Distinct from other offsets (+200 forge, +500 reroll) to keep onboarding phase-clear
// board reseeding deterministic without colliding with existing RNG branches.
const ONBOARDING_SEED_OFFSET = 600;

/** Convert rich grid tile objects into a plain serializable 4x4 value snapshot. */
function toBoardSnapshot(grid: Grid): Array<Array<number | null>> {
  return grid.map(row => row.map(cell => cell?.value ?? null));
}

/** Build a persistable step record with plain board snapshots and no unstable refs. */
function toSlimEntry(entry: ReactionLogEntry, energyBefore: number, energyAfter: number): SlimReactionEntry {
  const { step, gridBefore, gridAfter, ...rest } = entry;
  return {
    ...rest,
    stepNumber: step,
    boardBefore: toBoardSnapshot(gridBefore),
    boardAfter: toBoardSnapshot(gridAfter),
    energyBefore,
    energyAfter,
  };
}

/** Build a PhaseLog snapshot from the current engine state. */
function buildPhaseLog(state: GameState, cleared: boolean, failReason: string | null = null): PhaseLog {
  return {
    round: state.roundNumber,
    phaseIndex: state.phaseIndex,
    targetOutput: state.phaseTargetOutput,
    actualOutput: state.output,
    stepsUsed: state.stepsRemaining >= 0
      ? getPhasesForRound(state.roundNumber)[state.phaseIndex].steps - state.stepsRemaining
      : getPhasesForRound(state.roundNumber)[state.phaseIndex].steps,
    cleared,
    activeCatalysts: [...state.activeCatalysts],
    activePattern: state.activePattern,
    patternLevel: state.activePattern ? state.patternLevels[state.activePattern] : 0,
    globalMultiplier: state.globalMultiplier,
    entries: [...state.currentPhaseEntries],
    entropyAtEnd: state.entropy,
    corruptedTileCount: state.corruptedTileCount,
    failReason: failReason !== undefined ? failReason : null,
  };
}

function makeOnboardingGrid(): { grid: Grid; idCounter: number } {
  // Centered 2x2 identical tiles guarantees immediate horizontal+vertical merge
  // opportunities, so all four first swipe directions can produce a merge.
  const openingTiles: Position[] = [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ];
  let grid = createEmptyGrid();
  let idCounter = 0;
  for (const pos of openingTiles) {
    const result = spawnTile(grid, 2, pos, idCounter);
    grid = result.grid;
    idCounter = result.id;
  }
  return { grid, idCounter };
}

export function createInitialState(
  seed: number,
  protocol: ProtocolId = DEFAULT_PROTOCOL,
  runConfig?: { ascensionLevel?: AscensionLevel; unlockedCatalysts?: CatalystId[]; infiniteMode?: boolean }
): GameState {
  const rngSeed = seed;
  const ascensionLevel: AscensionLevel = runConfig?.ascensionLevel ?? 0;
  const unlockedCatalysts = runConfig?.unlockedCatalysts;
  const infiniteModeEnabled = runConfig?.infiniteMode ?? INFINITE_MODE_CONFIG.enabled;
  const ascMod = ASCENSION_MODIFIER_DEFS[ascensionLevel];
  const protocolDef = PROTOCOL_DEFS[protocol];
  const { grid, idCounter } = makeOnboardingGrid();
  const roundNumber = 1;
  const phases = getPhasesForRound(roundNumber);
  const phase = phases[0];

  const stepsForPhase = Math.max(1, phase.steps - protocolDef.stepsReduction - ascMod.stepsReduction);
  const startingEnergy = Math.floor(STARTING_ENERGY * ascMod.startingEnergyFactor);
  // At run start there are no active catalysts and no multiplier yet — factor = 1.0
  const initialPhaseTargetOutput = Math.ceil(phase.targetOutput * ascMod.targetOutputScale);
  const runStartedAt = Date.now();

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
    forgeItems: [],
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
    forgeVisitCount: 0,
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
    currentPhaseEntries: [],
    phaseLogBuffer: [],
    runSeed: seed,
    runStartedAt,
    infiniteModeEnabled,
    entropy: INFINITE_MODE_CONFIG.entropy.start,
    corruptedTileCount: 0,
    failReason: null,
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
  return {
    ...state,
    screen: 'playing',
    challengeId: null,
    isDailyRun: false,
  };
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
  if (!state.infiniteModeEnabled && state.stepsRemaining <= 0) return state;

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

  // ── Entropy update (infinite mode) — computed once per valid move ─────────
  const newEntropy = state.infiniteModeEnabled
    ? state.entropy + INFINITE_MODE_CONFIG.entropy.perMove
    : state.entropy;

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

  const previousMergeMoves = state.reactionLog.reduce((count, entry) => (
    entry.merges.length > 0 ? count + 1 : count
  ), 0);
  if (moveResult.merges.length > 0) {
    const earlyMergeFeedbackMult = previousMergeMoves === 0
      ? FIRST_MERGE_FEEDBACK_MULTIPLIER
      : (previousMergeMoves === 1 ? SECOND_MERGE_FEEDBACK_MULTIPLIER : 1);
    if (earlyMergeFeedbackMult > 1) {
      finalOutputAdjusted = Math.floor(finalOutputAdjusted * earlyMergeFeedbackMult);
    }
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
  let newCorruptedTileCount = state.corruptedTileCount;
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
      // ── Infinite mode: maybe spawn a corrupted tile ────────────────────────
      if (
        state.infiniteModeEnabled &&
        newEntropy >= INFINITE_MODE_CONFIG.entropy.spawnEntropyThreshold &&
        rng.next() < INFINITE_MODE_CONFIG.negativeTiles.corrupted.spawnChance
      ) {
        // Spawn a corrupted tile (value=2, cannot merge)
        newIdCounter++;
        const corruptedTile = { id: newIdCounter, value: 2, merged: false, corrupted: true };
        const corruptedGrid = newGrid.map(row => row.map(cell => cell));
        corruptedGrid[sp.row][sp.col] = corruptedTile;
        newGrid = corruptedGrid as typeof newGrid;
        newCorruptedTileCount++;
      } else {
        const base4Prob = SPAWN_4_PROBABILITY + ascMod.spawnFourBonus;
        const spawnValue = state.activeCatalysts.includes('lucky_seed')
          ? (rng.next() < 0.75 ? 2 : 4)
          : (rng.next() < (1 - base4Prob) ? 2 : 4);
        const spawnResult = spawnTile(newGrid, spawnValue, sp, newIdCounter);
        newGrid = spawnResult.grid;
        newIdCounter = spawnResult.id;
      }
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

  const nextEnergy = state.energy + energyGain + streakEnergyBonus + jackpotEnergyBonus;
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
    currentPhaseEntries: [...state.currentPhaseEntries, toSlimEntry(logEntry, state.energy, nextEnergy)],
    tileIdCounter: newIdCounter,
    rngSeed: state.rngSeed + 1,
    consecutiveValidMoves: newConsecutiveValidMoves,
    momentumMultiplier: newMomentumMultiplier,
    stabilityCount: newStabilityCount,
    delayedSpawnCount: newDelayedSpawnCount,
    echoOutputLast: finalOutputWithBonuses,
    energy: nextEnergy,
    pendingSignal: null,
    signals: usedSignal
      ? state.signals.filter(s => s !== usedSignal)
      : state.signals,
    roundOutput: state.roundOutput + finalOutputWithBonuses,
    bestMoveOutput: Math.max(state.bestMoveOutput, finalOutputWithBonuses),
    streakCount: newStreakCount,
    bestStreak: newBestStreak,
    jackpotTriggered,
    lastIntermissionMessage: null,
    entropy: newEntropy,
    corruptedTileCount: newCorruptedTileCount,
  };

  if (state.infiniteModeEnabled) {
    // ── Infinite mode: entropy overflow → game over ────────────────────────
    if (newEntropy >= INFINITE_MODE_CONFIG.entropy.max) {
      const failLog = buildPhaseLog({ ...newState, output: newOutput }, false, 'entropy_overflow');
      return {
        ...newState,
        screen: 'game_over',
        failReason: 'entropy_overflow',
        phaseLogBuffer: [...newState.phaseLogBuffer, failLog],
      };
    }
    // ── Infinite mode: score objective reached → phase success ─────────────
    if (newOutput >= INFINITE_MODE_CONFIG.phaseObjective.score) {
      newState = handlePhaseEnd(newState);
    }
  } else {
    if (newOutput >= state.phaseTargetOutput || newSteps <= 0) {
      newState = handlePhaseEnd(newState);
    }
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

  // In infinite mode, the phase is always cleared when handlePhaseEnd is called
  // (entropy-overflow failure is handled before reaching here).
  // In standard mode, check output vs target.
  const succeeded = state.infiniteModeEnabled
    ? true
    : output >= state.phaseTargetOutput;

  const failedPhaseLog = succeeded ? null : buildPhaseLog({ ...state, output }, false);

  if (!succeeded) {
    return {
      ...state,
      screen: 'game_over',
      output,
      energy,
      phaseLogBuffer: failedPhaseLog
        ? [...state.phaseLogBuffer, failedPhaseLog]
        : state.phaseLogBuffer,
    };
  }

  const clearedPhaseLog = buildPhaseLog({ ...state, output }, true);
  const nextPhaseLogBuffer = [...state.phaseLogBuffer, clearedPhaseLog];

  // Last phase of the round cleared — transition to round_complete (not used in infinite mode)
  if (!state.infiniteModeEnabled && state.phaseIndex >= PHASES_PER_ROUND - 1) {
    const roundCompleteEnergy = energy + ROUND_COMPLETE_ENERGY_BONUS;
    const roundCompleteMultiplier = Math.round((state.globalMultiplier + ROUND_COMPLETE_MULTIPLIER_BONUS) * 100) / 100;
    return {
      ...state,
      screen: 'round_complete',
      output,
      energy: roundCompleteEnergy,
      globalMultiplier: roundCompleteMultiplier,
      phaseLogBuffer: nextPhaseLogBuffer,
      currentPhaseEntries: [],
    };
  }

  // Not the last phase — advance to next phase and enter the unified Forge.
  const nextPhaseIndex = state.infiniteModeEnabled
    ? state.phaseIndex  // in infinite mode, phase index cycles (we reuse phase 0 infinitely)
    : state.phaseIndex + 1;
  const nextPhase = phases[state.infiniteModeEnabled ? 0 : nextPhaseIndex];
  const nextSteps = Math.max(1, nextPhase.steps - protocolDef.stepsReduction - ascMod.stepsReduction);
  const buildFactor = getBuildAwareTargetScale(
    state.activeCatalysts.length,
    state.globalMultiplier,
  );
  const nextPhaseTargetOutput = Math.ceil(nextPhase.targetOutput * ascMod.targetOutputScale * buildFactor);

  // ── Infinite mode: reduce entropy on success ───────────────────────────────
  const nextEntropy = state.infiniteModeEnabled
    ? Math.max(0, Math.floor(state.entropy * INFINITE_MODE_CONFIG.phaseTransition.entropyAfterSuccessRatio))
    : state.entropy;

  if (!state.infiniteModeEnabled && state.roundNumber === 1 && state.phaseIndex === 0) {
    // Keep onboarding reseed offset distinct from forge/reroll offsets so phase-clear
    // transition stays deterministic while avoiding overlap with other intermission RNG paths.
    const onboardingRng = createRng(state.rngSeed + ONBOARDING_SEED_OFFSET);
    let grid = createEmptyGrid();
    let idCounter = state.tileIdCounter;
    for (let i = 0; i < protocolDef.startTiles; i++) {
      const empty = getEmptyCells(grid);
      if (empty.length === 0) break;
      const pos = onboardingRng.pick(empty);
      const val = onboardingRng.next() < 0.9 ? 2 : 4;
      const spawned = spawnTile(grid, val, pos, idCounter);
      grid = spawned.grid;
      idCounter = spawned.id;
    }
    return {
      ...state,
      screen: 'playing',
      output: 0,
      grid,
      tileIdCounter: idCounter,
      forgeOffers: [],
      infusionOptions: [],
      forgeItems: [],
      reactionLog: [],
      phaseIndex: nextPhaseIndex,
      stepsRemaining: nextSteps,
      phaseTargetOutput: nextPhaseTargetOutput,
      consecutiveValidMoves: 0,
      momentumMultiplier: 1.0,
      stabilityCount: 0,
      lastIntermissionMessage: null,
      phaseLogBuffer: nextPhaseLogBuffer,
      currentPhaseEntries: [],
    };
  }

  const rng = createRng(state.rngSeed + 200);
  const forgeItems = generateForgeItems(
    state.activeCatalysts,
    state.activePattern,
    state.signals,
    rng.next.bind(rng),
    state.catalystPool,
    state.roundNumber,
    state.forgeVisitCount,
  );

  return {
    ...state,
    screen: 'forge',
    output,
    energy,
    entropy: nextEntropy,
    corruptedTileCount: state.infiniteModeEnabled ? 0 : state.corruptedTileCount,
    forgeOffers: forgeItems.filter(i => i.type === 'catalyst').map(i => i.catalyst),
    forgeItems,
    forgeVisitCount: state.forgeVisitCount + 1,
    phaseIndex: nextPhaseIndex,
    stepsRemaining: nextSteps,
    phaseTargetOutput: nextPhaseTargetOutput,
    lastIntermissionMessage: null,
    phaseLogBuffer: nextPhaseLogBuffer,
    currentPhaseEntries: [],
  };
}

// Deprecated compatibility path kept for older tests/scripts.
// Runtime gameplay now transitions directly to forge from phase clear.
export function selectInfusion(state: GameState, choice: InfusionChoice): GameState {
  if (state.screen !== 'infusion') return state;
  let next = { ...state };
  if (choice.type === 'energy') next.energy += 3;
  if (choice.type === 'steps') next.stepsRemaining += 2;
  if (choice.type === 'multiplier') {
    next.globalMultiplier = Math.round((next.globalMultiplier + 0.1) * 100) / 100;
  }
  if (choice.type === 'signal' && !next.signals.includes(choice.signal) && next.signals.length < SIGNAL_CAPACITY) {
    next.signals = [...next.signals, choice.signal];
    next.lastIntermissionMessage = { key: 'ui.infusion_granted_signal', params: { name: choice.signal } };
  }
  if (choice.type === 'pattern') {
    const prevPattern = next.activePattern;
    const nextLevel = prevPattern === choice.pattern ? next.patternLevels[choice.pattern] + 1 : 1;
    next.activePattern = choice.pattern;
    next.patternLevels = { ...next.patternLevels, [choice.pattern]: nextLevel };
    next.lastIntermissionMessage = prevPattern === choice.pattern
      ? { key: 'ui.infusion_pattern_growth', params: { name: choice.pattern, level: nextLevel } }
      : prevPattern
        ? { key: 'ui.infusion_pattern_replaced', params: { from: prevPattern, to: choice.pattern, level: nextLevel } }
        : { key: 'ui.infusion_pattern_acquired', params: { name: choice.pattern, level: nextLevel } };
  }
  if (choice.type === 'catalyst') {
    if (!next.activeCatalysts.includes(choice.catalyst.id) && next.activeCatalysts.length < MAX_CATALYSTS) {
      next.activeCatalysts = [...next.activeCatalysts, choice.catalyst.id];
      if (next.catalystPool !== undefined) {
        next.catalystPool = next.catalystPool.filter(id => id !== choice.catalyst.id);
      }
    } else if (next.activeCatalysts.length >= MAX_CATALYSTS) {
      next.energy += 3;
      next.lastIntermissionMessage = {
        key: 'ui.infusion_catalyst_slot_full',
        params: { name: choice.catalyst.id, energy: 3 },
      };
    }
  }
  const rng = createRng(next.rngSeed + 200);
  const forgeItems = generateForgeItems(
    next.activeCatalysts,
    next.activePattern,
    next.signals,
    rng.next.bind(rng),
    next.catalystPool,
    next.roundNumber,
    next.forgeVisitCount,
  );
  return {
    ...next,
    screen: 'forge',
    output: 0,
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    stabilityCount: 0,
    forgeOffers: forgeItems.filter(i => i.type === 'catalyst').map(i => i.catalyst),
    forgeItems,
    forgeVisitCount: next.forgeVisitCount + 1,
  };
}

export function buyForgeItem(state: GameState, item: ForgeShopItem, replaceIndex?: number): GameState {
  if (state.energy < item.price) return state;
  switch (item.type) {
    case 'catalyst':
      return buyFromForge(state, item.catalyst, replaceIndex);
    case 'signal':
      if (state.signals.includes(item.signal) || state.signals.length >= SIGNAL_CAPACITY) return state;
      return {
        ...state,
        energy: state.energy - item.price,
        signals: [...state.signals, item.signal],
        forgeItems: state.forgeItems.filter(i => i.id !== item.id),
        lastIntermissionMessage: {
          key: 'ui.forge_signal_ready',
          params: { name: item.signal },
        },
      };
    case 'pattern': {
      const previousPattern = state.activePattern;
      const isUpgrade = previousPattern === item.pattern;
      const nextLevel = isUpgrade ? state.patternLevels[item.pattern] + 1 : 1;
      return {
        ...state,
        energy: state.energy - item.price,
        activePattern: item.pattern,
        patternLevels: {
          ...state.patternLevels,
          [item.pattern]: nextLevel,
        },
        forgeItems: state.forgeItems.filter(i => i.id !== item.id),
        lastIntermissionMessage: {
          key: 'ui.infusion_pattern_growth',
          params: { name: item.pattern, level: nextLevel },
        },
      };
    }
    case 'utility': {
      let next: GameState = {
        ...state,
        energy: state.energy - item.price,
        forgeItems: state.forgeItems.filter(i => i.id !== item.id),
      };
      if (item.utility === 'energy') next = { ...next, energy: next.energy + FORGE_UTILITY_VALUES.energy };
      if (item.utility === 'steps') next = { ...next, stepsRemaining: next.stepsRemaining + FORGE_UTILITY_VALUES.steps };
      if (item.utility === 'multiplier') {
        next = { ...next, globalMultiplier: Math.round((next.globalMultiplier + FORGE_UTILITY_VALUES.multiplier) * 100) / 100 };
      }
      return next;
    }
  }
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
    forgeItems: state.forgeItems.filter(item => item.type !== 'catalyst' || item.catalyst.id !== catalyst.id),
    lastIntermissionMessage: {
      key: 'ui.forge_boost_ready',
      params: { name: catalyst.id },
    },
  };
}

export function rerollForge(state: GameState): GameState {
  if (state.energy < 1) return state;
  const rng = createRng(state.rngSeed + state.forgeItems.length + 500);
  const forgeItems = generateForgeItems(
    state.activeCatalysts,
    state.activePattern,
    state.signals,
    rng.next.bind(rng),
    state.catalystPool,
    state.roundNumber,
    // Keep rerolls in the same Forge visit band (first/early/full):
    // forgeVisitCount is incremented when entering Forge, so current visit index
    // is (forgeVisitCount - 1).
    Math.max(state.forgeVisitCount - 1, 0),
  );
  return {
    ...state,
    energy: state.energy - 1,
    forgeOffers: forgeItems.filter(i => i.type === 'catalyst').map(i => i.catalyst),
    forgeItems,
  };
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

export function sellPattern(state: GameState): GameState {
  const id = state.activePattern;
  if (!id) return state;
  const refund = Math.max(1, Math.floor(FORGE_PATTERN_PRICE * PATTERN_SELL_REFUND));
  return {
    ...state,
    activePattern: null,
    patternLevels: { ...state.patternLevels, [id]: 0 },
    energy: state.energy + refund,
    lastIntermissionMessage: {
      key: 'ui.forge_sold_pattern',
      params: { name: id, energy: refund },
    },
  };
}

export function sellSignal(state: GameState, signalId: SignalId): GameState {
  if (!state.signals.includes(signalId)) return state;
  const refund = Math.max(1, Math.floor(FORGE_SIGNAL_PRICE * SIGNAL_SELL_REFUND));
  return {
    ...state,
    signals: state.signals.filter(s => s !== signalId),
    pendingSignal: state.pendingSignal === signalId ? null : state.pendingSignal,
    energy: state.energy + refund,
    lastIntermissionMessage: {
      key: 'ui.forge_sold_signal',
      params: { name: signalId, energy: refund },
    },
  };
}

export function skipForge(state: GameState): GameState {
  // In infinite mode with keep_board, preserve the current board instead of resetting
  if (state.infiniteModeEnabled && INFINITE_MODE_CONFIG.phaseTransition.keepBoard) {
    return {
      ...state,
      screen: 'playing',
      output: 0,
      forgeOffers: [],
      infusionOptions: [],
      forgeItems: [],
      reactionLog: [],
      consecutiveValidMoves: 0,
      momentumMultiplier: 1.0,
      stabilityCount: 0,
      currentPhaseEntries: [],
    };
  }

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
    forgeOffers: [],
    infusionOptions: [],
    forgeItems: [],
    reactionLog: [],
    consecutiveValidMoves: 0,
    momentumMultiplier: 1.0,
    stabilityCount: 0,
    currentPhaseEntries: [],
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
    forgeOffers: [],
    infusionOptions: [],
    forgeItems: [],
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
    currentPhaseEntries: [],
    entropy: INFINITE_MODE_CONFIG.entropy.start,
    corruptedTileCount: 0,
    failReason: null,
  };
}

export { consumeSignal };
