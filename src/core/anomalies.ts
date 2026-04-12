import { AnomalyId, AnomalyDef, Grid, Position } from './types';
import { getEmptyCells, cloneGrid, findHighestTilePosition } from './board';
import { Rng } from './rng';

export const ANOMALY_DEFS: Record<AnomalyId, AnomalyDef> = {
  entropy_tax: {
    id: 'entropy_tax',
    name: 'Entropy Tax',
    description: 'Each turn, 1 random empty cell is blocked from spawning',
  },
  collapse_field: {
    id: 'collapse_field',
    name: 'Collapse Field',
    description: 'Every 3 valid moves, the highest tile is reduced by one level',
  },
};

export function applyEntropyTax(
  grid: Grid,
  rng: Rng
): { blockedCell: Position | null; description: string } {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return { blockedCell: null, description: 'Entropy Tax: no empty cells' };
  const cell = rng.pick(empty);
  return { blockedCell: cell, description: `Entropy Tax: cell (${cell.row},${cell.col}) blocked` };
}

export function applyCollapseField(
  grid: Grid,
  counter: number
): { grid: Grid; triggered: boolean; description: string } {
  if (counter % 3 !== 0 || counter === 0) {
    return { grid, triggered: false, description: '' };
  }
  const pos = findHighestTilePosition(grid);
  if (!pos) return { grid, triggered: false, description: 'Collapse Field: no tile found' };

  const tile = grid[pos.row][pos.col];
  if (!tile || tile.value <= 2) return { grid, triggered: false, description: 'Collapse Field: tile too small' };

  const newGrid = cloneGrid(grid);
  newGrid[pos.row][pos.col] = { ...tile, value: tile.value / 2 };
  return {
    grid: newGrid,
    triggered: true,
    description: `Collapse Field: highest tile reduced from ${tile.value} to ${tile.value / 2}`,
  };
}
