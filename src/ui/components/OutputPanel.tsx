import React from 'react';
import { ReactionLogEntry } from '../../core/types';
import { useT } from '../../i18n';

interface OutputPanelProps {
  lastEntry: ReactionLogEntry | null;
}

/** Map internal multiplier names to translation keys */
function multLabelKey(name: string): string {
  const lc = name.toLowerCase();
  if (lc.includes('chain'))     return 'ui.chain';
  if (lc.includes('corner') || lc.includes('highest') || lc.includes('condition')) return 'ui.condition';
  if (lc.includes('catalyst'))  return 'ui.catalyst_bonus';
  if (lc.includes('synergy'))   return 'ui.synergy_bonus';
  if (lc.includes('momentum'))  return 'ui.momentum_bonus';
  return name; // fallback: show as-is
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ lastEntry }) => {
  const t = useT();

  if (!lastEntry || lastEntry.base === 0) {
    return (
      <div className="panel output-panel">
        <div className="panel-title">{t('ui.output_breakdown')}</div>
        <div className="empty-state">{t('ui.no_output')}</div>
      </div>
    );
  }

  return (
    <div className="panel output-panel">
      <div className="panel-title">{t('ui.output_breakdown')}</div>
      <div className="output-row">
        <span>{t('ui.base')}</span>
        <span className="output-value">{lastEntry.base}</span>
      </div>
      {lastEntry.multipliers.map((m, i) => {
        const labelKey = multLabelKey(m.name);
        const label = t(labelKey) !== labelKey ? t(labelKey) : m.name;
        return (
          <div key={i} className="output-row">
            <span>{label}</span>
            <span className="output-value multiplier">×{m.value.toFixed(2)}</span>
          </div>
        );
      })}
      {/* Show synergy / momentum inline if not already in multipliers */}
      {lastEntry.synergyMultiplier > 1.0 && !lastEntry.multipliers.find(m => m.name.toLowerCase().includes('synergy')) && (
        <div className="output-row">
          <span>⚡ {t('ui.synergy_bonus')}</span>
          <span className="output-value multiplier synergy-mult">×{lastEntry.synergyMultiplier.toFixed(2)}</span>
        </div>
      )}
      {lastEntry.momentumMultiplier > 1.0 && !lastEntry.multipliers.find(m => m.name.toLowerCase().includes('momentum')) && (
        <div className="output-row">
          <span>🔥 {t('ui.momentum_bonus')}</span>
          <span className="output-value multiplier momentum-mult">×{lastEntry.momentumMultiplier.toFixed(2)}</span>
        </div>
      )}
      <div className="output-row total">
        <span>{t('ui.final_output')}</span>
        <span className="output-value">{lastEntry.finalOutput}</span>
      </div>
      {lastEntry.triggeredCatalysts.length > 0 && (
        <div className="output-triggered">
          <span className="output-triggered-label">{t('ui.triggered_catalysts')}</span>
          {lastEntry.triggeredCatalysts.map(id => (
            <span key={id} className="catalyst-tag">{t(`catalyst.${id}.name`)}</span>
          ))}
        </div>
      )}
      {lastEntry.signalUsed && (
        <div className="output-signal">
          🔮 {t(`signal.${lastEntry.signalUsed}.name`)}
          {lastEntry.signalEffect && <span className="output-signal-effect"> — {lastEntry.signalEffect}</span>}
        </div>
      )}
    </div>
  );
};
