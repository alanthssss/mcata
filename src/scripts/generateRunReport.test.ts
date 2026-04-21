import { describe, expect, it } from 'vitest';
import { RUN_LOG_EXPORT_SCHEMA_VERSION, type ExportRunRecord, type RunLogExportBundle } from './exportRunLogs';
import {
  generateSingleRunMarkdown,
  generateMultiRunComparisonMarkdown,
  generateBeforeVsAfterMarkdown,
  wrapMarkdownInHtml,
} from './generateRunReport';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRun(
  overrides: Partial<{
    runId: string;
    finalOutput: number;
    roundsCleared: number;
    roundsReached: number;
    outcome: 'cleared' | 'game_over';
    highestTierReached: number;
    energyEarnedTotal: number;
    energySpentTotal: number;
    boostsCount: number;
    combosCount: number;
    skillsCount: number;
    buildIdentityLabel: string | null;
    avgMovesPerStage: number;
    avgOutputPerMove: number;
  }> = {},
): ExportRunRecord {
  return {
    runMetadata: {
      runId: overrides.runId ?? 'run-test',
      schemaVersion: '2.0.0',
      seed: 42,
      startedAt: 1_000_000,
      endedAt: 1_060_000,
      protocol: 'corner_protocol',
      challengeId: null,
      isDailyRun: false,
      outcome: overrides.outcome ?? 'game_over',
      roundsReached: overrides.roundsReached ?? 2,
      roundsCleared: overrides.roundsCleared ?? 1,
      stagesReached: 7,
      finalOutput: overrides.finalOutput ?? 120,
      highestTierReached: overrides.highestTierReached ?? 64,
    },
    buildSnapshot: {
      activeBoosts: overrides.boostsCount != null ? Array.from({ length: overrides.boostsCount }, (_, i) => `boost_${i}` as never) : ['boost_a', 'boost_b'],
      activeCombos: overrides.combosCount != null ? Array.from({ length: overrides.combosCount }, (_, i) => `combo_${i}` as never) : [],
      equippedSkills: overrides.skillsCount != null ? Array.from({ length: overrides.skillsCount }, (_, i) => `skill_${i}` as never) : [],
      activeStyle: null,
      selectedRule: 'corner_protocol',
      buildIdentityLabel: overrides.buildIdentityLabel !== undefined ? overrides.buildIdentityLabel : 'mixed',
      boostsCount: overrides.boostsCount ?? 2,
      combosCount: overrides.combosCount ?? 0,
      skillsCount: overrides.skillsCount ?? 0,
    },
    analysis: {
      avgOutputPerMove: overrides.avgOutputPerMove ?? 10,
      avgMovesPerStage: overrides.avgMovesPerStage ?? 8,
      energyEarnedTotal: overrides.energyEarnedTotal ?? 10,
      energySpentTotal: overrides.energySpentTotal ?? 6,
      lateGameClearSpeed: 0.8,
      boostsAcquiredCount: overrides.boostsCount ?? 2,
      combosAcquiredCount: overrides.combosCount ?? 0,
      skillsAcquiredCount: overrides.skillsCount ?? 0,
    },
    replayData: { actions: ['left', 'right'] },
    summary: { phaseCount: 4, clearedPhaseCount: 3 },
    phases: [
      {
        round: 1,
        phaseIndex: 0,
        targetOutput: 170,
        cleared: true,
        entries: [
          {
            stepNumber: 1,
            action: 'left',
            base: 10,
            finalOutput: 15,
            multipliers: [],
            momentumMultiplier: 1,
            triggeredCatalysts: [],
            triggeredSynergies: [],
            signalUsed: null,
            signalEffect: null,
            anomalyEffect: null,
            boardBefore: [],
            boardAfter: [],
            energyBefore: 5,
            energyAfter: 5,
            merges: [],
          } as never,
          {
            stepNumber: 2,
            action: 'right',
            base: 20,
            finalOutput: 30,
            multipliers: [],
            momentumMultiplier: 1,
            triggeredCatalysts: [],
            triggeredSynergies: ['combo_a'],
            signalUsed: null,
            signalEffect: null,
            anomalyEffect: null,
            boardBefore: [],
            boardAfter: [],
            energyBefore: 5,
            energyAfter: 4,
            merges: [],
          } as never,
        ],
      } as never,
    ],
    steps: [
      {
        stepNumber: 1,
        action: 'left',
        roundNumber: 1,
        stageIndex: 1,
        moveIndexWithinStage: 1,
        moveIndexWithinRound: 1,
        currentStageTarget: 170,
        boardBefore: [],
        boardAfter: [],
        scoreBreakdown: { base: 10, multipliers: [], finalOutput: 15, momentumMultiplier: 1 },
        triggeredEffects: { catalysts: [], synergies: [], signal: null, signalEffect: null, anomalyEffect: null },
        energyBefore: 5,
        energyAfter: 5,
        derived: { comboTriggered: false, skillTriggered: false, surgeTriggered: false },
      },
      {
        stepNumber: 2,
        action: 'right',
        roundNumber: 1,
        stageIndex: 1,
        moveIndexWithinStage: 2,
        moveIndexWithinRound: 2,
        currentStageTarget: 170,
        boardBefore: [],
        boardAfter: [],
        scoreBreakdown: { base: 20, multipliers: [], finalOutput: 30, momentumMultiplier: 1 },
        triggeredEffects: { catalysts: [], synergies: ['combo_a'], signal: null, signalEffect: null, anomalyEffect: null },
        energyBefore: 5,
        energyAfter: 4,
        derived: { comboTriggered: true, skillTriggered: false, surgeTriggered: false },
      },
    ],
  };
}

function makeBundle(run: ExportRunRecord, configVersion = 'v-test'): RunLogExportBundle {
  return {
    schemaVersion: RUN_LOG_EXPORT_SCHEMA_VERSION,
    runLogSchemaVersion: '2.0.0',
    exportedAt: 1,
    exportScope: 'current',
    benchmarkMode: false,
    configVersion,
    configSnapshot: {
      balanceVersion: configVersion,
      resolvedConfig: {} as RunLogExportBundle['configSnapshot']['resolvedConfig'],
    },
    runs: [run],
  };
}

// ─── Single-Run Report ────────────────────────────────────────────────────────

describe('generateSingleRunMarkdown', () => {
  it('includes all required sections', () => {
    const md = generateSingleRunMarkdown(makeRun());
    expect(md).toContain('## Run Overview');
    expect(md).toContain('## Build Summary');
    expect(md).toContain('## Pacing Summary');
    expect(md).toContain('## Economy Summary');
    expect(md).toContain('## Key Moments');
    expect(md).toContain('## End-of-Run Diagnosis');
  });

  it('includes run metadata values', () => {
    const md = generateSingleRunMarkdown(makeRun({ runId: 'abc-123', finalOutput: 999 }));
    expect(md).toContain('abc-123');
    expect(md).toContain('999');
  });

  it('shows correct outcome labels', () => {
    expect(generateSingleRunMarkdown(makeRun({ outcome: 'cleared' }))).toContain('✅ Cleared');
    expect(generateSingleRunMarkdown(makeRun({ outcome: 'game_over' }))).toContain('❌ Game Over');
  });

  it('handles missing optional fields gracefully', () => {
    const run = makeRun({ buildIdentityLabel: null });
    const md = generateSingleRunMarkdown(run);
    expect(md).toContain('unknown');
  });

  it('shows failure point for game_over runs', () => {
    const md = generateSingleRunMarkdown(makeRun({ outcome: 'game_over' }));
    expect(md).toContain('Round');
  });

  it('shows — failure point for cleared runs', () => {
    const md = generateSingleRunMarkdown(makeRun({ outcome: 'cleared' }));
    expect(md).toContain('Failure Point');
    expect(md).toContain('—');
  });

  it('calculates energy balance correctly', () => {
    const md = generateSingleRunMarkdown(makeRun({ energyEarnedTotal: 10, energySpentTotal: 6 }));
    expect(md).toContain('+4');
  });

  it('reports negative energy balance', () => {
    const md = generateSingleRunMarkdown(makeRun({ energyEarnedTotal: 3, energySpentTotal: 8 }));
    expect(md).toContain('-5');
  });

  it('shows combo information in key moments', () => {
    const md = generateSingleRunMarkdown(makeRun({ combosCount: 1 }));
    expect(md).toContain('combo_a');
  });

  it('shows diagnosis helpers for strong runs', () => {
    const md = generateSingleRunMarkdown(makeRun({ boostsCount: 4, combosCount: 2, roundsCleared: 4 }));
    expect(md).toContain('What likely helped most');
  });

  it('works with empty steps array', () => {
    const run = makeRun();
    run.steps = [];
    const md = generateSingleRunMarkdown(run);
    expect(md).toContain('## Key Moments');
  });

  it('works with empty phases array', () => {
    const run = makeRun();
    run.phases = [];
    run.steps = [];
    const md = generateSingleRunMarkdown(run);
    expect(md).toContain('## Pacing Summary');
  });
});

// ─── HTML wrapper ─────────────────────────────────────────────────────────────

describe('wrapMarkdownInHtml', () => {
  it('produces valid HTML with title', () => {
    const html = wrapMarkdownInHtml('Test Report', '# Heading\n\nBody text.');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Test Report</title>');
    expect(html).toContain('<h1>Heading</h1>');
  });

  it('converts Markdown tables to HTML tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = wrapMarkdownInHtml('T', md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('handles empty content without throwing', () => {
    expect(() => wrapMarkdownInHtml('Empty', '')).not.toThrow();
  });
});

// ─── Multi-Run Comparison Report ─────────────────────────────────────────────

describe('generateMultiRunComparisonMarkdown', () => {
  it('includes comparison table and interpretation', () => {
    const bundles = [
      makeBundle(makeRun({ runId: 'run-a', finalOutput: 100, roundsCleared: 1 })),
      makeBundle(makeRun({ runId: 'run-b', finalOutput: 200, roundsCleared: 3 })),
    ];
    const md = generateMultiRunComparisonMarkdown(bundles);
    expect(md).toContain('## Run Summary Table');
    expect(md).toContain('run-a');
    expect(md).toContain('run-b');
    expect(md).toContain('## Interpretation');
  });

  it('identifies the best and weakest run', () => {
    const bundles = [
      makeBundle(makeRun({ runId: 'run-weak', finalOutput: 50 })),
      makeBundle(makeRun({ runId: 'run-strong', finalOutput: 500 })),
    ];
    const md = generateMultiRunComparisonMarkdown(bundles);
    expect(md).toContain('run-strong');
    expect(md).toContain('run-weak');
  });

  it('handles a single bundle gracefully', () => {
    const md = generateMultiRunComparisonMarkdown([makeBundle(makeRun())]);
    expect(md).toContain('## Run Summary Table');
  });

  it('returns empty message for empty bundles array', () => {
    const md = generateMultiRunComparisonMarkdown([]);
    expect(md).toContain('No bundles provided');
  });

  it('handles bundles with no runs gracefully', () => {
    const emptyBundle: RunLogExportBundle = {
      ...makeBundle(makeRun()),
      runs: [],
    };
    const md = generateMultiRunComparisonMarkdown([emptyBundle]);
    expect(md).toContain('No runs found');
  });

  it('notes healthy pacing for avg 8 moves/stage', () => {
    const bundle = makeBundle(makeRun({ avgMovesPerStage: 8 }));
    const md = generateMultiRunComparisonMarkdown([bundle]);
    expect(md).toContain('healthy');
  });

  it('warns about low avg moves per stage', () => {
    const bundle = makeBundle(makeRun({ avgMovesPerStage: 3 }));
    const md = generateMultiRunComparisonMarkdown([bundle]);
    expect(md).toContain('short-clear risk');
  });
});

// ─── Before-vs-After Config Comparison Report ────────────────────────────────

describe('generateBeforeVsAfterMarkdown', () => {
  it('includes metric diff section', () => {
    const before = makeBundle(makeRun({ finalOutput: 100, roundsCleared: 1 }), 'v5');
    const after = makeBundle(makeRun({ finalOutput: 150, roundsCleared: 2 }), 'v6');
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('## Metric Diff');
    expect(md).toContain('## Interpretation');
  });

  it('shows correct version labels', () => {
    const before = makeBundle(makeRun(), 'v5');
    const after = makeBundle(makeRun(), 'v6');
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('v5');
    expect(md).toContain('v6');
  });

  it('detects improved rounds cleared', () => {
    const before = makeBundle(makeRun({ roundsCleared: 1 }));
    const after = makeBundle(makeRun({ roundsCleared: 4 }));
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('improved');
  });

  it('detects regressed rounds cleared', () => {
    const before = makeBundle(makeRun({ roundsCleared: 4 }));
    const after = makeBundle(makeRun({ roundsCleared: 1 }));
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('regressed');
  });

  it('shows config diff when configs differ', () => {
    const before = makeBundle(makeRun());
    const after = makeBundle(makeRun());
    // Inject a difference into the config snapshot
    (before.configSnapshot.resolvedConfig as unknown as Record<string, unknown>)['someParam'] = 10;
    (after.configSnapshot.resolvedConfig as unknown as Record<string, unknown>)['someParam'] = 20;
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('## Config Diff');
    expect(md).toContain('someParam');
  });

  it('notes no config changes when configs are identical', () => {
    const before = makeBundle(makeRun());
    const after = makeBundle(makeRun());
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('No config changes detected');
  });

  it('handles empty before bundle gracefully', () => {
    const empty: RunLogExportBundle = { ...makeBundle(makeRun()), runs: [] };
    const after = makeBundle(makeRun({ roundsCleared: 2 }));
    const md = generateBeforeVsAfterMarkdown(empty, after);
    expect(md).toContain('## Metric Diff');
  });

  it('detects tighter economy', () => {
    const before = makeBundle(makeRun({ energyEarnedTotal: 10, energySpentTotal: 3 }));
    const after = makeBundle(makeRun({ energyEarnedTotal: 10, energySpentTotal: 9 }));
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('Economy became tighter');
  });

  it('detects longer phases', () => {
    const before = makeBundle(makeRun({ avgMovesPerStage: 6 }));
    const after = makeBundle(makeRun({ avgMovesPerStage: 14 }));
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('Phases became longer');
  });

  it('detects shorter phases (short-clear risk)', () => {
    const before = makeBundle(makeRun({ avgMovesPerStage: 12 }));
    const after = makeBundle(makeRun({ avgMovesPerStage: 3 }));
    const md = generateBeforeVsAfterMarkdown(before, after);
    expect(md).toContain('Phases became shorter');
  });
});
