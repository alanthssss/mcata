/**
 * Auto-persist run logs to local disk under artifacts/runs/.
 * Node.js only — not suitable for browser use.
 *
 * Lifecycle:
 *   const persister = createRunLogPersister();
 *   const runId = persister.onRunStart(seed, configSnapshot?);
 *   // ... game loop ...
 *   persister.onStep(stepNumber, output, energy, action); // optional; throttled
 *   const filePath = persister.onRunEnd(runLog);          // flushes to disk
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BALANCE_VERSION } from '../core/config';
import { GAME_CONFIG } from '../core/generatedGameConfig';
import { RUN_LOG_SCHEMA_VERSION, type RunLog } from '../store/runLogStore';
import {
  RUN_LOG_EXPORT_SCHEMA_VERSION,
  toExportRunRecord,
  type RunLogExportBundle,
} from './exportRunLogs';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RUNS_DIR = path.resolve(process.cwd(), 'artifacts', 'runs');

// ─── Types ────────────────────────────────────────────────────────────────────

/** Snapshot of run start metadata written into every persisted bundle. */
export interface RunStartInfo {
  runId: string;
  seed: number;
  configVersion: string;
  configSnapshot: object;
  startedAt: number;
}

/** Slim per-step record captured during a live run (optional). */
export interface PersistedStepRecord {
  stepNumber: number;
  action: string;
  output: number;
  energy: number;
}

export interface RunLogPersisterOptions {
  /**
   * Directory to write run-log JSON files.
   * Default: `<cwd>/artifacts/runs`
   */
  runsDir?: string;
  /**
   * Only record every Nth step to `onStep`.
   * 1 = record all steps (default).
   * 0 or negative values are clamped to 1.
   */
  stepThrottle?: number;
}

/** Stateful persister returned by `createRunLogPersister`. */
export interface RunLogPersister {
  /**
   * Called when a new run begins.
   * Initialises an internal buffer and returns the generated runId.
   */
  onRunStart(seed: number, configSnapshot?: object): string;

  /**
   * Called after each game step.
   * Respects `stepThrottle` — steps are skipped when throttle > 1.
   */
  onStep(stepNumber: number, output: number, energy: number, action: string): void;

  /**
   * Called when the run ends.
   * Flushes the completed `RunLog` as a `RunLogExportBundle` JSON file to disk.
   * Returns the absolute path of the written file.
   */
  onRunEnd(runLog: RunLog): string;

  /** Returns the active runId, or `null` when no run is in progress. */
  getRunId(): string | null;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a stateful run-log persister.
 *
 * The persister is single-use per run: call `onRunStart` to begin,
 * optionally call `onStep` during the run, and call `onRunEnd` to flush.
 * After `onRunEnd` the persister resets and is ready for the next run.
 */
export function createRunLogPersister(options: RunLogPersisterOptions = {}): RunLogPersister {
  const runsDir = options.runsDir ?? DEFAULT_RUNS_DIR;
  const stepThrottle = Math.max(1, Math.floor(options.stepThrottle ?? 1));

  let runId: string | null = null;
  let startInfo: RunStartInfo | null = null;
  let stepBuffer: PersistedStepRecord[] = [];
  let stepsSinceLastRecord = 0;

  function reset(): void {
    runId = null;
    startInfo = null;
    stepBuffer = [];
    stepsSinceLastRecord = 0;
  }

  return {
    onRunStart(seed: number, configSnapshot?: object): string {
      const startedAt = Date.now();
      const id = `${startedAt}-${Math.random().toString(36).slice(2, 7)}`;
      runId = id;
      startInfo = {
        runId: id,
        seed,
        configVersion: BALANCE_VERSION,
        configSnapshot: configSnapshot ?? {
          balanceVersion: BALANCE_VERSION,
          resolvedConfig: GAME_CONFIG,
        },
        startedAt,
      };
      stepBuffer = [];
      stepsSinceLastRecord = 0;
      return id;
    },

    onStep(stepNumber: number, output: number, energy: number, action: string): void {
      if (!runId) return;
      stepsSinceLastRecord++;
      if (stepsSinceLastRecord < stepThrottle) return;
      stepsSinceLastRecord = 0;
      stepBuffer.push({ stepNumber, output, energy, action });
    },

    onRunEnd(runLog: RunLog): string {
      if (!runId) {
        throw new Error('persistRunLog: onRunEnd called without a prior onRunStart');
      }

      const activeRunId = runId;
      const activeStartInfo = startInfo;
      const activeSteps = stepBuffer.slice();

      // Reset before writing so any error doesn't leave stale state
      reset();

      const bundle: RunLogExportBundle & { runStartInfo: RunStartInfo | null; liveSteps: PersistedStepRecord[] } = {
        schemaVersion: RUN_LOG_EXPORT_SCHEMA_VERSION,
        runLogSchemaVersion: RUN_LOG_SCHEMA_VERSION,
        exportedAt: Date.now(),
        exportScope: 'current',
        benchmarkMode: false,
        configVersion: BALANCE_VERSION,
        configSnapshot: { balanceVersion: BALANCE_VERSION, resolvedConfig: GAME_CONFIG },
        runs: [toExportRunRecord(runLog)],
        runStartInfo: activeStartInfo,
        liveSteps: activeSteps,
      };

      fs.mkdirSync(runsDir, { recursive: true });
      const filePath = path.join(runsDir, `run-${activeRunId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf-8');

      return filePath;
    },

    getRunId(): string | null {
      return runId;
    },
  };
}
