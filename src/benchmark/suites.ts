/**
 * Benchmark suite definitions.
 */
import { Agent } from '../ai/types';
import { RunMetrics, SuiteMetrics, buildSuiteMetrics } from './metrics';
import { runBatch } from './runner';

export interface SuiteDefinition {
  name:        string;
  description: string;
  agents:      Agent[];
  runCount:    number;
  seedStart:   number;
}

export interface SuiteResult {
  suiteName:    string;
  agentResults: Record<string, RunMetrics[]>;
  suiteMetrics: Record<string, SuiteMetrics>;
}

// ─── Run a suite ──────────────────────────────────────────────────────────────
export function runSuite(
  suite: SuiteDefinition,
  onProgress?: (agent: string, done: number, total: number) => void
): SuiteResult {
  const agentResults: Record<string, RunMetrics[]> = {};
  const suiteMetrics: Record<string, SuiteMetrics> = {};

  for (const agent of suite.agents) {
    console.log(`  [${suite.name}] Running ${agent.name} × ${suite.runCount}...`);
    const runs = runBatch({
      agent,
      runCount:  suite.runCount,
      seedStart: suite.seedStart,
      onProgress: (done, total) => onProgress?.(agent.name, done, total),
    });
    agentResults[agent.name] = runs;
    suiteMetrics[agent.name] = buildSuiteMetrics(runs);
  }

  return { suiteName: suite.name, agentResults, suiteMetrics };
}
