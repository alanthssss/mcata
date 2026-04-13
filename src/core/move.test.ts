import { describe, it, expect } from 'vitest';
import { applyMove } from './move';
import { createEmptyGrid } from './board';
import type { Grid, Tile } from './types';

function t(value: number, id = value): Tile {
  return { id, value, merged: false };
}

/** Build a 4×4 grid from a row-major array of values (0 = null). */
function makeGrid(values: number[][]): Grid {
  return values.map(row => row.map(v => (v === 0 ? null : t(v))));
}

/** Extract just the values from a grid (null → 0). */
function gridValues(grid: Grid): number[][] {
  return grid.map(row => row.map(cell => (cell ? cell.value : 0)));
}

describe('applyMove', () => {
  describe('left', () => {
    it('slides tiles to the left', () => {
      const grid = makeGrid([
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, changed } = applyMove(grid, 'left', 10);
      expect(changed).toBe(true);
      expect(gridValues(result)[0]).toEqual([2, 0, 0, 0]);
    });

    it('merges equal adjacent tiles', () => {
      const grid = makeGrid([
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, merges } = applyMove(grid, 'left', 10);
      expect(gridValues(result)[0]).toEqual([4, 0, 0, 0]);
      expect(merges).toHaveLength(1);
      expect(merges[0].value).toBe(4);
    });

    it('does not merge already-merged tile again', () => {
      const grid = makeGrid([
        [2, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result } = applyMove(grid, 'left', 10);
      expect(gridValues(result)[0]).toEqual([4, 2, 0, 0]);
    });

    it('returns changed=false when nothing moves', () => {
      const grid = makeGrid([
        [2, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { changed } = applyMove(grid, 'left', 0);
      expect(changed).toBe(false);
    });
  });

  describe('right', () => {
    it('slides tiles to the right', () => {
      const grid = makeGrid([
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, changed } = applyMove(grid, 'right', 0);
      expect(changed).toBe(true);
      expect(gridValues(result)[0]).toEqual([0, 0, 0, 2]);
    });

    it('merges equal tiles moving right', () => {
      const grid = makeGrid([
        [0, 0, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, merges } = applyMove(grid, 'right', 0);
      expect(gridValues(result)[0]).toEqual([0, 0, 0, 4]);
      expect(merges[0].to).toEqual({ row: 0, col: 3 });
      expect(merges[0].value).toBe(4);
    });
  });

  describe('up', () => {
    it('slides tiles upward', () => {
      const grid = makeGrid([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [2, 0, 0, 0],
      ]);
      const { grid: result, changed } = applyMove(grid, 'up', 0);
      expect(changed).toBe(true);
      expect(result[0][0]!.value).toBe(2);
      expect(result[3][0]).toBeNull();
    });

    it('merges equal tiles in the same column moving up', () => {
      const grid = makeGrid([
        [2, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, merges } = applyMove(grid, 'up', 0);
      expect(result[0][0]!.value).toBe(4);
      expect(merges[0].to).toEqual({ row: 0, col: 0 });
    });
  });

  describe('down', () => {
    it('slides tiles downward', () => {
      const grid = makeGrid([
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, changed } = applyMove(grid, 'down', 0);
      expect(changed).toBe(true);
      expect(result[3][0]!.value).toBe(2);
      expect(result[0][0]).toBeNull();
    });

    it('merges equal tiles in same column moving down', () => {
      const grid = makeGrid([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [4, 0, 0, 0],
        [4, 0, 0, 0],
      ]);
      const { grid: result, merges } = applyMove(grid, 'down', 0);
      expect(result[3][0]!.value).toBe(8);
      expect(merges[0].to).toEqual({ row: 3, col: 0 });
    });
  });

  describe('MergeInfo', () => {
    it('isCorner is true when merge destination is a corner', () => {
      const grid = makeGrid([
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { merges } = applyMove(grid, 'left', 0);
      expect(merges[0].isCorner).toBe(true);
    });

    it('isHighest is true when the merged value exceeds previous highest', () => {
      const grid = makeGrid([
        [4, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { merges } = applyMove(grid, 'left', 0);
      expect(merges[0].isHighest).toBe(true);
    });

    it('isHighest is false when a higher tile already exists', () => {
      const grid = makeGrid([
        [4, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 16],
      ]);
      const { merges } = applyMove(grid, 'left', 0);
      // 4+4=8, but 16 is already on board → not isHighest
      expect(merges[0].isHighest).toBe(false);
    });

    it('increments tile id counter for each merge', () => {
      const grid = makeGrid([
        [2, 2, 4, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { newTileIdCounter } = applyMove(grid, 'left', 5);
      // Two merges → id counter += 2
      expect(newTileIdCounter).toBe(7);
    });
  });

  describe('multiple merges per move', () => {
    it('handles two merges in the same row', () => {
      const grid = makeGrid([
        [2, 2, 4, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const { grid: result, merges } = applyMove(grid, 'left', 0);
      expect(gridValues(result)[0]).toEqual([4, 8, 0, 0]);
      expect(merges).toHaveLength(2);
    });
  });

  describe('empty grid', () => {
    it('returns changed=false', () => {
      const { changed } = applyMove(createEmptyGrid(), 'left', 0);
      expect(changed).toBe(false);
    });
  });
});
