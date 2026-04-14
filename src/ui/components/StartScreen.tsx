import React, { useState } from 'react';
import { ProtocolId } from '../../core/types';
import { ALL_PROTOCOLS, DEFAULT_PROTOCOL } from '../../core/protocols';
import { useT } from '../../i18n';
import { HelpOverlay } from './HelpOverlay';

interface StartScreenProps {
  onStart: (protocol: ProtocolId) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const t = useT();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolId>(DEFAULT_PROTOCOL);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="screen start-screen">
      <h1 className="game-title">{t('ui.header_title')}</h1>
      <p className="game-subtitle">{t('ui.game_subtitle')}</p>

      <div className="start-info">
        <p>{t('ui.start_hint_output')}</p>
        <p>{t('ui.start_hint_catalyst')}</p>
        <p>{t('ui.start_hint_energy')}</p>
        <p>{t('ui.start_hint_anomaly')}</p>
      </div>

      <div className="protocol-select-section">
        <div className="protocol-select-label">{t('ui.select_protocol')}</div>
        <div className="protocol-select-grid">
          {ALL_PROTOCOLS.map(protocol => (
            <button
              key={protocol.id}
              className={`protocol-card ${selectedProtocol === protocol.id ? 'protocol-card--selected' : ''}`}
              onClick={() => setSelectedProtocol(protocol.id)}
              aria-pressed={selectedProtocol === protocol.id}
            >
              <span className="protocol-card__icon">{protocol.icon}</span>
              <span className="protocol-card__name">{t(`protocol.${protocol.id}.name`)}</span>
              <span className="protocol-card__desc">{t(`protocol.${protocol.id}.description`)}</span>
              <span className={`protocol-card__tag protocol-card__tag--${protocol.difficulty}`}>
                {t(`protocol.difficulty.${protocol.difficulty}`)}
              </span>
            </button>
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
