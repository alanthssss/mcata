import React from 'react';
import { PHASES } from '../../core/phases';

interface HeaderProps {
  phaseIndex: number;
  output: number;
  totalOutput: number;
  stepsRemaining: number;
  energy: number;
  globalMultiplier: number;
}

export const Header: React.FC<HeaderProps> = ({
  phaseIndex,
  output,
  totalOutput,
  stepsRemaining,
  energy,
  globalMultiplier,
}) => {
  const phase = PHASES[phaseIndex];

  return (
    <div className="header">
      <div className="header-title">⚗ Merge Catalyst</div>
      <div className="header-stats">
        <div className="stat">
          <span className="stat-label">Phase</span>
          <span className="stat-value">{phase.phaseNumber} / {PHASES.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Output</span>
          <span className="stat-value">{output} / {phase.targetOutput}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Steps</span>
          <span className="stat-value">{stepsRemaining}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Energy</span>
          <span className="stat-value">⚡ {energy}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{totalOutput}</span>
        </div>
        {globalMultiplier !== 1.0 && (
          <div className="stat">
            <span className="stat-label">Global</span>
            <span className="stat-value">x{globalMultiplier.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
