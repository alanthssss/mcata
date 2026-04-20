import React from 'react';
import { formatScore } from '../scoreDisplay';
import { useT } from '../../i18n';
import { CatalystId, PatternId, ReactionLogEntry, SynergyId } from '../../core/types';
import { CATALYST_DEFS } from '../../core/catalysts';
import { LocaleSwitcher } from './LocaleSwitcher';
import { SYNERGY_DEFS, getActiveSynergies } from '../../core/synergies';
import { ROUND_COMPLETE_ENERGY_BONUS, ROUND_COMPLETE_MULTIPLIER_BONUS } from '../../core/config';
import { deriveBuildIdentity } from '../../core/buildIdentity';

interface RoundCompleteScreenProps {
  roundNumber: number;
  roundOutput: number;
  totalOutput: number;
  bestMoveOutput: number;
  activeCatalysts: CatalystId[];
  activePattern: PatternId | null;
  reactionLog: ReactionLogEntry[];
  energy: number;
  onContinue: () => void;
  onQuit: () => void;
}

const ROUND_FLAVOR_COUNT = 5;

function getBestCatalyst(activeCatalysts: CatalystId[]): CatalystId | null {
  // Prefer epic > rare > common
  const rarityOrder: Record<string, number> = { epic: 3, rare: 2, common: 1 };
  let best: CatalystId | null = null;
  let bestScore = 0;
  for (const id of activeCatalysts) {
    const def = CATALYST_DEFS[id];
    if (def) {
      const score = rarityOrder[def.rarity] ?? 0;
      if (score > bestScore) { bestScore = score; best = id; }
    }
  }
  return best;
}

function getBestSynergy(activeCatalysts: CatalystId[]): SynergyId | null {
  const synergies = getActiveSynergies(activeCatalysts);
  if (synergies.length === 0) return null;
  // Return the synergy with the highest multiplier
  return synergies.reduce((best, id) => {
    const bDef = SYNERGY_DEFS[best];
    const cDef = SYNERGY_DEFS[id];
    return cDef.multiplier > bDef.multiplier ? id : best;
  });
}

export const RoundCompleteScreen: React.FC<RoundCompleteScreenProps> = ({
  roundNumber,
  roundOutput,
  totalOutput,
  bestMoveOutput,
  activeCatalysts,
  activePattern,
  reactionLog,
  energy,
  onContinue,
  onQuit,
}) => {
  const t = useT();
  const flavorKey = `ui.round_flavor_${(Math.max(roundNumber, 1) - 1) % ROUND_FLAVOR_COUNT}`;
  const flavorText = t(flavorKey);
  const activeSynergies = getActiveSynergies(activeCatalysts);
  const mvpCatalyst = getBestCatalyst(activeCatalysts);
  const strongestSynergy = getBestSynergy(activeCatalysts);
  const buildIdentity = deriveBuildIdentity({ activeCatalysts, activePattern, reactionLog, energy });

  return (
    <div className="screen end-screen">
      <div className="screen-locale-switcher"><LocaleSwitcher /></div>
      <div className="round-complete-banner">
        <h1 className="end-title end-title--victory round-complete-pulse">
          {t('ui.round_complete_title', { round: String(roundNumber) })}
        </h1>
        <p className="round-complete-flavor">{flavorText}</p>
        <p className="end-subtitle">{t('ui.round_complete_subtitle')}</p>
      </div>

      <div className="end-stats round-complete-stats">
        <div className="end-stat">
          <span className="end-stat__label">{t('ui.round_output_gained')}</span>
          <span className="end-stat__value">{formatScore(roundOutput)}</span>
        </div>
        <div className="end-stat">
          <span className="end-stat__label">{t('ui.total_output')}</span>
          <span className="end-stat__value">{formatScore(totalOutput)}</span>
        </div>
        <div className="end-stat">
          <span className="end-stat__label">{t('ui.best_move_output')}</span>
          <span className="end-stat__value end-stat__value--highlight">{formatScore(bestMoveOutput)}</span>
        </div>
      </div>

      <div className="round-complete-build">
        <div className="round-complete-section">
          <h3 className="round-complete-section__title">{t('ui.build_identity')}</h3>
          <div className="round-complete-build-label">{t(buildIdentity.labelKey)}</div>
          <div className="round-complete-none">{t(buildIdentity.summaryKey)}</div>
        </div>
        <div className="round-complete-section">
          <h3 className="round-complete-section__title">{t('ui.build_summary')}</h3>
          {activeCatalysts.length > 0 ? (
            <div className="round-complete-catalysts">
              {activeCatalysts.slice(0, 4).map(id => {
                const def = CATALYST_DEFS[id];
                return (
                  <span key={id} className={`catalyst-badge catalyst-badge--${def?.rarity ?? 'common'}`}>
                    {def ? t(`catalyst.${def.id}.name`) : id}
                  </span>
                );
              })}
              {activeCatalysts.length > 4 && (
                <span className="catalyst-badge">+{activeCatalysts.length - 4}</span>
              )}
            </div>
          ) : (
            <span className="round-complete-none">{t('ui.no_catalysts')}</span>
          )}
        </div>

        {activeSynergies.length > 0 && (
          <div className="round-complete-section">
            <h3 className="round-complete-section__title">{t('ui.active_synergies_label')}</h3>
            <div className="round-complete-synergies">
              {activeSynergies.map(id => (
                <span key={id} className="synergy-badge">{t(`synergy.${id}.name`)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="round-complete-highlights">
          {mvpCatalyst && CATALYST_DEFS[mvpCatalyst] && (
            <div className="round-complete-highlight round-complete-highlight--mvp">
              <span className="highlight-icon">🏆</span>
              <span className="highlight-label">{t('ui.mvp_catalyst')}</span>
              <span className="highlight-value">{t(`catalyst.${mvpCatalyst}.name`)}</span>
            </div>
          )}
          {strongestSynergy && (
            <div className="round-complete-highlight round-complete-highlight--synergy">
              <span className="highlight-icon">⚡</span>
              <span className="highlight-label">{t('ui.strongest_synergy')}</span>
              <span className="highlight-value">{t(`synergy.${strongestSynergy}.name`)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="round-complete-reward">
        <div className="round-complete-reward__title">{t('ui.round_reward_title')}</div>
        <div className="round-complete-reward__items">
          <span className="reward-item">⚡+{ROUND_COMPLETE_ENERGY_BONUS} {t('ui.energy')}</span>
          <span className="reward-item">×+{Math.round(ROUND_COMPLETE_MULTIPLIER_BONUS * 100)}% {t('ui.global')}</span>
        </div>
      </div>

      <div className="end-actions">
        <button className="start-btn start-btn--pulse" onClick={onContinue}>
          {t('ui.continue_run')}
        </button>
        <button className="help-btn" onClick={onQuit}>
          {t('ui.new_round')}
        </button>
      </div>
    </div>
  );
};
