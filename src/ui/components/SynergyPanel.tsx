import React from 'react';
import { CatalystId, SynergyId } from '../../core/types';
import { SYNERGY_DEFS, getActiveSynergies } from '../../core/synergies';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

interface SynergyPanelProps {
  activeCatalysts: CatalystId[];
  lastTriggeredSynergies?: SynergyId[];
}

/** Derive a lightweight build-identity label from active catalysts */
function getBuildIdentityKey(activeCatalysts: CatalystId[]): string | null {
  const cats = new Set(activeCatalysts);
  const cornerCats = ['corner_crown', 'gravity_well', 'empty_amplifier'] as const;
  const chainCats  = ['chain_reactor', 'combo_wire', 'echo_multiplier'] as const;
  const genCats    = ['double_spawn', 'rich_merge', 'energy_loop', 'reserve_bank'] as const;

  const cornerCount = cornerCats.filter(c => cats.has(c)).length;
  const chainCount  = chainCats.filter(c => cats.has(c)).length;
  const genCount    = genCats.filter(c => cats.has(c)).length;

  if (cornerCount >= 2) return 'ui.build_corner';
  if (chainCount >= 2)  return 'ui.build_chain';
  if (genCount >= 2)    return 'ui.build_economy';
  if (cornerCount >= 1 && chainCount >= 1) return 'ui.build_hybrid';
  return null;
}

export const SynergyPanel: React.FC<SynergyPanelProps> = ({
  activeCatalysts,
  lastTriggeredSynergies = [],
}) => {
  const t = useT();
  const activeSynergies = getActiveSynergies(activeCatalysts);
  const buildIdentityKey = getBuildIdentityKey(activeCatalysts);

  return (
    <div className="panel synergy-panel">
      <div className="panel-title">
        {t('ui.synergies')}
        {buildIdentityKey && (
          <span className="build-identity-badge">{t(buildIdentityKey)}</span>
        )}
      </div>

      {activeSynergies.length === 0 ? (
        <>
          <div className="empty-state">{t('ui.no_synergies')}</div>
          <div className="panel-help">{t('ui.synergy_help_empty')}</div>
        </>
      ) : (
        <div className="synergy-list">
          {activeSynergies.map(id => {
            const def = SYNERGY_DEFS[id];
            const tName = t(`synergy.${id}.name`);
            const tDesc = t(`synergy.${id}.description`);
            const wasTriggered = lastTriggeredSynergies.includes(id);
            const [c1, c2] = def.catalysts;
            const c1Name = t(`catalyst.${c1}.name`);
            const c2Name = t(`catalyst.${c2}.name`);
            return (
              <div
                key={id}
                className={`synergy-item${wasTriggered ? ' synergy-item--triggered' : ''}`}
              >
                <CompactDetail
                  selected={wasTriggered}
                  summary={(
                    <div className="synergy-header">
                      <span className="synergy-name">⚡ {tName}</span>
                      <span className="synergy-tag">×{def.multiplier.toFixed(2)}</span>
                    </div>
                  )}
                  detail={(
                    <>
                      <div className="compact-detail__line">{tDesc}</div>
                      <div className="synergy-catalysts">
                        {c1Name} + {c2Name}
                      </div>
                    </>
                  )}
                />
                {wasTriggered && (
                  <div className="synergy-triggered-badge">{t('ui.synergy_triggered')}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lastTriggeredSynergies.length > 0 && activeSynergies.length === 0 && (
        <div className="synergy-last">
          <span className="synergy-last-label">{t('ui.last_triggered')}</span>
          {lastTriggeredSynergies.map(id => (
            <span key={id} className="synergy-tag">{t(`synergy.${id}.name`)}</span>
          ))}
        </div>
      )}
    </div>
  );
};
