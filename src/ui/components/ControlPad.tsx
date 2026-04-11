import React from 'react';
import { Direction } from '../../core/types';

interface ControlPadProps {
  onMove: (dir: Direction) => void;
}

export const ControlPad: React.FC<ControlPadProps> = ({ onMove }) => {
  return (
    <div className="control-pad">
      <div className="control-row">
        <button className="ctrl-btn" onClick={() => onMove('up')}>▲</button>
      </div>
      <div className="control-row">
        <button className="ctrl-btn" onClick={() => onMove('left')}>◀</button>
        <button className="ctrl-btn" onClick={() => onMove('down')}>▼</button>
        <button className="ctrl-btn" onClick={() => onMove('right')}>▶</button>
      </div>
    </div>
  );
};
