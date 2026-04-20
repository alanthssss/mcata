import React, { useState } from 'react';
import { CatalystId, ForgeShopItem, LocalizedText, PatternId, SignalId } from '../../core/types';
import { ALL_SYNERGIES } from '../../core/synergies';
import { Modal } from './Modal';
import { useT } from '../../i18n';

interface ForgeModalProps {
  items: ForgeShopItem[];
  activeCatalysts: CatalystId[];
  activePattern: PatternId | null;
  activePatternLevel: number;
  signals: SignalId[];
  energy: number;
  lastIntermissionMessage: LocalizedText | null;
  onBuy: (item: ForgeShopItem, replaceIndex?: number) => void;
  onSell: (index: number) => void;
  onSellPattern: () => void;
  onSellSignal: (signalId: SignalId) => void;
  onReroll: () => void;
  onSkip: () => void;
}

export function localizeIntermissionMessage(message: LocalizedText, t: ReturnType<typeof useT>): string {
  const params = { ...message.params };
  const localizeIdParam = (key: 'name' | 'from' | 'to') => {
    if (typeof params[key] !== 'string') return;
    const paramValue = params[key] as string;
    if (['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step'].includes(paramValue)) {
      params[key] = t(`signal.${paramValue as SignalId}.name`);
    } else if (['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival'].includes(paramValue)) {
      params[key] = t(`pattern.${paramValue as PatternId}.name`);
    } else {
      params[key] = t(`catalyst.${paramValue as CatalystId}.name`);
    }
  };
  localizeIdParam('name');
  localizeIdParam('from');
  localizeIdParam('to');
  return t(message.key, params);
}

const CATEGORY_ICON: Record<string, string> = {
  amplifier: '🔺',
  stabilizer: '🛡',
  generator: '⚡',
  modifier: '🔀',
  legacy: '⚙',
};

const CATALYST_TAG_BY_CATEGORY: Record<string, 'tag.scoring' | 'tag.energy' | 'tag.control'> = {
  generator: 'tag.energy',
  stabilizer: 'tag.control',
  modifier: 'tag.control',
  amplifier: 'tag.scoring',
  legacy: 'tag.scoring',
};

const SIGNAL_TAG_BY_ID: Record<SignalId, 'tag.scoring' | 'tag.control'> = {
  pulse_boost: 'tag.scoring',
  chain_trigger: 'tag.scoring',
  grid_clean: 'tag.control',
  freeze_step: 'tag.control',
};

const UTILITY_TAG_BY_TYPE: Record<'energy' | 'steps' | 'multiplier', 'tag.scoring' | 'tag.energy' | 'tag.control'> = {
  energy: 'tag.energy',
  steps: 'tag.control',
  multiplier: 'tag.scoring',
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
  items, activeCatalysts, activePattern, activePatternLevel, signals, energy,
  lastIntermissionMessage, onBuy, onSell, onSellPattern, onSellSignal, onReroll, onSkip
}) => {
  const t = useT();
  const [pendingCatalyst, setPendingCatalyst] = useState<ForgeShopItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const getItemTagKey = (item: ForgeShopItem): 'tag.scoring' | 'tag.energy' | 'tag.control' => {
    if (item.type === 'catalyst') {
      return CATALYST_TAG_BY_CATEGORY[item.catalyst.category] ?? 'tag.scoring';
    }
    if (item.type === 'utility') {
      return UTILITY_TAG_BY_TYPE[item.utility];
    }
    if (item.type === 'pattern') return 'tag.control';
    return SIGNAL_TAG_BY_ID[item.signal];
  };

  const getTagClassName = (tagKey: 'tag.scoring' | 'tag.energy' | 'tag.control'): string => {
    if (tagKey === 'tag.scoring') return 'offer-tag offer-tag--simple offer-tag--score';
    if (tagKey === 'tag.energy') return 'offer-tag offer-tag--simple offer-tag--energy';
    return 'offer-tag offer-tag--simple offer-tag--control';
  };

  const handleBuyClick = (item: ForgeShopItem) => {
    setSelectedItemId(item.id);
    if (item.type === 'catalyst' && activeCatalysts.length >= 6) {
      setPendingCatalyst(item);
    } else {
      onBuy(item);
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
      <div className="forge-offers">
        {items.map((item) => {
          const blocked = energy < item.price;
          const selected = selectedItemId === item.id;
          const tagKey = getItemTagKey(item);
          if (item.type !== 'catalyst') {
            const name = item.type === 'pattern'
              ? t(`pattern.${item.pattern}.name`)
              : item.type === 'signal'
                ? t(`signal.${item.signal}.name`)
                : t(`ui.forge_utility_${item.utility}`);
            const desc = item.type === 'pattern'
              ? t(`pattern.${item.pattern}.description`)
              : item.type === 'signal'
              ? t(`signal.${item.signal}.description`)
                : t(`ui.forge_utility_${item.utility}_desc`, { value: item.amount });
            return (
              <div key={item.id} className={`forge-offer common ${selected ? 'forge-offer--selected' : ''}`} title={`${name} — ${desc}`}>
                <div className="offer-name">{name}</div>
                <div className="offer-rarity-row">
                  <span className={getTagClassName(tagKey)}>
                    {t(tagKey)}
                  </span>
                </div>
                <div className="offer-desc">{desc}</div>
                <div className="offer-cost">⚡ {item.price} {t('ui.energy')}</div>
                <button className="offer-btn" disabled={blocked} onClick={() => handleBuyClick(item)}>
                  {blocked ? t('ui.forge_not_enough') : t('ui.forge_buy')}
                </button>
              </div>
            );
          }
          const cat = item.catalyst;
          const synergyPartnerId = getSynergyHint(cat.id, activeCatalysts);
          const alreadyOwned = activeCatalysts.includes(cat.id);
          const buyBlocked = alreadyOwned || blocked;
          const tName = t(`catalyst.${cat.id}.name`);
          const tDesc = t(`catalyst.${cat.id}.description`);
          const hoverTooltip = synergyPartnerId
            ? `${tName} — ${tDesc} (${t('ui.forge_synergy_hint', { partner: t(`catalyst.${synergyPartnerId}.name`) })})`
            : `${tName} — ${tDesc}`;
          return (
              <div key={item.id} className={`forge-offer ${cat.rarity} ${selected ? 'forge-offer--selected' : ''}`} title={hoverTooltip}>
              <div className="offer-name">{tName}</div>
              <div className="offer-rarity-row">
                <span className={getTagClassName(tagKey)}>
                  {CATEGORY_ICON[cat.category]} {t(tagKey)}
                </span>
              </div>
              <div className="offer-desc">{tDesc}</div>
              <div className="offer-cost">⚡ {item.price} {t('ui.energy')}</div>
              <button
                className="offer-btn"
                disabled={buyBlocked}
                  onClick={() => handleBuyClick(item)}
                >
                  {alreadyOwned ? t('ui.forge_owned') : energy < item.price ? t('ui.forge_not_enough') : t('ui.forge_equip')}
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
      {activePattern && (
        <div className="forge-actions">
          <button className="action-btn" onClick={onSellPattern}>
            {t('ui.forge_sell_pattern', { name: t(`pattern.${activePattern}.name`), level: activePatternLevel })}
          </button>
        </div>
      )}
      {signals.length > 0 && (
        <div className="forge-actions">
          {signals.map(signalId => (
            <button key={signalId} className="action-btn" onClick={() => onSellSignal(signalId)}>
              {t('ui.forge_sell_signal', { name: t(`signal.${signalId}.name`) })}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
