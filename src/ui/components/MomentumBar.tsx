import React from 'react';
import { MOMENTUM_CONFIG } from '../../core/config';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

interface MomentumBarProps {
  momentumMultiplier: number;
  consecutiveValidMoves: number;
}

export const MomentumBar: React.FC<MomentumBarProps> = ({
  momentumMultiplier,
  consecutiveValidMoves,
}) => {
  const t = useT();
  const { maxMultiplier } = MOMENTUM_CONFIG;
  const pct = Math.min(((momentumMultiplier - 1.0) / (maxMultiplier - 1.0)) * 100, 100);
  const isMax = momentumMultiplier >= maxMultiplier;
  const isActive = momentumMultiplier > 1.0;

  return (
    <div className={`panel momentum-panel${isActive ? ' momentum-panel--active' : ''}`}>
      <div className="panel-title">{t('ui.momentum_panel')}</div>
      <div className="momentum-row">
        <div className="momentum-bar-wrap">
          <div
            className={`momentum-bar${isMax ? ' momentum-bar--max' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`momentum-mult${isMax ? ' momentum-mult--max' : ''}`}>
          ×{momentumMultiplier.toFixed(2)}
          {isMax && <span className="momentum-max-label">{t('ui.momentum_max')}</span>}
        </span>
      </div>
      <CompactDetail
        className="momentum-detail"
        summary={<span className="momentum-meta">{t('ui.momentum_streak')}: {consecutiveValidMoves}</span>}
        detail={<span>{t('ui.momentum_help_empty')}</span>}
      />
    </div>
  );
};
