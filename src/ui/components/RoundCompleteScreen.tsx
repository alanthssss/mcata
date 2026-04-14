import React from 'react';
import { formatScore } from '../scoreDisplay';
import { useT } from '../../i18n';

interface RoundCompleteScreenProps {
  roundNumber: number;
  totalOutput: number;
  onContinue: () => void;
  onQuit: () => void;
}

export const RoundCompleteScreen: React.FC<RoundCompleteScreenProps> = ({
  roundNumber,
  totalOutput,
  onContinue,
  onQuit,
}) => {
  const t = useT();

  return (
    <div className="screen end-screen">
      <h1 className="end-title end-title--victory">
        {t('ui.round_complete_title', { round: String(roundNumber) })}
      </h1>
      <p className="end-subtitle">{t('ui.round_complete_subtitle')}</p>

      <div className="end-stats">
        <div className="end-stat">
          <span className="end-stat__label">{t('ui.total_output')}</span>
          <span className="end-stat__value">{formatScore(totalOutput)}</span>
        </div>
        <div className="end-stat">
          <span className="end-stat__label">{t('ui.round_number', { round: String(roundNumber) })}</span>
          <span className="end-stat__value">✓</span>
        </div>
      </div>

      <div className="end-actions">
        <button className="start-btn" onClick={onContinue}>
          {t('ui.continue_run')}
        </button>
        <button className="help-btn" onClick={onQuit}>
          {t('ui.new_run')}
        </button>
      </div>
    </div>
  );
};
