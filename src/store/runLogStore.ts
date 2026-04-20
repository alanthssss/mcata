/**
 * Run-log store — persists per-run Reaction Log data to localStorage
 * as a parameter-tuning aid.
 *
 * Key: "mcata_run_logs"
 *
 * Up to MAX_STORED_RUNS complete run records are kept (oldest removed first).
 * Grid snapshots are intentionally excluded to keep storage small.
 */
import { PhaseLog } from '../core/types';
import { BALANCE_VERSION } from '../core/config';
import type { ProtocolId } from '../core/types';
import type { ChallengeId } from '../core/challenges';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunLog {
  /** Unique identifier: timestamp + random suffix. */
  id: string;
  /** Unix ms timestamp when the run started. */
  timestamp: number;
  /** Balance / config version string (e.g. "v6"). */
  balanceVersion: string;
  protocol: ProtocolId;
  challengeId: ChallengeId | null;
  isDailyRun: boolean;
  /** Highest round number reached during the run. */
  roundNumber: number;
  outcome: 'cleared' | 'game_over';
  totalOutput: number;
  phases: PhaseLog[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const RUN_LOG_STORAGE_KEY = 'mcata_run_logs';
const MAX_STORED_RUNS = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRunLogs(): RunLog[] {
  try {
    const raw = localStorage.getItem(RUN_LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RunLog[];
  } catch {
    return [];
  }
}

/**
 * Append a completed run log to localStorage.
 * Keeps at most MAX_STORED_RUNS entries (oldest removed on overflow).
 * Silently ignores quota / unavailability errors.
 */
export function appendRunLog(log: RunLog): void {
  try {
    const existing = getRunLogs();
    const updated = [...existing, log].slice(-MAX_STORED_RUNS);
    localStorage.setItem(RUN_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage quota exceeded or unavailable — try trimming aggressively
    try {
      const existing = getRunLogs();
      const trimmed = [...existing, log].slice(-Math.max(1, Math.floor(MAX_STORED_RUNS / 2)));
      localStorage.setItem(RUN_LOG_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Silently ignore — storage unavailable (incognito / full quota)
    }
  }
}

/** Remove all stored run logs. */
export function clearRunLogs(): void {
  try {
    localStorage.removeItem(RUN_LOG_STORAGE_KEY);
  } catch { /* ignore */ }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Build a RunLog record from the terminal GameState.
 * Call this when the game screen transitions to 'game_over' or 'run_complete'.
 */
export function buildRunLog(
  state: {
    rngSeed: number;
    protocol: ProtocolId;
    challengeId: ChallengeId | null;
    isDailyRun: boolean;
    roundNumber: number;
    screen: string;
    totalOutput: number;
    phaseLogBuffer: PhaseLog[];
  }
): RunLog {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    balanceVersion: BALANCE_VERSION,
    protocol: state.protocol,
    challengeId: state.challengeId,
    isDailyRun: state.isDailyRun,
    roundNumber: state.roundNumber,
    outcome: state.screen === 'game_over' ? 'game_over' : 'cleared',
    totalOutput: state.totalOutput,
    phases: state.phaseLogBuffer,
  };
}
