/**
 * Benchmark runner: drives a single game run with an agent headlessly.
 * Supports the endless round-based progression (round_complete screen).
 */
import { Agent }        from '../ai/types';
import { RunMetrics, PhaseRecord, actionEntropy } from './metrics';
import {
  createInitialState,
  startGame,
  processMoveAction,
  buyForgeItem,
  skipForge,
  advanceRound,
} from '../core/engine';
import { GameState, Direction, CatalystId, AscensionLevel } from '../core/types';
import { getEmptyCells, getHighestTileValue } from '../core/board';
import { getPhasesForRound, PHASES_PER_ROUND } from '../core/phases';
import { ProtocolId } from '../core/types';
import { DEFAULT_PROTOCOL } from '../core/protocols';
import { calculateRunReward } from '../core/profile';
import { CATALYST_DEFS } from '../core/catalysts';
import { buildRunLog } from '../store/runLogStore';
import type { RunLogPersister } from '../scripts/persistRunLog';

export interface BenchmarkTuningOverrides {
  stepsMultiplier?: number;
  targetOutputMultiplier?: number;
  roundScaleMultiplier?: number;
  startingEnergy?: number;
  energyIncomeMultiplier?: number;
}

function autoForge(state: GameState): GameState {
  const affordable = state.forgeItems
    .filter(item => state.energy >= item.price)
    .sort((a, b) => a.price - b.price);
  const afterBuy = affordable.length > 0 ? buyForgeItem(state, affordable[0]) : state;
  return skipForge(afterBuy);
}

function withPhaseOverrides(state: GameState, overrides?: BenchmarkTuningOverrides): GameState {
  if (!overrides) return state;
  const stepsMultiplier = overrides.stepsMultiplier ?? 1;
  const targetOutputMultiplier = overrides.targetOutputMultiplier ?? 1;
  const roundScaleMultiplier = overrides.roundScaleMultiplier ?? 1;
  const roundScale = Math.pow(roundScaleMultiplier, Math.max(0, state.roundNumber - 1));
  return {
    ...state,
    stepsRemaining: Math.max(3, Math.round(state.stepsRemaining * stepsMultiplier)),
    phaseTargetOutput: Math.max(1, Math.ceil(state.phaseTargetOutput * targetOutputMultiplier * roundScale)),
  };
}

function withEnergyIncomeScaling(prev: GameState, next: GameState, overrides?: BenchmarkTuningOverrides): GameState {
  const energyIncomeMultiplier = overrides?.energyIncomeMultiplier ?? 1;
  if (energyIncomeMultiplier === 1) return next;
  const delta = next.energy - prev.energy;
  if (delta <= 0) return next;
  return { ...next, energy: prev.energy + Math.max(0, Math.round(delta * energyIncomeMultiplier)) };
}

// ─── Single run ───────────────────────────────────────────────────────────────
export interface RunOptions {
  seed:  number;
  agent: Agent;
  maxSteps?: number; // safety guard (default 2000)
  /** Protocol to use (default: corner_protocol) */
  protocol?: ProtocolId;
  /** Ascension level 0–8 (default: 0) */
  ascensionLevel?: AscensionLevel;
  /**
   * Maximum number of rounds to simulate (default: 10).
   * Keeps benchmark runs finite for headless mode.
   */
  maxRounds?: number;
  /**
   * When provided, only catalysts in this list appear in Forge / Infusion.
   * Leave undefined for full pool (benchmark default).
   */
  unlockedCatalysts?: CatalystId[];
  tuningOverrides?: BenchmarkTuningOverrides;
  /** Optional persister for automatic run-log disk persistence. */
  persister?: RunLogPersister;
}

export function runSingle(opts: RunOptions): RunMetrics {
  const { seed, agent } = opts;
  const maxSteps = opts.maxSteps ?? 2000;
  const maxRounds = opts.maxRounds ?? 10;
  const protocol       = opts.protocol ?? DEFAULT_PROTOCOL;
  const ascensionLevel = opts.ascensionLevel ?? 0;
  const unlockedCatalysts = opts.unlockedCatalysts;
  const tuningOverrides = opts.tuningOverrides;
  const persister = opts.persister;

  let state = startGame(createInitialState(seed, protocol, {
    ascensionLevel,
    unlockedCatalysts,
  }));
  state = withPhaseOverrides(state, tuningOverrides);
  if (tuningOverrides?.startingEnergy !== undefined) {
    state = { ...state, energy: tuningOverrides.startingEnergy };
  }

  // ── Lifecycle: run start ──────────────────────────────────────────────────
  if (persister) persister.onRunStart(seed);

  let totalSteps           = 0;
  let totalCatalysts       = 0;
  let catalystReplacements = 0;
  let totalEnergyEarned    = 0;
  let totalEnergySpent     = 0;
  let prevCatalysts: CatalystId[] = [];
  let anomalyPhaseCount    = 0;
  let anomalyPhasesSurvived = 0;
  let totalMergesPerMove   = 0;
  let emptyCellSum         = 0;
  let roundsCleared        = 0;
  let highestRound         = 1;
  // Phase pacing metrics
  let phaseStepSum         = 0;  // total steps across all completed phases
  let phasesTracked        = 0;  // number of phases where we measured steps
  let phaseStepStart       = 0;  // step count at the start of the current phase
  const phaseHistory: PhaseRecord[] = [];
  const forgeOfferRarityCounts: Record<'common' | 'rare' | 'epic', number> = { common: 0, rare: 0, epic: 0 };
  const acquiredRarityCounts: Record<'common' | 'rare' | 'epic', number> = { common: 0, rare: 0, epic: 0 };
  let forgeOffersSeen = 0;
  let forgeOffersAffordable = 0;
  let firstRareRound: number | undefined;
  let firstEpicRound: number | undefined;
  // Snapshot of state at the start of each phase for PhaseRecord
  let phaseStartRound      = state.roundNumber;
  let phaseStartIndex      = state.phaseIndex;
  let phaseStartTarget     = state.phaseTargetOutput;
  const actionCounts: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };

  const isRunning = () =>
    state.screen !== 'game_over' &&
    state.screen !== 'run_complete' &&
    state.screen !== 'round_complete' &&
    totalSteps < maxSteps &&
    state.roundNumber <= maxRounds;

  while (isRunning()) {
    if (state.screen === 'playing') {
      const dir: Direction = agent.nextAction(state);
      const prevState  = state;
      state = processMoveAction(state, dir);
      state = withEnergyIncomeScaling(prevState, state, tuningOverrides);

      if (state === prevState) {
        // invalid move — try fallback directions
        const dirs: Direction[] = ['up', 'down', 'left', 'right'];
        for (const d of dirs) {
          const next = processMoveAction(state, d);
          if (next !== state) {
            state = withEnergyIncomeScaling(prevState, next, tuningOverrides);
            actionCounts[d]++;
            break;
          }
        }
      } else {
        actionCounts[dir]++;
      }

      totalSteps++;
      emptyCellSum   += getEmptyCells(state.grid).length;
      const mergesThisMove = state.reactionLog[0]?.merges.length ?? 0;
      totalMergesPerMove   += mergesThisMove;

      const energyDelta = state.energy - prevState.energy;
      if (energyDelta > 0) totalEnergyEarned += energyDelta;
      if (energyDelta < 0) totalEnergySpent += Math.abs(energyDelta);

      // ── Lifecycle: step ────────────────────────────────────────────────────
      if (persister) persister.onStep(totalSteps, state.totalOutput, state.energy, dir);
    }

    // Handle all non-playing, non-terminal screens
    while (
      state.screen !== 'playing' &&
      state.screen !== 'game_over' &&
      state.screen !== 'run_complete'
    ) {
      if (state.screen === 'forge') {
        // Phase just ended — capture PhaseRecord and pacing metrics
        const movesUsed = totalSteps - phaseStepStart;
        phaseStepSum += movesUsed;
        phasesTracked++;
        phaseHistory.push({
          round:        phaseStartRound,
          phaseIndex:   phaseStartIndex,
          movesUsed,
          targetOutput: phaseStartTarget,
          actualOutput: state.output,
          maxTile:      getHighestTileValue(state.grid),
          cleared:      true,
          catalystCount: state.activeCatalysts.length,
        });
        phaseStepStart   = totalSteps;
        phaseStartRound  = state.roundNumber;
        phaseStartIndex  = state.phaseIndex;
        phaseStartTarget = state.phaseTargetOutput;
        for (const offer of state.forgeItems) {
          if (offer.type !== 'catalyst') continue;
          const catalyst = offer.catalyst;
          forgeOfferRarityCounts[catalyst.rarity]++;
        }
        forgeOffersSeen += state.forgeItems.filter(i => i.type === 'catalyst').length;
        forgeOffersAffordable += state.forgeItems.filter(i => i.type === 'catalyst' && state.energy >= i.price).length;
        const beforeIds = new Set(state.activeCatalysts);
        const preForge = state;
        state = autoForge(state);
        state = withEnergyIncomeScaling(preForge, state, tuningOverrides);
        state = withPhaseOverrides(state, tuningOverrides);
        const forgeEnergyDelta = state.energy - preForge.energy;
        if (forgeEnergyDelta > 0) totalEnergyEarned += forgeEnergyDelta;
        if (forgeEnergyDelta < 0) totalEnergySpent += Math.abs(forgeEnergyDelta);
        for (const id of state.activeCatalysts) {
          if (!beforeIds.has(id)) {
            const rarity = CATALYST_DEFS[id].rarity;
            acquiredRarityCounts[rarity]++;
            if (rarity === 'rare' && firstRareRound === undefined) firstRareRound = state.roundNumber;
            if (rarity === 'epic' && firstEpicRound === undefined) firstEpicRound = state.roundNumber;
          }
        }
      } else if (state.screen === 'round_complete') {
        // Last phase of the round cleared — record it before advancing
        const movesUsed = totalSteps - phaseStepStart;
        phaseStepSum += movesUsed;
        phasesTracked++;
        phaseHistory.push({
          round:        phaseStartRound,
          phaseIndex:   phaseStartIndex,
          movesUsed,
          targetOutput: phaseStartTarget,
          actualOutput: state.output,
          maxTile:      getHighestTileValue(state.grid),
          cleared:      true,
          catalystCount: state.activeCatalysts.length,
        });
        roundsCleared++;
        highestRound = Math.max(highestRound, state.roundNumber);
        if (state.roundNumber >= maxRounds) {
          // Treat hitting maxRounds as a "won enough" condition
          break;
        }
        const preRound = state;
        state = advanceRound(state);
        state = withEnergyIncomeScaling(preRound, state, tuningOverrides);
        state = withPhaseOverrides(state, tuningOverrides);
        const roundEnergyDelta = state.energy - preRound.energy;
        if (roundEnergyDelta > 0) totalEnergyEarned += roundEnergyDelta;
        if (roundEnergyDelta < 0) totalEnergySpent += Math.abs(roundEnergyDelta);
        phaseStepStart   = totalSteps;
        phaseStartRound  = state.roundNumber;
        phaseStartIndex  = state.phaseIndex;
        phaseStartTarget = state.phaseTargetOutput;
      } else {
        break;
      }
    }

    // Track catalyst changes
    const curCatalysts = [...state.activeCatalysts].sort();
    const prevSorted   = [...prevCatalysts].sort();
    const replaced = prevSorted.filter(c => !curCatalysts.includes(c)).length;
    totalCatalysts       = state.activeCatalysts.length;
    catalystReplacements += replaced;
    if (curCatalysts.join() !== prevSorted.join()) prevCatalysts = curCatalysts;
  }

  // Final screen handling (also record failed phase on game_over)
  while (
    state.screen !== 'game_over' &&
    state.screen !== 'run_complete' &&
    state.screen !== 'round_complete'
  ) {
    if (state.screen === 'forge') state = autoForge(state);
    else break;
  }

  // Record the terminal phase (failed or run truncated at maxRounds)
  if (state.screen === 'game_over') {
    phaseHistory.push({
      round:        phaseStartRound,
      phaseIndex:   phaseStartIndex,
      movesUsed:    totalSteps - phaseStepStart,
      targetOutput: phaseStartTarget,
      actualOutput: state.output,
      maxTile:      getHighestTileValue(state.grid),
      cleared:      false,
      catalystCount: state.activeCatalysts.length,
    });
  }

  // Track last round
  highestRound = Math.max(highestRound, state.roundNumber);

  // Compute anomaly survival rate across all rounds played
  const phasesForCurrentRound = getPhasesForRound(state.roundNumber);
  for (const ph of phasesForCurrentRound) {
    if (ph.anomaly) {
      anomalyPhaseCount++;
      if (
        state.phaseIndex > phasesForCurrentRound.indexOf(ph) ||
        state.screen === 'round_complete' ||
        state.screen === 'run_complete'
      ) {
        anomalyPhasesSurvived++;
      }
    }
  }

  // Derive phasesCleared from phaseHistory (count of cleared phases across all rounds)
  const phasesCleared = phaseHistory.filter(p => p.cleared).length;
  // Failure tracking: only set when the run ended with game_over (not benchmark truncation)
  const failureRound      = state.screen === 'game_over' ? state.roundNumber : undefined;
  const failurePhaseIndex = state.screen === 'game_over' ? state.phaseIndex  : undefined;
  const finalOutput  = state.totalOutput;
  const maxTile      = getHighestTileValue(state.grid);
  const avgOutputPerMove = totalSteps > 0 ? finalOutput / totalSteps : 0;
  const avgMergesPerMove = totalSteps > 0 ? totalMergesPerMove / totalSteps : 0;
  const avgEmptyCells    = totalSteps > 0 ? emptyCellSum / totalSteps : 0;
  const moveDiversity    = actionEntropy(actionCounts) / Math.log2(4); // normalised 0–1
  const anomalySurvivalRate = anomalyPhaseCount > 0 ? anomalyPhasesSurvived / anomalyPhaseCount : 1;
  const avgMovesPerPhase = phasesTracked > 0 ? phaseStepSum / phasesTracked : 0;
  const uniqueCatalystsAcquired = new Set(state.activeCatalysts).size;
  const highestTierReached = Math.log2(Math.max(2, maxTile));

  const reward = calculateRunReward(state, anomalySurvivalRate);

  // ── Lifecycle: run end ────────────────────────────────────────────────────
  if (persister) {
    try {
      const runLog = buildRunLog({
        rngSeed: state.rngSeed,
        runSeed: seed,
        protocol,
        challengeId: state.challengeId,
        isDailyRun: state.isDailyRun,
        roundNumber: state.roundNumber,
        screen: state.screen,
        totalOutput: state.totalOutput,
        phaseLogBuffer: state.phaseLogBuffer,
        activeCatalysts: state.activeCatalysts,
        signals: state.signals,
        activePattern: state.activePattern,
      });
      persister.onRunEnd(runLog);
    } catch (err) {
      // Persistence errors must never break the benchmark run; log to stderr for diagnostics
      process.stderr.write(`[persistRunLog] error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  return {
    seed,
    agentName:            agent.name,
    finalOutput,
    phasesCleared,
    maxTile,
    totalSteps,
    totalCatalysts,
    catalystReplacements,
    totalEnergyEarned,
    totalEnergySpent,
    avgOutputPerMove,
    anomalySurvivalRate,
    avgMergesPerMove,
    avgEmptyCells,
    activeCatalysts:      state.activeCatalysts,
    moveDiversity,
    invalidMoveRate:      0, // agents should never hit invalid moves
    ascensionLevel:       ascensionLevel,
    coreShards:           reward.metaCurrencyEarned,
    roundsCleared,
    highestRound,
    failureRound,
    failurePhaseIndex,
    avgMovesPerPhase,
    uniqueCatalystsAcquired,
    phaseHistory,
    forgeOfferRarityCounts,
    acquiredRarityCounts,
    firstRareRound,
    firstEpicRound,
    selectedPattern: state.activePattern,
    highestTierReached,
    forgeOffersSeen,
    forgeOffersAffordable,
  };
}

// ─── Batch run ────────────────────────────────────────────────────────────────
export interface BatchOptions {
  agent:     Agent;
  runCount:  number;
  seedStart: number;
  protocol?:          ProtocolId;
  ascensionLevel?:    AscensionLevel;
  unlockedCatalysts?: CatalystId[];
  tuningOverrides?: BenchmarkTuningOverrides;
  onProgress?: (done: number, total: number) => void;
}

export function runBatch(opts: BatchOptions): RunMetrics[] {
  const results: RunMetrics[] = [];
  for (let i = 0; i < opts.runCount; i++) {
    results.push(runSingle({
      seed: opts.seedStart + i,
      agent: opts.agent,
      protocol:          opts.protocol,
      ascensionLevel:    opts.ascensionLevel,
      unlockedCatalysts: opts.unlockedCatalysts,
      tuningOverrides: opts.tuningOverrides,
    }));
    opts.onProgress?.(i + 1, opts.runCount);
  }
  return results;
}
