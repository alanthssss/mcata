/**
 * Benchmark suite definitions.
 */
import { Agent } from '../ai/types';
import { RunMetrics, SuiteMetrics, buildSuiteMetrics } from './metrics';
import { runBatch } from './runner';
import { AscensionLevel } from '../core/types';
import { ALL_ASCENSION_LEVELS } from '../core/ascensionModifiers';
import { BASE_UNLOCKED_CATALYSTS } from '../core/unlockConfig';

export interface SuiteDefinition {
  name:        string;
  description: string;
  agents:      Agent[];
  runCount:    number;
  seedStart:   number;
  category?:   'tuning' | 'debug';
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

// ─── Ascension sweep ──────────────────────────────────────────────────────────

export interface AscensionSuiteResult {
  /** Results keyed by ascension level then by agent name */
  byLevel: Record<number, Record<string, RunMetrics[]>>;
  /** Suite metrics keyed by ascension level then by agent name */
  metricsByLevel: Record<number, Record<string, SuiteMetrics>>;
}

/**
 * Run the same set of agents across multiple (or all) ascension levels and
 * collect per-level win rates.
 */
export function runAscensionSuite(
  agents: Agent[],
  runCount: number,
  seedStart: number,
  levels: AscensionLevel[] = ALL_ASCENSION_LEVELS,
  onProgress?: (level: number, agent: string, done: number, total: number) => void,
): AscensionSuiteResult {
  const byLevel:      Record<number, Record<string, RunMetrics[]>> = {};
  const metricsByLevel: Record<number, Record<string, SuiteMetrics>> = {};

  for (const level of levels) {
    byLevel[level]      = {};
    metricsByLevel[level] = {};

    for (const agent of agents) {
      const runs = runBatch({
        agent,
        runCount,
        seedStart,
        ascensionLevel: level,
        onProgress: (done, total) => onProgress?.(level, agent.name, done, total),
      });
      byLevel[level][agent.name]      = runs;
      metricsByLevel[level][agent.name] = buildSuiteMetrics(runs);
    }
  }

  return { byLevel, metricsByLevel };
}

// ─── Unlock pool comparison ───────────────────────────────────────────────────

export interface UnlockComparisonResult {
  basePool: Record<string, RunMetrics[]>;
  fullPool: Record<string, RunMetrics[]>;
  baseMetrics: Record<string, SuiteMetrics>;
  fullMetrics: Record<string, SuiteMetrics>;
}

/**
 * Compare agent performance with the base (legacy-only) catalyst pool versus
 * the full catalyst pool.  Useful for measuring unlock impact.
 */
export function runUnlockComparisonSuite(
  agents: Agent[],
  runCount: number,
  seedStart: number,
  onProgress?: (pool: 'base' | 'full', agent: string, done: number, total: number) => void,
): UnlockComparisonResult {
  const basePool:    Record<string, RunMetrics[]> = {};
  const fullPool:    Record<string, RunMetrics[]> = {};
  const baseMetrics: Record<string, SuiteMetrics> = {};
  const fullMetrics: Record<string, SuiteMetrics> = {};

  for (const agent of agents) {
    // Base pool: only legacy catalysts
    basePool[agent.name] = runBatch({
      agent, runCount, seedStart,
      unlockedCatalysts: BASE_UNLOCKED_CATALYSTS,
      onProgress: (d, t) => onProgress?.('base', agent.name, d, t),
    });
    baseMetrics[agent.name] = buildSuiteMetrics(basePool[agent.name]);

    // Full pool: all catalysts (no restriction)
    fullPool[agent.name] = runBatch({
      agent, runCount, seedStart,
      onProgress: (d, t) => onProgress?.('full', agent.name, d, t),
    });
    fullMetrics[agent.name] = buildSuiteMetrics(fullPool[agent.name]);
  }

  return { basePool, fullPool, baseMetrics, fullMetrics };
}
