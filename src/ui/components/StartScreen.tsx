import React, { useState } from 'react';
import { ProtocolId } from '../../core/types';
import { ALL_PROTOCOLS, DEFAULT_PROTOCOL } from '../../core/protocols';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';
import { LocaleSwitcher } from './LocaleSwitcher';
import { hasRunLogs, isDebugExportLogs } from '../../store/runLogStore';
import { downloadRunLogs, downloadRunLogsCsv, downloadRunSummaryCsv } from '../../scripts/exportRunLogs';

interface StartScreenProps {
  onStart: (protocol: ProtocolId, infiniteMode: boolean) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const t = useT();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolId>(DEFAULT_PROTOCOL);
  const [infiniteMode, setInfiniteMode] = useState(false);
  const showExport = isDebugExportLogs();
  const canExport = hasRunLogs();

  return (
    <div className="screen start-screen">
      <div className="screen-locale-switcher"><LocaleSwitcher /></div>
      <h1 className="game-title">{t('ui.header_title')}</h1>

      <div className="protocol-select-section">
        <div className="protocol-select-label">{t('ui.select_protocol')}</div>
        <div className="protocol-select-grid">
          {ALL_PROTOCOLS.map(protocol => (
            <CompactDetail
              key={protocol.id}
              className={`protocol-card ${selectedProtocol === protocol.id ? 'protocol-card--selected' : ''}`}
              selected={selectedProtocol === protocol.id}
              onSummaryClick={() => setSelectedProtocol(protocol.id)}
              summary={
                <>
                  <span className="protocol-card__icon">{protocol.icon}</span>
                  <span className="protocol-card__name">{t(`protocol.${protocol.id}.name`)}</span>
                  <span className={`protocol-card__tag protocol-card__tag--${protocol.stakes}`}>
                    {t(`protocol.stakes.${protocol.stakes}`)}
                  </span>
                </>
              }
              detail={<span>{t(`protocol.${protocol.id}.description`)}</span>}
            />
          ))}
        </div>
      </div>

      {/* ── Mode Selection ─────────────────────────────────────────────────── */}
      <div className="mode-select-section">
        <div className="protocol-select-label">{t('ui.select_mode')}</div>
        <div className="mode-select-grid">
          <button
            className={`mode-card ${!infiniteMode ? 'mode-card--selected' : ''}`}
            onClick={() => setInfiniteMode(false)}
          >
            <span className="mode-card__icon">🎯</span>
            <span className="mode-card__name">{t('ui.mode_standard')}</span>
            <span className="mode-card__desc">{t('ui.mode_standard_desc')}</span>
          </button>
          <button
            className={`mode-card mode-card--infinite ${infiniteMode ? 'mode-card--selected mode-card--infinite-selected' : ''}`}
            onClick={() => setInfiniteMode(true)}
          >
            <span className="mode-card__icon">∞</span>
            <span className="mode-card__name">{t('ui.mode_infinite')}</span>
            <span className="mode-card__desc">{t('ui.mode_infinite_desc')}</span>
          </button>
        </div>
        {infiniteMode && (
          <div className="mode-infinite-hint">
            {t('ui.mode_infinite_hint')}
          </div>
        )}
      </div>

      <div className="start-actions">
        <button className="start-btn" onClick={() => onStart(selectedProtocol, infiniteMode)}>
          {t('ui.start_btn')}
        </button>
      </div>

      {showExport && (
        <div className="debug-export-row">
          <button
            className="debug-export-btn"
            title={canExport ? t('ui.export_run_tooltip') : t('ui.export_run_disabled')}
            disabled={!canExport}
            onClick={() => downloadRunLogs('mcata_run_logs_bundle.json', { scope: 'all' })}
          >
            {t('ui.export_all_runs_json')}
          </button>
          <button
            className="debug-export-btn"
            title={canExport ? t('ui.export_run_tooltip') : t('ui.export_run_disabled')}
            disabled={!canExport}
            onClick={() => downloadRunLogsCsv('mcata_run_logs_steps.csv', { scope: 'all' })}
          >
            {t('ui.export_all_runs_csv')}
          </button>
          <button
            className="debug-export-btn"
            title={canExport ? t('ui.export_run_tooltip') : t('ui.export_run_disabled')}
            disabled={!canExport}
            onClick={() => downloadRunSummaryCsv('mcata_run_logs_summary.csv', { scope: 'all' })}
          >
            {t('ui.export_all_runs_summary_csv')}
          </button>
        </div>
      )}
    </div>
  );
};
