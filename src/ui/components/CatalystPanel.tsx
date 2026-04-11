import React from 'react';
import { CatalystId, Position } from '../../core/types';
import { CATALYST_DEFS } from '../../core/catalysts';

interface CatalystPanelProps {
  activeCatalysts: CatalystId[];
  frozenCell: Position | null;
}

export const CatalystPanel: React.FC<CatalystPanelProps> = ({ activeCatalysts, frozenCell }) => {
  return (
    <div className="panel catalyst-panel">
      <div className="panel-title">Active Catalysts ({activeCatalysts.length}/3)</div>
      {activeCatalysts.length === 0 ? (
        <div className="empty-state">No catalysts active</div>
      ) : (
        <div className="catalyst-list">
          {activeCatalysts.map(id => {
            const def = CATALYST_DEFS[id];
            return (
              <div key={id} className="catalyst-item">
                <div className="catalyst-name">{def.name}</div>
                <div className="catalyst-desc">{def.description}</div>
                {id === 'frozen_cell' && frozenCell && (
                  <div className="catalyst-extra">
                    Frozen: ({frozenCell.row},{frozenCell.col})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
