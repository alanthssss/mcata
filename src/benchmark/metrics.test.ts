import { describe, it, expect } from 'vitest';
import { buildSuiteMetrics, RunMetrics } from './metrics';

function makeRun(overrides: Partial<RunMetrics>): RunMetrics {
  return {
    seed: 1,
    agentName: 'TestAgent',
    finalOutput: 100,
    phasesCleared: 3,
    won: false,
    maxTile: 16,
    totalSteps: 20,
    totalCatalysts: 2,
    catalystReplacements: 0,
    totalEnergyEarned: 0,
    avgOutputPerMove: 5,
    anomalySurvivalRate: 0.5,
    avgMergesPerMove: 1,
    avgEmptyCells: 4,
    activeCatalysts: [],
    avgMovesPerPhase: 6,
    uniqueCatalystsAcquired: 2,
    phaseHistory: [],
    ...overrides,
  };
}

describe('buildSuiteMetrics pacing metrics', () => {
  it('computes avgMaxTile and lateGameClearTurns', () => {
    const runs: RunMetrics[] = [
      makeRun({
        maxTile: 64,
        phaseHistory: [
          { round: 4, phaseIndex: 0, movesUsed: 4, targetOutput: 100, actualOutput: 120, maxTile: 32, cleared: true },
          { round: 5, phaseIndex: 0, movesUsed: 5, targetOutput: 120, actualOutput: 150, maxTile: 64, cleared: true },
        ],
      }),
      makeRun({
        seed: 2,
        maxTile: 128,
        phaseHistory: [
          { round: 4, phaseIndex: 1, movesUsed: 6, targetOutput: 100, actualOutput: 140, maxTile: 64, cleared: true },
          { round: 2, phaseIndex: 1, movesUsed: 3, targetOutput: 80, actualOutput: 90, maxTile: 16, cleared: true },
        ],
      }),
    ];

    const metrics = buildSuiteMetrics(runs);

    expect(metrics.avgMaxTile).toBe(96);
    expect(metrics.lateGameClearTurns).toBe(5);
    expect(metrics.avgMovesPerPhase).toBe(6);
  });
});
