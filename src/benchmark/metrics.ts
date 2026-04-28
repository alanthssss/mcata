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
  /** Active catalyst count at phase end. */
  catalystCount?: number;
}

// ─── Per-run metrics ──────────────────────────────────────────────────────────
export interface RunMetrics {
  seed:                 number;
  agentName:            string;
  finalOutput:          number;
  /** Total phases successfully cleared across all rounds. */
  phasesCleared:        number;
  maxTile:              number;
  totalSteps:           number;
  totalCatalysts:       number;
  catalystReplacements: number;
  totalEnergyEarned:    number;
  totalEnergySpent?:    number;
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
  highestRound?:        number;  // highest round number reached (= roundsCleared + 1 if failed mid-round)
  // Failure tracking (for endless-mode depth analysis)
  /** Round number in which the run ended (game_over). undefined if run was truncated at maxRounds. */
  failureRound?:        number;
  /** Phase index within the failure round (0–5). undefined if not failed. */
  failurePhaseIndex?:   number;
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
  // Rarity pacing metrics
  forgeOfferRarityCounts?: Record<'common' | 'rare' | 'epic', number>;
  acquiredRarityCounts?: Record<'common' | 'rare' | 'epic', number>;
  firstRareRound?: number;
  firstEpicRound?: number;
  selectedPattern?: string | null;
  highestTierReached?: number;
  forgeOffersSeen?: number;
  forgeOffersAffordable?: number;
  // Infinite mode metrics
  /** Steps taken in the current/last phase (infinite mode) */
  stepsPerPhase?: number;
  /** Entropy value at the time of the last phase success (infinite mode) */
  entropyAtSuccess?: number;
  /** Entropy value at the time of the last phase failure (infinite mode) */
  entropyAtFailure?: number;
  /** Total corrupted tiles spawned across all phases (infinite mode) */
  corruptedTileCount?: number;
  /** Reason the run failed (e.g. 'entropy_overflow'); null for standard out-of-steps failure */
  failReason?: string | null;
  /** Rate of score growth across phases (output delta per phase) */
  scoreGrowthRate?: number;
}

// ─── Aggregate suite metrics ──────────────────────────────────────────────────
export interface SuiteMetrics {
  agentName:           string;
  runCount:            number;
  meanOutput:          number;
  medianOutput:        number;
  p90Output:           number;
  maxTileDistribution: Record<number, number>;
  phaseClearDist:      Record<number, number>;
  avgStepsSurvived:    number;
  avgOutputPerMove:    number;
  avgCatalystCount:    number;
  anomalySuccessRate:  number;
  scoreVariance:       number;
  scoreStdDev:         number;
  // ── Endless-round depth metrics (primary) ──
  /** Mean complete rounds cleared per run */
  avgRoundsCleared:    number;
  /** Median complete rounds cleared per run */
  medianRoundsCleared: number;
  /** 90th-percentile complete rounds cleared */
  p90RoundsCleared:    number;
  /** Mean highest round number reached */
  meanHighestRound:    number;
  /** Highest round number reached across all runs */
  maxRoundReached:     number;
  /** Output growth by round: avg finalOutput of runs that reached each round */
  outputGrowthByRound: Record<number, number>;
  /** Failure count grouped by round number — where runs most commonly ended */
  failureDistributionByRound: Record<number, number>;
  /** Failure count grouped by phase index (0–5) within the failure round */
  failureDistributionByPhaseIndex: Record<number, number>;
  // ── Pacing metrics ──
  /** Average moves (steps) per completed phase — pacing metric */
  avgMovesPerPhase:    number;
  /** Average unique catalyst ids acquired per run — build diversity metric */
  avgUniqueCatalysts:  number;
  /** Average of each run's maxTile value */
  avgMaxTile:          number;
  /** Average turns (moves used) to clear phases in round 4+ */
  lateGameClearTurns:  number;
  /** Fraction of phases cleared in ≤3 moves across all runs (short-clear rate) */
  shortClearRate:      number;
  /** Short-clear rate restricted to phases in round 4+ (late-game pressure check) */
  lateGameShortClearRate: number;
  /** Average moves per phase broken down by round number */
  avgMovesPerPhaseByRound: Record<number, number>;
  avgHighestTierPerPhase: number;
  avgHighestTierPerRound: Record<number, number>;
  highTierReachDistribution: Record<number, number>;
  energyIncomePerRound: number;
  energySpentPerRound: number;
  forgeAffordabilityRate: number;
  buildMaturityByRound: Record<number, number>;
  lateGameClearSpeed: number;
  // ── Legacy progression metrics ──
  /** Average milestones per run */
  avgMilestones:       number;
  /** Average jackpots per run */
  avgJackpots:         number;
  /** Average best streak per run */
  avgBestStreak:       number;
  offerDistributionByRarity: Record<'common' | 'rare' | 'epic', number>;
  acquisitionDistributionByRarity: Record<'common' | 'rare' | 'epic', number>;
  avgFirstRareRound: number;
  avgFirstEpicRound: number;
  patternOutcomeByPattern: Record<string, { runs: number; avgRoundsCleared: number }>;
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

function calculateTier(maxTile: number): number {
  return Math.log2(Math.max(2, maxTile));
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
      maxTileDistribution: {},
      phaseClearDist: {},
      avgStepsSurvived: 0,
      avgOutputPerMove: 0,
      avgCatalystCount: 0,
      anomalySuccessRate: 0,
      scoreVariance: 0,
      scoreStdDev: 0,
      avgRoundsCleared: 0,
      medianRoundsCleared: 0,
      p90RoundsCleared: 0,
      meanHighestRound: 0,
      maxRoundReached: 0,
      outputGrowthByRound: {},
      failureDistributionByRound: {},
      failureDistributionByPhaseIndex: {},
      avgMilestones: 0,
      avgJackpots:   0,
      avgBestStreak: 0,
      avgMovesPerPhase: 0,
      avgUniqueCatalysts: 0,
      avgMaxTile: 0,
      lateGameClearTurns: 0,
      shortClearRate: 0,
      lateGameShortClearRate: 0,
      avgMovesPerPhaseByRound: {},
      avgHighestTierPerPhase: 0,
      avgHighestTierPerRound: {},
      highTierReachDistribution: {},
      energyIncomePerRound: 0,
      energySpentPerRound: 0,
      forgeAffordabilityRate: 0,
      buildMaturityByRound: {},
      lateGameClearSpeed: 0,
      offerDistributionByRarity: { common: 0, rare: 0, epic: 0 },
      acquisitionDistributionByRarity: { common: 0, rare: 0, epic: 0 },
      avgFirstRareRound: 0,
      avgFirstEpicRound: 0,
      patternOutcomeByPattern: {},
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
  const lateGameClearTurns = latePhases.length > 0 ? mean(latePhases.map(p => p.movesUsed)) : 0;

  // Avg moves per phase broken down by round
  const movesByRound: Record<number, number[]> = {};
  for (const p of clearedPhases) {
    if (!movesByRound[p.round]) movesByRound[p.round] = [];
    movesByRound[p.round].push(p.movesUsed);
  }
  const avgMovesPerPhaseByRound: Record<number, number> = {};
  const avgHighestTierPerRound: Record<number, number> = {};
  const buildMaturityByRound: Record<number, number> = {};
  for (const [round, moves] of Object.entries(movesByRound)) {
    avgMovesPerPhaseByRound[Number(round)] = mean(moves);
  }
  const tiersByRound: Record<number, number[]> = {};
  const catalystsByRound: Record<number, number[]> = {};
  for (const p of clearedPhases) {
    const tier = calculateTier(p.maxTile);
    if (!tiersByRound[p.round]) tiersByRound[p.round] = [];
    tiersByRound[p.round].push(tier);
    if (p.catalystCount !== undefined) {
      if (!catalystsByRound[p.round]) catalystsByRound[p.round] = [];
      catalystsByRound[p.round].push(p.catalystCount);
    }
  }
  for (const [round, tiers] of Object.entries(tiersByRound)) {
    avgHighestTierPerRound[Number(round)] = mean(tiers);
  }
  for (const [round, counts] of Object.entries(catalystsByRound)) {
    buildMaturityByRound[Number(round)] = mean(counts);
  }

  // Output growth by round: avg finalOutput of runs that reached each round
  const outputsByRound: Record<number, number[]> = {};
  for (const r of runs) {
    const reached = r.highestRound ?? 1;
    for (let round = 1; round <= reached; round++) {
      if (!outputsByRound[round]) outputsByRound[round] = [];
      outputsByRound[round].push(r.finalOutput);
    }
  }
  const outputGrowthByRound: Record<number, number> = {};
  for (const [round, outs] of Object.entries(outputsByRound)) {
    outputGrowthByRound[Number(round)] = mean(outs);
  }

  // Failure distribution by round and phase index
  const failureDistributionByRound: Record<number, number> = {};
  const failureDistributionByPhaseIndex: Record<number, number> = {};
  for (const r of runs) {
    if (r.failureRound !== undefined) {
      failureDistributionByRound[r.failureRound] =
        (failureDistributionByRound[r.failureRound] ?? 0) + 1;
    }
    if (r.failurePhaseIndex !== undefined) {
      failureDistributionByPhaseIndex[r.failurePhaseIndex] =
        (failureDistributionByPhaseIndex[r.failurePhaseIndex] ?? 0) + 1;
    }
  }

  for (const r of runs) {
    maxTileDist[r.maxTile] = (maxTileDist[r.maxTile] ?? 0) + 1;
    phaseDist[r.phasesCleared] = (phaseDist[r.phasesCleared] ?? 0) + 1;
  }

  const roundsClearedArr = runs.map(r => r.roundsCleared ?? 0);
  const highestRoundArr  = runs.map(r => r.highestRound ?? 1);
  const highestTierReachDistribution: Record<number, number> = {};
  const avgHighestTierPerPhase = mean(clearedPhases.map(p => calculateTier(p.maxTile)));
  const energyIncomePerRound = mean(
    runs.map(r => (r.totalEnergyEarned ?? 0) / Math.max(1, r.highestRound ?? 1)),
  );
  const energySpentPerRound = mean(
    runs.map(r => (r.totalEnergySpent ?? 0) / Math.max(1, r.highestRound ?? 1)),
  );
  const forgeAffordabilityRate = mean(
    runs.map(r => {
      const seen = r.forgeOffersSeen ?? 0;
      return seen > 0 ? (r.forgeOffersAffordable ?? 0) / seen : 0;
    }),
  );
  for (const r of runs) {
    const tier = r.highestTierReached ?? calculateTier(r.maxTile);
    highestTierReachDistribution[tier] = (highestTierReachDistribution[tier] ?? 0) + 1;
  }
  const offerDistributionByRarity: Record<'common' | 'rare' | 'epic', number> = { common: 0, rare: 0, epic: 0 };
  const acquisitionDistributionByRarity: Record<'common' | 'rare' | 'epic', number> = { common: 0, rare: 0, epic: 0 };
  const firstRareRounds = runs.map(r => r.firstRareRound).filter((n): n is number => n !== undefined);
  const firstEpicRounds = runs.map(r => r.firstEpicRound).filter((n): n is number => n !== undefined);
  const patternRuns: Record<string, number[]> = {};
  for (const r of runs) {
    for (const rarity of ['common', 'rare', 'epic'] as const) {
      offerDistributionByRarity[rarity] += r.forgeOfferRarityCounts?.[rarity] ?? 0;
      acquisitionDistributionByRarity[rarity] += r.acquiredRarityCounts?.[rarity] ?? 0;
    }
    if (r.selectedPattern) {
      if (!patternRuns[r.selectedPattern]) patternRuns[r.selectedPattern] = [];
      patternRuns[r.selectedPattern].push(r.roundsCleared ?? 0);
    }
  }
  const patternOutcomeByPattern: Record<string, { runs: number; avgRoundsCleared: number }> = {};
  for (const [pattern, values] of Object.entries(patternRuns)) {
    patternOutcomeByPattern[pattern] = { runs: values.length, avgRoundsCleared: mean(values) };
  }

  return {
    agentName:           runs[0].agentName,
    runCount:            runs.length,
    meanOutput:          mean(outputs),
    medianOutput:        median(outputs),
    p90Output:           percentile(outputs, 90),
    maxTileDistribution: maxTileDist,
    phaseClearDist:      phaseDist,
    avgStepsSurvived:    mean(runs.map(r => r.totalSteps)),
    avgOutputPerMove:    mean(runs.map(r => r.avgOutputPerMove)),
    avgCatalystCount:    mean(runs.map(r => r.totalCatalysts)),
    anomalySuccessRate:  mean(runs.map(r => r.anomalySurvivalRate)),
    scoreVariance:       v,
    scoreStdDev:         Math.sqrt(v),
    avgRoundsCleared:    mean(roundsClearedArr),
    medianRoundsCleared: median(roundsClearedArr),
    p90RoundsCleared:    percentile(roundsClearedArr, 90),
    meanHighestRound:    mean(highestRoundArr),
    maxRoundReached:     Math.max(...highestRoundArr),
    outputGrowthByRound,
    failureDistributionByRound,
    failureDistributionByPhaseIndex,
    avgMilestones:       mean(runs.map(r => r.milestoneCount ?? 0)),
    avgJackpots:         mean(runs.map(r => r.jackpotCount ?? 0)),
    avgBestStreak:       mean(runs.map(r => r.maxStreak ?? 0)),
    avgMovesPerPhase:    mean(runs.map(r => r.avgMovesPerPhase ?? 0)),
    avgUniqueCatalysts:  mean(runs.map(r => r.uniqueCatalystsAcquired ?? 0)),
    avgMaxTile:          mean(runs.map(r => r.maxTile)),
    lateGameClearTurns,
    shortClearRate,
    lateGameShortClearRate,
    avgMovesPerPhaseByRound,
    avgHighestTierPerPhase,
    avgHighestTierPerRound,
    highTierReachDistribution: highestTierReachDistribution,
    energyIncomePerRound,
    energySpentPerRound,
    forgeAffordabilityRate,
    buildMaturityByRound,
    lateGameClearSpeed: lateGameClearTurns,
    offerDistributionByRarity,
    acquisitionDistributionByRarity,
    avgFirstRareRound: firstRareRounds.length ? mean(firstRareRounds) : 0,
    avgFirstEpicRound: firstEpicRounds.length ? mean(firstEpicRounds) : 0,
    patternOutcomeByPattern,
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
