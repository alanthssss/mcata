import React from 'react';
import { ProtocolId } from '../../core/types';
import { useT } from '../../i18n';

interface ProtocolBadgeProps {
  protocol: ProtocolId;
  highlighted?: boolean;
}

const PROTOCOL_ICON: Record<ProtocolId, string> = {
  corner_protocol:   '📐',
  sparse_protocol:   '🌑',
  overload_protocol: '⚡',
};

export const ProtocolBadge: React.FC<ProtocolBadgeProps> = ({ protocol, highlighted = false }) => {
  const t = useT();
  const tName = t(`protocol.${protocol}.name`);
  const tDesc = t(`protocol.${protocol}.description`);

  return (
    <div className={`protocol-badge${highlighted ? ' protocol-badge--highlight' : ''}`} title={tDesc}>
      <span className="protocol-badge__icon">{PROTOCOL_ICON[protocol]}</span>
      <span className="protocol-badge__name">{tName}</span>
    </div>
  );
};

/** Expanded panel version shown in the left column */
export const ProtocolPanel: React.FC<{ protocol: ProtocolId; highlighted?: boolean }> = ({
  protocol,
  highlighted = false,
}) => {
  const t = useT();
  const tName = t(`protocol.${protocol}.name`);
  const tDesc = t(`protocol.${protocol}.description`);

  return (
    <div className={`panel protocol-panel${highlighted ? ' protocol-panel--highlight' : ''}`}>
      <div className="panel-title">{t('ui.protocol_panel')}</div>
      <div className="protocol-row">
        <span className="protocol-icon">{PROTOCOL_ICON[protocol]}</span>
        <div className="protocol-info">
          <div className="protocol-name">{tName}</div>
          <div className="protocol-desc">{tDesc}</div>
        </div>
      </div>
    </div>
  );
};
