import { CatalystId } from '../core/types';

// ─── Per-phase record ─────────────────────────────────────────────────────────
/** Granular data captured for one completed (or failed) phase. */
export interface PhaseRecord {
  /** Round number this phase was in. */
  round: number;
  /** Phase index within the round (0–5). */
  phaseIndex: number;
  /** Number of moves spent in this phase. */
  movesUsed: number;
  /** Effective target output that was required (includes build-aware factor). */
  targetOutput: number;
  /** Actual output achieved. */
  actualOutput: number;
  /** Highest tile value present on the board when the phase ended. */
  maxTile: number;
  /** Whether the phase was cleared successfully. */
  cleared: boolean;
}

// ─── Per-run metrics ──────────────────────────────────────────────────────────
export interface RunMetrics {
  seed:                 number;
  agentName:            string;
  finalOutput:          number;
  phasesCleared:        number;
  won:                  boolean;
  maxTile:              number;
  totalSteps:           number;
  totalCatalysts:       number;
  catalystReplacements: number;
  totalEnergyEarned:    number;
  avgOutputPerMove:     number;
  anomalySurvivalRate:  number;  // 0–1: fraction of anomaly phases survived
  avgMergesPerMove:     number;
  avgEmptyCells:        number;
  activeCatalysts:      CatalystId[];
  // Advanced / optional
  moveDiversity?:       number;  // 0–1 entropy of action distribution
  invalidMoveRate?:     number;  // should be near 0 for agents
  // Meta progression
  ascensionLevel?:      number;  // 0–8 ascension level used for this run
  coreShards?:          number;  // meta currency earned this run
  // Endless round tracking
  roundsCleared?:       number;  // total complete rounds finished
  highestRound?:        number;  // highest round number reached
  // New progression metrics
  milestoneCount?:      number;  // total milestones triggered
  jackpotCount?:        number;  // total jackpots triggered
  maxStreak?:           number;  // best streak this run
  challengeId?:         string | null; // challenge mode used (null = standard)
  isDailyRun?:          boolean; // whether this was a daily run
  // Phase pacing metrics
  /** Average number of moves (steps) per completed phase */
  avgMovesPerPhase?:    number;
  /** Number of distinct catalyst ids acquired this run */
  uniqueCatalystsAcquired?: number;
  /** Per-phase granular records for pacing and board-development analysis */
  phaseHistory?:        PhaseRecord[];
}

// ─── Aggregate suite metrics ──────────────────────────────────────────────────
export interface SuiteMetrics {
  agentName:           string;
  runCount:            number;
  meanOutput:          number;
  medianOutput:        number;
  p90Output:           number;
  winRate:             number;
  maxTileDistribution: Record<number, number>;
  phaseClearDist:      Record<number, number>;
  avgStepsSurvived:    number;
  avgOutputPerMove:    number;
  avgCatalystCount:    number;
  anomalySuccessRate:  number;
  scoreVariance:       number;
  scoreStdDev:         number;
  /** Average complete rounds cleared per run */
  avgRoundsCleared:    number;
  /** Highest round number reached across all runs */
  maxRoundReached:     number;
  /** Average milestones per run */
  avgMilestones:       number;
  /** Average jackpots per run */
  avgJackpots:         number;
  /** Average best streak per run */
  avgBestStreak:       number;
  /** Average moves (steps) per completed phase — pacing metric */
  avgMovesPerPhase:    number;
  /** Average unique catalyst ids acquired per run — build diversity metric */
  avgUniqueCatalysts:  number;
  /** Fraction of phases cleared in ≤3 moves across all runs (short-clear rate) */
  shortClearRate:      number;
  /** Short-clear rate restricted to phases in round 4+ (late-game pressure check) */
  lateGameShortClearRate: number;
  /** Average moves per phase broken down by round number */
  avgMovesPerPhaseByRound: Record<number, number>;
}

// ─── Aggregate helpers ────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * s.length) - 1;
  return s[Math.max(0, idx)];
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return mean(xs.map(x => (x - m) ** 2));
}

// ─── Build suite metrics from run results ─────────────────────────────────────
export function buildSuiteMetrics(runs: RunMetrics[]): SuiteMetrics {
  if (runs.length === 0) {
    return {
      agentName: '',
      runCount: 0,
      meanOutput: 0,
      medianOutput: 0,
      p90Output: 0,
      winRate: 0,
      maxTileDistribution: {},
      phaseClearDist: {},
      avgStepsSurvived: 0,
      avgOutputPerMove: 0,
      avgCatalystCount: 0,
      anomalySuccessRate: 0,
      scoreVariance: 0,
      scoreStdDev: 0,
      avgRoundsCleared: 0,
      maxRoundReached: 0,
      avgMilestones: 0,
      avgJackpots:   0,
      avgBestStreak: 0,
      avgMovesPerPhase: 0,
      avgUniqueCatalysts: 0,
      shortClearRate: 0,
      lateGameShortClearRate: 0,
      avgMovesPerPhaseByRound: {},
    };
  }

  const outputs = runs.map(r => r.finalOutput);
  const v = variance(outputs);
  const maxTileDist: Record<number, number> = {};
  const phaseDist:   Record<number, number> = {};

  // Flatten all phase history records
  const allPhases: PhaseRecord[] = runs.flatMap(r => r.phaseHistory ?? []);
  const clearedPhases = allPhases.filter(p => p.cleared);

  // Short-clear rate: fraction of cleared phases finished in ≤3 moves
  const shortClears      = clearedPhases.filter(p => p.movesUsed <= 3).length;
  const shortClearRate   = clearedPhases.length > 0 ? shortClears / clearedPhases.length : 0;

  // Late-game short-clear rate: same but only round 4+
  const latePhases        = clearedPhases.filter(p => p.round >= 4);
  const lateShortClears   = latePhases.filter(p => p.movesUsed <= 3).length;
  const lateGameShortClearRate = latePhases.length > 0 ? lateShortClears / latePhases.length : 0;

  // Avg moves per phase broken down by round
  const movesByRound: Record<number, number[]> = {};
  for (const p of clearedPhases) {
    if (!movesByRound[p.round]) movesByRound[p.round] = [];
    movesByRound[p.round].push(p.movesUsed);
  }
  const avgMovesPerPhaseByRound: Record<number, number> = {};
  for (const [round, moves] of Object.entries(movesByRound)) {
    avgMovesPerPhaseByRound[Number(round)] = mean(moves);
  }

  for (const r of runs) {
    maxTileDist[r.maxTile] = (maxTileDist[r.maxTile] ?? 0) + 1;
    phaseDist[r.phasesCleared] = (phaseDist[r.phasesCleared] ?? 0) + 1;
  }

  return {
    agentName:           runs[0].agentName,
    runCount:            runs.length,
    meanOutput:          mean(outputs),
    medianOutput:        median(outputs),
    p90Output:           percentile(outputs, 90),
    winRate:             runs.filter(r => r.won).length / runs.length,
    maxTileDistribution: maxTileDist,
    phaseClearDist:      phaseDist,
    avgStepsSurvived:    mean(runs.map(r => r.totalSteps)),
    avgOutputPerMove:    mean(runs.map(r => r.avgOutputPerMove)),
    avgCatalystCount:    mean(runs.map(r => r.totalCatalysts)),
    anomalySuccessRate:  mean(runs.map(r => r.anomalySurvivalRate)),
    scoreVariance:       v,
    scoreStdDev:         Math.sqrt(v),
    avgRoundsCleared:    mean(runs.map(r => r.roundsCleared ?? 0)),
    maxRoundReached:     Math.max(...runs.map(r => r.highestRound ?? 1)),
    avgMilestones:       mean(runs.map(r => r.milestoneCount ?? 0)),
    avgJackpots:         mean(runs.map(r => r.jackpotCount ?? 0)),
    avgBestStreak:       mean(runs.map(r => r.maxStreak ?? 0)),
    avgMovesPerPhase:    mean(runs.map(r => r.avgMovesPerPhase ?? 0)),
    avgUniqueCatalysts:  mean(runs.map(r => r.uniqueCatalystsAcquired ?? 0)),
    shortClearRate,
    lateGameShortClearRate,
    avgMovesPerPhaseByRound,
  };
}

// ─── Action-distribution entropy helper ──────────────────────────────────────
export function actionEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -Object.values(counts)
    .filter(c => c > 0)
    .map(c => {
      const p = c / total;
      return p * Math.log2(p);
    })
    .reduce((a, b) => a + b, 0);
}
