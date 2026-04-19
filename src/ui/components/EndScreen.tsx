import React from 'react';
import { useT } from '../../i18n';
import { formatScore } from '../scoreDisplay';
import { LocaleSwitcher } from './LocaleSwitcher';

interface EndScreenProps {
  isVictory: boolean;
  totalOutput: number;
  onRestart: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({ isVictory, totalOutput, onRestart }) => {
  const t = useT();

  return (
    <div className="screen end-screen">
      <div className="screen-locale-switcher"><LocaleSwitcher /></div>
      <h1 className={`end-title ${isVictory ? 'victory' : 'defeat'}`}>
        {isVictory ? t('ui.victory_title') : t('ui.defeat_title')}
      </h1>
      <p className="end-subtitle">
        {isVictory ? t('ui.victory_subtitle') : t('ui.defeat_subtitle')}
      </p>
      <div className="end-stats">
        <div className="stat-block">
          <div className="stat-label">{t('ui.total_output')}</div>
          <div className="stat-big">{formatScore(totalOutput)}</div>
        </div>
      </div>
      <button className="start-btn" onClick={onRestart}>{t('ui.new_round')}</button>
    </div>
  );
};
