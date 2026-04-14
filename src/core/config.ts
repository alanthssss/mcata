// Centralized tuning configuration for Merge Catalyst.
// All balance-sensitive values live here so tuning changes are one-line edits.

export const BALANCE_VERSION = 'v3';

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
    targetOutput: 70,
    steps: 12,
    expectedOutput: 90,
    highSkillOutput: 140,
    challengeTier: 'small',
  },
  {
    phaseNumber: 2,
    targetOutput: 80,
    steps: 12,
    expectedOutput: 110,
    highSkillOutput: 180,
    challengeTier: 'big',
  },
  {
    phaseNumber: 3,
    targetOutput: 75,
    steps: 10,
    expectedOutput: 100,
    highSkillOutput: 160,
    challengeTier: 'boss',
    modifier: 'Corner bonus disabled — chain merges are your only edge',
  },
  {
    phaseNumber: 4,
    targetOutput: 40,
    steps: 8,
    anomaly: 'entropy_tax',
    expectedOutput: 55,
    highSkillOutput: 90,
    challengeTier: 'small',
    modifier: 'Entropy Tax: one cell blocked each move',
  },
  {
    phaseNumber: 5,
    targetOutput: 80,
    steps: 10,
    expectedOutput: 110,
    highSkillOutput: 200,
    challengeTier: 'big',
  },
  {
    phaseNumber: 6,
    targetOutput: 55,
    steps: 8,
    anomaly: 'collapse_field',
    expectedOutput: 75,
    highSkillOutput: 130,
    challengeTier: 'boss',
    modifier: 'Collapse Field: every 4 scoring moves removes the lowest tile',
  },
];

// After which phase index (0-based) the Forge screen is shown.
export const FORGE_AFTER_PHASE = 2;

// ─── Scoring config ───────────────────────────────────────────────────────────
export const CATALYST_MULTIPLIERS = {
  corner_crown:   2.0,   // corner merge multiplier
  twin_burst:     1.5,   // ≥2 merges multiplier
  combo_wire:     1.3,   // 3-consecutive-scoring-moves multiplier
  high_tribute:   1.4,   // highest-tile merge multiplier
  reserve_bonus:  20,    // output per unused step (Reserve catalyst)
  bankers_edge_energy: 2, // extra energy from Banker's Edge on phase clear
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
  energy_loop_fraction:        0.1, // fraction of output that becomes energy
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

// ─── Infusion rewards ─────────────────────────────────────────────────────────
export const INFUSION_ENERGY_BONUS     = 3;
export const INFUSION_STEPS_BONUS      = 2;
export const INFUSION_MULTIPLIER_BONUS = 0.1;

// ─── Forge ────────────────────────────────────────────────────────────────────
export const FORGE_REROLL_COST = 1;
export const MAX_CATALYSTS     = 3;

// ─── Anomaly intensity ───────────────────────────────────────────────────────
export const COLLAPSE_FIELD_PERIOD = 4; // every N scoring moves triggers collapse

// ─── Tile spawn probabilities ─────────────────────────────────────────────────
export const SPAWN_4_PROBABILITY         = 0.10; // base chance of spawning a "4"
export const LUCKY_SEED_SPAWN_4_PROBABILITY = 0.25; // with Lucky Seed

// ─── Starting energy ─────────────────────────────────────────────────────────
export const STARTING_ENERGY = 10;

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
