import React, { useState } from 'react';
import { CatalystCategory, CatalystDef, CatalystId, CatalystRarity } from '../../core/types';
import { ALL_CATALYSTS } from '../../core/catalysts';
import { useT } from '../../i18n';

interface CatalystCollectionViewProps {
  /** IDs of unlocked catalysts. Pass `undefined` for full pool (all unlocked). */
  unlockedIds: CatalystId[] | undefined;
  onClose: () => void;
}

const CATEGORY_ICON: Record<CatalystCategory, string> = {
  amplifier:  '🔺',
  stabilizer: '🛡',
  generator:  '⚡',
  modifier:   '🔀',
  legacy:     '⚙',
};

const RARITY_COLOR: Record<CatalystRarity, string> = {
  common: '#7da87d',
  rare:   '#5b8ac4',
  epic:   '#9e6ec4',
};

const ALL_CATEGORIES: Array<CatalystCategory | 'all'> = [
  'all', 'amplifier', 'stabilizer', 'generator', 'modifier', 'legacy',
];

function CatalystCard({ def, unlocked, t }: {
  def: CatalystDef;
  unlocked: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const rarityBorder = RARITY_COLOR[def.rarity];
  const tName = t(`catalyst.${def.id}.name`);
  const tDesc = t(`catalyst.${def.id}.description`);

  return (
    <div
      className={`collection-card ${unlocked ? 'collection-card--unlocked' : 'collection-card--locked'}`}
      style={{ borderColor: unlocked ? rarityBorder : '#555' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={`${tName} — ${unlocked ? t('ui.collection_unlocked') : t('ui.collection_locked')}`}
    >
      <div className="collection-card__header">
        <span className="collection-card__icon">{CATEGORY_ICON[def.category]}</span>
        <span className="collection-card__name" style={{ color: unlocked ? rarityBorder : '#888' }}>
          {unlocked ? tName : '???'}
        </span>
        {unlocked && (
          <span className="collection-card__rarity" style={{ color: rarityBorder }}>
            {def.rarity}
          </span>
        )}
      </div>

      {unlocked && (
        <div className="collection-card__tags">
          {def.tags.map(tag => (
            <span key={tag} className="collection-card__tag">{tag}</span>
          ))}
        </div>
      )}

      {showTooltip && unlocked && (
        <div className="collection-card__tooltip" role="tooltip">
          <strong>{tName}</strong>
          <p>{tDesc}</p>
          {def.flavorText && (
            <em className="collection-card__flavor">"{def.flavorText}"</em>
          )}
          <div className="collection-card__unlock-cond">{def.unlockCondition}</div>
        </div>
      )}

      {showTooltip && !unlocked && (
        <div className="collection-card__tooltip" role="tooltip">
          <div className="collection-card__unlock-cond">{def.unlockCondition}</div>
        </div>
      )}
    </div>
  );
}

export const CatalystCollectionView: React.FC<CatalystCollectionViewProps> = ({
  unlockedIds,
  onClose,
}) => {
  const t = useT();
  const [categoryFilter, setCategoryFilter] = useState<CatalystCategory | 'all'>('all');

  const filtered = ALL_CATALYSTS.filter(c =>
    categoryFilter === 'all' || c.category === categoryFilter
  );

  const unlockedSet = unlockedIds === undefined
    ? null  // null = full pool, all unlocked
    : new Set<CatalystId>(unlockedIds);
  const unlockedCount = unlockedSet === null
    ? ALL_CATALYSTS.length
    : ALL_CATALYSTS.filter(c => unlockedSet.has(c.id)).length;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t('ui.collection_title')}>
      <div className="modal-box collection-modal">
        <div className="modal-header">
          <h2 className="modal-title">{t('ui.collection_title')}</h2>
          <div className="collection-progress">
            {unlockedCount} / {ALL_CATALYSTS.length} {t('ui.collection_unlocked_count')}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t('ui.collection_close')}>
            ✕
          </button>
        </div>

        <div className="collection-filters">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${categoryFilter === cat ? 'filter-btn--active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? t('ui.collection_filter_all') : `${CATEGORY_ICON[cat as CatalystCategory]} ${t(`tag.${cat}`)}`}
            </button>
          ))}
        </div>

        <div className="collection-grid">
          {filtered.map(def => (
            <CatalystCard
              key={def.id}
              def={def}
              unlocked={unlockedSet === null || unlockedSet.has(def.id)}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
