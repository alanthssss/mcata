import { PhaseDef } from './types';
import {
  PHASE_CONFIG,
  ROUND_TEMPLATES,
  ROUND_TARGET_SCALE,
  ROUND_SCALE_COMPOUND,
  BUILD_AWARE_SCALING,
  SEGMENTED_GROWTH_SCALING,
} from './config';

export const PHASES: PhaseDef[] = PHASE_CONFIG;

/** Number of phases per round. */
export const PHASES_PER_ROUND = 6;

/**
 * Returns the scaled phases for a given round number.
 * Round 1 uses the template unmodified.
 * When ROUND_SCALE_COMPOUND is true (default): compound growth Math.pow(1+rate, round-1).
 * When false: linear growth 1 + (round-1) * rate (legacy behaviour).
 * Templates rotate: round 1 = alpha, round 2 = beta, round 3 = gamma, round 4 = alpha again, etc.
 */
export function getPhasesForRound(roundNumber: number): PhaseDef[] {
  const templateIndex = (roundNumber - 1) % ROUND_TEMPLATES.length;
  const template = ROUND_TEMPLATES[templateIndex];
  const rawRoundIndex = Math.max(0, roundNumber - SEGMENTED_GROWTH_SCALING.roundIndexOffset);
  const roundIndex = rawRoundIndex * SEGMENTED_GROWTH_SCALING.roundIndexScale;

  return template.phases.map(phase => ({
    ...phase,
    targetOutput:    Math.ceil(phase.targetOutput   * getSegmentedTargetScale(phase.phaseNumber, roundIndex, rawRoundIndex)),
    expectedOutput:  phase.expectedOutput  != null
      ? Math.ceil(phase.expectedOutput  * getSegmentedTargetScale(phase.phaseNumber, roundIndex, rawRoundIndex))
      : undefined,
    highSkillOutput: phase.highSkillOutput != null
      ? Math.ceil(phase.highSkillOutput * getSegmentedTargetScale(phase.phaseNumber, roundIndex, rawRoundIndex))
      : undefined,
  }));
}

export function getSegmentedTargetScale(
  phaseNumber: number,
  roundIndex: number,
  rawRoundIndex = roundIndex,
): number {
  if (!SEGMENTED_GROWTH_SCALING.enabled) {
    return ROUND_SCALE_COMPOUND
      ? Math.pow(1 + ROUND_TARGET_SCALE, rawRoundIndex)
      : 1 + rawRoundIndex * ROUND_TARGET_SCALE;
  }

  const cfg = SEGMENTED_GROWTH_SCALING;
  const phaseIndex = cfg.phaseIndexByPhaseNumber[phaseNumber]
    ?? cfg.defaultPhaseIndex;

  const base = cfg.baseMultiplier;
  const phaseFactor = 1 + Math.pow(phaseIndex, cfg.phaseExponent);
  const roundFactor = 1 + Math.pow(roundIndex, cfg.roundExponent);
  const smoothing = Math.log(phaseIndex + roundIndex + cfg.smoothingOffset);

  return base * phaseFactor * roundFactor * smoothing;
}

/**
 * Compute a build-aware multiplier on top of the base phase target.
 * This factor increases as the player builds up catalysts and global multiplier,
 * directly countering the exponential power growth of a strong mid/late-game deck.
 *
 * Factor is capped at BUILD_AWARE_SCALING.maxFactor to prevent unreachable targets.
 *
 * @param catalystCount  Number of currently active catalysts
 * @param globalMultiplier  Current global score multiplier (starts at 1.0)
 */
export function getBuildAwareTargetScale(catalystCount: number, globalMultiplier: number): number {
  if (!BUILD_AWARE_SCALING.enabled) return 1.0;
  const factor =
    1
    + catalystCount * BUILD_AWARE_SCALING.catalystWeight
    + Math.max(0, globalMultiplier - 1.0) * BUILD_AWARE_SCALING.multiplierWeight;
  return Math.min(factor, BUILD_AWARE_SCALING.maxFactor);
}

export const FORGE_AFTER_PHASE_INDEX = 2; // kept for backward compat with tests
