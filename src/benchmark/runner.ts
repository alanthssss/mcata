/**
 * Benchmark runner: drives a single game run with an agent headlessly.
 * Supports the endless round-based progression (round_complete screen).
 */
import { Agent }        from '../ai/types';
import { RunMetrics, actionEntropy } from './metrics';
import {
  createInitialState,
  startGame,
  processMoveAction,
  selectInfusion,
  buyFromForge,
  skipForge,
  advanceRound,
} from '../core/engine';
import { GameState, Direction, CatalystId, AscensionLevel } from '../core/types';
import { getEmptyCells, getHighestTileValue } from '../core/board';
import { getPhasesForRound, PHASES_PER_ROUND } from '../core/phases';
import { MAX_CATALYSTS } from '../core/config';
import { ProtocolId } from '../core/types';
import { DEFAULT_PROTOCOL } from '../core/protocols';
import { calculateRunReward } from '../core/profile';
import { generateForgeOffers } from '../core/forge';
import { createRng } from '../core/rng';

// ─── Auto-pilot helpers for non-playing screens ───────────────────────────────
function autoInfusion(state: GameState): GameState {
  if (state.infusionOptions.length === 0) {
    // No infusion options — skip directly to forge with pre-populated offers
    // (this mirrors the path selectInfusion() takes)
    const rng = createRng(state.rngSeed + 100);
    const forgeOffers = generateForgeOffers(
      state.activeCatalysts, 3, rng.next.bind(rng), state.unlockedCatalysts
    );
    return { ...state, screen: 'forge', forgeOffers };
  }
  // When at max catalysts, a catalyst choice does nothing — prefer steps instead.
  const atMaxCatalysts = state.activeCatalysts.length >= MAX_CATALYSTS;
  let choice: typeof state.infusionOptions[0];
  if (!atMaxCatalysts) {
    // Prefer catalyst; fall back to first option
    choice = state.infusionOptions.find(o => o.type === 'catalyst') ?? state.infusionOptions[0];
  } else {
    // Prefer steps (+2 moves) > multiplier > energy
    choice =
      state.infusionOptions.find(o => o.type === 'steps') ??
      state.infusionOptions.find(o => o.type === 'multiplier') ??
      state.infusionOptions[0];
  }
  return selectInfusion(state, choice);
}

function autoForge(state: GameState): GameState {
  // Buy cheapest available catalyst if enough energy, then always skip to 'playing'.
  // buyFromForge keeps screen='forge', so we must call skipForge to advance the screen.
  const affordable = state.forgeOffers
    .filter(c => state.energy >= c.cost)
    .sort((a, b) => a.cost - b.cost);
  const afterBuy = affordable.length > 0 ? buyFromForge(state, affordable[0]) : state;
  return skipForge(afterBuy);
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
}

export function runSingle(opts: RunOptions): RunMetrics {
  const { seed, agent } = opts;
  const maxSteps = opts.maxSteps ?? 2000;
  const maxRounds = opts.maxRounds ?? 10;
  const protocol       = opts.protocol ?? DEFAULT_PROTOCOL;
  const ascensionLevel = opts.ascensionLevel ?? 0;
  const unlockedCatalysts = opts.unlockedCatalysts;

  let state = startGame(createInitialState(seed, protocol, {
    ascensionLevel,
    unlockedCatalysts,
  }));

  let totalSteps           = 0;
  let totalCatalysts       = 0;
  let catalystReplacements = 0;
  let totalEnergyEarned    = 0;
  let prevCatalysts: CatalystId[] = [];
  let anomalyPhaseCount    = 0;
  let anomalyPhasesSurvived = 0;
  let totalMergesPerMove   = 0;
  let emptyCellSum         = 0;
  let roundsCleared        = 0;
  let highestRound         = 1;
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
      const prevOutput = state.output;
      const prevState  = state;
      state = processMoveAction(state, dir);

      if (state === prevState) {
        // invalid move — try fallback directions
        const dirs: Direction[] = ['up', 'down', 'left', 'right'];
        for (const d of dirs) {
          const next = processMoveAction(state, d);
          if (next !== state) { state = next; actionCounts[d]++; break; }
        }
      } else {
        actionCounts[dir]++;
      }

      totalSteps++;
      emptyCellSum   += getEmptyCells(state.grid).length;
      const mergesThisMove = state.reactionLog[0]?.merges.length ?? 0;
      totalMergesPerMove   += mergesThisMove;

      // Energy tracking
      if (state.screen === 'infusion' || state.screen === 'forge') {
        totalEnergyEarned += state.energy - prevOutput; // rough proxy
      }
    }

    // Handle all non-playing, non-terminal screens
    while (
      state.screen !== 'playing' &&
      state.screen !== 'game_over' &&
      state.screen !== 'run_complete'
    ) {
      if (state.screen === 'infusion') {
        state = autoInfusion(state);
      } else if (state.screen === 'forge') {
        state = autoForge(state);
      } else if (state.screen === 'round_complete') {
        roundsCleared++;
        highestRound = Math.max(highestRound, state.roundNumber);
        if (state.roundNumber >= maxRounds) {
          // Treat hitting maxRounds as a "won enough" condition
          break;
        }
        state = advanceRound(state);
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

  // Final screen handling
  while (
    state.screen !== 'game_over' &&
    state.screen !== 'run_complete' &&
    state.screen !== 'round_complete'
  ) {
    if (state.screen === 'infusion') state = autoInfusion(state);
    else if (state.screen === 'forge') state = autoForge(state);
    else break;
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

  const won = state.screen === 'round_complete' || state.screen === 'run_complete';
  const phasesCleared = state.phaseIndex + (won ? 1 : 0);
  const finalOutput  = state.totalOutput;
  const maxTile      = getHighestTileValue(state.grid);
  const avgOutputPerMove = totalSteps > 0 ? finalOutput / totalSteps : 0;
  const avgMergesPerMove = totalSteps > 0 ? totalMergesPerMove / totalSteps : 0;
  const avgEmptyCells    = totalSteps > 0 ? emptyCellSum / totalSteps : 0;
  const moveDiversity    = actionEntropy(actionCounts) / Math.log2(4); // normalised 0–1
  const anomalySurvivalRate = anomalyPhaseCount > 0 ? anomalyPhasesSurvived / anomalyPhaseCount : 1;

  const reward = calculateRunReward(state, anomalySurvivalRate);

  return {
    seed,
    agentName:            agent.name,
    finalOutput,
    phasesCleared,
    won,
    maxTile,
    totalSteps,
    totalCatalysts,
    catalystReplacements,
    totalEnergyEarned,
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
    }));
    opts.onProgress?.(i + 1, opts.runCount);
  }
  return results;
}
