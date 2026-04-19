/**
 * File exporters: write benchmark results to disk.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SuiteResult } from './suites';
import { RunMetrics, SuiteMetrics } from './metrics';
import { BalanceReport } from './analysis';
import { applyTerminology } from '../i18n/terminology';

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'artifacts', 'benchmark', 'latest');
const term = (text: string): string => applyTerminology('en', text);

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  Wrote ${path.relative(process.cwd(), filePath)}`);
}

// ─── JSON exports ─────────────────────────────────────────────────────────────

export function exportSummary(results: SuiteResult[]): void {
  const summary = results.map(r => ({
    suite:   r.suiteName,
    metrics: r.suiteMetrics,
  }));
  write(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
}

export function exportPerAgent(results: SuiteResult[]): void {
  const perAgent: Record<string, SuiteMetrics[]> = {};
  for (const r of results) {
    for (const [agent, metrics] of Object.entries(r.suiteMetrics)) {
      if (!perAgent[agent]) perAgent[agent] = [];
      perAgent[agent].push(metrics);
    }
  }
  write(path.join(ARTIFACTS_DIR, 'per_agent.json'), JSON.stringify(perAgent, null, 2));
}

export function exportCatalystStats(report: BalanceReport): void {
  write(path.join(ARTIFACTS_DIR, 'catalyst_stats.json'), JSON.stringify(report.catalystStats, null, 2));
}

export function exportAnomalyStats(results: SuiteResult[]): void {
  // Aggregate anomaly survival rates across all results for the same agent
  const statsBySuite: Record<string, Record<string, number>> = {};
  for (const r of results) {
    const suiteStats: Record<string, number> = {};
    for (const [agent, m] of Object.entries(r.suiteMetrics)) {
      suiteStats[agent] = m.anomalySuccessRate;
    }
    statsBySuite[r.suiteName] = suiteStats;
  }
  write(path.join(ARTIFACTS_DIR, 'anomaly_stats.json'), JSON.stringify(statsBySuite, null, 2));
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportRunsCSV(results: SuiteResult[]): void {
  const header = [
    'suite', 'agent', 'seed', 'finalOutput', 'phasesCleared',
    'roundsCleared', 'highestRound', 'failureRound', 'failurePhaseIndex',
    'maxTile', 'totalSteps', 'avgOutputPerMove', 'anomalySurvivalRate',
    'activeCatalysts',
  ].join(',');

  const rows: string[] = [header];
  for (const r of results) {
    for (const [agent, runs] of Object.entries(r.agentResults)) {
      for (const run of runs) {
        rows.push([
          r.suiteName, agent, run.seed, run.finalOutput, run.phasesCleared,
          run.roundsCleared ?? 0, run.highestRound ?? 1,
          run.failureRound  ?? '', run.failurePhaseIndex ?? '',
          run.maxTile, run.totalSteps,
          run.avgOutputPerMove.toFixed(2), run.anomalySurvivalRate.toFixed(2),
          `"${run.activeCatalysts.join(';')}"`,
        ].join(','));
      }
    }
  }
  write(path.join(ARTIFACTS_DIR, 'runs.csv'), rows.join('\n'));
}

// ─── Markdown comparison report ───────────────────────────────────────────────

export function exportComparisonMd(results: SuiteResult[], report: BalanceReport): void {
  const lines: string[] = [
    term('# Merge Catalyst — Benchmark Comparison Report'),
    '',
    `> Generated: ${report.generatedAt}`,
    `> Suites: ${report.suiteNames.join(', ')}`,
    '',
    term('## Agent Performance Summary'),
    '',
    term('| Agent | Mean Output | Median | P90 | Avg Rounds | Median Rounds | P90 Rounds | Avg Steps | Anomaly Survival |'),
    '|-------|-------------|--------|-----|-----------|---------------|------------|-----------|-----------------|',
  ];

  for (const [agent, m] of Object.entries(report.agentSummary)) {
    lines.push(
      `| ${agent} | ${m.meanOutput.toFixed(0)} | ${m.medianOutput.toFixed(0)} | ${m.p90Output.toFixed(0)} | ${m.avgRoundsCleared.toFixed(1)} | ${m.medianRoundsCleared.toFixed(1)} | ${m.p90RoundsCleared.toFixed(1)} | ${m.avgStepsSurvived.toFixed(1)} | ${(m.anomalySuccessRate * 100).toFixed(1)}% |`
    );
  }

  lines.push('', term('## Balance Findings'), '');
  for (const f of report.findings) {
    const icon = f.severity === 'critical' ? '🔴' : f.severity === 'warn' ? '🟡' : '🟢';
    lines.push(`- ${icon} **[${f.category}]** ${term(f.message)}`);
  }

  lines.push('', term('## Recommendations'), '');
  if (report.recommendations.length === 0) {
    lines.push('_No recommendations at this time._');
  } else {
    for (const rec of report.recommendations) {
      lines.push(`- ${term(rec)}`);
    }
  }

  lines.push('', term('## Catalyst Stats'), '');
  lines.push(term('| Catalyst | Pick Rate | Avg Rounds Cleared | Mean Output |'));
  lines.push('|----------|-----------|--------------------|-------------|');
  for (const cs of report.catalystStats) {
    lines.push(`| ${cs.id} | ${(cs.pickRate * 100).toFixed(1)}% | ${cs.avgRoundsCleared.toFixed(2)} | ${cs.meanOutput.toFixed(0)} |`);
  }

  lines.push('', term('## Pacing Metrics'), '');
  lines.push(term('| Agent | Avg Moves / Phase | Avg Max Tile | Late-Game Clear Turns (R4+) |'));
  lines.push('|-------|-------------------:|-------------:|------------------------------:|');
  for (const [agent, m] of Object.entries(report.agentSummary)) {
    lines.push(
      `| ${agent} | ${m.avgMovesPerPhase.toFixed(2)} | ${m.avgMaxTile.toFixed(2)} | ${m.lateGameClearTurns.toFixed(2)} |`,
    );
  }

  lines.push('', term('## Failure Distribution'), '');
  lines.push(term('Failure count by round number (where runs most commonly ended):'));
  lines.push('');
  for (const [agent, m] of Object.entries(report.agentSummary)) {
    lines.push(`**${agent}**`);
    const dist = m.failureDistributionByRound;
    if (Object.keys(dist).length === 0) {
      lines.push('_No failure data (all runs reached maxRounds)_');
    } else {
      lines.push(term('| Round | Failures |'));
      lines.push('|-------|---------|');
      for (const round of Object.keys(dist).map(Number).sort((a, b) => a - b)) {
        lines.push(`| ${round} | ${dist[round]} |`);
      }
    }
    lines.push('');
  }

  write(path.join(ARTIFACTS_DIR, 'comparison.md'), lines.join('\n'));
}

// ─── Balance report Markdown ──────────────────────────────────────────────────

export function exportSynergyStats(report: BalanceReport): void {
  write(path.join(ARTIFACTS_DIR, 'synergy_stats.json'), JSON.stringify(report.synergyStats, null, 2));
}

export function exportBuildStats(report: BalanceReport): void {
  write(path.join(ARTIFACTS_DIR, 'build_stats.json'), JSON.stringify(report.buildStats, null, 2));
}

export function exportBalanceReport(report: BalanceReport): void {
  const lines: string[] = [
    term('# Merge Catalyst — Balance Report'),
    '',
    `> Generated: ${report.generatedAt}`,
    '',
    term('## Summary Findings'),
    '',
  ];

  const critical = report.findings.filter(f => f.severity === 'critical');
  const warn     = report.findings.filter(f => f.severity === 'warn');
  const info     = report.findings.filter(f => f.severity === 'info');

  if (critical.length) {
    lines.push('### 🔴 Critical');
    critical.forEach(f => lines.push(`- **[${f.category}]** ${term(f.message)}`));
    lines.push('');
  }
  if (warn.length) {
    lines.push('### 🟡 Warnings');
    warn.forEach(f => lines.push(`- **[${f.category}]** ${term(f.message)}`));
    lines.push('');
  }
  if (info.length) {
    lines.push('### 🟢 Info');
    info.forEach(f => lines.push(`- **[${f.category}]** ${term(f.message)}`));
    lines.push('');
  }

  lines.push(term('## Recommendations'), '');
  if (report.recommendations.length === 0) {
    lines.push('_No specific recommendations._');
  } else {
    report.recommendations.forEach(r => lines.push(`- ${term(r)}`));
  }

  lines.push('', term('## Catalyst Analysis'), '');
  lines.push(term('| Catalyst | Pick Rate | Avg Rounds Cleared | Mean Output |'));
  lines.push('|----------|-----------|--------------------|-------------|');
  for (const cs of report.catalystStats) {
    lines.push(`| \`${cs.id}\` | ${(cs.pickRate * 100).toFixed(1)}% | ${cs.avgRoundsCleared.toFixed(2)} | ${cs.meanOutput.toFixed(0)} |`);
  }

  write(path.join(ARTIFACTS_DIR, 'balance_report.md'), lines.join('\n'));
}

export function exportAll(results: SuiteResult[], report: BalanceReport): void {
  ensureDir(ARTIFACTS_DIR);
  exportSummary(results);
  exportPerAgent(results);
  exportCatalystStats(report);
  exportSynergyStats(report);
  exportBuildStats(report);
  exportAnomalyStats(results);
  exportRunsCSV(results);
  exportComparisonMd(results, report);
  exportBalanceReport(report);
}
