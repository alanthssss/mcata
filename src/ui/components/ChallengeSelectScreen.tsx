import React from 'react';
import { ChallengeId, ALL_CHALLENGES } from '../../core/challenges';
import { useT } from '../../i18n';

interface ChallengeSelectScreenProps {
  onSelect: (challengeId: ChallengeId) => void;
  onBack: () => void;
}

export const ChallengeSelectScreen: React.FC<ChallengeSelectScreenProps> = ({ onSelect, onBack }) => {
  const t = useT();

  return (
    <div className="screen start-screen">
      <h1 className="game-title">{t('ui.challenge_select_title')}</h1>
      <p className="game-subtitle">{t('ui.challenge_select_subtitle')}</p>

      <div className="challenge-grid">
        {ALL_CHALLENGES.map(challenge => (
          <button
            key={challenge.id}
            className="challenge-card"
            onClick={() => onSelect(challenge.id)}
          >
            <div className="challenge-card__name">{t(`challenge.${challenge.id}.name`)}</div>
            <div className="challenge-card__desc">{t(`challenge.${challenge.id}.description`)}</div>
            <ul className="challenge-card__rules">
              {challenge.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
            <div className="challenge-card__win">{t('ui.challenge_win')}: {t(`challenge.${challenge.id}.win_condition`)}</div>
          </button>
        ))}
      </div>

      <button className="help-btn" onClick={onBack}>{t('ui.back')}</button>
    </div>
  );
};
