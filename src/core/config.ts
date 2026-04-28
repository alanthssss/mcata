import type { CatalystRarity, PatternId } from './types';
import type { RarityRule, TileDisplayMode } from './gameConfigSchema';
import { GAME_CONFIG } from './generatedGameConfig';

export type { RarityRule, TileDisplayMode };

export const BALANCE_VERSION = GAME_CONFIG.balanceVersion;

export const PHASE_CONFIG = GAME_CONFIG.phaseConfig;

export const PROGRESSION_SCALING = GAME_CONFIG.progressionScaling;

export const SEGMENTED_GROWTH_SCALING = GAME_CONFIG.segmentedGrowthScaling;
export const ROUND_TARGET_SCALE = GAME_CONFIG.roundTargetScale;
export const ROUND_SCALE_COMPOUND = GAME_CONFIG.roundScaleCompound;

export const BUILD_AWARE_SCALING = GAME_CONFIG.buildAwareScaling;
export const ROUND_ECONOMY_SCALE = GAME_CONFIG.roundEconomyScale;

export const CATALYST_MULTIPLIERS = GAME_CONFIG.catalystMultipliers;

export const CHAIN_MULTIPLIERS: Record<number, number> = GAME_CONFIG.chainMultipliers;
export const CHAIN_MULTIPLIER_4PLUS = GAME_CONFIG.chainMultiplier4Plus;

export const CORNER_MERGE_MULT = GAME_CONFIG.conditionMultipliers.cornerMerge;
export const HIGHEST_TILE_MULT = GAME_CONFIG.conditionMultipliers.highestTile;

export const SYNERGY_MULTIPLIERS = GAME_CONFIG.synergyMultipliers;

export const MOMENTUM_CONFIG = GAME_CONFIG.momentumConfig;

export const SIGNAL_CAPACITY = GAME_CONFIG.signalConfig.capacity;
export const PULSE_BOOST_MULT = GAME_CONFIG.signalConfig.pulseBoostMult;
export const GRID_CLEAN_COUNT = GAME_CONFIG.signalConfig.gridCleanCount;

export const FORGE_REROLL_COST = GAME_CONFIG.forge.rerollCost;
export const MAX_CATALYSTS = GAME_CONFIG.forge.maxCatalysts;
export const FORGE_ITEM_COUNTS = GAME_CONFIG.forge.itemCounts;
export const CATALYST_SELL_REFUND_BY_RARITY: Record<CatalystRarity, number> = GAME_CONFIG.forge.sellRefundByRarity;
export const PATTERN_SELL_REFUND = GAME_CONFIG.forge.patternSellRefund;
export const SIGNAL_SELL_REFUND = GAME_CONFIG.forge.signalSellRefund;
export const FORGE_PATTERN_PRICE = GAME_CONFIG.forge.patternPrice;
export const FORGE_SIGNAL_PRICE = GAME_CONFIG.forge.signalPrice;
export const FORGE_UTILITY_PRICES = GAME_CONFIG.forge.utilityPrices;
export const FORGE_UTILITY_VALUES = GAME_CONFIG.forge.utilityValues;

export const CATALYST_RARITY_RULES_BY_ROUND: Array<{
  maxRound: number;
  rules: Record<CatalystRarity, RarityRule>;
}> = GAME_CONFIG.rarityRulesByRound;

export function getRarityRulesForRound(roundNumber: number): Record<CatalystRarity, RarityRule> {
  return CATALYST_RARITY_RULES_BY_ROUND.find(b => roundNumber <= b.maxRound)?.rules
    ?? CATALYST_RARITY_RULES_BY_ROUND[CATALYST_RARITY_RULES_BY_ROUND.length - 1].rules;
}

export const PATTERN_BONUS_BY_LEVEL: Record<PatternId, number> = GAME_CONFIG.patternBonusByLevel;
export const PATTERN_EMPTY_SPACE_CAP = GAME_CONFIG.patternEmptySpaceCap;

export const COLLAPSE_FIELD_PERIOD = GAME_CONFIG.collapseFieldPeriod;

export const SPAWN_4_PROBABILITY = GAME_CONFIG.spawn4Probability;
export const LUCKY_SEED_SPAWN_4_PROBABILITY = GAME_CONFIG.luckySeedSpawn4Probability;

export const STARTING_ENERGY = GAME_CONFIG.startingEnergy;

export const DISPLAY_SCORE_SCALE = GAME_CONFIG.displayScoreScale;

export const TILE_DISPLAY_MODE: TileDisplayMode = GAME_CONFIG.tileDisplayMode;

export const STREAK_MIN_OUTPUT = GAME_CONFIG.streak.minOutput;
export const STREAK_BONUS_THRESHOLD = GAME_CONFIG.streak.bonusThreshold;
export const STREAK_ENERGY_BONUS = GAME_CONFIG.streak.energyBonus;

export const JACKPOT_PROBABILITY = GAME_CONFIG.jackpot.probability;
export const JACKPOT_MIN_OUTPUT = GAME_CONFIG.jackpot.minOutput;
export const JACKPOT_OUTPUT_BONUS = GAME_CONFIG.jackpot.outputBonus;
export const JACKPOT_ENERGY_BONUS = GAME_CONFIG.jackpot.energyBonus;

export const ROUND_COMPLETE_ENERGY_BONUS = GAME_CONFIG.roundCompleteReward.energyBonus;
export const ROUND_COMPLETE_MULTIPLIER_BONUS = GAME_CONFIG.roundCompleteReward.multiplierBonus;

export const BUILD_IDENTITY_CONFIG = GAME_CONFIG.buildIdentity;

export const BENCHMARK_TUNING_BASELINE_CANDIDATE = GAME_CONFIG.benchmarkTuning.baselineCandidate;
export const BENCHMARK_TUNING_BOUNDS = GAME_CONFIG.benchmarkTuning.bounds;
export const BENCHMARK_TUNING_TARGETS = GAME_CONFIG.benchmarkTuning.heuristicTargets;

export const INFINITE_MODE_CONFIG = GAME_CONFIG.infiniteMode;
