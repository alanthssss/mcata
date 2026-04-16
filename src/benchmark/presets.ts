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

function debugAgents() {
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
  description: 'Quick sanity check: verify benchmark plumbing and extension agents still run end-to-end.',
  agents:      debugAgents(),
  runCount:    5,
  seedStart:   999,
  category:    'debug',
};

/** Suite: Baseline — Standard Heuristic tuning pass. */
export const SUITE_BASELINE: SuiteDefinition = {
  name:        'Baseline',
  description: 'Primary balance baseline using only HeuristicAgent for pacing/economy/board-growth tuning.',
  agents:      [new HeuristicAgent()],
  runCount:    40,
  seedStart:   1000,
  category:    'tuning',
};

/** Suite: Long — Higher-confidence Heuristic tuning pass. */
export const SUITE_LONG: SuiteDefinition = {
  name:        'Long',
  description: 'Higher-confidence Heuristic-only run for validating longer-term scaling trends.',
  agents:      [new HeuristicAgent()],
  runCount:    120,
  seedStart:   2000,
  category:    'tuning',
};

/** Suite: Balance — Heuristic-only economy and growth probe. */
export const SUITE_BALANCE: SuiteDefinition = {
  name:        'BalanceProbe',
  description: 'Balance-focused Heuristic probe for pacing, economy tightness, and board growth.',
  agents:      [new HeuristicAgent()],
  runCount:    35,
  seedStart:   3000,
  category:    'tuning',
};

/** Suite: Pacing — Heuristic-only pacing analysis. */
export const SUITE_PACING: SuiteDefinition = {
  name:        'Pacing',
  description: 'Pacing-focused Heuristic run: moves-per-phase by round and late-game clear speed.',
  agents:      [new HeuristicAgent()],
  runCount:    30,
  seedStart:   4000,
  category:    'tuning',
};

/** Suite: RoundStress — Heuristic-only late-round pressure analysis. */
export const SUITE_ROUND_STRESS: SuiteDefinition = {
  name:        'RoundStress',
  description: 'Late-round stress with Heuristic to inspect failure distribution and board maturity.',
  agents:      [new HeuristicAgent()],
  runCount:    30,
  seedStart:   5000,
  category:    'tuning',
};

/** Suite: Debug agents — optional strategy comparison outside tuning workflow. */
export const SUITE_DEBUG_AGENTS: SuiteDefinition = {
  name:        'DebugAgents',
  description: 'Optional suite for smoke-comparing non-primary agents. Not used by default tuning flows.',
  agents:      debugAgents(),
  runCount:    20,
  seedStart:   7000,
  category:    'debug',
};

export const ALL_PRESETS: Record<string, SuiteDefinition> = {
  smoke:        SUITE_SMOKE,
  baseline:     SUITE_BASELINE,
  long:         SUITE_LONG,
  balance:      SUITE_BALANCE,
  pacing:       SUITE_PACING,
  round_stress: SUITE_ROUND_STRESS,
  debug_agents: SUITE_DEBUG_AGENTS,
};
