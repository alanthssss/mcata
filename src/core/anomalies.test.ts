import { describe, it, expect } from 'vitest';
import { applyEntropyTax, applyCollapseField } from './anomalies';
import { createEmptyGrid, spawnTile } from './board';
import { createRng } from './rng';

function gridWith(tiles: Array<{ row: number; col: number; value: number }>): ReturnType<typeof createEmptyGrid> {
  let grid = createEmptyGrid();
  let id = 0;
  for (const { row, col, value } of tiles) {
    const r = spawnTile(grid, value, { row, col }, id++);
    grid = r.grid;
  }
  return grid;
}

describe('applyEntropyTax', () => {
  it('returns a blocked cell from the empty cells', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 4 }]);
    const rng = createRng(1);
    const { blockedCell } = applyEntropyTax(grid, rng);
    expect(blockedCell).not.toBeNull();
    // Blocked cell must not be the occupied cell
    expect(blockedCell).not.toMatchObject({ row: 0, col: 0 });
  });

  it('returns null when the grid is completely full', () => {
    let grid = createEmptyGrid();
    let id = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const res = spawnTile(grid, 2, { row: r, col: c }, id++);
        grid = res.grid;
      }
    }
    const rng = createRng(1);
    const { blockedCell } = applyEntropyTax(grid, rng);
    expect(blockedCell).toBeNull();
  });

  it('includes a description string', () => {
    const grid = createEmptyGrid();
    const rng = createRng(1);
    const { description } = applyEntropyTax(grid, rng);
    expect(description).toMatch(/Entropy Tax/i);
  });

  it('is deterministic for the same rng seed', () => {
    const grid = createEmptyGrid();
    const { blockedCell: b1 } = applyEntropyTax(grid, createRng(42));
    const { blockedCell: b2 } = applyEntropyTax(grid, createRng(42));
    expect(b1).toEqual(b2);
  });
});

describe('applyCollapseField', () => {
  it('does not trigger when counter is not a multiple of period', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 64 }]);
    const { triggered } = applyCollapseField(grid, 3, 4);
    expect(triggered).toBe(false);
  });

  it('does not trigger when counter is 0', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 64 }]);
    const { triggered } = applyCollapseField(grid, 0, 4);
    expect(triggered).toBe(false);
  });

  it('triggers and halves the highest tile at period multiple', () => {
    const grid = gridWith([{ row: 1, col: 2, value: 128 }]);
    const { triggered, grid: newGrid } = applyCollapseField(grid, 4, 4);
    expect(triggered).toBe(true);
    expect(newGrid[1][2]!.value).toBe(64);
  });

  it('does not trigger when highest tile is 2 (too small)', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 2 }]);
    const { triggered } = applyCollapseField(grid, 4, 4);
    expect(triggered).toBe(false);
  });

  it('does not trigger on an empty grid', () => {
    const { triggered } = applyCollapseField(createEmptyGrid(), 4, 4);
    expect(triggered).toBe(false);
  });

  it('uses the default period from config when not provided', () => {
    // COLLAPSE_FIELD_PERIOD = 4
    const grid = gridWith([{ row: 0, col: 0, value: 64 }]);
    const { triggered: yes } = applyCollapseField(grid, 4);
    const { triggered: no }  = applyCollapseField(grid, 3);
    expect(yes).toBe(true);
    expect(no).toBe(false);
  });

  it('includes a description string when triggered', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 64 }]);
    const { description } = applyCollapseField(grid, 4, 4);
    expect(description).toMatch(/Collapse Field/i);
  });

  it('does not mutate the original grid', () => {
    const grid = gridWith([{ row: 0, col: 0, value: 64 }]);
    applyCollapseField(grid, 4, 4);
    expect(grid[0][0]!.value).toBe(64);
  });
});
