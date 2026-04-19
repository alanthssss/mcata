import React from 'react';
import { CatalystId, Position } from '../../core/types';
import { CATALYST_DEFS } from '../../core/catalysts';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

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
        <>
          <div className="empty-state">{t('ui.no_catalysts')}</div>
          <div className="panel-help">{t('ui.catalyst_help_empty')}</div>
        </>
      ) : (
        <div className="catalyst-list">
          {activeCatalysts.map(id => {
            const def = CATALYST_DEFS[id];
            const tName = t(`catalyst.${id}.name`);
            const tDesc = t(`catalyst.${id}.description`);
            const tagKey = `tag.${def.category}`;
            const triggerLabel = def.trigger.replace('on_', '');
            return (
              <div key={id} className="catalyst-item">
                <CompactDetail
                  summary={(
                    <div className="catalyst-summary">
                      <span className="catalyst-name">{CATEGORY_ICON[def.category] ?? '⚙'} {tName}</span>
                      <span className={`catalyst-tag catalyst-tag--${def.category}`}>{t(tagKey)}</span>
                    </div>
                  )}
                  detail={(
                    <>
                      <div className="compact-detail__line">{tDesc}</div>
                      <div className="compact-detail__line">
                        <span className="catalyst-tag">{def.rarity}</span>
                        <span className="catalyst-tag catalyst-tag--trigger">{triggerLabel}</span>
                      </div>
                      {id === 'frozen_cell' && frozenCell && (
                        <div className="catalyst-extra">
                          {t('ui.frozen_cell_info', { row: frozenCell.row, col: frozenCell.col })}
                        </div>
                      )}
                    </>
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
