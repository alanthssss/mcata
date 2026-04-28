import { Grid, Direction, Position, MergeInfo, Cell } from './types';
import { cloneGrid, isCorner, getHighestTileValue } from './board';

export interface MoveResult {
  grid: Grid;
  merges: MergeInfo[];
  changed: boolean;
  newTileIdCounter: number;
}

type Line = (Cell)[];

function mergeLine(line: Line, startId: number, highestBefore: number): {
  result: Line;
  merges: Array<{ fromIdx: number; toIdx: number; value: number }>;
  idCounter: number;
} {
  // Remove nulls
  const tiles = line.filter(Boolean) as NonNullable<Cell>[];
  const result: Line = Array(4).fill(null);
  const merges: Array<{ fromIdx: number; toIdx: number; value: number }> = [];
  let idCounter = startId;
  let ri = 0;
  let ti = 0;

  while (ti < tiles.length) {
    if (
      ti + 1 < tiles.length &&
      tiles[ti].value === tiles[ti + 1].value &&
      !tiles[ti].merged &&
      !tiles[ti + 1].merged &&
      !tiles[ti].corrupted &&
      !tiles[ti + 1].corrupted
    ) {
      const newValue = tiles[ti].value * 2;
      idCounter++;
      result[ri] = { id: idCounter, value: newValue, merged: true };
      merges.push({ fromIdx: ti, toIdx: ri, value: newValue });
      ti += 2;
    } else {
      result[ri] = { ...tiles[ti], merged: false };
      ti++;
    }
    ri++;
  }

  // suppress unused warning
  void highestBefore;

  return { result, merges, idCounter };
}

function extractLine(grid: Grid, dir: Direction, idx: number): Line {
  if (dir === 'left' || dir === 'right') {
    const row = grid[idx].map(c => c);
    return dir === 'right' ? [...row].reverse() : row;
  } else {
    const col = [0, 1, 2, 3].map(r => grid[r][idx]);
    return dir === 'down' ? [...col].reverse() : col;
  }
}

function applyLine(grid: Grid, line: Line, dir: Direction, idx: number): void {
  const finalLine = dir === 'right' || dir === 'down' ? [...line].reverse() : line;
  if (dir === 'left' || dir === 'right') {
    for (let c = 0; c < 4; c++) grid[idx][c] = finalLine[c];
  } else {
    for (let r = 0; r < 4; r++) grid[r][idx] = finalLine[r];
  }
}

export function applyMove(
  grid: Grid,
  dir: Direction,
  idCounter: number
): MoveResult {
  const newGrid = cloneGrid(grid);
  const allMerges: MergeInfo[] = [];
  const highestBefore = getHighestTileValue(grid);
  let changed = false;
  let currentId = idCounter;

  for (let idx = 0; idx < 4; idx++) {
    const line = extractLine(newGrid, dir, idx);
    const originalValues = line.map(c => c?.value ?? null);

    const { result, merges, idCounter: newId } = mergeLine(line, currentId, highestBefore);
    currentId = newId;

    const resultValues = result.map(c => c?.value ?? null);
    const lineChanged = JSON.stringify(originalValues) !== JSON.stringify(resultValues);
    if (lineChanged) changed = true;

    applyLine(newGrid, result, dir, idx);

    // Convert local merges to MergeInfo
    for (const m of merges) {
      let toPos: Position;
      let fromPos1: Position;
      let fromPos2: Position;

      if (dir === 'left') {
        toPos = { row: idx, col: m.toIdx };
        fromPos1 = { row: idx, col: m.fromIdx };
        fromPos2 = { row: idx, col: m.fromIdx + 1 };
      } else if (dir === 'right') {
        toPos = { row: idx, col: 3 - m.toIdx };
        fromPos1 = { row: idx, col: 3 - m.fromIdx };
        fromPos2 = { row: idx, col: 3 - m.fromIdx - 1 };
      } else if (dir === 'up') {
        toPos = { row: m.toIdx, col: idx };
        fromPos1 = { row: m.fromIdx, col: idx };
        fromPos2 = { row: m.fromIdx + 1, col: idx };
      } else {
        toPos = { row: 3 - m.toIdx, col: idx };
        fromPos1 = { row: 3 - m.fromIdx, col: idx };
        fromPos2 = { row: 3 - m.fromIdx - 1, col: idx };
      }

      allMerges.push({
        from: [fromPos1, fromPos2],
        to: toPos,
        value: m.value,
        isCorner: isCorner(toPos),
        isHighest: m.value > highestBefore,
      });
    }
  }

  return { grid: newGrid, merges: allMerges, changed, newTileIdCounter: currentId };
}
