import { PhaseDef } from './types';
import { PHASE_CONFIG, ROUND_TEMPLATES, ROUND_TARGET_SCALE } from './config';

export const PHASES: PhaseDef[] = PHASE_CONFIG;

/** Number of phases per round. */
export const PHASES_PER_ROUND = 6;

/**
 * Returns the scaled phases for a given round number.
 * Round 1 uses the template unmodified.
 * Each subsequent round scales all targetOutput values by ROUND_TARGET_SCALE.
 * Templates rotate: round 1 = alpha, round 2 = beta, round 3 = gamma, round 4 = alpha again, etc.
 */
export function getPhasesForRound(roundNumber: number): PhaseDef[] {
  const templateIndex = (roundNumber - 1) % ROUND_TEMPLATES.length;
  const template = ROUND_TEMPLATES[templateIndex];
  const scaleFactor = 1 + (roundNumber - 1) * ROUND_TARGET_SCALE;

  return template.phases.map(phase => ({
    ...phase,
    targetOutput:   Math.ceil(phase.targetOutput   * scaleFactor),
    expectedOutput: Math.ceil(phase.expectedOutput * scaleFactor),
    highSkillOutput: Math.ceil(phase.highSkillOutput * scaleFactor),
  }));
}

export const FORGE_AFTER_PHASE_INDEX = 2; // kept for backward compat with tests
