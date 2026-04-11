/**
 * Move scoring helpers used by greedy / beam agents.
 * Returns immediate value of taking a move from a state.
 */
import { GameState, Direction } from '../../core/types';
import { processMoveAction } from '../../core/engine';
import { countEmptyCells, maxTile, cornerStability } from './features';

export interface ImmediateScore {
  outputGained:  number;
  emptyCells:    number;
  maxTileGrowth: number;
  cornerBonus:   number;
  total:         number;
}

export function scoreImmediateMove(
  state: GameState,
  dir: Direction,
): ImmediateScore | null {
  const next = processMoveAction(state, dir);
  // If state did not change the grid (invalid move), return null
  if (next === state) return null;

  const outputGained  = next.output - state.output;
  const emptyCells    = countEmptyCells(next.grid);
  const maxTileGrowth = maxTile(next.grid) - maxTile(state.grid);
  const cornerBonus   = cornerStability(next.grid);

  const total =
    outputGained * 5 +
    emptyCells   * 20 +
    maxTileGrowth * 10 +
    cornerBonus  * 2;

  return { outputGained, emptyCells, maxTileGrowth, cornerBonus, total };
}

/** Return all legal directions from this state (ones that actually change the grid). */
export function legalMoves(state: GameState): Direction[] {
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  return dirs.filter(d => {
    const next = processMoveAction(state, d);
    return next !== state;
  });
}
