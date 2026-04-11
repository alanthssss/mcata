/**
 * Low-level feature extraction from a GameState.
 * These are pure functions over Grid / GameState with no side-effects.
 */
import { Grid, GameState } from '../../core/types';
import { getEmptyCells, getHighestTileValue } from '../../core/board';
import { COLLAPSE_FIELD_PERIOD } from '../../core/config';

// ─── Empty cell count ─────────────────────────────────────────────────────────
export function countEmptyCells(grid: Grid): number {
  return getEmptyCells(grid).length;
}

// ─── Max tile value ───────────────────────────────────────────────────────────
export function maxTile(grid: Grid): number {
  return getHighestTileValue(grid);
}

// ─── Monotonicity ─────────────────────────────────────────────────────────────
// Returns a score (higher = more monotonic).
export function monotonicity(grid: Grid): number {
  let total = 0;
  // Horizontal
  for (let r = 0; r < 4; r++) {
    let incr = 0; let decr = 0;
    for (let c = 0; c < 3; c++) {
      const a = grid[r][c]?.value ?? 0;
      const b = grid[r][c + 1]?.value ?? 0;
      if (a > b) decr += a - b;
      else if (b > a) incr += b - a;
    }
    total -= Math.min(incr, decr);
  }
  // Vertical
  for (let c = 0; c < 4; c++) {
    let incr = 0; let decr = 0;
    for (let r = 0; r < 3; r++) {
      const a = grid[r][c]?.value ?? 0;
      const b = grid[r + 1][c]?.value ?? 0;
      if (a > b) decr += a - b;
      else if (b > a) incr += b - a;
    }
    total -= Math.min(incr, decr);
  }
  return total;
}

// ─── Smoothness ───────────────────────────────────────────────────────────────
// Penalises large differences between adjacent tiles.
export function smoothness(grid: Grid): number {
  let penalty = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = grid[r][c]?.value;
      if (!v) continue;
      if (c < 3) {
        const n = grid[r][c + 1]?.value;
        if (n) penalty -= Math.abs(Math.log2(v) - Math.log2(n));
      }
      if (r < 3) {
        const n = grid[r + 1][c]?.value;
        if (n) penalty -= Math.abs(Math.log2(v) - Math.log2(n));
      }
    }
  }
  return penalty;
}

// ─── Corner stability ─────────────────────────────────────────────────────────
// Returns log2 of max tile value if it is in a corner, else 0.
export function cornerStability(grid: Grid): number {
  const corners: [number, number][] = [[0,0],[0,3],[3,0],[3,3]];
  const max = maxTile(grid);
  for (const [r, c] of corners) {
    if (grid[r][c]?.value === max) return Math.log2(max);
  }
  return 0;
}

// ─── Merge potential ──────────────────────────────────────────────────────────
// Count adjacent tile pairs with equal value (potential merges).
export function mergePotential(grid: Grid): number {
  let count = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = grid[r][c]?.value;
      if (!v) continue;
      if (c < 3 && grid[r][c + 1]?.value === v) count++;
      if (r < 3 && grid[r + 1][c]?.value === v) count++;
    }
  }
  return count;
}

// ─── Survival potential ───────────────────────────────────────────────────────
// Simple proxy: number of empty cells.
export function survivalPotential(grid: Grid): number {
  return countEmptyCells(grid);
}

// ─── Anomaly risk ─────────────────────────────────────────────────────────────
// Returns a 0–1 risk factor based on active anomaly and counters.
export function anomalyRisk(state: GameState): number {
  const phase = state.phaseIndex;
  // Phase 4 (index 3) = entropy_tax, Phase 6 (index 5) = collapse_field
  if (phase === 3) {
    // Entropy tax: risk rises as grid fills
    const empty = countEmptyCells(state.grid);
    return empty <= 2 ? 1.0 : empty <= 5 ? 0.5 : 0.1;
  }
  if (phase === 5) {
    // Collapse field: risk near every Nth move (N = COLLAPSE_FIELD_PERIOD)
    const movesToCollapse = COLLAPSE_FIELD_PERIOD - (state.collapseFieldCounter % COLLAPSE_FIELD_PERIOD);
    return movesToCollapse === 1 ? 0.8 : movesToCollapse === 2 ? 0.4 : 0.1;
  }
  return 0;
}

// ─── Catalyst synergy bonus ───────────────────────────────────────────────────
// Returns an additive bonus score based on active catalyst synergies.
export function catalystSynergyBonus(state: GameState, hasCornerMerge: boolean, mergeCount: number): number {
  let bonus = 0;
  if (state.activeCatalysts.includes('corner_crown') && hasCornerMerge) bonus += 50;
  if (state.activeCatalysts.includes('twin_burst') && mergeCount >= 2) bonus += 30;
  if (state.activeCatalysts.includes('combo_wire') && state.comboWireCount >= 2) bonus += 20;
  return bonus;
}
