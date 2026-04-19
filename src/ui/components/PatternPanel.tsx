import React from 'react';
import { PatternId } from '../../core/types';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

interface PatternPanelProps {
  activePattern: PatternId | null;
  level: number;
}

export const PatternPanel: React.FC<PatternPanelProps> = ({ activePattern, level }) => {
  const t = useT();

  return (
    <div className="panel pattern-panel">
      <div className="panel-title">{t('ui.pattern_title')}</div>
      {!activePattern || level <= 0 ? (
        <>
          <div className="empty-state">{t('ui.pattern_none')}</div>
          <CompactDetail
            className="pattern-help-detail"
            summary={<span className="pattern-meta">{t('ui.pattern_how_to_get')}</span>}
            detail={<span>{t('ui.pattern_help_empty')}</span>}
          />
        </>
      ) : (
        <CompactDetail
          summary={<div className="pattern-name">🧭 {t(`pattern.${activePattern}.name`)}</div>}
          detail={(
            <>
              <div className="compact-detail__line">{t('ui.pattern_level', { level })}</div>
              <div className="compact-detail__line">{t(`pattern.${activePattern}.description`)}</div>
            </>
          )}
        />
      )}
    </div>
  );
};
