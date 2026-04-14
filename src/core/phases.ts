import { PhaseDef } from './types';
import { PHASE_CONFIG, ROUND_TEMPLATES, ROUND_TARGET_SCALE, ROUND_SCALE_COMPOUND, BUILD_AWARE_SCALING } from './config';

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
  const scaleFactor = ROUND_SCALE_COMPOUND
    ? Math.pow(1 + ROUND_TARGET_SCALE, roundNumber - 1)
    : 1 + (roundNumber - 1) * ROUND_TARGET_SCALE;

  return template.phases.map(phase => ({
    ...phase,
    targetOutput:    Math.ceil(phase.targetOutput   * scaleFactor),
    expectedOutput:  phase.expectedOutput  != null ? Math.ceil(phase.expectedOutput  * scaleFactor) : undefined,
    highSkillOutput: phase.highSkillOutput != null ? Math.ceil(phase.highSkillOutput * scaleFactor) : undefined,
  }));
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
