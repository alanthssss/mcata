import { describe, expect, it } from 'vitest';
import { RUN_LOG_EXPORT_SCHEMA_VERSION, type ExportRunRecord, type RunLogExportBundle } from './exportRunLogs';
import {
  aggregateBuildStats,
  classifyMetaHealth,
  generateMetaHealthMarkdown,
} from './metaHealthAnalysis';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRun(
  label: string,
  finalOutput: number,
  roundsCleared = 2,
  highestTierReached = 64,
  avgMovesPerStage = 8,
  energyEarned = 10,
  energySpent = 6,
): ExportRunRecord {
  return {
    runMetadata: {
      runId: `run-${Math.random().toString(36).slice(2)}`,
      schemaVersion: '2.0.0',
      seed: 1,
      startedAt: 1000,
      endedAt: 2000,
      protocol: 'corner_protocol',
      challengeId: null,
      isDailyRun: false,
      outcome: 'game_over',
      roundsReached: roundsCleared + 1,
      roundsCleared,
      stagesReached: roundsCleared * 6,
      finalOutput,
      highestTierReached,
    },
    buildSnapshot: {
      activeBoosts: [],
      activeCombos: [],
      equippedSkills: [],
      activeStyle: null,
      selectedRule: 'corner_protocol',
      buildIdentityLabel: label,
      boostsCount: 2,
      combosCount: 0,
      skillsCount: 0,
    },
    analysis: {
      avgOutputPerMove: finalOutput / 50,
      avgMovesPerStage,
      energyEarnedTotal: energyEarned,
      energySpentTotal: energySpent,
      lateGameClearSpeed: 0.8,
      boostsAcquiredCount: 2,
      combosAcquiredCount: 0,
      skillsAcquiredCount: 0,
    },
    replayData: { actions: [] },
    summary: { phaseCount: roundsCleared * 6, clearedPhaseCount: roundsCleared * 6 - 1 },
    phases: [],
    steps: [],
  };
}

function makeBundle(runs: ExportRunRecord[]): RunLogExportBundle {
  return {
    schemaVersion: RUN_LOG_EXPORT_SCHEMA_VERSION,
    runLogSchemaVersion: '2.0.0',
    exportedAt: 1,
    exportScope: 'all',
    benchmarkMode: false,
    configVersion: 'v-test',
    configSnapshot: {
      balanceVersion: 'v-test',
      resolvedConfig: {} as RunLogExportBundle['configSnapshot']['resolvedConfig'],
    },
    runs,
  };
}

// ─── aggregateBuildStats ──────────────────────────────────────────────────────

describe('aggregateBuildStats', () => {
  it('groups runs by build identity label', () => {
    const bundle = makeBundle([
      makeRun('combo', 100),
      makeRun('combo', 120),
      makeRun('control', 80),
    ]);
    const stats = aggregateBuildStats([bundle]);
    expect(stats).toHaveLength(2);
    const combo = stats.find(s => s.label === 'combo')!;
    expect(combo.count).toBe(2);
    expect(combo.pickRate).toBeCloseTo(2 / 3, 5);
    expect(combo.avgOutput).toBeCloseTo(110, 5);
  });

  it('returns empty array for empty bundles', () => {
    expect(aggregateBuildStats([])).toEqual([]);
    expect(aggregateBuildStats([makeBundle([])])).toEqual([]);
  });

  it('handles null build identity as "unknown"', () => {
    const run = makeRun('combo', 100);
    run.buildSnapshot.buildIdentityLabel = null;
    const stats = aggregateBuildStats([makeBundle([run])]);
    expect(stats[0].label).toBe('unknown');
  });

  it('sorts by pick rate descending', () => {
    const bundle = makeBundle([
      makeRun('rare', 100),
      makeRun('common', 110),
      makeRun('common', 120),
      makeRun('common', 90),
    ]);
    const stats = aggregateBuildStats([bundle]);
    expect(stats[0].label).toBe('common');
  });

  it('combines runs across multiple bundles', () => {
    const b1 = makeBundle([makeRun('alpha', 100)]);
    const b2 = makeBundle([makeRun('alpha', 200)]);
    const stats = aggregateBuildStats([b1, b2]);
    expect(stats[0].count).toBe(2);
    expect(stats[0].avgOutput).toBeCloseTo(150, 5);
  });

  it('calculates energy balance correctly', () => {
    const bundle = makeBundle([makeRun('x', 100, 2, 64, 8, 10, 4)]);
    const stats = aggregateBuildStats([bundle]);
    expect(stats[0].avgEnergyBalance).toBeCloseTo(6, 5);
  });
});

// ─── classifyMetaHealth ───────────────────────────────────────────────────────

describe('classifyMetaHealth', () => {
  it('returns safe defaults for empty input', () => {
    const result = classifyMetaHealth([]);
    expect(result.totalRuns).toBe(0);
    expect(result.builds).toHaveLength(0);
    expect(result.flags).toContain('No runs to analyze.');
  });

  it('classifies a dominant build (high pick rate + high performance)', () => {
    // 7 runs with "strong" at high output (2×+ global), 3 with "weak" at low output
    const runs = [
      ...Array.from({ length: 7 }, () => makeRun('strong', 350, 5)),
      ...Array.from({ length: 3 }, () => makeRun('weak', 50, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const strong = result.builds.find(b => b.stat.label === 'strong')!;
    expect(strong.classification).toBe('dominant');
  });

  it('classifies a dead build (low pick rate + low performance)', () => {
    // 11 runs with "normal" + 1 with "bad" → pick rate 1/12 ≈ 8.3% < 10% threshold
    const runs = [
      ...Array.from({ length: 11 }, () => makeRun('normal', 150)),
      makeRun('bad', 50, 0),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const bad = result.builds.find(b => b.stat.label === 'bad')!;
    expect(bad.classification).toBe('dead');
  });

  it('classifies a trap choice (present but underperforms)', () => {
    // 4 runs with "trap" at very low output, 6 with "normal"
    const runs = [
      ...Array.from({ length: 6 }, () => makeRun('normal', 150)),
      ...Array.from({ length: 4 }, () => makeRun('trap-build', 80, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const trap = result.builds.find(b => b.stat.label === 'trap-build')!;
    expect(trap.classification).toBe('trap');
  });

  it('classifies healthy builds when performance is balanced', () => {
    const runs = [
      ...Array.from({ length: 5 }, () => makeRun('alpha', 150)),
      ...Array.from({ length: 5 }, () => makeRun('beta', 160)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const classes = result.builds.map(b => b.classification);
    expect(classes.every(c => c === 'healthy' || c === 'dominant' || c === 'niche')).toBe(true);
  });

  it('raises a flag for a single dominant build', () => {
    // 7 "op" at very high output (ensures perfRatio >= 1.30), 3 "weak" at low output
    const runs = [
      ...Array.from({ length: 7 }, () => makeRun('op', 400, 6)),
      ...Array.from({ length: 3 }, () => makeRun('weak', 50, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const hasDominantFlag = result.flags.some(f => f.toLowerCase().includes('dominant'));
    expect(hasDominantFlag).toBe(true);
  });

  it('includes all runs across multiple bundles', () => {
    const b1 = makeBundle([makeRun('x', 100)]);
    const b2 = makeBundle([makeRun('x', 200)]);
    const result = classifyMetaHealth([b1, b2]);
    expect(result.totalRuns).toBe(2);
  });

  it('each classified build has a non-empty suggestion', () => {
    const runs = [
      ...Array.from({ length: 7 }, () => makeRun('strong', 200, 3)),
      ...Array.from({ length: 3 }, () => makeRun('weak', 50, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    for (const b of result.builds) {
      expect(b.suggestion.length).toBeGreaterThan(0);
      expect(b.reason.length).toBeGreaterThan(0);
    }
  });
});

// ─── generateMetaHealthMarkdown ───────────────────────────────────────────────

describe('generateMetaHealthMarkdown', () => {
  it('produces a report with all required sections', () => {
    const runs = [
      ...Array.from({ length: 6 }, () => makeRun('combo', 150)),
      ...Array.from({ length: 4 }, () => makeRun('control', 100)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const md = generateMetaHealthMarkdown(result);

    expect(md).toContain('# Meta-Health Report');
    expect(md).toContain('## Ecosystem Flags');
    expect(md).toContain('## Build Classification');
  });

  it('includes build labels in the output', () => {
    const runs = [makeRun('my-build', 120)];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const md = generateMetaHealthMarkdown(result);
    expect(md).toContain('my-build');
  });

  it('shows dominant, dead, and trap sections when present', () => {
    const runs = [
      ...Array.from({ length: 7 }, () => makeRun('strong', 350, 5)),
      ...Array.from({ length: 3 }, () => makeRun('weak', 50, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const md = generateMetaHealthMarkdown(result);
    // Section headers include emoji prefix, e.g. "## 🔴 Dominant Builds"
    expect(md).toMatch(/## [^\n]*(Dominant|Dead|Trap|Niche|Healthy)/);
  });

  it('handles empty result without crashing', () => {
    const result = classifyMetaHealth([]);
    const md = generateMetaHealthMarkdown(result);
    expect(md).toContain('# Meta-Health Report');
    expect(md).toContain('No runs to analyze');
  });

  it('includes pick rate percentages', () => {
    const bundle = makeBundle([
      makeRun('alpha', 150),
      makeRun('alpha', 150),
      makeRun('beta', 100),
    ]);
    const result = classifyMetaHealth([bundle]);
    const md = generateMetaHealthMarkdown(result);
    expect(md).toContain('%'); // pick rates shown as percentages
  });

  it('includes actionable suggestions for each build', () => {
    const runs = [
      ...Array.from({ length: 7 }, () => makeRun('op', 250, 4)),
      ...Array.from({ length: 3 }, () => makeRun('bad', 60, 0)),
    ];
    const result = classifyMetaHealth([makeBundle(runs)]);
    const md = generateMetaHealthMarkdown(result);
    expect(md).toContain('Suggestion');
  });

  it('includes threshold legend at the bottom', () => {
    const result = classifyMetaHealth([makeBundle([makeRun('x', 100)])]);
    const md = generateMetaHealthMarkdown(result);
    expect(md).toContain('Classification thresholds');
  });
});
