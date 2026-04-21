/**
 * Run-log store — persists per-run structured telemetry to localStorage.
 *
 * Key: "mcata_run_logs"
 */
import { BALANCE_VERSION } from '../core/config';
import { getActiveSynergies } from '../core/synergies';
import {
  CatalystId,
  Direction,
  PatternId,
  PhaseLog,
  ProtocolId,
  SignalId,
  SlimReactionEntry,
  SynergyId,
} from '../core/types';
import type { ChallengeId } from '../core/challenges';

// ─── Types ────────────────────────────────────────────────────────────────────

export const RUN_LOG_SCHEMA_VERSION = '2.0.0';
const STAGES_PER_ROUND = 6;

export interface RunBuildSnapshot {
  activeBoosts: CatalystId[];
  activeCombos: SynergyId[];
  equippedSkills: SignalId[];
  activeStyle: PatternId | null;
  selectedRule: ProtocolId;
  buildIdentityLabel: string | null;
  boostsCount: number;
  combosCount: number;
  skillsCount: number;
}

export interface RunLog {
  schemaVersion: string;
  runId: string;
  /** Backward-compatible alias kept for existing tooling/tests. */
  id: string;
  seed: number | null;
  startedAt: number | null;
  endedAt: number;
  balanceVersion: string;
  protocol: ProtocolId;
  challengeId: ChallengeId | null;
  isDailyRun: boolean;
  outcome: 'cleared' | 'game_over';
  roundsReached: number;
  roundsCleared: number;
  stagesReached: number;
  finalOutput: number;
  highestTierReached: number;
  avgOutputPerMove: number;
  avgMovesPerStage: number;
  energyEarnedTotal: number;
  energySpentTotal: number;
  lateGameClearSpeed: number;
  buildSnapshot: RunBuildSnapshot;
  replayActions: Direction[];
  phases: PhaseLog[];
  /** Legacy aliases for older scripts. */
  timestamp: number;
  roundNumber: number;
  totalOutput: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const RUN_LOG_STORAGE_KEY = 'mcata_run_logs';
const MAX_STORED_RUNS = 20;

function inferHighestTier(entries: SlimReactionEntry[]): number {
  let highest = 0;
  for (const entry of entries) {
    for (const merge of entry.merges) {
      if (merge.value > highest) highest = merge.value;
    }
    for (const row of entry.boardAfter) {
      for (const value of row) {
        if (typeof value === 'number' && value > highest) highest = value;
      }
    }
  }
  return highest;
}

/**
 * Provide a stable analysis label when explicit build-identity output is absent.
 * Priority is active style (most specific), then combo presence, then mixed boosts.
 */
function deriveBuildIdentityLabel(build: RunBuildSnapshot): string | null {
  if (build.activeStyle) return build.activeStyle;
  if (build.activeCombos.length > 0) return 'combo';
  if (build.activeBoosts.length > 0) return 'mixed';
  return null;
}

function ensureBuildIdentityLabel(build: RunBuildSnapshot): RunBuildSnapshot {
  if (build.buildIdentityLabel) return build;
  return {
    ...build,
    buildIdentityLabel: deriveBuildIdentityLabel(build),
  };
}

function normaliseRunLog(raw: unknown): RunLog | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<RunLog> & {
    phases?: PhaseLog[];
    id?: string;
    timestamp?: number;
    roundNumber?: number;
    totalOutput?: number;
    balanceVersion?: string;
    protocol?: ProtocolId;
    outcome?: 'cleared' | 'game_over';
    challengeId?: ChallengeId | null;
    isDailyRun?: boolean;
  };

  const phases = Array.isArray(source.phases) ? source.phases : [];
  const entries = phases.flatMap(p => p.entries ?? []);
  const endedAt = typeof source.endedAt === 'number'
    ? source.endedAt
    : (typeof source.timestamp === 'number' ? source.timestamp : Date.now());
  const runId = typeof source.runId === 'string'
    ? source.runId
    : (typeof source.id === 'string' ? source.id : `${endedAt}`);
  const roundsReached = typeof source.roundsReached === 'number'
    ? source.roundsReached
    : (typeof source.roundNumber === 'number' ? source.roundNumber : 1);
  const finalOutput = typeof source.finalOutput === 'number'
    ? source.finalOutput
    : (typeof source.totalOutput === 'number' ? source.totalOutput : 0);
  const roundClearsByPhases = phases.filter(p => p.cleared).length;
  const roundsCleared = typeof source.roundsCleared === 'number'
    ? source.roundsCleared
    : Math.floor(roundClearsByPhases / STAGES_PER_ROUND);

  const lastPhase = phases.length > 0 ? phases[phases.length - 1] : undefined;
  const activeBoosts = source.buildSnapshot?.activeBoosts ?? (lastPhase?.activeCatalysts ?? []);
  const activeStyle = source.buildSnapshot?.activeStyle ?? (lastPhase?.activePattern ?? null);
  const selectedRule = source.buildSnapshot?.selectedRule ?? source.protocol ?? 'corner_protocol';
  const activeCombos = source.buildSnapshot?.activeCombos ?? getActiveSynergies(activeBoosts);
  const equippedSkills = source.buildSnapshot?.equippedSkills ?? [];

  const buildSnapshot: RunBuildSnapshot = {
    activeBoosts,
    activeCombos,
    equippedSkills,
    activeStyle,
    selectedRule,
    buildIdentityLabel: source.buildSnapshot?.buildIdentityLabel ?? null,
    boostsCount: source.buildSnapshot?.boostsCount ?? activeBoosts.length,
    combosCount: source.buildSnapshot?.combosCount ?? activeCombos.length,
    skillsCount: source.buildSnapshot?.skillsCount ?? equippedSkills.length,
  };

  const labeledBuildSnapshot = ensureBuildIdentityLabel(buildSnapshot);

  let energyEarnedTotal = 0;
  let energySpentTotal = 0;
  for (const entry of entries) {
    const diff = (entry.energyAfter ?? 0) - (entry.energyBefore ?? 0);
    if (diff > 0) energyEarnedTotal += diff;
    if (diff < 0) energySpentTotal += Math.abs(diff);
  }

  const steps = entries.length;
  const lateGameCleared = phases.filter(p => p.cleared && p.round >= 4);

  return {
    schemaVersion: source.schemaVersion ?? RUN_LOG_SCHEMA_VERSION,
    runId,
    id: runId,
    seed: typeof source.seed === 'number' ? source.seed : null,
    startedAt: typeof source.startedAt === 'number' ? source.startedAt : null,
    endedAt,
    balanceVersion: source.balanceVersion ?? BALANCE_VERSION,
    protocol: source.protocol ?? 'corner_protocol',
    challengeId: source.challengeId ?? null,
    isDailyRun: source.isDailyRun ?? false,
    outcome: source.outcome ?? 'game_over',
    roundsReached,
    roundsCleared,
    stagesReached: typeof source.stagesReached === 'number' ? source.stagesReached : phases.length,
    finalOutput,
    highestTierReached: typeof source.highestTierReached === 'number' ? source.highestTierReached : inferHighestTier(entries),
    avgOutputPerMove: typeof source.avgOutputPerMove === 'number' ? source.avgOutputPerMove : (steps > 0 ? finalOutput / steps : 0),
    avgMovesPerStage: typeof source.avgMovesPerStage === 'number' ? source.avgMovesPerStage : (phases.length > 0 ? steps / phases.length : 0),
    energyEarnedTotal: typeof source.energyEarnedTotal === 'number' ? source.energyEarnedTotal : energyEarnedTotal,
    energySpentTotal: typeof source.energySpentTotal === 'number' ? source.energySpentTotal : energySpentTotal,
    lateGameClearSpeed: typeof source.lateGameClearSpeed === 'number'
      ? source.lateGameClearSpeed
      : (lateGameCleared.length > 0
        ? lateGameCleared.reduce((sum, phase) => sum + phase.stepsUsed, 0) / lateGameCleared.length
        : 0),
    buildSnapshot: labeledBuildSnapshot,
    replayActions: Array.isArray(source.replayActions) ? source.replayActions : entries.map(entry => entry.action),
    phases,
    timestamp: source.timestamp ?? endedAt,
    roundNumber: source.roundNumber ?? roundsReached,
    totalOutput: source.totalOutput ?? finalOutput,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRunLogs(): RunLog[] {
  try {
    const raw = localStorage.getItem(RUN_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normaliseRunLog)
      .filter((value): value is RunLog => value !== null);
  } catch {
    return [];
  }
}

export function getLatestRunLog(): RunLog | null {
  const logs = getRunLogs();
  return logs.length > 0 ? logs[logs.length - 1] : null;
}

export function getRecentRunLogs(count: number): RunLog[] {
  if (!Number.isFinite(count) || count < 1) return [];
  return getRunLogs().slice(-Math.floor(count));
}

export function hasRunLogs(): boolean {
  return getRunLogs().length > 0;
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
    try {
      const existing = getRunLogs();
      const trimmed = [...existing, log].slice(-Math.max(1, Math.floor(MAX_STORED_RUNS / 2)));
      localStorage.setItem(RUN_LOG_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Silently ignore — storage unavailable (incognito / full quota)
    }
  }
}

/** Returns true when the ?debug=export_logs URL parameter is present. */
export function isDebugExportLogs(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('debug') === 'export_logs';
  } catch {
    return false;
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
    runSeed?: number;
    runStartedAt?: number;
    protocol: ProtocolId;
    challengeId: ChallengeId | null;
    isDailyRun: boolean;
    roundNumber: number;
    screen: string;
    totalOutput: number;
    phaseLogBuffer: PhaseLog[];
    activeCatalysts: CatalystId[];
    signals: SignalId[];
    activePattern: PatternId | null;
  }
): RunLog {
  const endedAt = Date.now();
  const runId = `${endedAt}-${Math.random().toString(36).slice(2, 7)}`;
  const entries = state.phaseLogBuffer.flatMap(phase => phase.entries);
  const roundsCleared = Math.floor(state.phaseLogBuffer.filter(phase => phase.cleared).length / STAGES_PER_ROUND);
  const lateGameCleared = state.phaseLogBuffer.filter(phase => phase.cleared && phase.round >= 4);
  const activeCombos = getActiveSynergies(state.activeCatalysts);

  let energyEarnedTotal = 0;
  let energySpentTotal = 0;
  for (const entry of entries) {
    const diff = entry.energyAfter - entry.energyBefore;
    if (diff > 0) energyEarnedTotal += diff;
    if (diff < 0) energySpentTotal += Math.abs(diff);
  }

  const buildSnapshot = ensureBuildIdentityLabel({
    activeBoosts: [...state.activeCatalysts],
    activeCombos,
    equippedSkills: [...state.signals],
    activeStyle: state.activePattern,
    selectedRule: state.protocol,
    buildIdentityLabel: null,
    boostsCount: state.activeCatalysts.length,
    combosCount: activeCombos.length,
    skillsCount: state.signals.length,
  });

  const run: RunLog = {
    schemaVersion: RUN_LOG_SCHEMA_VERSION,
    runId,
    id: runId,
    seed: state.runSeed ?? state.rngSeed,
    startedAt: state.runStartedAt ?? null,
    endedAt,
    balanceVersion: BALANCE_VERSION,
    protocol: state.protocol,
    challengeId: state.challengeId,
    isDailyRun: state.isDailyRun,
    roundsReached: state.roundNumber,
    roundsCleared,
    stagesReached: state.phaseLogBuffer.length,
    outcome: state.screen === 'game_over' ? 'game_over' : 'cleared',
    finalOutput: state.totalOutput,
    highestTierReached: inferHighestTier(entries),
    avgOutputPerMove: entries.length > 0 ? state.totalOutput / entries.length : 0,
    avgMovesPerStage: state.phaseLogBuffer.length > 0 ? entries.length / state.phaseLogBuffer.length : 0,
    energyEarnedTotal,
    energySpentTotal,
    lateGameClearSpeed: lateGameCleared.length > 0
      ? lateGameCleared.reduce((sum, phase) => sum + phase.stepsUsed, 0) / lateGameCleared.length
      : 0,
    buildSnapshot,
    replayActions: entries.map(entry => entry.action),
    phases: state.phaseLogBuffer,
    timestamp: endedAt,
    roundNumber: state.roundNumber,
    totalOutput: state.totalOutput,
  };

  return run;
}
