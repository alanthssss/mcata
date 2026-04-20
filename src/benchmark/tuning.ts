import { BenchmarkTuningOverrides } from './runner';
import { SuiteMetrics } from './metrics';
import {
  BENCHMARK_TUNING_BASELINE_CANDIDATE,
  BENCHMARK_TUNING_BOUNDS,
  BENCHMARK_TUNING_TARGETS,
} from '../core/config';

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
  ...BENCHMARK_TUNING_BASELINE_CANDIDATE,
};

export const TUNING_BOUNDS: Record<keyof TuningCandidate, [number, number]> = {
  ...BENCHMARK_TUNING_BOUNDS,
};

export const HEURISTIC_TUNING_TARGETS: TuningTargets = {
  ...BENCHMARK_TUNING_TARGETS,
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
