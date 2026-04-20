import React from 'react';
import type { CatalystId, PatternId, ReactionLogEntry } from '../../core/types';
import { deriveBuildIdentity } from '../../core/buildIdentity';
import { useT } from '../../i18n';
import { CompactDetail } from './CompactDetail';

interface BuildIdentityPanelProps {
  activeCatalysts: CatalystId[];
  activePattern: PatternId | null;
  reactionLog: ReactionLogEntry[];
  energy: number;
}

export const BuildIdentityPanel: React.FC<BuildIdentityPanelProps> = ({
  activeCatalysts,
  activePattern,
  reactionLog,
  energy,
}) => {
  const t = useT();
  const identity = deriveBuildIdentity({ activeCatalysts, activePattern, reactionLog, energy });

  return (
    <div className="panel build-identity-panel">
      <div className="panel-title">{t('ui.build_identity')}</div>
      <CompactDetail
        summary={(
          <div className="build-identity-summary">
            <div className="build-identity-headline">
              <span className="build-identity-label">{t(identity.labelKey)}</span>
              <span className="build-identity-confidence">{Math.round(identity.confidence * 100)}%</span>
            </div>
            <div className="build-identity-text">{t(identity.summaryKey)}</div>
            <div className="build-identity-contributors">
              {identity.topContributors.map((entry, index) => {
                const text = entry.type === 'style'
                  ? t(`pattern.${entry.id as PatternId}.name`)
                  : entry.type === 'boost'
                    ? t(`catalyst.${entry.id as CatalystId}.name`)
                    : t(`signal.${entry.id}.name`);
                return (
                  <span key={`${entry.type}-${entry.id}-${index}`} className="build-identity-chip">{text}</span>
                );
              })}
            </div>
          </div>
        )}
        detail={(
          <div className="build-identity-detail">
            <div className="compact-detail__line">{t('ui.build_identity_why')}</div>
            <div className="compact-detail__line">{t('ui.build_axis_score', { axis: t('tag.build_score'), value: identity.directionScores.score.toFixed(1) })}</div>
            <div className="compact-detail__line">{t('ui.build_axis_score', { axis: t('tag.build_chain'), value: identity.directionScores.chain.toFixed(1) })}</div>
            <div className="compact-detail__line">{t('ui.build_axis_score', { axis: t('tag.build_control'), value: identity.directionScores.control.toFixed(1) })}</div>
            <div className="compact-detail__line">{t('ui.build_axis_score', { axis: t('tag.build_energy'), value: identity.directionScores.energy.toFixed(1) })}</div>
          </div>
        )}
      />
    </div>
  );
};
