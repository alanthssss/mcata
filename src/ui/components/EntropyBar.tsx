import React from 'react';
import { useT } from '../../i18n';

interface EntropyBarProps {
  entropy: number;
  entropyMax: number;
  phaseObjectiveScore: number;
  currentOutput: number;
}

function getEntropyDangerLevel(entropy: number, max: number): 'low' | 'medium' | 'high' {
  const ratio = entropy / max;
  if (ratio >= 0.75) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

export const EntropyBar: React.FC<EntropyBarProps> = ({
  entropy,
  entropyMax,
  phaseObjectiveScore,
  currentOutput,
}) => {
  const t = useT();
  const dangerLevel = getEntropyDangerLevel(entropy, entropyMax);
  const entropyPct = Math.min((entropy / entropyMax) * 100, 100);
  const objectivePct = Math.min((currentOutput / phaseObjectiveScore) * 100, 100);

  return (
    <div className="panel entropy-bar-panel">
      <div className="panel-title">{t('ui.infinite_mode')}</div>

      {/* Entropy display */}
      <div className={`entropy-row entropy-danger-${dangerLevel}`}>
        <span className="stat-label">{t('ui.entropy')}</span>
        <span className="stat-value">
          {entropy} / {entropyMax}
        </span>
        <span className={`entropy-danger-badge entropy-danger-${dangerLevel}`}>
          {dangerLevel === 'high' && t('ui.entropy_danger_high')}
          {dangerLevel === 'medium' && t('ui.entropy_danger_medium')}
          {dangerLevel === 'low' && t('ui.entropy_danger_low')}
        </span>
      </div>
      <div className="progress-bar-container entropy-progress">
        <div
          className={`progress-bar entropy-bar entropy-bar-${dangerLevel}`}
          style={{ width: `${entropyPct}%` }}
        />
      </div>

      {/* Phase objective display */}
      <div className="entropy-row">
        <span className="stat-label">{t('ui.phase_objective')}</span>
        <span className="stat-value">
          {t('ui.phase_objective_score', { score: phaseObjectiveScore })}
        </span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar objective-bar" style={{ width: `${objectivePct}%` }} />
        <span className="progress-label">{Math.floor(objectivePct)}%</span>
      </div>
    </div>
  );
};
