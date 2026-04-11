/**
 * Preconfigured benchmark suite presets.
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

/** Suite A — Baseline (100 runs each) */
export const SUITE_BASELINE: SuiteDefinition = {
  name:        'Baseline',
  description: 'All agents, 100 runs each, fixed seed range.',
  agents:      defaultAgents(),
  runCount:    100,
  seedStart:   1000,
};

/** Suite B — Long (500 runs each) */
export const SUITE_LONG: SuiteDefinition = {
  name:        'Long',
  description: 'All agents, 500 runs each for stable comparisons.',
  agents:      defaultAgents(),
  runCount:    500,
  seedStart:   2000,
};

/** Suite C — Balance Probe (50 runs, GreedyAgent + HeuristicAgent) */
export const SUITE_BALANCE: SuiteDefinition = {
  name:        'BalanceProbe',
  description: 'Balance-focused runs with Greedy and Heuristic agents.',
  agents:      [new GreedyAgent(), new HeuristicAgent()],
  runCount:    50,
  seedStart:   3000,
};

/** Suite D — Phase Stress Test (50 runs, HeuristicAgent) */
export const SUITE_PHASE_STRESS: SuiteDefinition = {
  name:        'PhaseStress',
  description: 'Phase 4 / 6 anomaly stress runs using HeuristicAgent.',
  agents:      [new HeuristicAgent(), new MCTSAgent({ rollouts: 20, rolloutDepth: 10 })],
  runCount:    50,
  seedStart:   4000,
};

/** Quick smoke test (5 runs) */
export const SUITE_SMOKE: SuiteDefinition = {
  name:        'Smoke',
  description: 'Quick sanity check, 5 runs each.',
  agents:      defaultAgents(),
  runCount:    5,
  seedStart:   999,
};

export const ALL_PRESETS: Record<string, SuiteDefinition> = {
  baseline:     SUITE_BASELINE,
  long:         SUITE_LONG,
  balance:      SUITE_BALANCE,
  phase_stress: SUITE_PHASE_STRESS,
  smoke:        SUITE_SMOKE,
};
