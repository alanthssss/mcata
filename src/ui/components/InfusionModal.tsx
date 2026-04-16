import React from 'react';
import { InfusionChoice } from '../../core/types';
import { Modal } from './Modal';
import { useT } from '../../i18n';

interface InfusionModalProps {
  options: InfusionChoice[];
  onChoose: (choice: InfusionChoice) => void;
}

const INFUSION_ICONS: Record<string, string> = {
  catalyst:   '⚗',
  energy:     '⚡',
  steps:      '👣',
  multiplier: '×',
  signal:     '🔮',
  catalyst_upgrade: '⬆',
  pool_reroll: '🎲',
  pool_convert: '🔁',
  pattern: '🧭',
};

const INFUSION_TAG_KEY: Record<string, string> = {
  catalyst:   'tag.scoring',
  energy:     'tag.energy',
  steps:      'tag.control',
  multiplier: 'tag.amplification',
  signal: 'tag.control',
  catalyst_upgrade: 'tag.amplification',
  pool_reroll: 'tag.control',
  pool_convert: 'tag.energy',
  pattern: 'tag.scoring',
};

function getChoiceLabelKey(choice: InfusionChoice): string {
  switch (choice.type) {
    case 'catalyst': return 'ui.infusion_gain_catalyst';
    case 'energy':   return 'ui.infusion_gain_energy';
    case 'steps':    return 'ui.infusion_gain_steps';
    case 'multiplier': return 'ui.infusion_gain_multiplier';
    case 'signal': return 'ui.infusion_gain_signal';
    case 'catalyst_upgrade': return 'ui.infusion_gain_catalyst_upgrade';
    case 'pool_reroll': return 'ui.infusion_gain_pool_reroll';
    case 'pool_convert': return 'ui.infusion_gain_pool_convert';
    case 'pattern': return 'ui.infusion_gain_pattern';
  }
}

function getChoiceDescKey(choice: InfusionChoice): string {
  switch (choice.type) {
    case 'catalyst': return `catalyst.${choice.catalyst.id}.description`;
    case 'energy':   return 'ui.infusion_desc_energy';
    case 'steps':    return 'ui.infusion_desc_steps';
    case 'multiplier': return 'ui.infusion_desc_multiplier';
    case 'signal': return `signal.${choice.signal}.description`;
    case 'catalyst_upgrade': return 'ui.infusion_desc_catalyst_upgrade';
    case 'pool_reroll': return 'ui.infusion_desc_pool_reroll';
    case 'pool_convert': return 'ui.infusion_desc_pool_convert';
    case 'pattern': return `pattern.${choice.pattern}.description`;
  }
}

function getChoiceLabel(choice: InfusionChoice, t: ReturnType<typeof useT>): string {
  const labelKey = getChoiceLabelKey(choice);
  switch (choice.type) {
    case 'catalyst':
      return t(labelKey, { name: t(`catalyst.${choice.catalyst.id}.name`) });
    case 'signal':
      return t(labelKey, { name: t(`signal.${choice.signal}.name`) });
    case 'pattern':
      return t(labelKey, { name: t(`pattern.${choice.pattern}.name`) });
    default:
      return t(labelKey);
  }
}

export const InfusionModal: React.FC<InfusionModalProps> = ({ options, onChoose }) => {
  const t = useT();

  return (
    <Modal title={t('ui.infusion_title')}>
      <p className="modal-subtitle">{t('ui.infusion_subtitle')}</p>
      <div className="infusion-options">
        {options.map((choice, i) => {
          const icon = INFUSION_ICONS[choice.type] ?? '';
          const tagKey = INFUSION_TAG_KEY[choice.type] ?? '';
          const label = getChoiceLabel(choice, t);
          return (
            <button key={i} className="infusion-option" onClick={() => onChoose(choice)}>
              <div className="infusion-header">
                <span className="infusion-icon">{icon}</span>
                <span className="infusion-label">{label}</span>
                {tagKey && (
                  <span className={`infusion-tag infusion-tag--${choice.type}`}>{t(tagKey)}</span>
                )}
              </div>
              <div className="infusion-desc">{t(getChoiceDescKey(choice))}</div>
              {choice.type === 'pattern' && (
                <div className="infusion-desc">{t('ui.infusion_desc_pattern')}</div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
