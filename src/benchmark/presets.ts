/**
 * Preconfigured benchmark suite presets.
 * All suites evaluate score-chasing depth and survival across endless rounds.
 * No suite assumes a fixed 6-phase win condition.
 */
import { SuiteDefinition } from './suites';
import {
  RandomAgent,
  GreedyAgent,
  HeuristicAgent,
  BeamSearchAgent,
  MCTSAgent,
} from '../ai/agents/index';

function defaultAgents() {
  return [
    new RandomAgent(),
    new GreedyAgent(),
    new HeuristicAgent(),
    new BeamSearchAgent({ depth: 3, beamWidth: 3 }),
    new MCTSAgent({ rollouts: 15, rolloutDepth: 8 }),
  ];
}

/** Suite: Smoke — Quick sanity / correctness check (5 runs each). */
export const SUITE_SMOKE: SuiteDefinition = {
  name:        'Smoke',
  description: 'Quick sanity check: verify agents run to completion, artifacts generate, and core metrics are non-zero.',
  agents:      defaultAgents(),
  runCount:    5,
  seedStart:   999,
};

/** Suite: Baseline — Standard endless-mode comparison (100 runs each). */
export const SUITE_BASELINE: SuiteDefinition = {
  name:        'Baseline',
  description: 'Compare agents on score-chasing performance: avgRoundsCleared, meanOutput, and pacing across 100 runs per agent.',
  agents:      defaultAgents(),
  runCount:    100,
  seedStart:   1000,
};

/** Suite: Long — Stable endless-mode comparison (500 runs each). */
export const SUITE_LONG: SuiteDefinition = {
  name:        'Long',
  description: 'High-confidence agent comparison: rounds reached, output growth, build maturity, and failure distribution across 500 runs per agent.',
  agents:      defaultAgents(),
  runCount:    500,
  seedStart:   2000,
};

/** Suite: Balance — Catalyst diversity and economy probing (50 runs each). */
export const SUITE_BALANCE: SuiteDefinition = {
  name:        'BalanceProbe',
  description: 'Balance-focused: inspect catalyst pick rates, synergy density, economy trend, and anomaly pressure across rounds.',
  agents:      [new GreedyAgent(), new HeuristicAgent()],
  runCount:    50,
  seedStart:   3000,
};

/** Suite: Pacing — Phase pacing and moves-per-phase analysis (50 runs each). */
export const SUITE_PACING: SuiteDefinition = {
  name:        'Pacing',
  description: 'Pacing-focused: measure avgMovesPerPhase by round, late-game clear speed, short-clear rate, and max tier reached.',
  agents:      [new HeuristicAgent(), new MCTSAgent({ rollouts: 20, rolloutDepth: 10 })],
  runCount:    50,
  seedStart:   4000,
};

/** Suite: RoundStress — Later-round failure pattern analysis (50 runs each). */
export const SUITE_ROUND_STRESS: SuiteDefinition = {
  name:        'RoundStress',
  description: 'Late-round stress: focus on failureDistributionByRound, anomaly survival in rounds 3+, and output growth trajectory.',
  agents:      [new HeuristicAgent(), new MCTSAgent({ rollouts: 20, rolloutDepth: 10 })],
  runCount:    50,
  seedStart:   5000,
};

export const ALL_PRESETS: Record<string, SuiteDefinition> = {
  smoke:        SUITE_SMOKE,
  baseline:     SUITE_BASELINE,
  long:         SUITE_LONG,
  balance:      SUITE_BALANCE,
  pacing:       SUITE_PACING,
  round_stress: SUITE_ROUND_STRESS,
};
