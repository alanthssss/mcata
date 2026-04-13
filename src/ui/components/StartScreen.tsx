import React, { useState } from 'react';
import { DEFAULT_PROTOCOL } from '../../core/protocols';
import { useT } from '../../i18n';
import { HelpOverlay } from './HelpOverlay';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const t = useT();
  const [showHelp, setShowHelp] = useState(false);
  const protocol = DEFAULT_PROTOCOL;

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

      <div className="start-protocol-info">
        <div className="start-protocol-label">{t('ui.how_it_works')}</div>
        <div className="start-protocol-row">
          <span className="start-protocol-key">{t('ui.protocol_in_effect')}</span>
          <span className="start-protocol-val">{t(`protocol.${protocol}.name`)}</span>
        </div>
        <div className="start-protocol-desc">{t(`protocol.${protocol}.description`)}</div>
      </div>

      <div className="controls-info">
        <strong>{t('ui.controls_label')}:</strong> {t('ui.controls_desc')}
      </div>

      <div className="start-actions">
        <button className="start-btn" onClick={onStart}>{t('ui.start_btn')}</button>
        <button className="help-btn" onClick={() => setShowHelp(true)}>{t('ui.help_btn')}</button>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
};
