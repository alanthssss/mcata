import React from 'react';
import { InfusionChoice } from '../../core/types';
import { Modal } from './Modal';

interface InfusionModalProps {
  options: InfusionChoice[];
  onChoose: (choice: InfusionChoice) => void;
}

function choiceLabel(choice: InfusionChoice): string {
  switch (choice.type) {
    case 'catalyst': return `Gain Catalyst: ${choice.catalyst.name}`;
    case 'energy': return 'Gain ⚡3 Energy';
    case 'steps': return 'Gain +2 Steps (next phase)';
    case 'multiplier': return '+10% Global Output Multiplier';
  }
}

function choiceDesc(choice: InfusionChoice): string {
  switch (choice.type) {
    case 'catalyst': return choice.catalyst.description;
    case 'energy': return 'Increase your Energy reserve by 3.';
    case 'steps': return 'Get 2 extra steps in the next phase.';
    case 'multiplier': return 'All future output is multiplied by an additional 10%.';
  }
}

export const InfusionModal: React.FC<InfusionModalProps> = ({ options, onChoose }) => {
  return (
    <Modal title="⚡ Infusion">
      <p className="modal-subtitle">Phase cleared! Choose your reward.</p>
      <div className="infusion-options">
        {options.map((choice, i) => (
          <button key={i} className="infusion-option" onClick={() => onChoose(choice)}>
            <div className="infusion-label">{choiceLabel(choice)}</div>
            <div className="infusion-desc">{choiceDesc(choice)}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
