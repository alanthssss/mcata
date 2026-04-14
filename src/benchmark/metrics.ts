import { CatalystId } from '../core/types';

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
    };
  }

  const outputs = runs.map(r => r.finalOutput);
  const v = variance(outputs);
  const maxTileDist: Record<number, number> = {};
  const phaseDist:   Record<number, number> = {};

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
