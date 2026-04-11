import React from 'react';
import { Grid, Position } from '../../core/types';
import { Tile } from './Tile';

interface GridViewProps {
  grid: Grid;
  frozenCell?: Position | null;
  blockedCell?: Position | null;
}

export const GridView: React.FC<GridViewProps> = ({ grid, frozenCell, blockedCell }) => {
  return (
    <div className="grid-container">
      {grid.map((row, r) =>
        row.map((cell, c) => (
          <Tile
            key={`${r}-${c}`}
            cell={cell}
            isFrozen={!!frozenCell && frozenCell.row === r && frozenCell.col === c}
            isBlocked={!!blockedCell && blockedCell.row === r && blockedCell.col === c}
          />
        ))
      )}
    </div>
  );
};
