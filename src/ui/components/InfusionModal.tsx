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
};

const INFUSION_TAG_KEY: Record<string, string> = {
  catalyst:   'tag.scoring',
  energy:     'tag.energy',
  steps:      'tag.control',
  multiplier: 'tag.amplification',
};

export const InfusionModal: React.FC<InfusionModalProps> = ({ options, onChoose }) => {
  const t = useT();

  function choiceLabel(choice: InfusionChoice): string {
    switch (choice.type) {
      case 'catalyst': return t('ui.infusion_gain_catalyst', { name: t(`catalyst.${choice.catalyst.id}.name`) });
      case 'energy':   return t('ui.infusion_gain_energy');
      case 'steps':    return t('ui.infusion_gain_steps');
      case 'multiplier': return t('ui.infusion_gain_multiplier');
    }
  }

  function choiceDesc(choice: InfusionChoice): string {
    switch (choice.type) {
      case 'catalyst': return t(`catalyst.${choice.catalyst.id}.description`);
      case 'energy':   return t('ui.infusion_desc_energy');
      case 'steps':    return t('ui.infusion_desc_steps');
      case 'multiplier': return t('ui.infusion_desc_multiplier');
    }
  }

  return (
    <Modal title={t('ui.infusion_title')}>
      <p className="modal-subtitle">{t('ui.infusion_subtitle')}</p>
      <div className="infusion-options">
        {options.map((choice, i) => {
          const icon = INFUSION_ICONS[choice.type] ?? '';
          const tagKey = INFUSION_TAG_KEY[choice.type] ?? '';
          return (
            <button key={i} className="infusion-option" onClick={() => onChoose(choice)}>
              <div className="infusion-header">
                <span className="infusion-icon">{icon}</span>
                <span className="infusion-label">{choiceLabel(choice)}</span>
                {tagKey && (
                  <span className={`infusion-tag infusion-tag--${choice.type}`}>{t(tagKey)}</span>
                )}
              </div>
              <div className="infusion-desc">{choiceDesc(choice)}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
