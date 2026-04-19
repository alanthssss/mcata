import React from 'react';
import { Cell } from '../../core/types';
import { TILE_DISPLAY_MODE } from '../../core/config';
import { useThemeStore, getThemeEntry } from '../../theme/themeRegistry';

interface TileProps {
  cell: Cell;
  isFrozen?: boolean;
  isBlocked?: boolean;
  isHinted?: boolean;
  mergeFeedback?: 'normal' | 'strong' | null;
  /** Override the global display mode for this tile instance. */
  displayMode?: import('../../core/config').TileDisplayMode;
}

export const Tile: React.FC<TileProps> = ({ cell, isFrozen, isBlocked, isHinted, mergeFeedback, displayMode }) => {
  const theme = useThemeStore(s => s.getActiveTheme());
  const mode = displayMode ?? TILE_DISPLAY_MODE;

  const className = [
    'tile',
    cell ? 'tile-filled' : '',
    isFrozen ? 'tile-frozen' : '',
    isBlocked ? 'tile-blocked' : '',
    isHinted ? 'tile-hinted' : '',
    mergeFeedback ? 'tile-merge-feedback' : '',
    mergeFeedback === 'strong' ? 'tile-merge-feedback--strong' : '',
  ].filter(Boolean).join(' ');

  let style: React.CSSProperties = {};
  let label: React.ReactNode = null;

  if (cell) {
    const entry = getThemeEntry(theme, cell.value);
    style = {
      backgroundColor: entry.colorToken,
      color: entry.textColorToken,
    };

    if (mode === 'value-only') {
      label = (
        <span className="tile-display-label">{cell.value}</span>
      );
    } else if (mode === 'label+value') {
      label = (
        <>
          {entry.iconToken && (
            <span className="tile-icon" aria-hidden="true">{entry.iconToken}</span>
          )}
          <span className="tile-display-label">{entry.displayLabel}</span>
          <span className="tile-internal-value" aria-label={`internal value ${cell.value}`}>
            {cell.value}
          </span>
        </>
      );
    } else {
      // mode === 'label'
      label = (
        <>
          {entry.iconToken && (
            <span className="tile-icon" aria-hidden="true">{entry.iconToken}</span>
          )}
          <span className="tile-display-label">{entry.displayLabel}</span>
        </>
      );
    }
  }

  return (
    <div className={className} style={style}>
      {label}
      {isFrozen && <span className="tile-label">❄</span>}
      {isBlocked && <span className="tile-label">✕</span>}
    </div>
  );
};
