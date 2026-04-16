import React from 'react';
import { PatternId } from '../../core/types';
import { useT } from '../../i18n';

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
        <div className="empty-state">{t('ui.pattern_none')}</div>
      ) : (
        <>
          <div className="signal-name">🧭 {t(`pattern.${activePattern}.name`)}</div>
          <div className="signal-desc">{t('ui.pattern_level', { level })}</div>
          <div className="signal-desc">{t(`pattern.${activePattern}.description`)}</div>
        </>
      )}
    </div>
  );
};
