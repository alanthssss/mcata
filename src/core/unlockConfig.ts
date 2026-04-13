/**
 * Unlock system configuration.
 *
 * All unlock costs, default unlock sets, and meta-currency rules live here.
 * Nothing is hard-coded outside this file.
 */
import { CatalystId, SignalId, ProtocolId, AnomalyId } from './types';

// ─── Default unlocked content ────────────────────────────────────────────────

/** The 8 legacy catalysts unlocked in a fresh profile. */
export const BASE_UNLOCKED_CATALYSTS: CatalystId[] = [
  'corner_crown',
  'twin_burst',
  'lucky_seed',
  'bankers_edge',
  'reserve',
  'frozen_cell',
  'combo_wire',
  'high_tribute',
];

/** Signals available by default (none — must be unlocked). */
export const BASE_UNLOCKED_SIGNALS: SignalId[] = [];

/** Protocols available by default. */
export const BASE_UNLOCKED_PROTOCOLS: ProtocolId[] = ['corner_protocol'];

/** Anomalies available by default (both are always in play). */
export const BASE_UNLOCKED_ANOMALIES: AnomalyId[] = ['entropy_tax', 'collapse_field'];

// ─── Unlock costs (in Core Shards) ──────────────────────────────────────────

export const UNLOCK_COSTS = {
  catalyst: {
    common: 15,
    rare:   25,
    epic:   40,
  },
  signal:        20,
  protocol:      30,
  /**
   * Anomaly unlocks reuse the common-catalyst cost tier.
   * (Anomalies are always active in runs so this cost is for future use.)
   */
  anomaly:       15,
  /** Cost to unlock Ascension level N = ASCENSION_UNLOCK_COST_PER_LEVEL × N */
  ascensionLevelPerLevel: 20,
} as const;

// ─── Meta currency config ────────────────────────────────────────────────────

export const META_CURRENCY_CONFIG = {
  /** Display name of the currency. */
  name: 'Core Shards',

  /** Flat reward every player earns for completing (or attempting) a run. */
  baseReward: 10,

  /** Bonus shards per phase cleared. */
  perPhaseClearedBonus: 5,

  /** Bonus shards when at least one anomaly phase is cleared. */
  anomalyClearBonus: 10,

  /**
   * Bonus shards per 100 total output above this threshold.
   * E.g. if totalOutput = 450, threshold = 200 → floor((450-200)/100) × rate
   */
  highOutputThreshold: 200,
  highOutputBonusPerHundred: 1,
} as const;
