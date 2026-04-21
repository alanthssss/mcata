import { describe, expect, it } from 'vitest';
import { RUN_LOG_EXPORT_SCHEMA_VERSION, type RunLogExportBundle } from './exportRunLogs';
import { compareBundles, parseRunLogExportJson, summarizeRunLogBundle } from './analyzeRunLogExports';

function makeBundle(finalOutput: number, runId: string): RunLogExportBundle {
  return {
    schemaVersion: RUN_LOG_EXPORT_SCHEMA_VERSION,
    runLogSchemaVersion: '2.0.0',
    exportedAt: 1,
    exportScope: 'current',
    benchmarkMode: false,
    configVersion: 'v-test',
    configSnapshot: {
      balanceVersion: 'v-test',
      resolvedConfig: {} as RunLogExportBundle['configSnapshot']['resolvedConfig'],
    },
    runs: [
      {
        runMetadata: {
          runId,
          schemaVersion: '2.0.0',
          seed: 1,
          startedAt: 1,
          endedAt: 2,
          protocol: 'corner_protocol',
          challengeId: null,
          isDailyRun: false,
          outcome: 'game_over',
          roundsReached: 2,
          roundsCleared: 1,
          stagesReached: 7,
          finalOutput,
          highestTierReached: 128,
        },
        buildSnapshot: {
          activeBoosts: ['corner_crown'],
          activeCombos: [],
          equippedSkills: [],
          activeStyle: null,
          selectedRule: 'corner_protocol',
          buildIdentityLabel: 'mixed',
          boostsCount: 1,
          combosCount: 0,
          skillsCount: 0,
        },
        analysis: {
          avgOutputPerMove: 10,
          avgMovesPerStage: 5,
          energyEarnedTotal: 2,
          energySpentTotal: 1,
          lateGameClearSpeed: 0,
          boostsAcquiredCount: 1,
          combosAcquiredCount: 0,
          skillsAcquiredCount: 0,
        },
        replayData: { actions: ['left'] },
        summary: { phaseCount: 1, clearedPhaseCount: 0 },
        phases: [],
        steps: [],
      },
    ],
  };
}

describe('analyzeRunLogExports', () => {
  it('parses and summarizes exported run bundles', () => {
    const bundle = makeBundle(120, 'run-a');
    const parsed = parseRunLogExportJson(JSON.stringify(bundle));
    const summary = summarizeRunLogBundle(parsed);

    expect(summary.runCount).toBe(1);
    expect(summary.avgFinalOutput).toBe(120);
    expect(summary.avgRoundsReached).toBe(2);
    expect(summary.maxHighestTierReached).toBe(128);
  });

  it('compares two run bundles', () => {
    const before = makeBundle(100, 'run-a');
    const after = makeBundle(140, 'run-b');

    const comparison = compareBundles(before, after);

    expect(comparison).toHaveLength(1);
    expect(comparison[0].finalOutputDelta).toBe(40);
    expect(comparison[0].roundsReachedDelta).toBe(0);
  });
});
