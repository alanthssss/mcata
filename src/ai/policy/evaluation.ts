/**
 * Heuristic state evaluation.
 * Returns a numeric score for how "good" a GameState is for an agent.
 */
import { GameState } from '../../core/types';
import {
  countEmptyCells,
  maxTile,
  monotonicity,
  smoothness,
  cornerStability,
  mergePotential,
  anomalyRisk,
} from './features';

export interface EvalWeights {
  empty:       number;
  monotonicity: number;
  smoothness:  number;
  corner:      number;
  merge:       number;
  maxTile:     number;
  anomaly:     number;
  output:      number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  empty:        270,
  monotonicity: 47,
  smoothness:   100,
  corner:       30,
  merge:        700,
  maxTile:      1,
  anomaly:      -200,
  output:       10,
};

export function evaluateState(state: GameState, weights: EvalWeights = DEFAULT_WEIGHTS): number {
  const grid = state.grid;

  const emptyScore       = countEmptyCells(grid) * weights.empty;
  const monoScore        = monotonicity(grid) * weights.monotonicity;
  const smoothScore      = smoothness(grid) * weights.smoothness;
  const cornerScore      = cornerStability(grid) * weights.corner;
  const mergeScore       = mergePotential(grid) * weights.merge;
  const maxScore         = Math.log2(Math.max(maxTile(grid), 1)) * weights.maxTile;
  const anomalyPenalty   = anomalyRisk(state) * Math.abs(weights.anomaly);
  const outputScore      = state.output * weights.output;

  return emptyScore + monoScore + smoothScore + cornerScore + mergeScore + maxScore - anomalyPenalty + outputScore;
}
