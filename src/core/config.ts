// Centralized tuning configuration for Merge Catalyst.
// All balance-sensitive values live here so tuning changes are one-line edits.

import type { CatalystRarity, PatternId } from './types';

export const BALANCE_VERSION = 'v7';

// ─── Core phase pacing baseline ───────────────────────────────────────────────
export const PHASE_CONFIG: Array<{
  phaseNumber: number;
  targetOutput: number;
  steps: number;
  anomaly?: 'entropy_tax' | 'collapse_field';
  expectedOutput: number;
  highSkillOutput: number;
  challengeTier: 'small' | 'big' | 'boss';
  modifier?: string;
}> = [
  {
    phaseNumber: 1,
    targetOutput: 170,
    steps: 20,
    expectedOutput: 225,
    highSkillOutput: 320,
    challengeTier: 'small',
  },
  {
    phaseNumber: 2,
    targetOutput: 205,
    steps: 20,
    expectedOutput: 280,
    highSkillOutput: 410,
    challengeTier: 'big',
  },
  {
    phaseNumber: 3,
    targetOutput: 190,
    steps: 18,
    expectedOutput: 255,
    highSkillOutput: 380,
    challengeTier: 'boss',
    modifier: 'Corner bonus disabled — chain merges are your only edge',
  },
  {
    phaseNumber: 4,
    targetOutput: 165,
    steps: 17,
    anomaly: 'entropy_tax',
    expectedOutput: 220,
    highSkillOutput: 320,
    challengeTier: 'small',
    modifier: 'Entropy Tax: one cell blocked each move',
  },
  {
    phaseNumber: 5,
    targetOutput: 235,
    steps: 19,
    expectedOutput: 320,
    highSkillOutput: 470,
    challengeTier: 'big',
  },
  {
    phaseNumber: 6,
    targetOutput: 220,
    steps: 19,
    anomaly: 'collapse_field',
    expectedOutput: 295,
    highSkillOutput: 430,
    challengeTier: 'boss',
    modifier: 'Collapse Field: every 4 scoring moves removes the lowest tile',
  },
];

// Pacing formulas:
//   steps  = baseSteps  + phaseIndex * stepPhaseScale  + roundIndex * stepRoundScale
//   target = baseTarget + phaseIndex * targetPhaseScale + roundIndex * targetRoundScale
export const PROGRESSION_SCALING = {
  stepPhaseScale: 1,
  stepRoundScale: 1,
  targetPhaseScale: 12,
  targetRoundScale: 20,
};

// Legacy compatibility exports (no longer used by progression logic).
export const SEGMENTED_GROWTH_SCALING = { roundIndexOffset: 1, roundIndexScale: 1 };
export const ROUND_TARGET_SCALE = 0;
export const ROUND_SCALE_COMPOUND = false;

/** Build-aware target scaling: phases become harder as the player's build grows.
 *  The factor is computed from activeCatalysts.length and globalMultiplier,
 *  directly countering the compounding power of a strong mid/late-game build.
 */
export const BUILD_AWARE_SCALING = {
  /** Enable/disable the entire mechanic (false = pre-v6 behaviour). */
  enabled: true,
  /** Additional fraction of base target per active catalyst (0.12 = +12 % each). */
  catalystWeight: 0.12,
  /** Additional fraction per 1.0 of globalMultiplier above the baseline of 1.0. */
  multiplierWeight: 0.30,
  /** Hard cap on the build factor (prevents unreachable targets). */
  maxFactor: 3.0,
};
export const ROUND_ECONOMY_SCALE = 0.08; // 8 % more energy per round

// ─── Scoring config ───────────────────────────────────────────────────────────
export const CATALYST_MULTIPLIERS = {
  corner_crown:   2.0,   // corner merge multiplier
  twin_burst:     1.5,   // ≥2 merges multiplier
  combo_wire:     1.3,   // 3-consecutive-scoring-moves multiplier
  high_tribute:   1.4,   // highest-tile merge multiplier
  reserve_bonus:  20,    // output per unused step (Reserve catalyst)
  bankers_edge_energy: 1, // extra energy from Banker's Edge on phase clear
  lucky_seed_pct: 0.75,  // probability of spawning a "2" with Lucky Seed
  // New amplifiers
  empty_amplifier_per_cell: 0.05, // multiplier bonus per empty cell
  chain_reactor_extra:      0.2,  // extra chain multiplier per merge
  echo_multiplier_carry:    0.2,  // fraction of last output carried forward
  threshold_surge_mult:     1.5,  // multiplier when base > threshold
  threshold_surge_value:    30,   // base output threshold for surge
  phase_resonance_per_phase: 0.1, // multiplier increment per phase index
  // New stabilizers
  gravity_well_mult:        1.1,  // corner merge bonus with gravity well
  stability_field_mult:     1.2,  // output bonus after 3 consecutive valid moves
  stability_field_period:   3,    // consecutive moves needed
  // New generators
  rich_merge_energy_per_merge: 1, // energy gained per merge
  energy_loop_fraction:        0.08, // fraction of output that becomes energy
  reserve_bank_energy_per_step: 1, // energy per step at phase clear
  double_spawn_probability:    0.25, // chance of double spawn
  delay_spawn_probability:     0.5,  // chance delay_spawn triggers on a given move
  // New modifiers
  diagonal_merge_mult:        1.2, // bonus multiplier for diagonal merge
  diagonal_merge_period:      4,   // every N moves
  inversion_field_mult:       1.15, // inversion field output multiplier
  anomaly_sync_mult:          1.3, // multiplier when anomaly triggers
};

// ─── Chain multipliers ────────────────────────────────────────────────────────
export const CHAIN_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
};
export const CHAIN_MULTIPLIER_4PLUS = 2.0;

// ─── Condition multipliers ────────────────────────────────────────────────────
export const CORNER_MERGE_MULT   = 1.2;
export const HIGHEST_TILE_MULT   = 1.2;

// ─── Synergy config ───────────────────────────────────────────────────────────
export const SYNERGY_MULTIPLIERS = {
  corner_empire:        1.3,
  chain_echo:           1.4,
  generator_surplus:    1.25,
  amplified_stability:  1.35,
  phase_reactor:        1.3,
};

// ─── Momentum config ─────────────────────────────────────────────────────────
export const MOMENTUM_CONFIG = {
  /** Multiplier increment per consecutive valid move */
  growthRate:   0.05,
  /** Maximum momentum multiplier */
  maxMultiplier: 2.0,
  /** Minimum output for a move to count as "valid" for momentum */
  validMoveMinOutput: 1,
};

// ─── Signal config ────────────────────────────────────────────────────────────
export const SIGNAL_CAPACITY    = 2;   // max signals a player can hold
export const PULSE_BOOST_MULT   = 2.0; // pulse_boost output multiplier
export const GRID_CLEAN_COUNT   = 2;   // number of lowest tiles removed by grid_clean

// ─── Forge ────────────────────────────────────────────────────────────────────
export const FORGE_REROLL_COST = 1;
export const MAX_CATALYSTS     = 6;
export const FORGE_ITEM_COUNTS = {
  catalysts: 3,
  signals: 1,
  patterns: 1,
  utilities: 1,
};
export const CATALYST_SELL_REFUND_BY_RARITY: Record<CatalystRarity, number> = {
  common: 0.6,
  rare: 0.5,
  epic: 0.4,
};
export const PATTERN_SELL_REFUND = 0.5;
export const SIGNAL_SELL_REFUND = 0.5;
export const FORGE_PATTERN_PRICE = 4;
export const FORGE_SIGNAL_PRICE = 3;
export const FORGE_UTILITY_PRICES = {
  energy: 2,
  steps: 3,
  multiplier: 4,
} as const;
export const FORGE_UTILITY_VALUES = {
  energy: 2,
  steps: 2,
  multiplier: 0.08,
} as const;

export interface RarityRule {
  offerWeight: number;
  minRound: number;
  perRunCap?: number;
}

export const CATALYST_RARITY_RULES_BY_ROUND: Array<{
  maxRound: number;
  rules: Record<CatalystRarity, RarityRule>;
}> = [
  {
    maxRound: 2,
    rules: {
      common: { offerWeight: 10, minRound: 1 },
      rare: { offerWeight: 2, minRound: 2, perRunCap: 4 },
      epic: { offerWeight: 0, minRound: 4, perRunCap: 1 },
    },
  },
  {
    maxRound: 4,
    rules: {
      common: { offerWeight: 8, minRound: 1 },
      rare: { offerWeight: 4, minRound: 2, perRunCap: 4 },
      epic: { offerWeight: 0.8, minRound: 4, perRunCap: 1 },
    },
  },
  {
    maxRound: Number.POSITIVE_INFINITY,
    rules: {
      common: { offerWeight: 6, minRound: 1 },
      rare: { offerWeight: 5, minRound: 2, perRunCap: 4 },
      epic: { offerWeight: 1.2, minRound: 4, perRunCap: 2 },
    },
  },
];

export function getRarityRulesForRound(roundNumber: number): Record<CatalystRarity, RarityRule> {
  return CATALYST_RARITY_RULES_BY_ROUND.find(b => roundNumber <= b.maxRound)?.rules
    ?? CATALYST_RARITY_RULES_BY_ROUND[CATALYST_RARITY_RULES_BY_ROUND.length - 1].rules;
}

export const PATTERN_BONUS_BY_LEVEL: Record<PatternId, number> = {
  corner: 0.1,
  chain: 0.1,
  empty_space: 0.025,
  high_tier: 0.12,
  economy: 1,
  survival: 0.12,
};
export const PATTERN_EMPTY_SPACE_CAP = 1.6;

// ─── Anomaly intensity ───────────────────────────────────────────────────────
export const COLLAPSE_FIELD_PERIOD = 4; // every N scoring moves triggers collapse

// ─── Tile spawn probabilities ─────────────────────────────────────────────────
export const SPAWN_4_PROBABILITY         = 0.10; // base chance of spawning a "4"
export const LUCKY_SEED_SPAWN_4_PROBABILITY = 0.25; // with Lucky Seed

// ─── Starting energy ─────────────────────────────────────────────────────────
export const STARTING_ENERGY = 5;

// ─── Display score scaling ────────────────────────────────────────────────────
// Internal score values are unchanged.  All player-facing score displays
// multiply by this factor to make numbers feel more rewarding.
// Set to 1 to disable scaling (internal = display).
export const DISPLAY_SCORE_SCALE = 10;

// ─── Tile display mode ────────────────────────────────────────────────────────
// Controls how individual tiles render their value on the grid.
//   "label"       — show only the theme display label (e.g. "Gold")
//   "label+value" — show the theme label AND the internal numeric value as a
//                   small secondary badge
//   "value-only"  — show only the raw internal value (debug / accessibility)
export type TileDisplayMode = 'label' | 'label+value' | 'value-only';
export const TILE_DISPLAY_MODE: TileDisplayMode = 'label+value';

// ─── Streak system ────────────────────────────────────────────────────────────
/** Minimum output for a move to count toward the streak counter */
export const STREAK_MIN_OUTPUT = 5;
/** Number of consecutive streak moves before granting a bonus */
export const STREAK_BONUS_THRESHOLD = 5;
/** Energy bonus awarded at each streak threshold */
export const STREAK_ENERGY_BONUS = 1;

// ─── Jackpot system ──────────────────────────────────────────────────────────
/** Probability of triggering a jackpot on an exceptional move */
export const JACKPOT_PROBABILITY = 0.02;
/** Minimum output multiplier on a single move to be eligible for jackpot */
export const JACKPOT_MIN_OUTPUT = 50;
/** Output bonus added when jackpot triggers */
export const JACKPOT_OUTPUT_BONUS = 100;
/** Energy bonus added when jackpot triggers */
export const JACKPOT_ENERGY_BONUS = 2;

// ─── Round-end reward ────────────────────────────────────────────────────────
/** Energy bonus granted on every round completion */
export const ROUND_COMPLETE_ENERGY_BONUS = 2;
/** Global multiplier bonus granted on every round completion */
export const ROUND_COMPLETE_MULTIPLIER_BONUS = 0.05;
