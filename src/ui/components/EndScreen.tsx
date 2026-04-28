import React from 'react';
import { useT } from '../../i18n';
import { formatScore } from '../scoreDisplay';
import { LocaleSwitcher } from './LocaleSwitcher';
import { hasRunLogs } from '../../store/runLogStore';
import { downloadRunLogs, downloadRunLogsCsv } from '../../scripts/exportRunLogs';

interface EndScreenProps {
  isVictory: boolean;
  totalOutput: number;
  onRestart: () => void;
  failReason?: string | null;
}

export function createEndScreenRunLogExportControls(canExport: boolean): {
  disabled: boolean;
  exportJson: () => void;
  exportCsv: () => void;
} {
  return {
    disabled: !canExport,
    exportJson: () => {
      if (!canExport) return;
      downloadRunLogs(undefined, { scope: 'current' });
    },
    exportCsv: () => {
      if (!canExport) return;
      downloadRunLogsCsv(undefined, { scope: 'current' });
    },
  };
}

export const EndScreen: React.FC<EndScreenProps> = ({ isVictory, totalOutput, onRestart, failReason }) => {
  const t = useT();
  const canExport = hasRunLogs();
  const controls = createEndScreenRunLogExportControls(canExport);
  const exportTitle = canExport ? t('ui.export_run_tooltip') : t('ui.export_run_disabled');

  const defeatSubtitle = failReason === 'entropy_overflow'
    ? t('ui.defeat_subtitle_entropy')
    : t('ui.defeat_subtitle');

  return (
    <div className="screen end-screen">
      <div className="screen-locale-switcher"><LocaleSwitcher /></div>
      <h1 className={`end-title ${isVictory ? 'victory' : 'defeat'}`}>
        {isVictory ? t('ui.victory_title') : t('ui.defeat_title')}
      </h1>
      <p className="end-subtitle">
        {isVictory ? t('ui.victory_subtitle') : defeatSubtitle}
      </p>
      {failReason && !isVictory && (
        <p className="end-fail-reason">
          {t(`ui.fail_reason_${failReason}`) || t('ui.fail_reason_unknown')}
        </p>
      )}
      <div className="end-stats">
        <div className="stat-block">
          <div className="stat-label">{t('ui.total_output')}</div>
          <div className="stat-big">{formatScore(totalOutput)}</div>
        </div>
      </div>
      <button className="start-btn" onClick={onRestart}>{t('ui.new_run')}</button>
      <div className="debug-export-row">
          <button
            className="debug-export-btn"
            title={exportTitle}
            disabled={controls.disabled}
            onClick={controls.exportJson}
          >
            {t('ui.export_run_json')}
          </button>
          <button
            className="debug-export-btn"
            title={exportTitle}
            disabled={controls.disabled}
            onClick={controls.exportCsv}
          >
            {t('ui.export_run_csv')}
          </button>
      </div>
    </div>
  );
};
