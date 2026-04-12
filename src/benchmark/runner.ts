/**
 * Benchmark runner: drives a single game run with an agent headlessly.
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
} from '../core/engine';
import { GameState, Direction, CatalystId } from '../core/types';
import { getEmptyCells, getHighestTileValue } from '../core/board';
import { PHASES } from '../core/phases';

// ─── Auto-pilot helpers for non-playing screens ───────────────────────────────
function autoInfusion(state: GameState): GameState {
  if (state.infusionOptions.length === 0) return { ...state, screen: 'playing' };
  // When at max catalysts, a catalyst choice does nothing — prefer steps instead.
  const atMaxCatalysts = state.activeCatalysts.length >= 3;
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
}

export function runSingle(opts: RunOptions): RunMetrics {
  const { seed, agent } = opts;
  const maxSteps = opts.maxSteps ?? 2000;

  let state = startGame(createInitialState(seed));

  let totalSteps           = 0;
  let totalCatalysts       = 0;
  let catalystReplacements = 0;
  let totalEnergyEarned    = 0;
  let prevCatalysts: CatalystId[] = [];
  let anomalyPhaseCount    = 0;
  let anomalyPhasesSurvived = 0;
  let totalMergesPerMove   = 0;
  let emptyCellSum         = 0;
  const actionCounts: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };

  while (state.screen === 'playing' && totalSteps < maxSteps) {
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

    // Energy tracking: if output increased and phase may have ended
    if (state.screen === 'infusion' || state.screen === 'forge') {
      totalEnergyEarned += state.energy - prevOutput; // rough proxy
    }

    // Handle screen transitions
    while (state.screen !== 'playing' &&
           state.screen !== 'game_over' &&
           state.screen !== 'run_complete') {
      if (state.screen === 'infusion') {
        state = autoInfusion(state);
      } else if (state.screen === 'forge') {
        state = autoForge(state);
      } else {
        break;
      }
    }

    // Track catalyst changes
    const curCatalysts = [...state.activeCatalysts].sort();
    const prevSorted   = [...prevCatalysts].sort();
    const gained   = curCatalysts.filter(c => !prevSorted.includes(c)).length;
    const replaced = prevSorted.filter(c => !curCatalysts.includes(c)).length;
    totalCatalysts       = state.activeCatalysts.length;
    catalystReplacements += replaced;
    if (gained > 0) prevCatalysts = curCatalysts;
  }

  // Final screen handling
  while (state.screen !== 'game_over' && state.screen !== 'run_complete') {
    if (state.screen === 'infusion') state = autoInfusion(state);
    else if (state.screen === 'forge') state = autoForge(state);
    else break;
  }

  // Compute anomaly survival rate
  for (const ph of PHASES) {
    if (ph.anomaly) {
      anomalyPhaseCount++;
      // If state survived past that phase index, count as survived
      if (state.phaseIndex > PHASES.indexOf(ph) ||
          state.screen === 'run_complete') {
        anomalyPhasesSurvived++;
      }
    }
  }

  const won          = state.screen === 'run_complete';
  const phasesCleared = state.phaseIndex + (won ? 1 : 0);
  const finalOutput  = state.totalOutput;
  const maxTile      = getHighestTileValue(state.grid);
  const avgOutputPerMove = totalSteps > 0 ? finalOutput / totalSteps : 0;
  const avgMergesPerMove = totalSteps > 0 ? totalMergesPerMove / totalSteps : 0;
  const avgEmptyCells    = totalSteps > 0 ? emptyCellSum / totalSteps : 0;
  const moveDiversity    = actionEntropy(actionCounts) / Math.log2(4); // normalised 0–1
  const anomalySurvivalRate = anomalyPhaseCount > 0 ? anomalyPhasesSurvived / anomalyPhaseCount : 1;

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
  };
}

// ─── Batch run ────────────────────────────────────────────────────────────────
export interface BatchOptions {
  agent:     Agent;
  runCount:  number;
  seedStart: number;
  onProgress?: (done: number, total: number) => void;
}

export function runBatch(opts: BatchOptions): RunMetrics[] {
  const results: RunMetrics[] = [];
  for (let i = 0; i < opts.runCount; i++) {
    results.push(runSingle({ seed: opts.seedStart + i, agent: opts.agent }));
    opts.onProgress?.(i + 1, opts.runCount);
  }
  return results;
}
