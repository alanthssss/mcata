import { BALANCE_VERSION } from '../core/config';
import { GAME_CONFIG } from '../core/generatedGameConfig';
import type { PhaseLog, SlimReactionEntry } from '../core/types';
import {
  getLatestRunLog,
  getRecentRunLogs,
  getRunLogs,
  RUN_LOG_SCHEMA_VERSION,
  type RunLog,
} from '../store/runLogStore';

export const RUN_LOG_EXPORT_SCHEMA_VERSION = 'run-log-export.v1';

type ExportScope = 'current' | 'recent' | 'all';

export interface RunLogExportOptions {
  scope?: ExportScope;
  recentCount?: number;
  balanceVersion?: string;
  benchmarkMode?: boolean;
}

export interface ExportStepRecord {
  stepNumber: number;
  action: SlimReactionEntry['action'];
  roundNumber: number;
  stageIndex: number;
  moveIndexWithinStage: number;
  moveIndexWithinRound: number;
  currentStageTarget: number;
  boardBefore: SlimReactionEntry['boardBefore'];
  boardAfter: SlimReactionEntry['boardAfter'];
  scoreBreakdown: {
    base: number;
    multipliers: SlimReactionEntry['multipliers'];
    finalOutput: number;
    momentumMultiplier: number;
  };
  triggeredEffects: {
    catalysts: SlimReactionEntry['triggeredCatalysts'];
    synergies: SlimReactionEntry['triggeredSynergies'];
    signal: SlimReactionEntry['signalUsed'];
    signalEffect: SlimReactionEntry['signalEffect'];
    anomalyEffect: SlimReactionEntry['anomalyEffect'];
  };
  energyBefore: number;
  energyAfter: number;
  derived: {
    comboTriggered: boolean;
    skillTriggered: boolean;
    surgeTriggered: boolean;
  };
}

export interface ExportRunRecord {
  runMetadata: {
    runId: string;
    schemaVersion: string;
    seed: number | null;
    startedAt: number | null;
    endedAt: number;
    protocol: string;
    challengeId: string | null;
    isDailyRun: boolean;
    outcome: 'cleared' | 'game_over';
    roundsReached: number;
    roundsCleared: number;
    stagesReached: number;
    finalOutput: number;
    highestTierReached: number;
  };
  buildSnapshot: RunLog['buildSnapshot'];
  analysis: {
    avgOutputPerMove: number;
    avgMovesPerStage: number;
    energyEarnedTotal: number;
    energySpentTotal: number;
    lateGameClearSpeed: number;
    boostsAcquiredCount: number;
    combosAcquiredCount: number;
    skillsAcquiredCount: number;
  };
  replayData: {
    actions: RunLog['replayActions'];
  };
  summary: {
    phaseCount: number;
    clearedPhaseCount: number;
  };
  phases: PhaseLog[];
  steps: ExportStepRecord[];
}

export interface RunLogExportBundle {
  schemaVersion: string;
  runLogSchemaVersion: string;
  exportedAt: number;
  exportScope: ExportScope;
  benchmarkMode: boolean;
  configVersion: string;
  configSnapshot: {
    balanceVersion: string;
    resolvedConfig: typeof GAME_CONFIG;
  };
  runs: ExportRunRecord[];
}

function selectRuns(options: RunLogExportOptions): RunLog[] {
  const scope = options.scope ?? 'current';
  const allRuns = scope === 'current'
    ? (() => {
      const latest = getLatestRunLog();
      return latest ? [latest] : [];
    })()
    : scope === 'recent'
      ? getRecentRunLogs(options.recentCount ?? 5)
      : getRunLogs();

  if (!options.balanceVersion) return allRuns;
  return allRuns.filter(run => run.balanceVersion === options.balanceVersion);
}

function deriveStepRecords(phases: PhaseLog[]): ExportStepRecord[] {
  const steps: ExportStepRecord[] = [];
  const moveIndexByRound = new Map<number, number>();

  for (const phase of phases) {
    const round = phase.round;
    let roundMoveIndex = moveIndexByRound.get(round) ?? 0;

    for (const entry of phase.entries) {
      roundMoveIndex += 1;
      const multiplierNames = entry.multipliers.map(mult => mult.name.toLowerCase());
      steps.push({
        stepNumber: entry.stepNumber,
        action: entry.action,
        roundNumber: round,
        stageIndex: phase.phaseIndex + 1,
        moveIndexWithinStage: entry.stepNumber,
        moveIndexWithinRound: roundMoveIndex,
        currentStageTarget: phase.targetOutput,
        boardBefore: entry.boardBefore,
        boardAfter: entry.boardAfter,
        scoreBreakdown: {
          base: entry.base,
          multipliers: entry.multipliers,
          finalOutput: entry.finalOutput,
          momentumMultiplier: entry.momentumMultiplier,
        },
        triggeredEffects: {
          catalysts: entry.triggeredCatalysts,
          synergies: entry.triggeredSynergies,
          signal: entry.signalUsed,
          signalEffect: entry.signalEffect,
          anomalyEffect: entry.anomalyEffect,
        },
        energyBefore: entry.energyBefore,
        energyAfter: entry.energyAfter,
        derived: {
          comboTriggered: entry.triggeredSynergies.length > 0,
          skillTriggered: !!entry.signalUsed,
          surgeTriggered: multiplierNames.some(name => name.includes('surge')),
        },
      });
    }

    moveIndexByRound.set(round, roundMoveIndex);
  }

  return steps;
}

export function toExportRunRecord(run: RunLog): ExportRunRecord {
  const steps = deriveStepRecords(run.phases);
  return {
    runMetadata: {
      runId: run.runId,
      schemaVersion: run.schemaVersion,
      seed: run.seed,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      protocol: run.protocol,
      challengeId: run.challengeId,
      isDailyRun: run.isDailyRun,
      outcome: run.outcome,
      roundsReached: run.roundsReached,
      roundsCleared: run.roundsCleared,
      stagesReached: run.stagesReached,
      finalOutput: run.finalOutput,
      highestTierReached: run.highestTierReached,
    },
    buildSnapshot: run.buildSnapshot,
    analysis: {
      avgOutputPerMove: run.avgOutputPerMove,
      avgMovesPerStage: run.avgMovesPerStage,
      energyEarnedTotal: run.energyEarnedTotal,
      energySpentTotal: run.energySpentTotal,
      lateGameClearSpeed: run.lateGameClearSpeed,
      boostsAcquiredCount: run.buildSnapshot.boostsCount,
      combosAcquiredCount: run.buildSnapshot.combosCount,
      skillsAcquiredCount: run.buildSnapshot.skillsCount,
    },
    replayData: {
      actions: run.replayActions,
    },
    summary: {
      phaseCount: run.phases.length,
      clearedPhaseCount: run.phases.filter(phase => phase.cleared).length,
    },
    phases: run.phases,
    steps,
  };
}

export function createRunLogExportBundle(options: RunLogExportOptions = {}): RunLogExportBundle {
  const runs = selectRuns(options);
  return {
    schemaVersion: RUN_LOG_EXPORT_SCHEMA_VERSION,
    runLogSchemaVersion: RUN_LOG_SCHEMA_VERSION,
    exportedAt: Date.now(),
    exportScope: options.scope ?? 'current',
    benchmarkMode: options.benchmarkMode ?? false,
    configVersion: BALANCE_VERSION,
    configSnapshot: {
      balanceVersion: BALANCE_VERSION,
      resolvedConfig: GAME_CONFIG,
    },
    runs: runs.map(toExportRunRecord),
  };
}

/** Return structured run log export as JSON. */
export function exportRunLogsAsJson(options: RunLogExportOptions = {}): string {
  return JSON.stringify(createRunLogExportBundle(options), null, 2);
}

/**
 * RFC4180-style CSV escaping: quote fields containing comma/quote/newline and
 * escape internal quotes by doubling them.
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Flatten run export into per-step CSV rows for spreadsheet analysis. */
export function exportRunLogsAsCsv(options: RunLogExportOptions = {}): string {
  const bundle = createRunLogExportBundle(options);
  const header = [
    'schemaVersion',
    'runId',
    'seed',
    'protocol',
    'outcome',
    'roundsReached',
    'roundsCleared',
    'stagesReached',
    'finalOutput',
    'highestTierReached',
    'avgOutputPerMove',
    'avgMovesPerStage',
    'buildIdentityLabel',
    'boostsCount',
    'combosCount',
    'skillsCount',
    'energyEarnedTotal',
    'energySpentTotal',
    'lateGameClearSpeed',
    'roundNumber',
    'stageIndex',
    'stepNumber',
    'moveIndexWithinStage',
    'moveIndexWithinRound',
    'currentStageTarget',
    'action',
    'baseOutput',
    'finalOutputStep',
    'synergiesTriggered',
    'momentumMultiplier',
    'signalUsed',
    'comboTriggered',
    'skillTriggered',
    'surgeTriggered',
    'triggeredCatalysts',
    'triggeredSynergies',
    'anomalyEffect',
    'boardBefore',
    'boardAfter',
    'multipliers',
    'benchmarkMode',
    'configVersion',
  ];

  const rows: string[] = [header.join(',')];

  for (const run of bundle.runs) {
    for (const step of run.steps) {
      rows.push([
        bundle.schemaVersion,
        run.runMetadata.runId,
        `${run.runMetadata.seed ?? ''}`,
        run.runMetadata.protocol,
        run.runMetadata.outcome,
        `${run.runMetadata.roundsReached}`,
        `${run.runMetadata.roundsCleared}`,
        `${run.runMetadata.stagesReached}`,
        `${run.runMetadata.finalOutput}`,
        `${run.runMetadata.highestTierReached}`,
        run.analysis.avgOutputPerMove.toFixed(4),
        run.analysis.avgMovesPerStage.toFixed(4),
        run.buildSnapshot.buildIdentityLabel ?? '',
        `${run.buildSnapshot.boostsCount}`,
        `${run.buildSnapshot.combosCount}`,
        `${run.buildSnapshot.skillsCount}`,
        `${run.analysis.energyEarnedTotal}`,
        `${run.analysis.energySpentTotal}`,
        run.analysis.lateGameClearSpeed.toFixed(4),
        `${step.roundNumber}`,
        `${step.stageIndex}`,
        `${step.stepNumber}`,
        `${step.moveIndexWithinStage}`,
        `${step.moveIndexWithinRound}`,
        `${step.currentStageTarget}`,
        step.action,
        `${step.scoreBreakdown.base}`,
        `${step.scoreBreakdown.finalOutput}`,
        `${step.triggeredEffects.synergies.length > 0 ? 1 : 0}`,
        `${step.scoreBreakdown.momentumMultiplier}`,
        step.triggeredEffects.signal ?? '',
        step.derived.comboTriggered ? '1' : '0',
        step.derived.skillTriggered ? '1' : '0',
        step.derived.surgeTriggered ? '1' : '0',
        step.triggeredEffects.catalysts.join('|'),
        step.triggeredEffects.synergies.join('|'),
        step.triggeredEffects.anomalyEffect ?? '',
        JSON.stringify(step.boardBefore),
        JSON.stringify(step.boardAfter),
        JSON.stringify(step.scoreBreakdown.multipliers),
        bundle.benchmarkMode ? '1' : '0',
        bundle.configVersion,
      ].map(value => csvEscape(String(value))).join(','));
    }
  }

  return rows.join('\n');
}

/** Optional run-level summary CSV for quick comparison across many runs. */
export function exportRunSummariesAsCsv(options: RunLogExportOptions = {}): string {
  const bundle = createRunLogExportBundle(options);
  const header = [
    'runId', 'seed', 'protocol', 'outcome', 'roundsReached', 'roundsCleared',
    'stagesReached', 'finalOutput', 'highestTierReached', 'avgOutputPerMove',
    'avgMovesPerStage', 'buildIdentityLabel', 'boostsCount', 'combosCount',
    'skillsCount', 'energyEarnedTotal', 'energySpentTotal', 'benchmarkMode',
    'schemaVersion', 'configVersion',
  ];
  const rows = [header.join(',')];

  for (const run of bundle.runs) {
    rows.push([
      run.runMetadata.runId,
      `${run.runMetadata.seed ?? ''}`,
      run.runMetadata.protocol,
      run.runMetadata.outcome,
      `${run.runMetadata.roundsReached}`,
      `${run.runMetadata.roundsCleared}`,
      `${run.runMetadata.stagesReached}`,
      `${run.runMetadata.finalOutput}`,
      `${run.runMetadata.highestTierReached}`,
      run.analysis.avgOutputPerMove.toFixed(4),
      run.analysis.avgMovesPerStage.toFixed(4),
      run.buildSnapshot.buildIdentityLabel ?? '',
      `${run.buildSnapshot.boostsCount}`,
      `${run.buildSnapshot.combosCount}`,
      `${run.buildSnapshot.skillsCount}`,
      `${run.analysis.energyEarnedTotal}`,
      `${run.analysis.energySpentTotal}`,
      bundle.benchmarkMode ? '1' : '0',
      bundle.schemaVersion,
      bundle.configVersion,
    ].map(value => csvEscape(String(value))).join(','));
  }

  return rows.join('\n');
}

/** Trigger a browser download of run log JSON export. */
export function downloadRunLogs(filename = 'mcata_run_log.json', options: RunLogExportOptions = {}): void {
  const json = exportRunLogsAsJson(options);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of run log CSV export. */
export function downloadRunLogsCsv(filename = 'mcata_run_log.csv', options: RunLogExportOptions = {}): void {
  const csv = exportRunLogsAsCsv(options);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of run summary CSV export. */
export function downloadRunSummaryCsv(filename = 'mcata_run_summary.csv', options: RunLogExportOptions = {}): void {
  const csv = exportRunSummariesAsCsv(options);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
