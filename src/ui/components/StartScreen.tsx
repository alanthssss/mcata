import React, { useState } from 'react';
import { ProtocolId } from '../../core/types';
import { ALL_PROTOCOLS, DEFAULT_PROTOCOL } from '../../core/protocols';
import { useT } from '../../i18n';
import { HelpOverlay } from './HelpOverlay';
import { CompactDetail } from './CompactDetail';

interface StartScreenProps {
  onStart: (protocol: ProtocolId) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const t = useT();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolId>(DEFAULT_PROTOCOL);
  const [showHelp, setShowHelp] = useState(false);

  const startHints = [
    { label: t('ui.start_hint_goal_label'), detail: t('ui.start_hint_output') },
    { label: t('ui.start_hint_boosts_label'), detail: t('ui.start_hint_catalyst') },
    { label: t('ui.start_hint_forge_label'), detail: t('ui.start_hint_energy') },
    { label: t('ui.start_hint_hazard_label'), detail: t('ui.start_hint_anomaly') },
  ];

  return (
    <div className="screen start-screen">
      <h1 className="game-title">{t('ui.header_title')}</h1>
      <p className="game-subtitle">{t('ui.game_subtitle')}</p>

      <div className="start-hints-grid">
        {startHints.map((hint) => (
          <CompactDetail
            key={hint.label}
            className="start-hint-card"
            summary={<span className="start-hint-label">{hint.label}</span>}
            detail={<span>{hint.detail}</span>}
          />
        ))}
      </div>

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

      <div className="controls-info">
        <strong>{t('ui.controls_label')}:</strong> {t('ui.controls_desc')}
      </div>

      <div className="start-actions">
        <button className="start-btn" onClick={() => onStart(selectedProtocol)}>{t('ui.start_btn')}</button>
        <button className="help-btn" onClick={() => setShowHelp(true)}>{t('ui.help_btn')}</button>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
};
