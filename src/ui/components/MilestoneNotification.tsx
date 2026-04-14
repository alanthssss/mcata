import React, { useEffect } from 'react';
import { MilestoneId, MILESTONE_DEFS } from '../../core/milestones';
import { useT } from '../../i18n';

interface MilestoneNotificationProps {
  milestoneId: MilestoneId;
  onDismiss: () => void;
  isJackpot?: boolean;
}

export const MilestoneNotification: React.FC<MilestoneNotificationProps> = ({
  milestoneId, onDismiss, isJackpot = false
}) => {
  const t = useT();
  const def = MILESTONE_DEFS[milestoneId];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [milestoneId, onDismiss]);

  return (
    <div className={`milestone-notification ${isJackpot ? 'milestone-notification--jackpot' : ''}`} onClick={onDismiss}>
      <div className="milestone-notification__icon">{isJackpot ? '🎰' : '🏅'}</div>
      <div className="milestone-notification__body">
        <div className="milestone-notification__title">
          {isJackpot ? t('ui.jackpot_title') : t('ui.milestone_reached')}
        </div>
        <div className="milestone-notification__label">{def.label}</div>
        {def.reward.type !== 'none' && (
          <div className="milestone-notification__reward">
            {def.reward.type === 'energy'
              ? t('ui.milestone_reward_energy', { n: String(def.reward.amount) })
              : t('ui.milestone_reward_multiplier', { n: String(Math.round(def.reward.amount * 100)) })}
          </div>
        )}
      </div>
    </div>
  );
};

interface JackpotBannerProps {
  onDismiss: () => void;
}

export const JackpotBanner: React.FC<JackpotBannerProps> = ({ onDismiss }) => {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="jackpot-banner" onClick={onDismiss}>
      <span className="jackpot-banner__icon">🎰</span>
      <span className="jackpot-banner__text">{t('ui.jackpot_title')}</span>
      <span className="jackpot-banner__reward">{t('ui.jackpot_reward')}</span>
    </div>
  );
};
