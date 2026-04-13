import React from 'react';
import { CatalystId, Position } from '../../core/types';
import { CATALYST_DEFS } from '../../core/catalysts';
import { useT } from '../../i18n';

interface CatalystPanelProps {
  activeCatalysts: CatalystId[];
  frozenCell: Position | null;
}

const CATEGORY_ICON: Record<string, string> = {
  amplifier: '🔺',
  stabilizer: '🛡',
  generator: '⚡',
  modifier: '🔀',
  legacy: '⚙',
};

export const CatalystPanel: React.FC<CatalystPanelProps> = ({ activeCatalysts, frozenCell }) => {
  const t = useT();

  return (
    <div className="panel catalyst-panel">
      <div className="panel-title">{t('ui.active_catalysts', { count: activeCatalysts.length })}</div>
      {activeCatalysts.length === 0 ? (
        <div className="empty-state">{t('ui.no_catalysts')}</div>
      ) : (
        <div className="catalyst-list">
          {activeCatalysts.map(id => {
            const def = CATALYST_DEFS[id];
            const tName = t(`catalyst.${id}.name`);
            const tDesc = t(`catalyst.${id}.description`);
            const tagKey = `tag.${def.category}`;
            return (
              <div key={id} className="catalyst-item">
                <div className="catalyst-name">
                  {CATEGORY_ICON[def.category] ?? '⚙'} {tName}
                  <span className="catalyst-rarity"> [{def.rarity}]</span>
                </div>
                <div className="catalyst-desc">{tDesc}</div>
                <div className="catalyst-tags">
                  <span className={`catalyst-tag catalyst-tag--${def.category}`}>{t(tagKey)}</span>
                  <span className={`catalyst-tag catalyst-tag--trigger`}>{def.trigger.replace('on_', '')}</span>
                </div>
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
