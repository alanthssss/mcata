import { CatalystId, SynergyId } from './types';

export type MilestoneId =
  | 'output_1k' | 'output_5k' | 'output_10k' | 'output_50k' | 'output_100k'
  | 'round_3' | 'round_5' | 'round_10'
  | 'tile_256' | 'tile_512' | 'tile_1024' | 'tile_2048';

export interface MilestoneDef {
  id: MilestoneId;
  label: string;
  description: string;
  /** reward given when milestone is first reached */
  reward: MilestoneReward;
}

export interface MilestoneReward {
  type: 'energy' | 'multiplier' | 'none';
  amount: number;
}

export const MILESTONE_DEFS: Record<MilestoneId, MilestoneDef> = {
  output_1k:    { id: 'output_1k',    label: 'Output 1,000',   description: 'Reach 1,000 cumulative output',   reward: { type: 'energy',     amount: 2  } },
  output_5k:    { id: 'output_5k',    label: 'Output 5,000',   description: 'Reach 5,000 cumulative output',   reward: { type: 'energy',     amount: 4  } },
  output_10k:   { id: 'output_10k',   label: 'Output 10,000',  description: 'Reach 10,000 cumulative output',  reward: { type: 'multiplier', amount: 0.1} },
  output_50k:   { id: 'output_50k',   label: 'Output 50,000',  description: 'Reach 50,000 cumulative output',  reward: { type: 'multiplier', amount: 0.15} },
  output_100k:  { id: 'output_100k',  label: 'Output 100,000', description: 'Reach 100,000 cumulative output', reward: { type: 'multiplier', amount: 0.2} },
  round_3:      { id: 'round_3',      label: 'Round 3',        description: 'Clear 3 complete rounds',         reward: { type: 'energy',     amount: 3  } },
  round_5:      { id: 'round_5',      label: 'Round 5',        description: 'Clear 5 complete rounds',         reward: { type: 'multiplier', amount: 0.1} },
  round_10:     { id: 'round_10',     label: 'Round 10',       description: 'Clear 10 complete rounds',        reward: { type: 'multiplier', amount: 0.2} },
  tile_256:     { id: 'tile_256',     label: 'Tile 256',       description: 'Create a 256 tile',               reward: { type: 'energy',     amount: 2  } },
  tile_512:     { id: 'tile_512',     label: 'Tile 512',       description: 'Create a 512 tile',               reward: { type: 'energy',     amount: 3  } },
  tile_1024:    { id: 'tile_1024',    label: 'Tile 1,024',     description: 'Create a 1,024 tile',             reward: { type: 'multiplier', amount: 0.1} },
  tile_2048:    { id: 'tile_2048',    label: 'Tile 2,048',     description: 'Create a 2,048 tile',             reward: { type: 'multiplier', amount: 0.2} },
};

export const ALL_MILESTONES = Object.values(MILESTONE_DEFS);

/** Output thresholds for milestone checking */
export const OUTPUT_MILESTONE_THRESHOLDS: Partial<Record<MilestoneId, number>> = {
  output_1k:   100,   // internal value; multiply by DISPLAY_SCORE_SCALE for display
  output_5k:   500,
  output_10k:  1000,
  output_50k:  5000,
  output_100k: 10000,
};

/** Round thresholds */
export const ROUND_MILESTONE_THRESHOLDS: Partial<Record<MilestoneId, number>> = {
  round_3:  3,
  round_5:  5,
  round_10: 10,
};

/** Max tile thresholds */
export const TILE_MILESTONE_THRESHOLDS: Partial<Record<MilestoneId, number>> = {
  tile_256:  256,
  tile_512:  512,
  tile_1024: 1024,
  tile_2048: 2048,
};

/**
 * Check which new milestones are reached given the current game state.
 * Returns only milestones not already triggered.
 */
export function checkMilestones(
  totalOutput: number,
  roundNumber: number,
  maxTile: number,
  alreadyTriggered: MilestoneId[]
): MilestoneId[] {
  const newlyTriggered: MilestoneId[] = [];

  for (const [id, threshold] of Object.entries(OUTPUT_MILESTONE_THRESHOLDS)) {
    const mid = id as MilestoneId;
    if (!alreadyTriggered.includes(mid) && totalOutput >= threshold!) {
      newlyTriggered.push(mid);
    }
  }
  for (const [id, threshold] of Object.entries(ROUND_MILESTONE_THRESHOLDS)) {
    const mid = id as MilestoneId;
    if (!alreadyTriggered.includes(mid) && roundNumber >= threshold!) {
      newlyTriggered.push(mid);
    }
  }
  for (const [id, threshold] of Object.entries(TILE_MILESTONE_THRESHOLDS)) {
    const mid = id as MilestoneId;
    if (!alreadyTriggered.includes(mid) && maxTile >= threshold!) {
      newlyTriggered.push(mid);
    }
  }

  return newlyTriggered;
}
