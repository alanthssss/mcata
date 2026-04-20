/**
 * exportRunLogs — utility functions for reading and analysing locally-persisted
 * Reaction Log data (written by runLogStore.ts).
 *
 * Intended for development / parameter-tuning workflows, not bundled into the
 * game itself.  The output format mirrors benchmark PhaseRecord so that
 * player-generated data can be fed directly into the existing analysis pipeline.
 *
 * Usage (browser console or Node REPL with access to localStorage):
 *   import { exportRunLogsAsJson, summariseRunLogs } from './exportRunLogs';
 *   console.log(exportRunLogsAsJson());
 *   console.log(summariseRunLogs());
 */

import { getRunLogs, RunLog } from '../store/runLogStore';
import { PhaseLog, SlimReactionEntry } from '../core/types';
import { PhaseRecord } from '../benchmark/metrics';

// ─── Conversion helpers ────────────────────────────────────────────────────────

/**
 * Convert a PhaseLog (from player data) to the benchmark PhaseRecord format.
 * maxTile is unavailable in player logs (grids are not stored), so it is
 * set to 0 by default.
 */
export function phaseLogToRecord(phase: PhaseLog): PhaseRecord {
  return {
    round: phase.round,
    phaseIndex: phase.phaseIndex,
    movesUsed: phase.stepsUsed,
    targetOutput: phase.targetOutput,
    actualOutput: phase.actualOutput,
    maxTile: 0,
    cleared: phase.cleared,
    catalystCount: phase.activeCatalysts.length,
  };
}

// ─── Per-run summary ──────────────────────────────────────────────────────────

export interface RunSummary {
  id: string;
  timestamp: number;
  balanceVersion: string;
  protocol: string;
  outcome: 'cleared' | 'game_over';
  roundNumber: number;
  totalOutput: number;
  phasesTotal: number;
  phasesCleared: number;
  avgOutputPerPhase: number;
  avgStepsPerPhase: number;
  clearRate: number;
  /** Per-phase benchmark records. */
  phaseRecords: PhaseRecord[];
}

export function summariseRun(run: RunLog): RunSummary {
  const phasesCleared = run.phases.filter(p => p.cleared).length;
  const phasesTotal = run.phases.length;
  const totalOutputSum = run.phases.reduce((s, p) => s + p.actualOutput, 0);
  const totalSteps = run.phases.reduce((s, p) => s + p.stepsUsed, 0);

  return {
    id: run.id,
    timestamp: run.timestamp,
    balanceVersion: run.balanceVersion,
    protocol: run.protocol,
    outcome: run.outcome,
    roundNumber: run.roundNumber,
    totalOutput: run.totalOutput,
    phasesTotal,
    phasesCleared,
    avgOutputPerPhase: phasesTotal > 0 ? totalOutputSum / phasesTotal : 0,
    avgStepsPerPhase: phasesTotal > 0 ? totalSteps / phasesTotal : 0,
    clearRate: phasesTotal > 0 ? phasesCleared / phasesTotal : 0,
    phaseRecords: run.phases.map(phaseLogToRecord),
  };
}

// ─── Aggregate analysis ────────────────────────────────────────────────────────

export interface AggregateStats {
  balanceVersion: string;
  runsAnalysed: number;
  outcomes: { game_over: number; cleared: number };
  avgRoundsReached: number;
  avgTotalOutput: number;
  avgClearRate: number;
  /** Phase-level aggregate keyed by "round-phaseIndex". */
  byPhase: Record<string, PhaseAggregate>;
}

export interface PhaseAggregate {
  round: number;
  phaseIndex: number;
  attempts: number;
  cleared: number;
  clearRate: number;
  avgOutputPerStep: number;
  avgStepsUsed: number;
  avgActualOutput: number;
  avgTargetOutput: number;
}

/**
 * Aggregate all stored run logs into summary statistics.
 * Optionally filter by balanceVersion.
 */
export function summariseRunLogs(balanceVersion?: string): AggregateStats {
  const all = getRunLogs();
  const runs = balanceVersion
    ? all.filter(r => r.balanceVersion === balanceVersion)
    : all;

  if (runs.length === 0) {
    return {
      balanceVersion: balanceVersion ?? 'all',
      runsAnalysed: 0,
      outcomes: { game_over: 0, cleared: 0 },
      avgRoundsReached: 0,
      avgTotalOutput: 0,
      avgClearRate: 0,
      byPhase: {},
    };
  }

  const outcomes = { game_over: 0, cleared: 0 };
  let totalRounds = 0;
  let totalOutput = 0;
  let totalClearRate = 0;

  const phaseMap: Record<string, { attempts: number; cleared: number; outputPerStep: number[]; steps: number[]; actual: number[]; target: number[] }> = {};

  for (const run of runs) {
    outcomes[run.outcome]++;
    totalRounds += run.roundNumber;
    totalOutput += run.totalOutput;
    const runCleared = run.phases.filter(p => p.cleared).length;
    totalClearRate += run.phases.length > 0 ? runCleared / run.phases.length : 0;

    for (const phase of run.phases) {
      const key = `${phase.round}-${phase.phaseIndex}`;
      if (!phaseMap[key]) {
        phaseMap[key] = { attempts: 0, cleared: 0, outputPerStep: [], steps: [], actual: [], target: [] };
      }
      const entry = phaseMap[key];
      entry.attempts++;
      if (phase.cleared) entry.cleared++;
      entry.steps.push(phase.stepsUsed);
      entry.actual.push(phase.actualOutput);
      entry.target.push(phase.targetOutput);
      if (phase.stepsUsed > 0) {
        entry.outputPerStep.push(phase.actualOutput / phase.stepsUsed);
      }
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const byPhase: Record<string, PhaseAggregate> = {};
  for (const [key, data] of Object.entries(phaseMap)) {
    const [round, phaseIndex] = key.split('-').map(Number);
    byPhase[key] = {
      round,
      phaseIndex,
      attempts: data.attempts,
      cleared: data.cleared,
      clearRate: data.attempts > 0 ? data.cleared / data.attempts : 0,
      avgOutputPerStep: avg(data.outputPerStep),
      avgStepsUsed: avg(data.steps),
      avgActualOutput: avg(data.actual),
      avgTargetOutput: avg(data.target),
    };
  }

  return {
    balanceVersion: balanceVersion ?? 'all',
    runsAnalysed: runs.length,
    outcomes,
    avgRoundsReached: totalRounds / runs.length,
    avgTotalOutput: totalOutput / runs.length,
    avgClearRate: totalClearRate / runs.length,
    byPhase,
  };
}

// ─── Export helpers ────────────────────────────────────────────────────────────

/** Return all stored run logs as a JSON string. */
export function exportRunLogsAsJson(balanceVersion?: string): string {
  const all = getRunLogs();
  const filtered = balanceVersion
    ? all.filter(r => r.balanceVersion === balanceVersion)
    : all;
  return JSON.stringify(filtered, null, 2);
}

/**
 * Flatten all stored runs into a CSV of per-phase statistics.
 * Columns align with benchmark PhaseRecord for easy comparison.
 */
export function exportRunLogsAsCsv(balanceVersion?: string): string {
  const all = getRunLogs();
  const filtered = balanceVersion
    ? all.filter(r => r.balanceVersion === balanceVersion)
    : all;

  const header = 'runId,balanceVersion,protocol,outcome,round,phaseIndex,targetOutput,actualOutput,stepsUsed,cleared,catalystCount,globalMultiplier,activePattern,patternLevel,avgFinalOutput,avgSynergyMult,avgMomentumMult';

  const rows: string[] = [header];

  for (const run of filtered) {
    for (const phase of run.phases) {
      const entries: SlimReactionEntry[] = phase.entries;
      const avgFinalOutput = entries.length > 0
        ? entries.reduce((s, e) => s + e.finalOutput, 0) / entries.length
        : 0;
      const avgSynergy = entries.length > 0
        ? entries.reduce((s, e) => s + e.synergyMultiplier, 0) / entries.length
        : 0;
      const avgMomentum = entries.length > 0
        ? entries.reduce((s, e) => s + e.momentumMultiplier, 0) / entries.length
        : 0;

      rows.push([
        run.id,
        run.balanceVersion,
        run.protocol,
        run.outcome,
        phase.round,
        phase.phaseIndex,
        phase.targetOutput,
        phase.actualOutput,
        phase.stepsUsed,
        phase.cleared ? 1 : 0,
        phase.activeCatalysts.length,
        phase.globalMultiplier,
        phase.activePattern ?? '',
        phase.patternLevel,
        avgFinalOutput.toFixed(2),
        avgSynergy.toFixed(3),
        avgMomentum.toFixed(3),
      ].join(','));
    }
  }

  return rows.join('\n');
}

/**
 * Trigger a browser download of the run log JSON file.
 * Only works in a browser context.
 */
export function downloadRunLogs(filename = 'mcata_run_logs.json', balanceVersion?: string): void {
  const json = exportRunLogsAsJson(balanceVersion);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download of the run log CSV file.
 * Only works in a browser context.
 */
export function downloadRunLogsCsv(filename = 'mcata_run_logs.csv', balanceVersion?: string): void {
  const csv = exportRunLogsAsCsv(balanceVersion);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
