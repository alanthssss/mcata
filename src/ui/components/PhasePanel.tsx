import React from 'react';
import { PHASES } from '../../core/phases';
import { useT } from '../../i18n';
import { formatScoreCompact } from '../scoreDisplay';

interface PhasePanelProps {
  phaseIndex: number;
  output: number;
  /** Effective phase target including round scaling, ascension, and build-aware factor. */
  phaseTargetOutput: number;
}

export const PhasePanel: React.FC<PhasePanelProps> = ({ phaseIndex, output, phaseTargetOutput }) => {
  const t = useT();
  const phase = PHASES[phaseIndex];
  const progress = Math.min((output / phaseTargetOutput) * 100, 100);

  return (
    <div className="panel phase-panel">
      <div className="panel-title">{t('ui.phase')} {phase.phaseNumber}</div>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">
          {formatScoreCompact(output)} / {formatScoreCompact(phaseTargetOutput)}
        </span>
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
