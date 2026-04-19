import React from 'react';
import { ProtocolId } from '../../core/types';
import { useT } from '../../i18n';
import { PROTOCOL_DEFS } from '../../core/protocols';
import { CompactDetail } from './CompactDetail';

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
  const stakes = PROTOCOL_DEFS[protocol].stakes;

  return (
    <CompactDetail
      className={`protocol-badge${highlighted ? ' protocol-badge--highlight' : ''}`}
      selected={highlighted}
      summary={(
        <>
          <span className="protocol-badge__icon">{PROTOCOL_ICON[protocol]}</span>
          <span className="protocol-badge__name">{tName}</span>
          <span className={`protocol-card__tag protocol-card__tag--${stakes}`}>{t(`protocol.stakes.${stakes}`)}</span>
        </>
      )}
      detail={<span>{tDesc}</span>}
    />
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
  const stakes = PROTOCOL_DEFS[protocol].stakes;

  return (
    <div className={`panel protocol-panel${highlighted ? ' protocol-panel--highlight' : ''}`}>
      <div className="panel-title">{t('ui.protocol_panel')}</div>
      <CompactDetail
        className="protocol-row"
        selected={highlighted}
        summary={(
          <>
            <span className="protocol-icon">{PROTOCOL_ICON[protocol]}</span>
            <div className="protocol-info">
              <div className="protocol-name">{tName}</div>
              <span className={`protocol-card__tag protocol-card__tag--${stakes}`}>{t(`protocol.stakes.${stakes}`)}</span>
            </div>
          </>
        )}
        detail={(
          <>
            <div className="compact-detail__line">{tDesc}</div>
            <div className="compact-detail__line">{t('ui.protocol_help')}</div>
          </>
        )}
      />
    </div>
  );
};
