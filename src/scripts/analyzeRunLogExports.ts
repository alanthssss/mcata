import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RUN_LOG_EXPORT_SCHEMA_VERSION, type ExportRunRecord, type RunLogExportBundle } from './exportRunLogs';

export interface RunLogBundleSummary {
  runCount: number;
  avgFinalOutput: number;
  avgRoundsReached: number;
  avgRoundsCleared: number;
  avgOutputPerMove: number;
  maxHighestTierReached: number;
}

export interface RunComparison {
  runIdBefore: string;
  runIdAfter: string;
  finalOutputDelta: number;
  roundsReachedDelta: number;
  avgOutputPerMoveDelta: number;
}

export function parseRunLogExportJson(raw: string): RunLogExportBundle {
  const parsed = JSON.parse(raw) as Partial<RunLogExportBundle>;
  if (parsed.schemaVersion !== RUN_LOG_EXPORT_SCHEMA_VERSION || !Array.isArray(parsed.runs)) {
    throw new Error('Invalid run log export bundle format');
  }
  return parsed as RunLogExportBundle;
}

export function summarizeRunLogBundle(bundle: RunLogExportBundle): RunLogBundleSummary {
  if (bundle.runs.length === 0) {
    return {
      runCount: 0,
      avgFinalOutput: 0,
      avgRoundsReached: 0,
      avgRoundsCleared: 0,
      avgOutputPerMove: 0,
      maxHighestTierReached: 0,
    };
  }

  let finalOutput = 0;
  let roundsReached = 0;
  let roundsCleared = 0;
  let outputPerMove = 0;
  let highestTier = 0;

  for (const run of bundle.runs) {
    finalOutput += run.runMetadata.finalOutput;
    roundsReached += run.runMetadata.roundsReached;
    roundsCleared += run.runMetadata.roundsCleared;
    outputPerMove += run.analysis.avgOutputPerMove;
    if (run.runMetadata.highestTierReached > highestTier) {
      highestTier = run.runMetadata.highestTierReached;
    }
  }

  return {
    runCount: bundle.runs.length,
    avgFinalOutput: finalOutput / bundle.runs.length,
    avgRoundsReached: roundsReached / bundle.runs.length,
    avgRoundsCleared: roundsCleared / bundle.runs.length,
    avgOutputPerMove: outputPerMove / bundle.runs.length,
    maxHighestTierReached: highestTier,
  };
}

export function compareRuns(before: ExportRunRecord, after: ExportRunRecord): RunComparison {
  return {
    runIdBefore: before.runMetadata.runId,
    runIdAfter: after.runMetadata.runId,
    finalOutputDelta: after.runMetadata.finalOutput - before.runMetadata.finalOutput,
    roundsReachedDelta: after.runMetadata.roundsReached - before.runMetadata.roundsReached,
    avgOutputPerMoveDelta: after.analysis.avgOutputPerMove - before.analysis.avgOutputPerMove,
  };
}

export function compareBundles(beforeBundle: RunLogExportBundle, afterBundle: RunLogExportBundle): RunComparison[] {
  const max = Math.min(beforeBundle.runs.length, afterBundle.runs.length);
  const comparisons: RunComparison[] = [];
  for (let i = 0; i < max; i++) {
    comparisons.push(compareRuns(beforeBundle.runs[i], afterBundle.runs[i]));
  }
  return comparisons;
}

async function main(): Promise<void> {
  const [firstPath, secondPath] = process.argv.slice(2);
  if (!firstPath) {
    console.error('Usage: tsx src/scripts/analyzeRunLogExports.ts <export.json> [other-export.json]');
    process.exitCode = 1;
    return;
  }

  const firstRaw = await fs.readFile(path.resolve(firstPath), 'utf8');
  const firstBundle = parseRunLogExportJson(firstRaw);
  const firstSummary = summarizeRunLogBundle(firstBundle);
  console.log(JSON.stringify({ file: firstPath, summary: firstSummary }, null, 2));

  if (!secondPath) return;

  const secondRaw = await fs.readFile(path.resolve(secondPath), 'utf8');
  const secondBundle = parseRunLogExportJson(secondRaw);
  const secondSummary = summarizeRunLogBundle(secondBundle);
  const comparisons = compareBundles(firstBundle, secondBundle);

  console.log(JSON.stringify({ file: secondPath, summary: secondSummary }, null, 2));
  console.log(JSON.stringify({ comparisonCount: comparisons.length, comparisons }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
