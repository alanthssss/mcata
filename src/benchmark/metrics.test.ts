import { describe, it, expect } from 'vitest';
import { buildSuiteMetrics, RunMetrics } from './metrics';

function makeRun(overrides: Partial<RunMetrics>): RunMetrics {
  return {
    seed: 1,
    agentName: 'TestAgent',
    finalOutput: 100,
    phasesCleared: 3,
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

describe('buildSuiteMetrics endless-round metrics', () => {
  it('computes medianRoundsCleared, p90RoundsCleared, and meanHighestRound', () => {
    const runs: RunMetrics[] = [
      makeRun({ roundsCleared: 1, highestRound: 2 }),
      makeRun({ seed: 2, roundsCleared: 3, highestRound: 4 }),
      makeRun({ seed: 3, roundsCleared: 2, highestRound: 3 }),
      makeRun({ seed: 4, roundsCleared: 4, highestRound: 5 }),
      makeRun({ seed: 5, roundsCleared: 2, highestRound: 3 }),
    ];

    const metrics = buildSuiteMetrics(runs);

    expect(metrics.avgRoundsCleared).toBeCloseTo((1 + 3 + 2 + 4 + 2) / 5);
    expect(metrics.medianRoundsCleared).toBe(2);
    expect(metrics.meanHighestRound).toBeCloseTo((2 + 4 + 3 + 5 + 3) / 5);
    expect(metrics.maxRoundReached).toBe(5);
  });

  it('computes failureDistributionByRound and failureDistributionByPhaseIndex', () => {
    const runs: RunMetrics[] = [
      makeRun({ failureRound: 1, failurePhaseIndex: 2 }),
      makeRun({ seed: 2, failureRound: 1, failurePhaseIndex: 4 }),
      makeRun({ seed: 3, failureRound: 2, failurePhaseIndex: 2 }),
      makeRun({ seed: 4 }), // no failure (truncated at maxRounds)
    ];

    const metrics = buildSuiteMetrics(runs);

    expect(metrics.failureDistributionByRound[1]).toBe(2);
    expect(metrics.failureDistributionByRound[2]).toBe(1);
    expect(metrics.failureDistributionByPhaseIndex[2]).toBe(2);
    expect(metrics.failureDistributionByPhaseIndex[4]).toBe(1);
    // Run with no failure should not appear
    expect(metrics.failureDistributionByRound[undefined as unknown as number]).toBeUndefined();
  });

  it('computes outputGrowthByRound', () => {
    const runs: RunMetrics[] = [
      makeRun({ finalOutput: 200, highestRound: 2 }),
      makeRun({ seed: 2, finalOutput: 400, highestRound: 3 }),
    ];

    const metrics = buildSuiteMetrics(runs);

    // both runs reached rounds 1 and 2 → mean output of both = (200 + 400) / 2 = 300
    expect(metrics.outputGrowthByRound[1]).toBeCloseTo(300);
    // Only 2nd run reached round 2 and 3
    expect(metrics.outputGrowthByRound[2]).toBeCloseTo(300); // both reached round 2
    expect(metrics.outputGrowthByRound[3]).toBeCloseTo(400); // only 2nd run reached round 3
  });
});
