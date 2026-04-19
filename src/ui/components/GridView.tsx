import React from 'react';
import { Grid, Position } from '../../core/types';
import { Tile } from './Tile';

interface GridViewProps {
  grid: Grid;
  frozenCell?: Position | null;
  blockedCell?: Position | null;
  hintedPair?: [Position, Position] | null;
  mergeTargets?: Position[];
  mergeFeedback?: 'normal' | 'strong' | null;
}

export const GridView: React.FC<GridViewProps> = ({ grid, frozenCell, blockedCell, hintedPair, mergeTargets = [], mergeFeedback }) => {
  const hintedLookup = new Set(
    hintedPair
      ? hintedPair.map(pos => `${pos.row}:${pos.col}`)
      : []
  );
  const mergeLookup = new Set(mergeTargets.map(pos => `${pos.row}:${pos.col}`));

  return (
    <div className="grid-container">
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <Tile
            key={`${r}-${c}`}
            cell={cell}
            isFrozen={!!frozenCell && frozenCell.row === r && frozenCell.col === c}
            isBlocked={!!blockedCell && blockedCell.row === r && blockedCell.col === c}
            isHinted={hintedLookup.has(`${r}:${c}`)}
            mergeFeedback={mergeLookup.has(`${r}:${c}`) ? (mergeFeedback ?? 'normal') : null}
          />
        ))
      )}
    </div>
  );
};
