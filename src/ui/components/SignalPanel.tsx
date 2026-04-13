import React from 'react';
import { SignalId } from '../../core/types';
import { SIGNAL_DEFS } from '../../core/signals';

interface SignalPanelProps {
  signals: SignalId[];
  pendingSignal: SignalId | null;
  onActivate: (id: SignalId) => void;
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signals, pendingSignal, onActivate }) => {
  if (signals.length === 0) return null;

  return (
    <div className="panel signal-panel">
      <div className="panel-title">Signals ({signals.length}/2)</div>
      <div className="signal-list">
        {signals.map(id => {
          const def = SIGNAL_DEFS[id];
          const isPending = pendingSignal === id;
          return (
            <button
              key={id}
              className={`signal-btn${isPending ? ' signal-btn--active' : ''}`}
              onClick={() => onActivate(id)}
              title={def.description}
            >
              🔮 {def.name}
            </button>
          );
        })}
      </div>
      {pendingSignal && (
        <div className="signal-pending">
          Queued: {SIGNAL_DEFS[pendingSignal].name} — activates on next move
        </div>
      )}
    </div>
  );
};
