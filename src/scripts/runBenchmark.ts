#!/usr/bin/env tsx
/**
 * Run a benchmark suite and export results.
 *
 * Usage:
 *   npm run benchmark              → runs Baseline suite (Heuristic-only tuning pass)
 *   npm run benchmark:long         → runs Long suite (Heuristic-only, higher confidence)
 *   tsx src/scripts/runBenchmark.ts --suite smoke
 */

import { ALL_PRESETS } from '../benchmark/presets';
import { runSuite }    from '../benchmark/suites';
import { analyseResults } from '../benchmark/analysis';
import { exportAll }   from '../benchmark/exporters';
import { generateAllCharts } from '../benchmark/charts';
import { applyTerminology } from '../i18n/terminology';
import { createRunLogPersister } from './persistRunLog';

const term = (text: string): string => applyTerminology('en', text);

const args    = process.argv.slice(2);
const suitArg = args.indexOf('--suite');
const suiteKey = suitArg >= 0 && args[suitArg + 1]
  ? args[suitArg + 1]
  : (process.env.BENCHMARK_SUITE ?? 'baseline');

const suite = ALL_PRESETS[suiteKey];
if (!suite) {
  console.error(`Unknown suite "${suiteKey}". Available: ${Object.keys(ALL_PRESETS).join(', ')}`);
  process.exit(1);
}

console.log(`\n=== ${term('Merge Catalyst Benchmark')}: ${term(suite.name)} ===`);
console.log(`Agents: ${suite.agents.map(a => a.name).join(', ')}`);
console.log(`Runs per agent: ${suite.runCount}\n`);

const t0 = Date.now();
const persister = createRunLogPersister();
const result = runSuite(suite, (agent, done, total) => {
  if (done % 50 === 0 || done === total) {
    process.stdout.write(`\r    ${agent}: ${done}/${total}`);
    if (done === total) process.stdout.write('\n');
  }
}, persister);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nCompleted in ${elapsed}s`);

const report = analyseResults([result]);
exportAll([result], report);
generateAllCharts(result.suiteMetrics);

console.log(`\n=== ${term('Summary')} ===`);
for (const [agent, m] of Object.entries(result.suiteMetrics)) {
  console.log(
    term(`  ${agent.padEnd(20)} rounds=${m.avgRoundsCleared.toFixed(2).padStart(5)}  mean=${m.meanOutput.toFixed(0).padStart(7)}  p90=${m.p90Output.toFixed(0).padStart(7)}`)
  );
}
console.log('\nArtifacts written to artifacts/benchmark/latest/');
