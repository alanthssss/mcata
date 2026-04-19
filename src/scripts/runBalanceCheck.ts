#!/usr/bin/env tsx
/**
 * Run the balance check suite and produce a balance report.
 *
 * Usage:
 *   npm run balance
 */

import { SUITE_BALANCE, SUITE_PACING, SUITE_ROUND_STRESS } from '../benchmark/presets';
import { runSuite } from '../benchmark/suites';
import { analyseResults } from '../benchmark/analysis';
import { exportAll, exportBalanceReport } from '../benchmark/exporters';
import { generateAllCharts } from '../benchmark/charts';
import { applyTerminology } from '../i18n/terminology';

const term = (text: string): string => applyTerminology('en', text);

console.log(`\n=== ${term('Merge Catalyst Balance Check')} ===\n`);

const t0 = Date.now();

console.log(`Running suite: ${SUITE_BALANCE.name}...`);
const balanceResult = runSuite(SUITE_BALANCE, (agent, done, total) => {
  if (done === total) process.stdout.write(`    ${agent}: ${done}/${total}\n`);
});

const stressSuites = [SUITE_PACING, SUITE_ROUND_STRESS];
const stressResults = stressSuites.map((suite) => {
  if (!suite) {
    throw new Error('Balance stress suite is missing. Check src/benchmark/presets.ts exports.');
  }
  console.log(`Running suite: ${suite.name}...`);
  return runSuite(suite, (agent, done, total) => {
    if (done === total) process.stdout.write(`    ${agent}: ${done}/${total}\n`);
  });
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nCompleted in ${elapsed}s`);

const results = [balanceResult, ...stressResults];
const report = analyseResults(results);
exportAll(results, report);
exportBalanceReport(report);
generateAllCharts(results.reduce((acc, result) => ({ ...acc, ...result.suiteMetrics }), {}));

console.log(`\n=== ${term('Balance Findings')} ===`);
for (const f of report.findings) {
  const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warn' ? '🟡' : '🟢';
  console.log(term(`  ${icon} [${f.category}] ${f.message}`));
}

if (report.recommendations.length > 0) {
  console.log(`\n=== ${term('Recommendations')} ===`);
  report.recommendations.forEach(r => console.log(term(`  - ${r}`)));
}

console.log('\nArtifacts written to artifacts/benchmark/latest/');
