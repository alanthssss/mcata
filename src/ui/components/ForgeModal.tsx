import React, { useState } from 'react';
import { CatalystDef, CatalystId } from '../../core/types';
import { CATALYST_DEFS } from '../../core/catalysts';
import { Modal } from './Modal';

interface ForgeModalProps {
  offers: CatalystDef[];
  activeCatalysts: CatalystId[];
  energy: number;
  onBuy: (catalyst: CatalystDef, replaceIndex?: number) => void;
  onReroll: () => void;
  onSkip: () => void;
}

export const ForgeModal: React.FC<ForgeModalProps> = ({
  offers, activeCatalysts, energy, onBuy, onReroll, onSkip
}) => {
  const [pendingCatalyst, setPendingCatalyst] = useState<CatalystDef | null>(null);

  const handleBuyClick = (catalyst: CatalystDef) => {
    if (activeCatalysts.length >= 3) {
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
    <Modal title="⚗ Forge">
      <p className="modal-subtitle">Select a Catalyst to equip. Max 3 slots.</p>
      <div className="forge-offers">
        {offers.map((cat, i) => (
          <div key={i} className={`forge-offer ${cat.rarity}`}>
            <div className="offer-name">{cat.name}</div>
            <div className="offer-rarity">{cat.rarity}</div>
            <div className="offer-desc">{cat.description}</div>
            <div className="offer-cost">⚡ {cat.cost} Energy</div>
            <button
              className="offer-btn"
              disabled={energy < cat.cost}
              onClick={() => handleBuyClick(cat)}
            >
              {energy < cat.cost ? 'Not enough Energy' : 'Equip'}
            </button>
          </div>
        ))}
      </div>

      {pendingCatalyst && (
        <div className="replace-prompt">
          <p>Slots full. Replace which Catalyst?</p>
          {activeCatalysts.map((id, idx) => (
            <button key={idx} className="replace-btn" onClick={() => handleReplace(idx)}>
              Replace: {CATALYST_DEFS[id].name}
            </button>
          ))}
          <button className="cancel-btn" onClick={() => setPendingCatalyst(null)}>Cancel</button>
        </div>
      )}

      <div className="forge-actions">
        <button
          className="action-btn reroll-btn"
          disabled={energy < 1}
          onClick={onReroll}
        >
          Reroll (⚡1)
        </button>
        <button className="action-btn skip-btn" onClick={onSkip}>
          Skip Forge
        </button>
      </div>

      <div className="active-catalysts-forge">
        <div className="forge-section-title">Active Catalysts:</div>
        {activeCatalysts.length === 0
          ? <span className="empty-state">None</span>
          : activeCatalysts.map(id => (
            <span key={id} className="catalyst-tag">{CATALYST_DEFS[id].name}</span>
          ))
        }
      </div>
    </Modal>
  );
};
