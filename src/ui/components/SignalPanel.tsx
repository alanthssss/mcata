import React from 'react';
import { SignalId } from '../../core/types';
import { SIGNAL_CAPACITY } from '../../core/config';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

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
        <div className="empty-state">{t('ui.no_signals_equipped')}</div>
      ) : (
        <div className="signal-list">
          {signals.map(id => {
            const isPending = pendingSignal === id;
            const tName = t(`signal.${id}.name`);
            const tDesc = t(`signal.${id}.description`);
            return (
              <div
                key={id}
                className={`signal-item${isPending ? ' signal-item--pending' : ''}`}
              >
                <CompactDetail
                  className="signal-info"
                  selected={isPending}
                  summary={<div className="signal-name">🔮 {tName}</div>}
                  detail={(
                    <>
                      <div className="compact-detail__line">{tDesc}</div>
                      <div className="compact-detail__line">
                        {isPending ? t('ui.signal_armed_next_move') : t('ui.signal_ready')}
                      </div>
                    </>
                  )}
                />
                <button
                  className={`signal-use-btn${isPending ? ' signal-use-btn--active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onActivate(id);
                  }}
                  title={isPending ? t('ui.signal_queued_tooltip', { name: tName }) : t('ui.signal_use')}
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
