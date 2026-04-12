/**
 * Balance analysis: inspect SuiteResult data and produce findings.
 */
import { SuiteResult } from './suites';
import { RunMetrics, SuiteMetrics } from './metrics';
import { CatalystId } from '../core/types';

export interface CatalystStat {
  id:       CatalystId;
  pickRate: number;
  winRate:  number;
  meanOutput: number;
}

export interface BalanceFinding {
  category: 'catalyst' | 'anomaly' | 'agent' | 'economy' | 'scoring';
  severity: 'info' | 'warn' | 'critical';
  message:  string;
}

export interface BalanceReport {
  generatedAt:    string;
  suiteNames:     string[];
  findings:       BalanceFinding[];
  catalystStats:  CatalystStat[];
  agentSummary:   Record<string, SuiteMetrics>;
  recommendations: string[];
}

// ─── Catalyst statistics ──────────────────────────────────────────────────────
function computeCatalystStats(runs: RunMetrics[]): CatalystStat[] {
  const ids: CatalystId[] = [
    'corner_crown', 'twin_burst', 'lucky_seed', 'bankers_edge',
    'reserve', 'frozen_cell', 'combo_wire', 'high_tribute',
  ];
  return ids.map(id => {
    const withCat  = runs.filter(r => r.activeCatalysts.includes(id));
    const pickRate = withCat.length / Math.max(runs.length, 1);
    const winRate  = withCat.length > 0
      ? withCat.filter(r => r.won).length / withCat.length
      : 0;
    const meanOutput = withCat.length > 0
      ? withCat.reduce((s, r) => s + r.finalOutput, 0) / withCat.length
      : 0;
    return { id, pickRate, winRate, meanOutput };
  });
}

// ─── Analysis ─────────────────────────────────────────────────────────────────
export function analyseResults(results: SuiteResult[]): BalanceReport {
  const findings:        BalanceFinding[]  = [];
  const recommendations: string[]          = [];
  const agentSummary: Record<string, SuiteMetrics> = {};

  const allRuns: RunMetrics[] = [];
  const suiteNames: string[] = [];

  for (const result of results) {
    suiteNames.push(result.suiteName);
    for (const [agentName, runs] of Object.entries(result.agentResults)) {
      allRuns.push(...runs);
      if (!agentSummary[agentName]) {
        agentSummary[agentName] = result.suiteMetrics[agentName];
      }
    }
  }

  const catalystStats = computeCatalystStats(allRuns);

  // ─── Win rate check ──────────────────────────────────────────────────────
  const allMetrics = Object.values(agentSummary);
  const avgWinRate = allMetrics.reduce((s, m) => s + m.winRate, 0) / Math.max(allMetrics.length, 1);

  if (avgWinRate < 0.02) {
    findings.push({ category: 'scoring', severity: 'critical',
      message: `Average win rate is very low (${(avgWinRate * 100).toFixed(1)}%). Game may be overtuned.` });
    recommendations.push('Consider reducing phase targetOutput for Phases 5–6.');
  } else if (avgWinRate > 0.5) {
    findings.push({ category: 'scoring', severity: 'warn',
      message: `Average win rate is high (${(avgWinRate * 100).toFixed(1)}%). Game may be undertuned.` });
    recommendations.push('Consider increasing phase targetOutput or reducing step count.');
  }

  // ─── Agent distinction ────────────────────────────────────────────────────
  const outputs = allMetrics.map(m => m.meanOutput);
  const range   = Math.max(...outputs) - Math.min(...outputs);
  const maxOut  = Math.max(...outputs);
  if (maxOut > 0 && range / maxOut < 0.1) {
    findings.push({ category: 'agent', severity: 'warn',
      message: 'Agents perform too similarly — game may lack strategic depth.' });
    recommendations.push('Review heuristic weights or increase phase difficulty slope.');
  }

  // ─── Catalyst analysis ────────────────────────────────────────────────────
  const globalWinRate = allRuns.length > 0
    ? allRuns.filter(r => r.won).length / allRuns.length
    : 0;

  for (const cs of catalystStats) {
    if (cs.pickRate < 0.05) {
      findings.push({ category: 'catalyst', severity: 'warn',
        message: `${cs.id}: rarely picked (${(cs.pickRate * 100).toFixed(1)}%) — may be weak or too expensive.` });
    }
    if (cs.winRate > globalWinRate * 1.5 && cs.pickRate > 0.1) {
      findings.push({ category: 'catalyst', severity: 'warn',
        message: `${cs.id}: unusually high win rate when held (${(cs.winRate * 100).toFixed(1)}% vs ${(globalWinRate * 100).toFixed(1)}% global). Potentially overpowered.` });
    }
  }

  // ─── Anomaly pressure ─────────────────────────────────────────────────────
  const anomalyRates = allMetrics.map(m => m.anomalySuccessRate);
  const avgAnomalyRate = anomalyRates.reduce((a, b) => a + b, 0) / Math.max(anomalyRates.length, 1);
  if (avgAnomalyRate < 0.3) {
    findings.push({ category: 'anomaly', severity: 'critical',
      message: `Low anomaly survival rate (${(avgAnomalyRate * 100).toFixed(1)}%). Entropy Tax / Collapse Field may be too harsh.` });
    recommendations.push('Reduce Collapse Field frequency (COLLAPSE_FIELD_PERIOD) or weaken Entropy Tax impact.');
  }

  // ─── Economy review ───────────────────────────────────────────────────────
  const avgCatalysts = allMetrics.reduce((s, m) => s + m.avgCatalystCount, 0) / Math.max(allMetrics.length, 1);
  if (avgCatalysts < 1.0) {
    findings.push({ category: 'economy', severity: 'warn',
      message: `Agents hold fewer than 1 catalyst on average. Forge/Energy economy may be too tight.` });
    recommendations.push('Increase STARTING_ENERGY or reduce catalyst costs in CATALYST_DEFS.');
  }

  if (findings.length === 0) {
    findings.push({ category: 'scoring', severity: 'info',
      message: 'No critical balance issues detected in this run.' });
  }

  return {
    generatedAt:    new Date().toISOString(),
    suiteNames,
    findings,
    catalystStats,
    agentSummary,
    recommendations,
  };
}
