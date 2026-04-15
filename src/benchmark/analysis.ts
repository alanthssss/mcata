/**
 * Balance analysis: inspect SuiteResult data and produce findings.
 */
import { SuiteResult } from './suites';
import { RunMetrics, SuiteMetrics } from './metrics';
import { CatalystId, SynergyId } from '../core/types';
import { ALL_CATALYSTS } from '../core/catalysts';
import { ALL_SYNERGIES, getActiveSynergies } from '../core/synergies';

export interface CatalystStat {
  id:       CatalystId;
  pickRate: number;
  avgRoundsCleared: number;
  meanOutput: number;
  avgOutputContribution: number;
}

export interface SynergyStat {
  id:           SynergyId;
  triggerRate:  number;
  avgRoundsCleared: number;
  meanOutput:   number;
}

export interface BuildStat {
  catalysts:    CatalystId[];
  frequency:    number;
  avgRoundsCleared: number;
  meanOutput:   number;
}

export interface BalanceFinding {
  category: 'catalyst' | 'anomaly' | 'agent' | 'economy' | 'scoring' | 'synergy' | 'momentum';
  severity: 'info' | 'warn' | 'critical';
  message:  string;
}

export interface BalanceReport {
  generatedAt:    string;
  suiteNames:     string[];
  findings:       BalanceFinding[];
  catalystStats:  CatalystStat[];
  synergyStats:   SynergyStat[];
  buildStats:     BuildStat[];
  agentSummary:   Record<string, SuiteMetrics>;
  recommendations: string[];
}

// ─── Catalyst statistics ──────────────────────────────────────────────────────
function computeCatalystStats(runs: RunMetrics[]): CatalystStat[] {
  return ALL_CATALYSTS.map(def => {
    const id = def.id;
    const withCat  = runs.filter(r => r.activeCatalysts.includes(id));
    const pickRate = withCat.length / Math.max(runs.length, 1);
    const avgRoundsCleared = withCat.length > 0
      ? withCat.reduce((s, r) => s + (r.roundsCleared ?? 0), 0) / withCat.length
      : 0;
    const meanOutput = withCat.length > 0
      ? withCat.reduce((s, r) => s + r.finalOutput, 0) / withCat.length
      : 0;
    const avgOutputContribution = withCat.length > 0
      ? withCat.reduce((s, r) => s + r.avgOutputPerMove, 0) / withCat.length
      : 0;
    return { id, pickRate, avgRoundsCleared, meanOutput, avgOutputContribution };
  });
}

// ─── Synergy statistics ───────────────────────────────────────────────────────
function computeSynergyStats(runs: RunMetrics[]): SynergyStat[] {
  return ALL_SYNERGIES.map(synDef => {
    const withSyn = runs.filter(r =>
      getActiveSynergies(r.activeCatalysts).includes(synDef.id)
    );
    const triggerRate = withSyn.length / Math.max(runs.length, 1);
    const avgRoundsCleared = withSyn.length > 0
      ? withSyn.reduce((s, r) => s + (r.roundsCleared ?? 0), 0) / withSyn.length
      : 0;
    const meanOutput = withSyn.length > 0
      ? withSyn.reduce((s, r) => s + r.finalOutput, 0) / withSyn.length
      : 0;
    return { id: synDef.id, triggerRate, avgRoundsCleared, meanOutput };
  });
}

// ─── Build statistics ─────────────────────────────────────────────────────────
function computeBuildStats(runs: RunMetrics[]): BuildStat[] {
  const buildMap = new Map<string, RunMetrics[]>();
  for (const run of runs) {
    if (run.activeCatalysts.length === 0) continue;
    const key = [...run.activeCatalysts].sort().join('+');
    const arr = buildMap.get(key) ?? [];
    arr.push(run);
    buildMap.set(key, arr);
  }

  const builds: BuildStat[] = [];
  for (const [key, arr] of buildMap.entries()) {
    builds.push({
      catalysts: key.split('+') as CatalystId[],
      frequency: arr.length / Math.max(runs.length, 1),
      avgRoundsCleared: arr.reduce((s, r) => s + (r.roundsCleared ?? 0), 0) / arr.length,
      meanOutput: arr.reduce((s, r) => s + r.finalOutput, 0) / arr.length,
    });
  }

  builds.sort((a, b) => b.frequency - a.frequency);
  return builds.slice(0, 10);
}

// Minimum run count before catalyst pick rate warnings are meaningful
const MIN_RUNS_FOR_PICK_RATE_WARNING = 20;

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
  const synergyStats  = computeSynergyStats(allRuns);
  const buildStats    = computeBuildStats(allRuns);

  // ─── Rounds-cleared depth check ──────────────────────────────────────────
  const allMetrics = Object.values(agentSummary);
  const avgRoundsCleared = allMetrics.reduce((s, m) => s + m.avgRoundsCleared, 0) / Math.max(allMetrics.length, 1);
  const avgLateGameClearTurns = allMetrics.reduce((s, m) => s + m.lateGameClearTurns, 0) / Math.max(allMetrics.length, 1);
  const avgMaxTile = allMetrics.reduce((s, m) => s + m.avgMaxTile, 0) / Math.max(allMetrics.length, 1);

  if (avgRoundsCleared < 1) {
    findings.push({ category: 'scoring', severity: 'critical',
      message: `Agents clear fewer than 1 round on average (${avgRoundsCleared.toFixed(2)}). Game may be overtuned.` });
    recommendations.push('Consider reducing phase targetOutput for Phases 5–6.');
  } else if (avgRoundsCleared > 8) {
    findings.push({ category: 'scoring', severity: 'warn',
      message: `Agents average ${avgRoundsCleared.toFixed(1)} rounds cleared. Game may be undertuned for endless progression.` });
    recommendations.push('Consider increasing phase targetOutput or reducing step count.');
  }

  if (avgLateGameClearTurns === 0) {
    findings.push({ category: 'scoring', severity: 'info',
      message: 'No late-game phase clear samples were observed (round 4+). Late-game pacing cannot be fully validated from this run.' });
  } else if (avgLateGameClearTurns <= 3) {
    findings.push({ category: 'scoring', severity: 'warn',
      message: `Late-game phases still clear too quickly (${avgLateGameClearTurns.toFixed(2)} turns in round 4+).` });
    recommendations.push('Increase late-game growth curve pressure or reduce late-game burst multipliers.');
  }

  if (avgMaxTile < 8) {
    findings.push({ category: 'momentum', severity: 'warn',
      message: `Average max tile is low (${avgMaxTile.toFixed(1)}). Players may not be reaching higher-tier merges often enough.` });
    recommendations.push('Increase phase step budgets or smooth early/mid growth to allow deeper board development.');
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
  const globalAvgRounds = allRuns.length > 0
    ? allRuns.reduce((s, r) => s + (r.roundsCleared ?? 0), 0) / allRuns.length
    : 0;

  for (const cs of catalystStats) {
    if (cs.pickRate < 0.05 && allRuns.length > MIN_RUNS_FOR_PICK_RATE_WARNING) {
      findings.push({ category: 'catalyst', severity: 'warn',
        message: `${cs.id}: rarely picked (${(cs.pickRate * 100).toFixed(1)}%) — may be weak or too expensive.` });
    }
    if (globalAvgRounds > 0 && cs.avgRoundsCleared > globalAvgRounds * 1.5 && cs.pickRate > 0.1) {
      findings.push({ category: 'catalyst', severity: 'warn',
        message: `${cs.id}: unusually high avg rounds when held (${cs.avgRoundsCleared.toFixed(1)} vs ${globalAvgRounds.toFixed(1)} global). Potentially overpowered.` });
    }
  }

  // ─── Synergy analysis ─────────────────────────────────────────────────────
  for (const ss of synergyStats) {
    if (globalAvgRounds > 0 && ss.avgRoundsCleared > globalAvgRounds * 2.0 && ss.triggerRate > 0.05) {
      findings.push({ category: 'synergy', severity: 'warn',
        message: `${ss.id}: synergy avg rounds ${ss.avgRoundsCleared.toFixed(1)} vs ${globalAvgRounds.toFixed(1)} global — may be overpowered.` });
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
    synergyStats,
    buildStats,
    agentSummary,
    recommendations,
  };
}
