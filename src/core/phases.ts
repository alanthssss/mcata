import { PhaseDef } from './types';

export const PHASES: PhaseDef[] = [
  { phaseNumber: 1, targetOutput: 120, steps: 12 },
  { phaseNumber: 2, targetOutput: 260, steps: 12 },
  { phaseNumber: 3, targetOutput: 500, steps: 10 },
  { phaseNumber: 4, targetOutput: 900, steps: 8, anomaly: 'entropy_tax' },
  { phaseNumber: 5, targetOutput: 1400, steps: 10 },
  { phaseNumber: 6, targetOutput: 2200, steps: 8, anomaly: 'collapse_field' },
];

export const FORGE_AFTER_PHASE_INDEX = 2; // After phase index 2 (Phase 3), before phase index 3 (Phase 4)
