import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRunLogExportBundle,
  exportRunLogsAsCsv,
  exportRunLogsAsJson,
  RUN_LOG_EXPORT_SCHEMA_VERSION,
} from './exportRunLogs';
import { appendRunLog, clearRunLogs, RUN_LOG_SCHEMA_VERSION, type RunLog } from '../store/runLogStore';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function sampleRun(runId: string, finalOutput: number): RunLog {
  return {
    schemaVersion: RUN_LOG_SCHEMA_VERSION,
    runId,
    id: runId,
    seed: 101,
    startedAt: 1000,
    endedAt: 2000,
    balanceVersion: 'v-test',
    protocol: 'corner_protocol',
    challengeId: null,
    isDailyRun: false,
    outcome: 'game_over',
    roundsReached: 2,
    roundsCleared: 1,
    stagesReached: 7,
    finalOutput,
    highestTierReached: 128,
    avgOutputPerMove: 12.5,
    avgMovesPerStage: 5,
    energyEarnedTotal: 10,
    energySpentTotal: 4,
    lateGameClearSpeed: 0,
    buildSnapshot: {
      activeBoosts: ['corner_crown', 'empty_amplifier'],
      activeCombos: ['corner_empire'],
      equippedSkills: ['pulse_boost'],
      activeStyle: 'corner',
      selectedRule: 'corner_protocol',
      buildIdentityLabel: 'corner',
      boostsCount: 2,
      combosCount: 1,
      skillsCount: 1,
    },
    replayActions: ['left', 'up'],
    phases: [
      {
        round: 2,
        phaseIndex: 0,
        targetOutput: 200,
        actualOutput: finalOutput,
        stepsUsed: 2,
        cleared: false,
        activeCatalysts: ['corner_crown', 'empty_amplifier'],
        activePattern: 'corner',
        patternLevel: 1,
        globalMultiplier: 1.2,
        entries: [
          {
            stepNumber: 1,
            action: 'left',
            boardBefore: [[2, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
            boardAfter: [[4, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
            merges: [{ from: [{ row: 0, col: 0 }, { row: 0, col: 1 }], to: { row: 0, col: 0 }, value: 4, isCorner: true, isHighest: true }],
            spawn: { row: 3, col: 3 },
            anomalyEffect: null,
            base: 10,
            multipliers: [{ name: 'Corner', value: 1.2 }],
            finalOutput: 20,
            triggeredCatalysts: ['corner_crown'],
            synergyMultiplier: 1,
            triggeredSynergies: [],
            momentumMultiplier: 1.1,
            signalUsed: null,
            signalEffect: null,
            energyBefore: 5,
            energyAfter: 6,
          },
          {
            stepNumber: 2,
            action: 'up',
            boardBefore: [[4, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, 2]],
            boardAfter: [[4, null, null, 2], [null, null, null, null], [null, null, null, null], [null, null, null, null]],
            merges: [],
            spawn: { row: 0, col: 3 },
            anomalyEffect: null,
            base: 0,
            multipliers: [{ name: 'Momentum', value: 1.1 }],
            finalOutput: finalOutput - 20,
            triggeredCatalysts: [],
            synergyMultiplier: 1,
            triggeredSynergies: ['corner_empire'],
            momentumMultiplier: 1.1,
            signalUsed: 'pulse_boost',
            signalEffect: { key: 'ui.signal_effect_pulse_boost', params: { output: 30 } },
            energyBefore: 6,
            energyAfter: 4,
          },
        ],
      },
    ],
    timestamp: 2000,
    roundNumber: 2,
    totalOutput: finalOutput,
  };
}

describe('exportRunLogs', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      writable: true,
      configurable: true,
    });
    clearRunLogs();
  });

  it('exports schema-versioned JSON with structured run fields', () => {
    appendRunLog(sampleRun('run-1', 100));

    const json = exportRunLogsAsJson({ scope: 'current' });
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe(RUN_LOG_EXPORT_SCHEMA_VERSION);
    expect(parsed.runLogSchemaVersion).toBe(RUN_LOG_SCHEMA_VERSION);
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].runMetadata.runId).toBe('run-1');
    expect(parsed.runs[0].buildSnapshot.activeBoosts).toEqual(['corner_crown', 'empty_amplifier']);
    expect(parsed.runs[0].steps[0].boardBefore[0][0]).toBe(2);
    expect(parsed.runs[0].steps[0].scoreBreakdown.base).toBe(10);
    expect(parsed.runs[0].steps[1].derived.skillTriggered).toBe(true);
    expect(parsed.configSnapshot.resolvedConfig).toBeDefined();
  });

  it('exports step-level CSV rows with key flattened fields', () => {
    appendRunLog(sampleRun('run-2', 120));

    const csv = exportRunLogsAsCsv({ scope: 'current' });

    expect(csv).toContain('runId,seed,protocol,outcome,roundsReached');
    expect(csv).toContain('run-2');
    expect(csv).toContain('corner_protocol');
    expect(csv).toContain('"[[2,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]"');
    expect(csv).toContain('comboTriggered');
  });

  it('supports multi-run bundle export for recent runs', () => {
    appendRunLog(sampleRun('run-1', 80));
    appendRunLog(sampleRun('run-2', 120));

    const bundle = createRunLogExportBundle({ scope: 'recent', recentCount: 2, benchmarkMode: true });

    expect(bundle.runs).toHaveLength(2);
    expect(bundle.benchmarkMode).toBe(true);
    expect(bundle.runs[0].runMetadata.runId).toBe('run-1');
    expect(bundle.runs[1].runMetadata.runId).toBe('run-2');
  });
});
