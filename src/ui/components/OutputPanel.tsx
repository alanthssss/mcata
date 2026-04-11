import React from 'react';
import { ReactionLogEntry } from '../../core/types';

interface OutputPanelProps {
  lastEntry: ReactionLogEntry | null;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ lastEntry }) => {
  if (!lastEntry || lastEntry.base === 0) {
    return (
      <div className="panel output-panel">
        <div className="panel-title">Output Breakdown</div>
        <div className="empty-state">No output yet</div>
      </div>
    );
  }

  return (
    <div className="panel output-panel">
      <div className="panel-title">Last Move Breakdown</div>
      <div className="output-row">
        <span>Base</span>
        <span className="output-value">{lastEntry.base}</span>
      </div>
      {lastEntry.multipliers.map((m, i) => (
        <div key={i} className="output-row">
          <span>{m.name}</span>
          <span className="output-value multiplier">x{m.value.toFixed(2)}</span>
        </div>
      ))}
      <div className="output-row total">
        <span>Final Output</span>
        <span className="output-value">{lastEntry.finalOutput}</span>
      </div>
      {lastEntry.triggeredCatalysts.length > 0 && (
        <div className="output-catalysts">
          {lastEntry.triggeredCatalysts.map(id => (
            <span key={id} className="catalyst-tag">{id.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )}
    </div>
  );
};
