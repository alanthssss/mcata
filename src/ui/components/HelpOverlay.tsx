import React from 'react';
import { useT } from '../../i18n';

interface HelpOverlayProps {
  onClose: () => void;
}

interface HelpEntry {
  titleKey: string;
  descKey: string;
}

const HELP_ENTRIES: HelpEntry[] = [
  { titleKey: 'ui.help_catalyst_title', descKey: 'ui.help_catalyst_desc' },
  { titleKey: 'ui.help_signal_title',   descKey: 'ui.help_signal_desc' },
  { titleKey: 'ui.help_protocol_title', descKey: 'ui.help_protocol_desc' },
  { titleKey: 'ui.help_anomaly_title',  descKey: 'ui.help_anomaly_desc' },
  { titleKey: 'ui.help_momentum_title', descKey: 'ui.help_momentum_desc' },
  { titleKey: 'ui.help_synergy_title',  descKey: 'ui.help_synergy_desc' },
];

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  const t = useT();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t('ui.help_title')}</h2>
        <div className="help-entries">
          {HELP_ENTRIES.map(({ titleKey, descKey }) => (
            <div key={titleKey} className="help-entry">
              <div className="help-entry-title">{t(titleKey)}</div>
              <div className="help-entry-desc">{t(descKey)}</div>
            </div>
          ))}
        </div>
        <button className="start-btn help-close-btn" onClick={onClose}>
          {t('ui.help_close')}
        </button>
      </div>
    </div>
  );
};
