import React from 'react';
import { SignalId } from '../../core/types';
import { SIGNAL_DEFS } from '../../core/signals';
import { SIGNAL_CAPACITY } from '../../core/config';
import { useT } from '../../i18n';

interface SignalPanelProps {
  signals: SignalId[];
  pendingSignal: SignalId | null;
  onActivate: (id: SignalId) => void;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signals, pendingSignal, onActivate }) => {
  const t = useT();

  return (
    <div className="panel signal-panel">
      <div className="panel-title">{t('ui.signals', { count: signals.length, max: SIGNAL_CAPACITY })}</div>
      {signals.length === 0 ? (
        <>
          <div className="empty-state">{t('ui.no_signals_equipped')}</div>
          <div className="panel-help">{t('ui.signal_help_empty')}</div>
        </>
      ) : (
        <div className="signal-list">
          {signals.map(id => {
            const def = SIGNAL_DEFS[id];
            const isPending = pendingSignal === id;
            const tName = t(`signal.${id}.name`);
            const tDesc = t(`signal.${id}.description`);
            return (
              <div
                key={id}
                className={`signal-item${isPending ? ' signal-item--pending' : ''}`}
              >
                <div className="signal-info">
                  <div className="signal-name">🔮 {tName}</div>
                  <div className="signal-desc">{tDesc}</div>
                  <div className="signal-desc">
                    {isPending ? t('ui.signal_armed_next_move') : t('ui.signal_ready')}
                  </div>
                </div>
                <button
                  className={`signal-use-btn${isPending ? ' signal-use-btn--active' : ''}`}
                  onClick={() => onActivate(id)}
                  title={isPending ? t('ui.signal_queued_tooltip', { name: tName }) : tDesc}
                >
                  {isPending ? t('ui.signal_armed') : t('ui.signal_use')}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {pendingSignal && (
        <div className="signal-pending">
          🔮 {t('ui.signal_queued', { name: t(`signal.${pendingSignal}.name`) })}
        </div>
      )}
    </div>
  );
};
