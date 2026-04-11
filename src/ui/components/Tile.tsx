import React from 'react';
import { Cell } from '../../core/types';

interface TileProps {
  cell: Cell;
  isFrozen?: boolean;
  isBlocked?: boolean;
}

const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
  4096: '#3c3a32',
  8192: '#1a1a2e',
};

function getTileColor(value: number): string {
  return TILE_COLORS[value] || '#cdc1b4';
}

function getTextColor(value: number): string {
  return value <= 4 ? '#776e65' : '#f9f6f2';
}

function getFontSize(value: number): string {
  if (value >= 1000) return '1.1rem';
  if (value >= 100) return '1.4rem';
  return '1.8rem';
}

export const Tile: React.FC<TileProps> = ({ cell, isFrozen, isBlocked }) => {
  const className = [
    'tile',
    cell ? 'tile-filled' : '',
    isFrozen ? 'tile-frozen' : '',
    isBlocked ? 'tile-blocked' : '',
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = cell
    ? {
        backgroundColor: getTileColor(cell.value),
        color: getTextColor(cell.value),
        fontSize: getFontSize(cell.value),
      }
    : {};

  return (
    <div className={className} style={style}>
      {cell ? cell.value : ''}
      {isFrozen && <span className="tile-label">❄</span>}
      {isBlocked && <span className="tile-label">✕</span>}
    </div>
  );
};
