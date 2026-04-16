import { PhaseDef } from './types';
import {
  PHASE_CONFIG,
  BUILD_AWARE_SCALING,
  PROGRESSION_SCALING,
} from './config';

export const PHASES: PhaseDef[] = PHASE_CONFIG;

/** Number of phases per round. */
export const PHASES_PER_ROUND = 6;

/**
 * Returns the scaled phases for a given round number.
 * Round 1 uses base values. Scaling is additive and config-driven:
 *   steps  = base + phaseScale + roundScale
 *   target = base + phaseScale + roundScale
 */
export function getPhasesForRound(roundNumber: number): PhaseDef[] {
  const roundIndex = Math.max(0, roundNumber - 1);
  return PHASE_CONFIG.map(phase => {
    const phaseIndex = Math.max(0, phase.phaseNumber - 1);
    const stepBudget = phase.steps
      + phaseIndex * PROGRESSION_SCALING.stepPhaseScale
      + roundIndex * PROGRESSION_SCALING.stepRoundScale;
    const targetOutput = phase.targetOutput
      + phaseIndex * PROGRESSION_SCALING.targetPhaseScale
      + roundIndex * PROGRESSION_SCALING.targetRoundScale;
    const expectedOutput = phase.expectedOutput
      + phaseIndex * PROGRESSION_SCALING.targetPhaseScale
      + roundIndex * PROGRESSION_SCALING.targetRoundScale;
    const highSkillOutput = phase.highSkillOutput
      + phaseIndex * PROGRESSION_SCALING.targetPhaseScale
      + roundIndex * PROGRESSION_SCALING.targetRoundScale;
    return {
      ...phase,
      steps: Math.max(1, Math.round(stepBudget)),
      targetOutput: Math.max(1, Math.ceil(targetOutput)),
      expectedOutput: Math.max(1, Math.ceil(expectedOutput)),
      highSkillOutput: Math.max(1, Math.ceil(highSkillOutput)),
    };
  });
}

export function getSegmentedTargetScale(
  _phaseNumber = 1,
  roundIndex = 0,
): number {
  return 1 + Math.max(0, roundIndex) * 0.01;
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
