import React, { useState } from 'react';
import { CatalystDef, CatalystId, LocalizedText, PatternId, SignalId } from '../../core/types';
import { ALL_SYNERGIES } from '../../core/synergies';
import { Modal } from './Modal';
import { useT } from '../../i18n';

interface ForgeModalProps {
  offers: CatalystDef[];
  activeCatalysts: CatalystId[];
  energy: number;
  lastIntermissionMessage: LocalizedText | null;
  onBuy: (catalyst: CatalystDef, replaceIndex?: number) => void;
  onSell: (index: number) => void;
  onReroll: () => void;
  onSkip: () => void;
}

export function localizeIntermissionMessage(message: LocalizedText, t: ReturnType<typeof useT>): string {
  const params = { ...message.params };
  if (typeof params.name === 'string') {
    const name = params.name as string;
    if (['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step'].includes(name)) {
      params.name = t(`signal.${name as SignalId}.name`);
    } else if (['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival'].includes(name)) {
      params.name = t(`pattern.${name as PatternId}.name`);
    } else {
      params.name = t(`catalyst.${name as CatalystId}.name`);
    }
  }
  return t(message.key, params);
}

const CATEGORY_ICON: Record<string, string> = {
  amplifier: '🔺',
  stabilizer: '🛡',
  generator: '⚡',
  modifier: '🔀',
  legacy: '⚙',
};

/** Return the synergy partner name if equipping this catalyst would activate a synergy */
function getSynergyHint(catalystId: CatalystId, activeCatalysts: CatalystId[]): CatalystId | null {
  for (const synergy of ALL_SYNERGIES) {
    const [c1, c2] = synergy.catalysts;
    if (c1 === catalystId && activeCatalysts.includes(c2)) return c2;
    if (c2 === catalystId && activeCatalysts.includes(c1)) return c1;
  }
  return null;
}

export const ForgeModal: React.FC<ForgeModalProps> = ({
  offers, activeCatalysts, energy, lastIntermissionMessage, onBuy, onSell, onReroll, onSkip
}) => {
  const t = useT();
  const [pendingCatalyst, setPendingCatalyst] = useState<CatalystDef | null>(null);

  const handleBuyClick = (catalyst: CatalystDef) => {
    if (activeCatalysts.length >= 6) {
      setPendingCatalyst(catalyst);
    } else {
      onBuy(catalyst);
    }
  };

  const handleReplace = (idx: number) => {
    if (pendingCatalyst) {
      onBuy(pendingCatalyst, idx);
      setPendingCatalyst(null);
    }
  };

  return (
    <Modal title={t('ui.forge_title')}>
      <p className="modal-subtitle">{t('ui.forge_subtitle')}</p>
      <div className="forge-offers">
        {offers.map((cat, i) => {
          const synergyPartnerId = getSynergyHint(cat.id, activeCatalysts);
          const alreadyOwned = activeCatalysts.includes(cat.id);
          const blocked = alreadyOwned || energy < cat.cost;
          const tName = t(`catalyst.${cat.id}.name`);
          const tDesc = t(`catalyst.${cat.id}.description`);
          const tagKey = `tag.${cat.category}`;
          return (
            <div key={i} className={`forge-offer ${cat.rarity}`}>
              <div className="offer-name">{tName}</div>
              <div className="offer-rarity-row">
                <span className="offer-rarity">{cat.rarity}</span>
                <span className={`offer-tag offer-tag--${cat.category}`}>
                  {CATEGORY_ICON[cat.category]} {t(tagKey)}
                </span>
              </div>
              <div className="offer-desc">{tDesc}</div>
              {synergyPartnerId && (
                <div className="offer-synergy-hint">
                  {t('ui.forge_synergy_hint', { partner: t(`catalyst.${synergyPartnerId}.name`) })}
                </div>
              )}
              <div className="offer-cost">⚡ {cat.cost} {t('ui.energy')}</div>
              <button
                className="offer-btn"
                disabled={blocked}
                onClick={() => handleBuyClick(cat)}
              >
                {alreadyOwned ? t('ui.forge_owned') : energy < cat.cost ? t('ui.forge_not_enough') : t('ui.forge_equip')}
              </button>
            </div>
          );
        })}
      </div>
      {lastIntermissionMessage && (
        <div className="signal-pending">{localizeIntermissionMessage(lastIntermissionMessage, t)}</div>
      )}

      {pendingCatalyst && (
        <div className="replace-prompt">
          <p>{t('ui.forge_slots_full')}</p>
          {activeCatalysts.map((id, idx) => (
            <button key={idx} className="replace-btn" onClick={() => handleReplace(idx)}>
              {t('ui.forge_replace', { name: t(`catalyst.${id}.name`) })}
            </button>
          ))}
          <button className="cancel-btn" onClick={() => setPendingCatalyst(null)}>{t('ui.forge_cancel')}</button>
        </div>
      )}

      <div className="forge-actions">
        <button
          className="action-btn reroll-btn"
          disabled={energy < 1}
          onClick={onReroll}
        >
          {t('ui.forge_reroll')}
        </button>
        <button className="action-btn skip-btn" onClick={onSkip}>
          {t('ui.forge_skip')}
        </button>
      </div>

      <div className="active-catalysts-forge">
        <div className="forge-section-title">{t('ui.forge_active_catalysts')}</div>
        {activeCatalysts.length === 0
          ? <span className="empty-state">{t('ui.forge_none')}</span>
          : activeCatalysts.map(id => (
            <span key={id} className="catalyst-tag">
              {t(`catalyst.${id}.name`)}
            </span>
          ))
        }
      </div>
      {activeCatalysts.length > 0 && (
        <div className="forge-actions">
          {activeCatalysts.map((id, idx) => (
            <button key={`${id}-${idx}`} className="action-btn" onClick={() => onSell(idx)}>
              {t('ui.forge_sell', { name: t(`catalyst.${id}.name`) })}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
