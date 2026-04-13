import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  cloneGrid,
  getEmptyCells,
  isCorner,
  getHighestTileValue,
  findHighestTilePosition,
  gridsEqual,
  spawnTile,
  resetMergedFlags,
} from './board';
import type { Grid, Tile } from './types';

function makeTile(id: number, value: number, merged = false): Tile {
  return { id, value, merged };
}

describe('createEmptyGrid', () => {
  it('produces a 4×4 grid of nulls', () => {
    const grid = createEmptyGrid();
    expect(grid).toHaveLength(4);
    for (const row of grid) {
      expect(row).toHaveLength(4);
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });
});

describe('cloneGrid', () => {
  it('deep-copies tiles', () => {
    const grid = createEmptyGrid();
    grid[0][0] = makeTile(1, 2);
    const copy = cloneGrid(grid);
    expect(copy[0][0]).toEqual(makeTile(1, 2));
    // Mutating the clone does not affect the original
    copy[0][0]!.value = 99;
    expect(grid[0][0]!.value).toBe(2);
  });

  it('preserves null cells', () => {
    const grid = createEmptyGrid();
    const copy = cloneGrid(grid);
    expect(copy[2][3]).toBeNull();
  });
});

describe('getEmptyCells', () => {
  it('returns all 16 positions for an empty grid', () => {
    const grid = createEmptyGrid();
    expect(getEmptyCells(grid)).toHaveLength(16);
  });

  it('excludes occupied cells', () => {
    const grid = createEmptyGrid();
    grid[0][0] = makeTile(1, 2);
    grid[3][3] = makeTile(2, 4);
    const empty = getEmptyCells(grid);
    expect(empty).toHaveLength(14);
    expect(empty.some(p => p.row === 0 && p.col === 0)).toBe(false);
    expect(empty.some(p => p.row === 3 && p.col === 3)).toBe(false);
  });

  it('returns empty array for a full grid', () => {
    const grid = createEmptyGrid();
    let id = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        grid[r][c] = makeTile(++id, 2);
    expect(getEmptyCells(grid)).toHaveLength(0);
  });
});

describe('isCorner', () => {
  it.each([
    [0, 0], [0, 3], [3, 0], [3, 3],
  ])('(%i, %i) is a corner', (row, col) => {
    expect(isCorner({ row, col })).toBe(true);
  });

  it.each([
    [0, 1], [1, 0], [1, 1], [2, 2], [3, 1],
  ])('(%i, %i) is not a corner', (row, col) => {
    expect(isCorner({ row, col })).toBe(false);
  });
});

describe('getHighestTileValue', () => {
  it('returns 0 for an empty grid', () => {
    expect(getHighestTileValue(createEmptyGrid())).toBe(0);
  });

  it('returns the max tile value', () => {
    const grid = createEmptyGrid();
    grid[0][0] = makeTile(1, 4);
    grid[1][2] = makeTile(2, 128);
    grid[3][3] = makeTile(3, 16);
    expect(getHighestTileValue(grid)).toBe(128);
  });
});

describe('findHighestTilePosition', () => {
  it('returns null for empty grid', () => {
    expect(findHighestTilePosition(createEmptyGrid())).toBeNull();
  });

  it('returns position of the highest tile', () => {
    const grid = createEmptyGrid();
    grid[2][1] = makeTile(1, 64);
    grid[0][3] = makeTile(2, 256);
    const pos = findHighestTilePosition(grid);
    expect(pos).toEqual({ row: 0, col: 3 });
  });
});

describe('gridsEqual', () => {
  it('two empty grids are equal', () => {
    expect(gridsEqual(createEmptyGrid(), createEmptyGrid())).toBe(true);
  });

  it('detects differing values', () => {
    const a = createEmptyGrid();
    const b = createEmptyGrid();
    a[0][0] = makeTile(1, 2);
    b[0][0] = makeTile(1, 4);
    expect(gridsEqual(a, b)).toBe(false);
  });

  it('detects one cell null while other is not', () => {
    const a = createEmptyGrid();
    const b = createEmptyGrid();
    a[1][1] = makeTile(1, 2);
    expect(gridsEqual(a, b)).toBe(false);
  });

  it('ignores id and merged flag (compares only value)', () => {
    const a = createEmptyGrid();
    const b = createEmptyGrid();
    a[0][0] = { id: 1, value: 4, merged: false };
    b[0][0] = { id: 99, value: 4, merged: true };
    expect(gridsEqual(a, b)).toBe(true);
  });
});

describe('spawnTile', () => {
  it('places a tile at the given position', () => {
    const grid = createEmptyGrid();
    const { grid: newGrid, id } = spawnTile(grid, 4, { row: 2, col: 3 }, 0);
    expect(newGrid[2][3]).toMatchObject({ value: 4, merged: false });
    expect(id).toBe(1);
  });

  it('increments the id counter', () => {
    const grid = createEmptyGrid();
    const { id: id1 } = spawnTile(grid, 2, { row: 0, col: 0 }, 5);
    expect(id1).toBe(6);
  });

  it('does not mutate the original grid', () => {
    const grid = createEmptyGrid();
    spawnTile(grid, 2, { row: 0, col: 0 }, 0);
    expect(grid[0][0]).toBeNull();
  });
});

describe('resetMergedFlags', () => {
  it('sets all merged flags to false', () => {
    const grid: Grid = createEmptyGrid();
    grid[0][0] = { id: 1, value: 4, merged: true };
    grid[1][1] = { id: 2, value: 8, merged: true };
    const reset = resetMergedFlags(grid);
    expect(reset[0][0]!.merged).toBe(false);
    expect(reset[1][1]!.merged).toBe(false);
  });

  it('preserves null cells', () => {
    const grid = createEmptyGrid();
    const reset = resetMergedFlags(grid);
    expect(reset[3][3]).toBeNull();
  });
});
