import React from 'react';
import { ReactionLogEntry, Direction } from '../../core/types';
import { useT } from '../../i18n';

interface LogPanelProps {
  log: ReactionLogEntry[];
}

const DIRECTION_ARROW: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export const LogPanel: React.FC<LogPanelProps> = ({ log }) => {
  const t = useT();

  return (
    <div className="panel log-panel">
      <div className="panel-title">{t('ui.reaction_log')}</div>
      {log.length === 0 ? (
        <div className="empty-state">{t('ui.no_reactions')}</div>
      ) : (
        <div className="log-list">
          {log.map((entry, i) => (
            <div key={i} className="log-entry">
              <div className="log-main">
                <span className="log-step">#{entry.step}</span>
                <span className="log-dir">{DIRECTION_ARROW[entry.action]}</span>
                <span className="log-merges">{t('ui.merge_count', { n: entry.merges.length })}</span>
                <span className="log-output">+{entry.finalOutput}</span>
                {entry.synergyMultiplier > 1.0 && (
                  <span className="log-synergy" title={t('ui.synergy_bonus')}>
                    ⚡×{entry.synergyMultiplier.toFixed(2)}
                  </span>
                )}
                {entry.momentumMultiplier > 1.0 && (
                  <span className="log-momentum" title={t('ui.momentum_bonus')}>
                    🔥×{entry.momentumMultiplier.toFixed(2)}
                  </span>
                )}
              </div>
              {entry.signalUsed && (
                <div className="log-signal">
                  🔮 {t(`signal.${entry.signalUsed}.name`)}
                  {entry.signalEffect ? ` — ${entry.signalEffect}` : ''}
                </div>
              )}
              {entry.anomalyEffect && (
                <div className="log-anomaly">⚠ {entry.anomalyEffect}</div>
              )}
              {entry.triggeredSynergies.length > 0 && (
                <div className="log-synergy-detail">
                  {entry.triggeredSynergies.map(sid => (
                    <span key={sid} className="log-synergy-tag">
                      ⚡ {t(`synergy.${sid}.name`)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
