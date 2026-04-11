import { Cell, Grid, Position } from './types';

export function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function getEmptyCells(grid: Grid): Position[] {
  const positions: Position[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) positions.push({ row: r, col: c });
    }
  }
  return positions;
}

export function isCorner(pos: Position): boolean {
  return (pos.row === 0 || pos.row === 3) && (pos.col === 0 || pos.col === 3);
}

export function getHighestTileValue(grid: Grid): number {
  let max = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell && cell.value > max) max = cell.value;
    }
  }
  return max;
}

export function findHighestTilePosition(grid: Grid): Position | null {
  let max = 0;
  let pos: Position | null = null;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell && cell.value > max) {
        max = cell.value;
        pos = { row: r, col: c };
      }
    }
  }
  return pos;
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const ca = a[r][c];
      const cb = b[r][c];
      if (ca === null && cb === null) continue;
      if (ca === null || cb === null) return false;
      if (ca.value !== cb.value) return false;
    }
  }
  return true;
}

export function spawnTile(
  grid: Grid,
  value: number,
  pos: Position,
  idCounter: number
): { grid: Grid; id: number } {
  const newGrid = cloneGrid(grid);
  const id = idCounter + 1;
  newGrid[pos.row][pos.col] = { id, value, merged: false };
  return { grid: newGrid, id };
}

export function resetMergedFlags(grid: Grid): Grid {
  return grid.map(row =>
    row.map(cell => (cell ? { ...cell, merged: false } : null))
  );
}
