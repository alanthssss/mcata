/**
 * Ascension system — difficulty modifiers for levels 0–8.
 *
 * Modifiers are cumulative: each level inherits the previous level's
 * penalties and adds one more.  Level 8 applies the harshest combined set.
 *
 * All values are centralised here; nothing is hard-coded in the engine.
 */
import { AscensionLevel } from './types';

export interface AscensionModifiers {
  /** Extra steps removed from every phase (stacks with protocol stepsReduction) */
  stepsReduction: number;
  /** Multiplier applied to every phase's targetOutput (≥1.0) */
  targetOutputScale: number;
  /**
   * Reduction applied to the effective Collapse Field period.
   * E.g. base period is 4; a reduction of 1 makes it trigger every 3 moves.
   */
  collapseFieldPeriodReduction: number;
  /** Extra energy cost added to every catalyst in the Forge */
  forgeCostBonus: number;
  /** Additional probability of spawning a "4" tile (base is 0.10) */
  spawnFourBonus: number;
  /** Multiplier for starting energy (≤1.0 means less energy) */
  startingEnergyFactor: number;
  /** Maximum number of infusion choices offered (default 4) */
  infusionChoiceCount: number;
  /** Human-readable description of active penalties */
  description: string;
}

export const ASCENSION_MODIFIER_DEFS: Record<AscensionLevel, AscensionModifiers> = {
  0: {
    stepsReduction: 0,
    targetOutputScale: 1.0,
    collapseFieldPeriodReduction: 0,
    forgeCostBonus: 0,
    spawnFourBonus: 0.0,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: 'No modifiers — baseline difficulty.',
  },
  1: {
    stepsReduction: 1,
    targetOutputScale: 1.0,
    collapseFieldPeriodReduction: 0,
    forgeCostBonus: 0,
    spawnFourBonus: 0.0,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: '-1 Step per Phase.',
  },
  2: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 0,
    forgeCostBonus: 0,
    spawnFourBonus: 0.0,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: '-1 Step per Phase; +15% Phase target output.',
  },
  3: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 1,
    forgeCostBonus: 0,
    spawnFourBonus: 0.0,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: 'Previous + Anomalies trigger more frequently.',
  },
  4: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 1,
    forgeCostBonus: 1,
    spawnFourBonus: 0.0,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: 'Previous + Forge catalyst cost +1.',
  },
  5: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 1,
    forgeCostBonus: 1,
    spawnFourBonus: 0.10,
    startingEnergyFactor: 1.0,
    infusionChoiceCount: 4,
    description: 'Previous + Higher "4" spawn probability.',
  },
  6: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 1,
    forgeCostBonus: 1,
    spawnFourBonus: 0.10,
    startingEnergyFactor: 0.8,
    infusionChoiceCount: 4,
    description: 'Previous + Starting Energy ×0.8.',
  },
  7: {
    stepsReduction: 1,
    targetOutputScale: 1.15,
    collapseFieldPeriodReduction: 1,
    forgeCostBonus: 1,
    spawnFourBonus: 0.10,
    startingEnergyFactor: 0.8,
    infusionChoiceCount: 3,
    description: 'Previous + Fewer Infusion reward choices.',
  },
  8: {
    stepsReduction: 2,
    targetOutputScale: 1.30,
    collapseFieldPeriodReduction: 2,
    forgeCostBonus: 2,
    spawnFourBonus: 0.15,
    startingEnergyFactor: 0.7,
    infusionChoiceCount: 3,
    description: 'Combined penalties — maximum difficulty.',
  },
};

export const ALL_ASCENSION_LEVELS: AscensionLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
