import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRunLogPersister } from './persistRunLog';
import { RUN_LOG_EXPORT_SCHEMA_VERSION } from './exportRunLogs';
import { RUN_LOG_SCHEMA_VERSION, type RunLog } from '../store/runLogStore';

// ─── Sample data helpers ──────────────────────────────────────────────────────

function sampleRun(runId: string, finalOutput: number): RunLog {
  return {
    schemaVersion: RUN_LOG_SCHEMA_VERSION,
    runId,
    id: runId,
    seed: 42,
    startedAt: 1000,
    endedAt: 2000,
    balanceVersion: 'v-test',
    protocol: 'corner_protocol',
    challengeId: null,
    isDailyRun: false,
    outcome: 'game_over',
    roundsReached: 2,
    roundsCleared: 1,
    stagesReached: 3,
    finalOutput,
    highestTierReached: 64,
    avgOutputPerMove: 10,
    avgMovesPerStage: 5,
    energyEarnedTotal: 8,
    energySpentTotal: 3,
    lateGameClearSpeed: 0,
    buildSnapshot: {
      activeBoosts: ['corner_crown'],
      activeCombos: [],
      equippedSkills: [],
      activeStyle: null,
      selectedRule: 'corner_protocol',
      buildIdentityLabel: null,
      boostsCount: 1,
      combosCount: 0,
      skillsCount: 0,
    },
    replayActions: ['left', 'up'],
    phases: [
      {
        round: 1,
        phaseIndex: 0,
        targetOutput: 100,
        actualOutput: finalOutput,
        stepsUsed: 2,
        cleared: false,
        activeCatalysts: ['corner_crown'],
        activePattern: null,
        patternLevel: 0,
        globalMultiplier: 1,
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
            finalOutput,
            triggeredCatalysts: ['corner_crown'],
            synergyMultiplier: 1,
            triggeredSynergies: [],
            momentumMultiplier: 1,
            signalUsed: null,
            signalEffect: null,
            energyBefore: 4,
            energyAfter: 5,
          },
        ],
      },
    ],
    timestamp: 2000,
    roundNumber: 2,
    totalOutput: finalOutput,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createRunLogPersister', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcata-persist-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a RunLogExportBundle JSON file on onRunEnd', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    const runId = persister.onRunStart(42);

    expect(runId).toBeTruthy();
    expect(persister.getRunId()).toBe(runId);

    const run = sampleRun(runId, 80);
    const filePath = persister.onRunEnd(run);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath).toContain(`run-${runId}.json`);

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(RUN_LOG_EXPORT_SCHEMA_VERSION);
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].runMetadata.runId).toBe(runId);
    expect(parsed.runs[0].runMetadata.finalOutput).toBe(80);
  });

  it('includes runStartInfo with seed and configVersion in the written file', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    const runId = persister.onRunStart(99);
    const filePath = persister.onRunEnd(sampleRun(runId, 50));

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(parsed.runStartInfo).toBeTruthy();
    expect(parsed.runStartInfo.seed).toBe(99);
    expect(parsed.runStartInfo.runId).toBe(runId);
    expect(typeof parsed.runStartInfo.configVersion).toBe('string');
    expect(typeof parsed.runStartInfo.startedAt).toBe('number');
  });

  it('resets state after onRunEnd so the persister is ready for a new run', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    const id1 = persister.onRunStart(1);
    persister.onRunEnd(sampleRun(id1, 10));

    expect(persister.getRunId()).toBeNull();

    // Second run works without error
    const id2 = persister.onRunStart(2);
    expect(id2).not.toBe(id1);
    const filePath2 = persister.onRunEnd(sampleRun(id2, 20));
    expect(fs.existsSync(filePath2)).toBe(true);
  });

  it('records liveSteps via onStep and writes them to the file', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    const runId = persister.onRunStart(7);

    persister.onStep(1, 10, 5, 'left');
    persister.onStep(2, 20, 6, 'up');

    const filePath = persister.onRunEnd(sampleRun(runId, 20));
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    expect(Array.isArray(parsed.liveSteps)).toBe(true);
    expect(parsed.liveSteps).toHaveLength(2);
    expect(parsed.liveSteps[0]).toMatchObject({ stepNumber: 1, output: 10, energy: 5, action: 'left' });
    expect(parsed.liveSteps[1]).toMatchObject({ stepNumber: 2, output: 20, energy: 6, action: 'up' });
  });

  it('respects stepThrottle: only records every Nth step', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir, stepThrottle: 3 });
    const runId = persister.onRunStart(3);

    for (let i = 1; i <= 9; i++) {
      persister.onStep(i, i * 10, i, 'up');
    }

    const filePath = persister.onRunEnd(sampleRun(runId, 90));
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // With throttle=3, steps 3, 6, 9 should be recorded (every 3rd)
    expect(parsed.liveSteps).toHaveLength(3);
    expect(parsed.liveSteps[0].stepNumber).toBe(3);
    expect(parsed.liveSteps[1].stepNumber).toBe(6);
    expect(parsed.liveSteps[2].stepNumber).toBe(9);
  });

  it('silently ignores onStep calls when no run is active', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    // No onRunStart called — should not throw
    expect(() => persister.onStep(1, 10, 5, 'left')).not.toThrow();
  });

  it('throws when onRunEnd is called without a prior onRunStart', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });
    expect(() => persister.onRunEnd(sampleRun('x', 10))).toThrow(/onRunEnd called without/);
  });

  it('creates the runsDir if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'a', 'b', 'runs');
    const persister = createRunLogPersister({ runsDir: nestedDir });
    const runId = persister.onRunStart(5);
    persister.onRunEnd(sampleRun(runId, 30));
    expect(fs.existsSync(nestedDir)).toBe(true);
  });

  it('writes a separate file per run', () => {
    const persister = createRunLogPersister({ runsDir: tmpDir });

    const id1 = persister.onRunStart(10);
    persister.onRunEnd(sampleRun(id1, 100));

    const id2 = persister.onRunStart(20);
    persister.onRunEnd(sampleRun(id2, 200));

    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
    expect(files).toHaveLength(2);
  });
});
