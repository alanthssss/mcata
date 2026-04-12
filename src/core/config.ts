// Centralized tuning configuration for Merge Catalyst.
// All balance-sensitive values live here so tuning changes are one-line edits.

export const PHASE_CONFIG: Array<{
  phaseNumber: number;
  targetOutput: number;
  steps: number;
  anomaly?: 'entropy_tax' | 'collapse_field';
}> = [
  { phaseNumber: 1, targetOutput: 70,  steps: 12 },
  { phaseNumber: 2, targetOutput: 80,  steps: 12 },
  { phaseNumber: 3, targetOutput: 75,  steps: 10 },
  { phaseNumber: 4, targetOutput: 40,  steps: 8,  anomaly: 'entropy_tax' },
  { phaseNumber: 5, targetOutput: 80,  steps: 10 },
  { phaseNumber: 6, targetOutput: 55,  steps: 8,  anomaly: 'collapse_field' },
];

// After which phase index (0-based) the Forge screen is shown.
export const FORGE_AFTER_PHASE = 2;

// ─── Catalyst multipliers ─────────────────────────────────────────────────────
export const CATALYST_MULTIPLIERS = {
  corner_crown:   2.0,   // corner merge multiplier
  twin_burst:     1.5,   // ≥2 merges multiplier
  combo_wire:     1.3,   // 3-consecutive-scoring-moves multiplier
  high_tribute:   1.4,   // highest-tile merge multiplier
  reserve_bonus:  20,    // output per unused step (Reserve catalyst)
  bankers_edge_energy: 2, // extra energy from Banker's Edge on phase clear
  lucky_seed_pct: 0.75,  // probability of spawning a "2" with Lucky Seed
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
