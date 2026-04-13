import React from 'react';
import { PHASES } from '../../core/phases';
import { useT } from '../../i18n';

interface PhasePanelProps {
  phaseIndex: number;
  output: number;
}

export const PhasePanel: React.FC<PhasePanelProps> = ({ phaseIndex, output }) => {
  const t = useT();
  const phase = PHASES[phaseIndex];
  const progress = Math.min((output / phase.targetOutput) * 100, 100);

  return (
    <div className="panel phase-panel">
      <div className="panel-title">{t('ui.phase')} {phase.phaseNumber}</div>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">{output} / {phase.targetOutput}</span>
      </div>
      {phase.anomaly && (
        <div className="anomaly-info">
          <span className="anomaly-label">{t('ui.anomaly_label')}:</span>
          <span className="anomaly-name">{t(`anomaly.${phase.anomaly}.name`)}</span>
          <div className="anomaly-desc">{t(`anomaly.${phase.anomaly}.description`)}</div>
        </div>
      )}
    </div>
  );
};
