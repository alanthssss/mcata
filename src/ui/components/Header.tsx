import React from 'react';
import { ProtocolId } from '../../core/types';
import { PHASES } from '../../core/phases';
import { useT } from '../../i18n';
import { ProtocolBadge } from './ProtocolBadge';
import { LocaleSwitcher } from './LocaleSwitcher';
import { formatScore, formatScoreCompact } from '../scoreDisplay';

interface HeaderProps {
  phaseIndex: number;
  output: number;
  totalOutput: number;
  stepsRemaining: number;
  energy: number;
  globalMultiplier: number;
  protocol: ProtocolId;
  momentumMultiplier: number;
}

export const Header: React.FC<HeaderProps> = ({
  phaseIndex,
  output,
  totalOutput,
  stepsRemaining,
  energy,
  globalMultiplier,
  protocol,
  momentumMultiplier,
}) => {
  const t = useT();
  const phase = PHASES[phaseIndex];

  return (
    <div className="header">
      <div className="header-left">
        <div className="header-title">{t('ui.header_title')}</div>
        <ProtocolBadge protocol={protocol} />
      </div>
      <div className="header-stats">
        <div className="stat">
          <span className="stat-label">{t('ui.phase')}</span>
          <span className="stat-value">{phase.phaseNumber} / {PHASES.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('ui.output')}</span>
          <span className="stat-value">{formatScoreCompact(output)} / {formatScoreCompact(phase.targetOutput)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('ui.steps')}</span>
          <span className="stat-value">{stepsRemaining}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('ui.energy')}</span>
          <span className="stat-value">⚡ {energy}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t('ui.total')}</span>
          <span className="stat-value">{formatScore(totalOutput)}</span>
        </div>
        {momentumMultiplier > 1.0 && (
          <div className="stat stat--momentum">
            <span className="stat-label">{t('ui.momentum')}</span>
            <span className="stat-value momentum-value">🔥 ×{momentumMultiplier.toFixed(2)}</span>
          </div>
        )}
        {globalMultiplier !== 1.0 && (
          <div className="stat">
            <span className="stat-label">{t('ui.global')}</span>
            <span className="stat-value">×{globalMultiplier.toFixed(1)}</span>
          </div>
        )}
      </div>
      <LocaleSwitcher />
    </div>
  );
};
