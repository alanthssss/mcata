import { BenchmarkTuningOverrides } from './runner';
import { SuiteMetrics } from './metrics';

export interface TuningCandidate extends Required<BenchmarkTuningOverrides> {}

export interface MetricTargetRange {
  min?: number;
  max?: number;
}

export interface TuningTargets {
  avgMovesPerPhase: MetricTargetRange;
  avgHighestTierPerPhase: MetricTargetRange;
  lateGameClearSpeed: MetricTargetRange;
  energyIncomePerRound: MetricTargetRange;
  forgeAffordabilityRate: MetricTargetRange;
  buildMaturityRound3: MetricTargetRange;
}

export const BASELINE_TUNING_CANDIDATE: TuningCandidate = {
  stepsMultiplier: 1.0,
  targetOutputMultiplier: 1.0,
  roundScaleMultiplier: 1.0,
  startingEnergy: 10,
  energyIncomeMultiplier: 1.0,
};

export const TUNING_BOUNDS: Record<keyof TuningCandidate, [number, number]> = {
  stepsMultiplier: [0.9, 1.4],
  targetOutputMultiplier: [0.9, 1.5],
  roundScaleMultiplier: [0.95, 1.2],
  startingEnergy: [6, 12],
  energyIncomeMultiplier: [0.6, 1.1],
};

export const HEURISTIC_TUNING_TARGETS: TuningTargets = {
  avgMovesPerPhase: { min: 8.5, max: 14 },
  avgHighestTierPerPhase: { min: 4.9 },
  lateGameClearSpeed: { min: 6 },
  energyIncomePerRound: { min: 2.5, max: 6.5 },
  forgeAffordabilityRate: { min: 0.3, max: 0.75 },
  buildMaturityRound3: { min: 2.5 },
};

export function clampCandidate(candidate: TuningCandidate): TuningCandidate {
  const result = { ...candidate };
  (Object.keys(TUNING_BOUNDS) as Array<keyof TuningCandidate>).forEach((key) => {
    const [min, max] = TUNING_BOUNDS[key];
    const raw = result[key];
    const rounded = key === 'startingEnergy' ? Math.round(raw) : Number(raw.toFixed(3));
    result[key] = Math.min(max, Math.max(min, rounded));
  });
  return result;
}

function distanceToRange(value: number, range: MetricTargetRange): number {
  if (range.min !== undefined && value < range.min) return range.min - value;
  if (range.max !== undefined && value > range.max) return value - range.max;
  return 0;
}

export function scoreAgainstTargets(metrics: SuiteMetrics, targets: TuningTargets): number {
  const buildMaturityRound3 = metrics.buildMaturityByRound[3] ?? 0;
  const penalties = [
    distanceToRange(metrics.avgMovesPerPhase, targets.avgMovesPerPhase) * 5,
    distanceToRange(metrics.avgHighestTierPerPhase, targets.avgHighestTierPerPhase) * 4,
    distanceToRange(metrics.lateGameClearSpeed, targets.lateGameClearSpeed) * 4,
    distanceToRange(metrics.energyIncomePerRound, targets.energyIncomePerRound) * 3,
    distanceToRange(metrics.forgeAffordabilityRate, targets.forgeAffordabilityRate) * 3,
    distanceToRange(buildMaturityRound3, targets.buildMaturityRound3) * 4,
  ];
  return penalties.reduce((sum, n) => sum + n, 0);
}
