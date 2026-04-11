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
  | 'corner_crown'
  | 'twin_burst'
  | 'lucky_seed'
  | 'bankers_edge'
  | 'reserve'
  | 'frozen_cell'
  | 'combo_wire'
  | 'high_tribute';

export type CatalystRarity = 'common' | 'rare';

export interface CatalystDef {
  id: CatalystId;
  name: string;
  description: string;
  rarity: CatalystRarity;
  cost: number;
}

// ─── Anomaly ─────────────────────────────────────────────────────────────────
export type AnomalyId = 'entropy_tax' | 'collapse_field';

export interface AnomalyDef {
  id: AnomalyId;
  name: string;
  description: string;
}

// ─── Phase ───────────────────────────────────────────────────────────────────
export interface PhaseDef {
  phaseNumber: number;
  targetOutput: number;
  steps: number;
  anomaly?: AnomalyId;
  isForge?: boolean;
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
}

// ─── Game State ──────────────────────────────────────────────────────────────
export type GameScreen =
  | 'start'
  | 'playing'
  | 'forge'
  | 'infusion'
  | 'game_over'
  | 'run_complete';

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
}
