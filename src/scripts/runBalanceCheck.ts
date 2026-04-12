#!/usr/bin/env tsx
/**
 * Run the balance check suite and produce a balance report.
 *
 * Usage:
 *   npm run balance
 */

import { SUITE_BALANCE, SUITE_PHASE_STRESS } from '../benchmark/presets';
import { runSuite } from '../benchmark/suites';
import { analyseResults } from '../benchmark/analysis';
import { exportAll, exportBalanceReport } from '../benchmark/exporters';
import { generateAllCharts } from '../benchmark/charts';

console.log('\n=== Merge Catalyst Balance Check ===\n');

const t0 = Date.now();

console.log(`Running suite: ${SUITE_BALANCE.name}...`);
const balanceResult = runSuite(SUITE_BALANCE, (agent, done, total) => {
  if (done === total) process.stdout.write(`    ${agent}: ${done}/${total}\n`);
});

console.log(`Running suite: ${SUITE_PHASE_STRESS.name}...`);
const stressResult = runSuite(SUITE_PHASE_STRESS, (agent, done, total) => {
  if (done === total) process.stdout.write(`    ${agent}: ${done}/${total}\n`);
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nCompleted in ${elapsed}s`);

const report = analyseResults([balanceResult, stressResult]);
exportAll([balanceResult, stressResult], report);
exportBalanceReport(report);
generateAllCharts({ ...balanceResult.suiteMetrics, ...stressResult.suiteMetrics });

console.log('\n=== Balance Findings ===');
for (const f of report.findings) {
  const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warn' ? '🟡' : '🟢';
  console.log(`  ${icon} [${f.category}] ${f.message}`);
}

if (report.recommendations.length > 0) {
  console.log('\n=== Recommendations ===');
  report.recommendations.forEach(r => console.log(`  - ${r}`));
}

console.log('\nArtifacts written to artifacts/benchmark/latest/');
