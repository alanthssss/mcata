import React from 'react';
import { Cell } from '../../core/types';
import { useThemeStore, getThemeEntry } from '../../theme/themeRegistry';

interface TileProps {
  cell: Cell;
  isFrozen?: boolean;
  isBlocked?: boolean;
  /** When true, show the internal numeric value as a small debug badge. */
  showInternalValue?: boolean;
}

export const Tile: React.FC<TileProps> = ({ cell, isFrozen, isBlocked, showInternalValue = false }) => {
  const theme = useThemeStore(s => s.getActiveTheme());

  const className = [
    'tile',
    cell ? 'tile-filled' : '',
    isFrozen ? 'tile-frozen' : '',
    isBlocked ? 'tile-blocked' : '',
  ].filter(Boolean).join(' ');

  let style: React.CSSProperties = {};
  let label: React.ReactNode = null;

  if (cell) {
    const entry = getThemeEntry(theme, cell.value);
    style = {
      backgroundColor: entry.colorToken,
      color: entry.textColorToken,
    };
    label = (
      <>
        {entry.iconToken && (
          <span className="tile-icon" aria-hidden="true">{entry.iconToken}</span>
        )}
        <span className="tile-display-label">{entry.displayLabel}</span>
        {showInternalValue && (
          <span className="tile-internal-value" aria-label={`internal value ${cell.value}`}>
            {cell.value}
          </span>
        )}
      </>
    );
  }

  return (
    <div className={className} style={style}>
      {label}
      {isFrozen && <span className="tile-label">❄</span>}
      {isBlocked && <span className="tile-label">✕</span>}
    </div>
  );
};
