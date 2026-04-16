#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { HeuristicAgent } from '../ai/agents/index';
import { runBatch } from '../benchmark/runner';
import { buildSuiteMetrics, SuiteMetrics } from '../benchmark/metrics';
import {
  BASELINE_TUNING_CANDIDATE,
  HEURISTIC_TUNING_TARGETS,
  TuningCandidate,
  clampCandidate,
  scoreAgainstTargets,
} from '../benchmark/tuning';

const ITERATIONS = 5;
const RUNS_PER_ITERATION = 20;
const SEED_START = 9000;
const OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts', 'benchmark', 'latest');

interface IterationResult {
  iteration: number;
  candidate: TuningCandidate;
  score: number;
  metrics: Pick<
    SuiteMetrics,
    | 'avgMovesPerPhase'
    | 'avgMovesPerPhaseByRound'
    | 'avgHighestTierPerPhase'
    | 'avgHighestTierPerRound'
    | 'highTierReachDistribution'
    | 'energyIncomePerRound'
    | 'energySpentPerRound'
    | 'forgeAffordabilityRate'
    | 'buildMaturityByRound'
    | 'lateGameClearSpeed'
  >;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(fileName: string, content: string) {
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), content, 'utf-8');
}

function runCandidate(candidate: TuningCandidate, iteration: number): IterationResult {
  const runs = runBatch({
    agent: new HeuristicAgent(),
    runCount: RUNS_PER_ITERATION,
    seedStart: SEED_START + iteration * 100,
    tuningOverrides: candidate,
  });
  const metrics = buildSuiteMetrics(runs);
  return {
    iteration,
    candidate,
    score: scoreAgainstTargets(metrics, HEURISTIC_TUNING_TARGETS),
    metrics: {
      avgMovesPerPhase: metrics.avgMovesPerPhase,
      avgMovesPerPhaseByRound: metrics.avgMovesPerPhaseByRound,
      avgHighestTierPerPhase: metrics.avgHighestTierPerPhase,
      avgHighestTierPerRound: metrics.avgHighestTierPerRound,
      highTierReachDistribution: metrics.highTierReachDistribution,
      energyIncomePerRound: metrics.energyIncomePerRound,
      energySpentPerRound: metrics.energySpentPerRound,
      forgeAffordabilityRate: metrics.forgeAffordabilityRate,
      buildMaturityByRound: metrics.buildMaturityByRound,
      lateGameClearSpeed: metrics.lateGameClearSpeed,
    },
  };
}

function nextCandidate(from: TuningCandidate, metrics: IterationResult['metrics']): TuningCandidate {
  const next: TuningCandidate = { ...from };

  if (metrics.avgMovesPerPhase < (HEURISTIC_TUNING_TARGETS.avgMovesPerPhase.min ?? 0)) {
    next.stepsMultiplier += 0.06;
  } else if (metrics.avgMovesPerPhase > (HEURISTIC_TUNING_TARGETS.avgMovesPerPhase.max ?? Infinity)) {
    next.stepsMultiplier -= 0.04;
  }

  if (metrics.lateGameClearSpeed < (HEURISTIC_TUNING_TARGETS.lateGameClearSpeed.min ?? 0)) {
    next.targetOutputMultiplier += 0.05;
    next.roundScaleMultiplier += 0.02;
  }

  if (metrics.energyIncomePerRound > (HEURISTIC_TUNING_TARGETS.energyIncomePerRound.max ?? Infinity)) {
    next.energyIncomeMultiplier -= 0.08;
    next.startingEnergy -= 1;
  } else if (metrics.energyIncomePerRound < (HEURISTIC_TUNING_TARGETS.energyIncomePerRound.min ?? 0)) {
    next.energyIncomeMultiplier += 0.04;
  }

  if ((metrics.buildMaturityByRound[3] ?? 0) < (HEURISTIC_TUNING_TARGETS.buildMaturityRound3.min ?? 0)) {
    next.stepsMultiplier += 0.03;
    next.targetOutputMultiplier += 0.02;
  }

  if (metrics.avgHighestTierPerPhase < (HEURISTIC_TUNING_TARGETS.avgHighestTierPerPhase.min ?? 0)) {
    next.stepsMultiplier += 0.02;
  }

  return clampCandidate(next);
}

function formatResult(result: IterationResult): string {
  return [
    `Iteration ${result.iteration} score=${result.score.toFixed(3)}`,
    `  candidate=${JSON.stringify(result.candidate)}`,
    `  avgMovesPerPhase=${result.metrics.avgMovesPerPhase.toFixed(2)}`,
    `  avgHighestTierPerPhase=${result.metrics.avgHighestTierPerPhase.toFixed(2)}`,
    `  lateGameClearSpeed=${result.metrics.lateGameClearSpeed.toFixed(2)}`,
    `  energyIncomePerRound=${result.metrics.energyIncomePerRound.toFixed(2)}`,
    `  energySpentPerRound=${result.metrics.energySpentPerRound.toFixed(2)}`,
    `  forgeAffordabilityRate=${(result.metrics.forgeAffordabilityRate * 100).toFixed(1)}%`,
  ].join('\n');
}

console.log('\n=== Merge Catalyst Heuristic Auto-Tune ===');
console.log(`Iterations: ${ITERATIONS}, runs/iteration: ${RUNS_PER_ITERATION}\n`);

const history: IterationResult[] = [];
let candidate = { ...BASELINE_TUNING_CANDIDATE };
for (let i = 1; i <= ITERATIONS; i++) {
  const result = runCandidate(candidate, i);
  history.push(result);
  console.log(formatResult(result));
  console.log('');
  if (i < ITERATIONS) candidate = nextCandidate(candidate, result.metrics);
}

const baseline = history[0];
const best = [...history].sort((a, b) => a.score - b.score)[0];
const rejected = history.filter(h => h.iteration !== best.iteration).map(h => ({
  iteration: h.iteration,
  score: h.score,
  candidate: h.candidate,
}));

write('tuning_history.json', JSON.stringify(history, null, 2));
write('best_config.json', JSON.stringify(best.candidate, null, 2));
write('tuning_rejected_configs.json', JSON.stringify(rejected, null, 2));
write(
  'tuning_summary.md',
  [
    '# Heuristic Auto-Tuning Summary',
    '',
    `- Iterations: ${ITERATIONS}`,
    `- Runs per iteration: ${RUNS_PER_ITERATION}`,
    `- Accepted config iteration: ${best.iteration}`,
    `- Accepted score: ${best.score.toFixed(3)}`,
    '',
    '## Target ranges',
    '',
    `- avgMovesPerPhase: ${HEURISTIC_TUNING_TARGETS.avgMovesPerPhase.min}–${HEURISTIC_TUNING_TARGETS.avgMovesPerPhase.max}`,
    `- avgHighestTierPerPhase: >= ${HEURISTIC_TUNING_TARGETS.avgHighestTierPerPhase.min}`,
    `- lateGameClearSpeed: >= ${HEURISTIC_TUNING_TARGETS.lateGameClearSpeed.min}`,
    `- energyIncomePerRound: ${HEURISTIC_TUNING_TARGETS.energyIncomePerRound.min}–${HEURISTIC_TUNING_TARGETS.energyIncomePerRound.max}`,
    `- forgeAffordabilityRate: ${HEURISTIC_TUNING_TARGETS.forgeAffordabilityRate.min}–${HEURISTIC_TUNING_TARGETS.forgeAffordabilityRate.max}`,
    `- buildMaturityByRound[3]: >= ${HEURISTIC_TUNING_TARGETS.buildMaturityRound3.min}`,
    '',
    '## Accepted config',
    '',
    '```json',
    JSON.stringify(best.candidate, null, 2),
    '```',
    '',
    '## Rejected configs',
    '',
    ...rejected.map(r => `- Iteration ${r.iteration}: score=${r.score.toFixed(3)} config=${JSON.stringify(r.candidate)}`),
    '',
    '## Rationale',
    '',
    '- Keep Heuristic as the only default tuning agent.',
    '- Push phase length and board maturity up using moderate step/target scaling.',
    '- Tighten economy by reducing starting energy and scaling down energy income when needed.',
  ].join('\n'),
);

write(
  'before_vs_after.md',
  [
    '# Before vs After (Auto-Tune)',
    '',
    '| Metric | Baseline | Best |',
    '|---|---:|---:|',
    `| avgMovesPerPhase | ${baseline.metrics.avgMovesPerPhase.toFixed(2)} | ${best.metrics.avgMovesPerPhase.toFixed(2)} |`,
    `| avgHighestTierPerPhase | ${baseline.metrics.avgHighestTierPerPhase.toFixed(2)} | ${best.metrics.avgHighestTierPerPhase.toFixed(2)} |`,
    `| lateGameClearSpeed | ${baseline.metrics.lateGameClearSpeed.toFixed(2)} | ${best.metrics.lateGameClearSpeed.toFixed(2)} |`,
    `| energyIncomePerRound | ${baseline.metrics.energyIncomePerRound.toFixed(2)} | ${best.metrics.energyIncomePerRound.toFixed(2)} |`,
    `| energySpentPerRound | ${baseline.metrics.energySpentPerRound.toFixed(2)} | ${best.metrics.energySpentPerRound.toFixed(2)} |`,
    `| forgeAffordabilityRate | ${(baseline.metrics.forgeAffordabilityRate * 100).toFixed(1)}% | ${(best.metrics.forgeAffordabilityRate * 100).toFixed(1)}% |`,
    '',
    '## Candidate patch recommendation',
    '',
    '```json',
    JSON.stringify({ baseline: baseline.candidate, recommended: best.candidate }, null, 2),
    '```',
  ].join('\n'),
);

console.log('Artifacts written to artifacts/benchmark/latest/');
