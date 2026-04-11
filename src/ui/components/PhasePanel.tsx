import React from 'react';
import { PHASES } from '../../core/phases';
import { ANOMALY_DEFS } from '../../core/anomalies';

interface PhasePanelProps {
  phaseIndex: number;
  output: number;
}

export const PhasePanel: React.FC<PhasePanelProps> = ({ phaseIndex, output }) => {
  const phase = PHASES[phaseIndex];
  const progress = Math.min((output / phase.targetOutput) * 100, 100);

  return (
    <div className="panel phase-panel">
      <div className="panel-title">Phase {phase.phaseNumber}</div>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">{output} / {phase.targetOutput}</span>
      </div>
      {phase.anomaly && (
        <div className="anomaly-info">
          <span className="anomaly-label">⚠ Anomaly:</span>
          <span className="anomaly-name">{ANOMALY_DEFS[phase.anomaly].name}</span>
          <div className="anomaly-desc">{ANOMALY_DEFS[phase.anomaly].description}</div>
        </div>
      )}
    </div>
  );
};
