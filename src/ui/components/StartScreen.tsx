import React, { useState } from 'react';
import { ProtocolId } from '../../core/types';
import { ALL_PROTOCOLS, DEFAULT_PROTOCOL } from '../../core/protocols';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

interface StartScreenProps {
  onStart: (protocol: ProtocolId) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const t = useT();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolId>(DEFAULT_PROTOCOL);

  return (
    <div className="screen start-screen">
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

      <div className="start-actions">
        <button className="start-btn" onClick={() => onStart(selectedProtocol)}>{t('ui.start_btn')}</button>
      </div>
    </div>
  );
};
