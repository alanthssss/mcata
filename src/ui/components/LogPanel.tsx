import React from 'react';
import { PatternId, ReactionLogEntry, Direction, SignalId } from '../../core/types';
import { useT } from '../../i18n';
import { formatScore } from '../scoreDisplay';

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
  const resolveLocalized = (key: string, params?: Record<string, string | number>) => {
    if (!params) return t(key);
    const resolved = { ...params };
    if (typeof resolved.name === 'string') {
      const name = resolved.name;
      if (['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step'].includes(name)) {
        resolved.name = t(`signal.${name as SignalId}.name`);
      } else if (['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival'].includes(name)) {
        resolved.name = t(`pattern.${name as PatternId}.name`);
      } else {
        resolved.name = t(`catalyst.${name}.name`);
      }
    }
    return t(key, resolved);
  };

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
                <span className="log-output">+{formatScore(entry.finalOutput)}</span>
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
                  {entry.signalEffect ? ` — ${resolveLocalized(entry.signalEffect.key, entry.signalEffect.params)}` : ''}
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
