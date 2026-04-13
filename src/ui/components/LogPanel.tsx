import React from 'react';
import { ReactionLogEntry, Direction } from '../../core/types';
import { SIGNAL_DEFS } from '../../core/signals';

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
  return (
    <div className="panel log-panel">
      <div className="panel-title">Reaction Log</div>
      {log.length === 0 ? (
        <div className="empty-state">No reactions yet</div>
      ) : (
        <div className="log-list">
          {log.map((entry, i) => (
            <div key={i} className="log-entry">
              <span className="log-step">#{entry.step}</span>
              <span className="log-dir">{DIRECTION_ARROW[entry.action]}</span>
              <span className="log-merges">{entry.merges.length} merge(s)</span>
              <span className="log-output">+{entry.finalOutput}</span>
              {entry.synergyMultiplier > 1.0 && (
                <span className="log-synergy">⚡×{entry.synergyMultiplier.toFixed(2)}</span>
              )}
              {entry.momentumMultiplier > 1.0 && (
                <span className="log-momentum">🔥×{entry.momentumMultiplier.toFixed(2)}</span>
              )}
              {entry.signalUsed && (
                <div className="log-signal">🔮 {entry.signalEffect ?? SIGNAL_DEFS[entry.signalUsed].name}</div>
              )}
              {entry.anomalyEffect && (
                <div className="log-anomaly">⚠ {entry.anomalyEffect}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
