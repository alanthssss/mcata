import { ProtocolId } from './types';

export type ChallengeId =
  | 'no_corners'
  | 'energy_starved'
  | 'chain_master'
  | 'anomaly_storm';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  description: string;
  rules: string[];
  winCondition: string;
  /** Base protocol this challenge uses */
  baseProtocol: ProtocolId;
  /** Config overrides applied on top of the base protocol */
  overrides: ChallengeOverrides;
}

export interface ChallengeOverrides {
  /** Disable corner bonuses */
  disableCornerBonus?: boolean;
  /** Energy gain factor (1.0 = normal, 0.5 = half) */
  energyGainFactor?: number;
  /** Only chain-based scoring counts */
  chainOnlyScoring?: boolean;
  /** Anomaly trigger frequency multiplier (1 = normal, 2 = double) */
  anomalyFrequencyMultiplier?: number;
  /** Catalyst pool restriction (undefined = all allowed) */
  restrictedCatalysts?: string[];
  /** Output scaling modifier (1.0 = normal) */
  outputScale?: number;
}

export const CHALLENGE_DEFS: Record<ChallengeId, ChallengeDef> = {
  no_corners: {
    id: 'no_corners',
    name: 'No Corners',
    description: 'Corner cell bonuses are completely disabled. Build through chains.',
    rules: [
      'Corner merge bonus removed',
      'Corner Crown catalyst has no effect',
      'Chain multipliers are unchanged',
    ],
    winCondition: 'Clear 3 rounds without corner bonuses',
    baseProtocol: 'corner_protocol',
    overrides: {
      disableCornerBonus: true,
    },
  },
  energy_starved: {
    id: 'energy_starved',
    name: 'Energy Starved',
    description: 'Energy gain is severely reduced. Every Forge visit counts.',
    rules: [
      'Energy gain reduced to 30% of normal',
      'Forge reroll costs 2 Energy',
      'Infusion energy bonus halved',
    ],
    winCondition: 'Reach Round 3 with limited energy',
    baseProtocol: 'sparse_protocol',
    overrides: {
      energyGainFactor: 0.3,
    },
  },
  chain_master: {
    id: 'chain_master',
    name: 'Chain Master',
    description: 'Only chain-based scoring matters. Single merges score nothing.',
    rules: [
      'Single-merge moves score 0 output',
      'Chain multipliers doubled',
      'Catalyst bonuses only apply on chained moves',
    ],
    winCondition: 'Clear 3 rounds using only chain scoring',
    baseProtocol: 'corner_protocol',
    overrides: {
      chainOnlyScoring: true,
    },
  },
  anomaly_storm: {
    id: 'anomaly_storm',
    name: 'Anomaly Storm',
    description: 'Anomalies trigger twice as often. Adapt or collapse.',
    rules: [
      'All anomaly phases have double frequency',
      'Entropy Tax blocks 2 cells instead of 1',
      'Collapse Field triggers every 2 scoring moves',
    ],
    winCondition: 'Survive 3 rounds under constant anomaly pressure',
    baseProtocol: 'overload_protocol',
    overrides: {
      anomalyFrequencyMultiplier: 2,
    },
  },
};

export const ALL_CHALLENGES = Object.values(CHALLENGE_DEFS);
