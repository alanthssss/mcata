export type TileValue = 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192;

export interface Tile {
  id: number;
  value: number;
  merged: boolean;
}

export type Cell = Tile | null;
export type Grid = Cell[][];  // 4x4

export interface Position {
  row: number;
  col: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

// ─── Catalyst ────────────────────────────────────────────────────────────────
export type CatalystId =
  // Legacy (original 8)
  | 'corner_crown'
  | 'twin_burst'
  | 'lucky_seed'
  | 'bankers_edge'
  | 'reserve'
  | 'frozen_cell'
  | 'combo_wire'
  | 'high_tribute'
  // Amplifier (score multipliers)
  | 'empty_amplifier'
  | 'chain_reactor'
  | 'echo_multiplier'
  | 'threshold_surge'
  | 'phase_resonance'
  // Stabilizer (board control)
  | 'gravity_well'
  | 'soft_reset'
  | 'buffer_zone'
  | 'merge_shield'
  | 'stability_field'
  // Generator (resource / spawn)
  | 'double_spawn'
  | 'rich_merge'
  | 'catalyst_echo'
  | 'energy_loop'
  | 'reserve_bank'
  // Modifier (rule changes)
  | 'diagonal_merge'
  | 'split_protocol'
  | 'inversion_field'
  | 'overflow_grid'
  | 'delay_spawn'
  | 'anomaly_sync';

export type CatalystRarity = 'common' | 'rare' | 'epic';

export type CatalystCategory = 'amplifier' | 'stabilizer' | 'generator' | 'modifier' | 'legacy';

export type CatalystTrigger =
  | 'on_merge'
  | 'on_phase_clear'
  | 'on_spawn'
  | 'on_move'
  | 'passive'
  | 'on_anomaly';

/** Semantic tags used for collection filtering (e.g. "chain", "corner", "energy"). */
export type CatalystTag =
  | 'chain'
  | 'corner'
  | 'energy'
  | 'risk'
  | 'combo'
  | 'control'
  | 'spawn'
  | 'echo'
  | 'surge'
  | 'phase'
  | 'board'
  | 'economy'
  | 'shield'
  | 'anomaly';

export interface CatalystEffectParams {
  multiplier?: number;
  flatBonus?: number;
  energyBonus?: number;
  stepsBonus?: number;
  probability?: number;
  threshold?: number;
  period?: number;
  maxStack?: number;
}

export interface CatalystDef {
  id: CatalystId;
  name: string;
  description: string;
  rarity: CatalystRarity;
  cost: number;
  category: CatalystCategory;
  trigger: CatalystTrigger;
  effectParams: CatalystEffectParams;
  /** Semantic tags for collection filtering. */
  tags: CatalystTag[];
  /** Short flavour text shown in the collection view. */
  flavorText?: string;
  /** Human-readable unlock condition description. */
  unlockCondition: string;
}

// ─── Signal ───────────────────────────────────────────────────────────────────
export type SignalId = 'pulse_boost' | 'grid_clean' | 'chain_trigger' | 'freeze_step';

export interface SignalDef {
  id: SignalId;
  name: string;
  description: string;
}

// ─── Protocol ────────────────────────────────────────────────────────────────
export type ProtocolId = 'corner_protocol' | 'sparse_protocol' | 'overload_protocol';

/**
 * Stakes tier for a protocol.  Describes how demanding the protocol's ruleset
 * is, displayed as a badge on the protocol selection card.
 */
export type RunStakes = 'standard' | 'tactical' | 'overclocked';

export interface ProtocolDef {
  id: ProtocolId;
  name: string;
  description: string;
  /** Emoji icon displayed on the protocol selection card */
  icon: string;
  /** Stakes tier — expresses how demanding this protocol's ruleset is */
  stakes: RunStakes;
  /** Extra corner multiplier applied on top of base corner bonuses */
  cornerMultiplier: number;
  /** Number of starting tiles (default 2) */
  startTiles: number;
  /** Spawn frequency reduction factor (1.0 = normal, >1 = less frequent) */
  spawnFrequencyFactor: number;
  /** Output scaling multiplier */
  outputScale: number;
  /** Steps reduction per phase (0 = no reduction) */
  stepsReduction: number;
}

// ─── Synergy ─────────────────────────────────────────────────────────────────
export type SynergyId =
  | 'corner_empire'
  | 'chain_echo'
  | 'generator_surplus'
  | 'amplified_stability'
  | 'phase_reactor';

export interface SynergyDef {
  id: SynergyId;
  name: string;
  catalysts: [CatalystId, CatalystId];
  multiplier: number;
  description: string;
}

// ─── Anomaly ─────────────────────────────────────────────────────────────────
export type AnomalyId = 'entropy_tax' | 'collapse_field';

export interface AnomalyDef {
  id: AnomalyId;
  name: string;
  description: string;
}

// ─── Phase ───────────────────────────────────────────────────────────────────

/** Tier of challenge within a run. Boss phases carry a rule modifier. */
export type ChallengeTier = 'small' | 'big' | 'boss';

export interface PhaseDef {
  phaseNumber: number;
  targetOutput: number;
  steps: number;
  anomaly?: AnomalyId;
  isForge?: boolean;
  /** Average output a typical player achieves — benchmark lower bound. */
  expectedOutput?: number;
  /** Output a skilled player can consistently achieve — benchmark upper bound. */
  highSkillOutput?: number;
  /** Challenge tier: small / big / boss. Bosses carry a rule modifier. */
  challengeTier?: ChallengeTier;
  /** Human-readable description of the active rule modifier (boss phases). */
  modifier?: string;
}

// ─── Round Template ───────────────────────────────────────────────────────────

/**
 * A round template defines the 6-phase structure for one round.
 * Templates rotate across rounds to keep runs feeling varied.
 */
export interface RoundTemplate {
  id: string;
  name: string;
  description: string;
  phases: PhaseDef[];
}

// ─── Forge ───────────────────────────────────────────────────────────────────
export interface ForgeOffer {
  catalyst: CatalystDef;
  index: number;
}

// ─── Infusion ────────────────────────────────────────────────────────────────
export type InfusionChoice =
  | { type: 'catalyst'; catalyst: CatalystDef }
  | { type: 'energy' }
  | { type: 'steps' }
  | { type: 'multiplier' };

// ─── Merge Info ──────────────────────────────────────────────────────────────
export interface MergeInfo {
  from: [Position, Position];
  to: Position;
  value: number;       // resulting tile value
  isCorner: boolean;
  isHighest: boolean;
}

// ─── Reaction Log ────────────────────────────────────────────────────────────
export interface MultiplierRecord {
  name: string;
  value: number;
}

export interface ReactionLogEntry {
  step: number;
  action: Direction;
  gridBefore: Grid;
  gridAfter: Grid;
  merges: MergeInfo[];
  spawn: Position | null;
  anomalyEffect: string | null;
  base: number;
  multipliers: MultiplierRecord[];
  finalOutput: number;
  triggeredCatalysts: CatalystId[];
  synergyMultiplier: number;
  triggeredSynergies: SynergyId[];
  momentumMultiplier: number;
  signalUsed: SignalId | null;
  signalEffect: string | null;
}

// ─── Meta Progression ────────────────────────────────────────────────────────
export type AscensionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ProfileState {
  unlockedCatalysts: CatalystId[];
  unlockedSignals: SignalId[];
  unlockedProtocols: ProtocolId[];
  unlockedAnomalies: AnomalyId[];
  unlockedAscensionLevel: AscensionLevel;
  metaCurrency: number;
}

export interface RunReward {
  metaCurrencyEarned: number;
  breakdown: {
    base: number;
    phasesBonus: number;
    anomalyBonus: number;
    outputBonus: number;
  };
}

// ─── Game State ──────────────────────────────────────────────────────────────
export type GameScreen =
  | 'start'
  | 'playing'
  | 'forge'
  | 'infusion'
  | 'game_over'
  | 'round_complete'
  | 'run_complete'    // kept for potential "end run early" UI flow
  | 'challenge_select';

export interface GameState {
  screen: GameScreen;
  grid: Grid;
  phaseIndex: number;           // 0-5 (index into phases array)
  stepsRemaining: number;
  energy: number;
  output: number;               // accumulated output for current phase
  totalOutput: number;          // accumulated across all phases
  activeCatalysts: CatalystId[];
  globalMultiplier: number;     // starts at 1.0, increases from Infusion
  comboWireCount: number;       // consecutive scoring moves for Combo Wire
  frozenCell: Position | null;  // for Frozen Cell catalyst
  collapseFieldCounter: number; // for Collapse Field anomaly
  entropyBlockedCell: Position | null; // for Entropy Tax anomaly
  reactionLog: ReactionLogEntry[];
  forgeOffers: CatalystDef[];
  infusionOptions: InfusionChoice[];
  tileIdCounter: number;
  rngSeed: number;
  // Signal system
  signals: SignalId[];          // active signals (max SIGNAL_CAPACITY)
  pendingSignal: SignalId | null; // signal queued for this move
  // Protocol system
  protocol: ProtocolId;
  // Momentum system
  consecutiveValidMoves: number; // for momentum calculation
  momentumMultiplier: number;    // current momentum multiplier
  // Extended catalyst state
  delayedSpawnCount: number;     // tiles owed from Delay Spawn
  stabilityCount: number;        // consecutive non-bad moves for Stability Field
  shieldCharge: number;          // remaining Merge Shield charges
  echoOutputLast: number;        // last move output for Echo Multiplier
  // Meta progression
  ascensionLevel: AscensionLevel;
  unlockedCatalysts: CatalystId[] | undefined; // undefined = full pool
  // Run-level catalyst pool — starts as unlockedCatalysts, shrinks as catalysts are acquired
  // undefined = full pool (mirrors unlockedCatalysts); empty array = pool exhausted
  catalystPool: CatalystId[] | undefined;
  // Round progression
  roundNumber: number;                         // current round (starts at 1)
  // Round stats
  roundOutput: number;          // output accumulated in the current round
  bestMoveOutput: number;       // highest single-move output this run
  // Streak system
  streakCount: number;          // consecutive high-output moves (≥ STREAK_MIN_OUTPUT)
  bestStreak: number;           // best streak this run
  // Milestone/jackpot system
  triggeredMilestones: import('./milestones').MilestoneId[];
  pendingMilestones: import('./milestones').MilestoneId[];  // queued for display
  jackpotTriggered: boolean;    // true for 1 tick after jackpot
  // Challenge mode
  challengeId: import('./challenges').ChallengeId | null;
  // Daily run flag
  isDailyRun: boolean;
}
