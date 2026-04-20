import type { CatalystRarity, PatternId } from './types';

export type TileDisplayMode = 'label' | 'label+value' | 'value-only';

export interface RarityRule {
  offerWeight: number;
  minRound: number;
  perRunCap?: number;
}

export interface BenchmarkTuningConfig {
  baselineCandidate: {
    stepsMultiplier: number;
    targetOutputMultiplier: number;
    roundScaleMultiplier: number;
    startingEnergy: number;
    energyIncomeMultiplier: number;
  };
  bounds: Record<'stepsMultiplier' | 'targetOutputMultiplier' | 'roundScaleMultiplier' | 'startingEnergy' | 'energyIncomeMultiplier', [number, number]>;
  heuristicTargets: {
    avgMovesPerPhase: { min?: number; max?: number };
    avgHighestTierPerPhase: { min?: number; max?: number };
    lateGameClearSpeed: { min?: number; max?: number };
    energyIncomePerRound: { min?: number; max?: number };
    forgeAffordabilityRate: { min?: number; max?: number };
    buildMaturityRound3: { min?: number; max?: number };
  };
}

export interface GameConfig {
  balanceVersion: string;
  phaseConfig: Array<{
    phaseNumber: number;
    targetOutput: number;
    steps: number;
    anomaly?: 'entropy_tax' | 'collapse_field';
    expectedOutput: number;
    highSkillOutput: number;
    challengeTier: 'small' | 'big' | 'boss';
    modifier?: string;
  }>;
  progressionScaling: {
    stepPhaseScale: number;
    stepRoundScale: number;
    targetPhaseScale: number;
    targetRoundScale: number;
  };
  segmentedGrowthScaling: {
    roundIndexOffset: number;
    roundIndexScale: number;
  };
  roundTargetScale: number;
  roundScaleCompound: boolean;
  buildAwareScaling: {
    enabled: boolean;
    catalystWeight: number;
    multiplierWeight: number;
    maxFactor: number;
  };
  roundEconomyScale: number;
  catalystMultipliers: Record<string, number>;
  chainMultipliers: Record<number, number>;
  chainMultiplier4Plus: number;
  conditionMultipliers: {
    cornerMerge: number;
    highestTile: number;
  };
  synergyMultipliers: Record<string, number>;
  momentumConfig: {
    growthRate: number;
    maxMultiplier: number;
    validMoveMinOutput: number;
  };
  signalConfig: {
    capacity: number;
    pulseBoostMult: number;
    gridCleanCount: number;
  };
  forge: {
    rerollCost: number;
    maxCatalysts: number;
    itemCounts: { catalysts: number; signals: number; patterns: number; utilities: number };
    sellRefundByRarity: Record<CatalystRarity, number>;
    patternSellRefund: number;
    signalSellRefund: number;
    patternPrice: number;
    signalPrice: number;
    utilityPrices: { energy: number; steps: number; multiplier: number };
    utilityValues: { energy: number; steps: number; multiplier: number };
  };
  rarityRulesByRound: Array<{ maxRound: number; rules: Record<CatalystRarity, RarityRule> }>;
  patternBonusByLevel: Record<PatternId, number>;
  patternEmptySpaceCap: number;
  collapseFieldPeriod: number;
  spawn4Probability: number;
  luckySeedSpawn4Probability: number;
  startingEnergy: number;
  displayScoreScale: number;
  tileDisplayMode: TileDisplayMode;
  streak: {
    minOutput: number;
    bonusThreshold: number;
    energyBonus: number;
  };
  jackpot: {
    probability: number;
    minOutput: number;
    outputBonus: number;
    energyBonus: number;
  };
  roundCompleteReward: {
    energyBonus: number;
    multiplierBonus: number;
  };
  buildIdentity: {
    minConfidenceForClear: number;
    mixedThreshold: number;
  };
  benchmarkTuning: BenchmarkTuningConfig;
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid config at ${path}: expected object`);
  }
  return value as Record<string, unknown>;
}

function assertNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid config at ${path}: expected number`);
  }
  return value;
}

function assertBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid config at ${path}: expected boolean`);
  }
  return value;
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid config at ${path}: expected string`);
  }
  return value;
}

function assertArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid config at ${path}: expected array`);
  }
  return value;
}

export function validateGameConfig(raw: unknown): GameConfig {
  const root = assertObject(raw, 'root');

  const phaseConfig = assertArray(root.phaseConfig, 'phaseConfig').map((phaseRaw, idx) => {
    const phase = assertObject(phaseRaw, `phaseConfig[${idx}]`);
    const challengeTier = assertString(phase.challengeTier, `phaseConfig[${idx}].challengeTier`) as 'small' | 'big' | 'boss';
    if (!['small', 'big', 'boss'].includes(challengeTier)) {
      throw new Error(`Invalid config at phaseConfig[${idx}].challengeTier: expected small|big|boss`);
    }
    const anomalyRaw = phase.anomaly;
    if (anomalyRaw !== undefined && anomalyRaw !== 'entropy_tax' && anomalyRaw !== 'collapse_field') {
      throw new Error(`Invalid config at phaseConfig[${idx}].anomaly: expected entropy_tax|collapse_field`);
    }
    return {
      phaseNumber: assertNumber(phase.phaseNumber, `phaseConfig[${idx}].phaseNumber`),
      targetOutput: assertNumber(phase.targetOutput, `phaseConfig[${idx}].targetOutput`),
      steps: assertNumber(phase.steps, `phaseConfig[${idx}].steps`),
      expectedOutput: assertNumber(phase.expectedOutput, `phaseConfig[${idx}].expectedOutput`),
      highSkillOutput: assertNumber(phase.highSkillOutput, `phaseConfig[${idx}].highSkillOutput`),
      challengeTier,
      anomaly: anomalyRaw as 'entropy_tax' | 'collapse_field' | undefined,
      modifier: phase.modifier === undefined ? undefined : assertString(phase.modifier, `phaseConfig[${idx}].modifier`),
    };
  });

  const progressionScalingObj = assertObject(root.progressionScaling, 'progressionScaling');
  const segmentedGrowthScalingObj = assertObject(root.segmentedGrowthScaling, 'segmentedGrowthScaling');
  const buildAwareScalingObj = assertObject(root.buildAwareScaling, 'buildAwareScaling');
  const conditionMultipliersObj = assertObject(root.conditionMultipliers, 'conditionMultipliers');
  const momentumConfigObj = assertObject(root.momentumConfig, 'momentumConfig');
  const signalConfigObj = assertObject(root.signalConfig, 'signalConfig');
  const forgeObj = assertObject(root.forge, 'forge');
  const forgeItemCountsObj = assertObject(forgeObj.itemCounts, 'forge.itemCounts');
  const forgeSellRefundObj = assertObject(forgeObj.sellRefundByRarity, 'forge.sellRefundByRarity');
  const forgeUtilityPricesObj = assertObject(forgeObj.utilityPrices, 'forge.utilityPrices');
  const forgeUtilityValuesObj = assertObject(forgeObj.utilityValues, 'forge.utilityValues');
  const streakObj = assertObject(root.streak, 'streak');
  const jackpotObj = assertObject(root.jackpot, 'jackpot');
  const roundCompleteRewardObj = assertObject(root.roundCompleteReward, 'roundCompleteReward');
  const buildIdentityObj = assertObject(root.buildIdentity, 'buildIdentity');
  const benchmarkTuningObj = assertObject(root.benchmarkTuning, 'benchmarkTuning');
  const baselineCandidateObj = assertObject(benchmarkTuningObj.baselineCandidate, 'benchmarkTuning.baselineCandidate');
  const boundsObj = assertObject(benchmarkTuningObj.bounds, 'benchmarkTuning.bounds');
  const heuristicTargetsObj = assertObject(benchmarkTuningObj.heuristicTargets, 'benchmarkTuning.heuristicTargets');

  const chainMultipliersRaw = assertObject(root.chainMultipliers, 'chainMultipliers');
  const chainMultipliers: Record<number, number> = {};
  Object.entries(chainMultipliersRaw).forEach(([key, value]) => {
    chainMultipliers[Number(key)] = assertNumber(value, `chainMultipliers.${key}`);
  });

  const rarityRulesByRound = assertArray(root.rarityRulesByRound, 'rarityRulesByRound').map((entryRaw, idx) => {
    const entry = assertObject(entryRaw, `rarityRulesByRound[${idx}]`);
    const rulesObj = assertObject(entry.rules, `rarityRulesByRound[${idx}].rules`);
    const rules: Record<CatalystRarity, RarityRule> = {
      common: { offerWeight: 0, minRound: 0 },
      rare: { offerWeight: 0, minRound: 0 },
      epic: { offerWeight: 0, minRound: 0 },
    };
    (['common', 'rare', 'epic'] as const).forEach((rarity) => {
      const ruleObj = assertObject(rulesObj[rarity], `rarityRulesByRound[${idx}].rules.${rarity}`);
      rules[rarity] = {
        offerWeight: assertNumber(ruleObj.offerWeight, `rarityRulesByRound[${idx}].rules.${rarity}.offerWeight`),
        minRound: assertNumber(ruleObj.minRound, `rarityRulesByRound[${idx}].rules.${rarity}.minRound`),
        perRunCap: ruleObj.perRunCap === undefined ? undefined : assertNumber(ruleObj.perRunCap, `rarityRulesByRound[${idx}].rules.${rarity}.perRunCap`),
      };
    });
    return {
      maxRound: assertNumber(entry.maxRound, `rarityRulesByRound[${idx}].maxRound`),
      rules,
    };
  });

  const patternBonusByLevelRaw = assertObject(root.patternBonusByLevel, 'patternBonusByLevel');
  const patternBonusByLevel = {
    corner: assertNumber(patternBonusByLevelRaw.corner, 'patternBonusByLevel.corner'),
    chain: assertNumber(patternBonusByLevelRaw.chain, 'patternBonusByLevel.chain'),
    empty_space: assertNumber(patternBonusByLevelRaw.empty_space, 'patternBonusByLevel.empty_space'),
    high_tier: assertNumber(patternBonusByLevelRaw.high_tier, 'patternBonusByLevel.high_tier'),
    economy: assertNumber(patternBonusByLevelRaw.economy, 'patternBonusByLevel.economy'),
    survival: assertNumber(patternBonusByLevelRaw.survival, 'patternBonusByLevel.survival'),
  };

  const parseRange = (rawRange: unknown, path: string): [number, number] => {
    const arr = assertArray(rawRange, path);
    if (arr.length !== 2) {
      throw new Error(`Invalid config at ${path}: expected [min, max]`);
    }
    return [assertNumber(arr[0], `${path}[0]`), assertNumber(arr[1], `${path}[1]`)];
  };

  const parseMetricRange = (rawRange: unknown, path: string): { min?: number; max?: number } => {
    const rangeObj = assertObject(rawRange, path);
    return {
      min: rangeObj.min === undefined ? undefined : assertNumber(rangeObj.min, `${path}.min`),
      max: rangeObj.max === undefined ? undefined : assertNumber(rangeObj.max, `${path}.max`),
    };
  };

  return {
    balanceVersion: assertString(root.balanceVersion, 'balanceVersion'),
    phaseConfig,
    progressionScaling: {
      stepPhaseScale: assertNumber(progressionScalingObj.stepPhaseScale, 'progressionScaling.stepPhaseScale'),
      stepRoundScale: assertNumber(progressionScalingObj.stepRoundScale, 'progressionScaling.stepRoundScale'),
      targetPhaseScale: assertNumber(progressionScalingObj.targetPhaseScale, 'progressionScaling.targetPhaseScale'),
      targetRoundScale: assertNumber(progressionScalingObj.targetRoundScale, 'progressionScaling.targetRoundScale'),
    },
    segmentedGrowthScaling: {
      roundIndexOffset: assertNumber(segmentedGrowthScalingObj.roundIndexOffset, 'segmentedGrowthScaling.roundIndexOffset'),
      roundIndexScale: assertNumber(segmentedGrowthScalingObj.roundIndexScale, 'segmentedGrowthScaling.roundIndexScale'),
    },
    roundTargetScale: assertNumber(root.roundTargetScale, 'roundTargetScale'),
    roundScaleCompound: assertBoolean(root.roundScaleCompound, 'roundScaleCompound'),
    buildAwareScaling: {
      enabled: assertBoolean(buildAwareScalingObj.enabled, 'buildAwareScaling.enabled'),
      catalystWeight: assertNumber(buildAwareScalingObj.catalystWeight, 'buildAwareScaling.catalystWeight'),
      multiplierWeight: assertNumber(buildAwareScalingObj.multiplierWeight, 'buildAwareScaling.multiplierWeight'),
      maxFactor: assertNumber(buildAwareScalingObj.maxFactor, 'buildAwareScaling.maxFactor'),
    },
    roundEconomyScale: assertNumber(root.roundEconomyScale, 'roundEconomyScale'),
    catalystMultipliers: Object.fromEntries(Object.entries(assertObject(root.catalystMultipliers, 'catalystMultipliers')).map(([key, val]) => [key, assertNumber(val, `catalystMultipliers.${key}`)])),
    chainMultipliers,
    chainMultiplier4Plus: assertNumber(root.chainMultiplier4Plus, 'chainMultiplier4Plus'),
    conditionMultipliers: {
      cornerMerge: assertNumber(conditionMultipliersObj.cornerMerge, 'conditionMultipliers.cornerMerge'),
      highestTile: assertNumber(conditionMultipliersObj.highestTile, 'conditionMultipliers.highestTile'),
    },
    synergyMultipliers: Object.fromEntries(Object.entries(assertObject(root.synergyMultipliers, 'synergyMultipliers')).map(([key, val]) => [key, assertNumber(val, `synergyMultipliers.${key}`)])),
    momentumConfig: {
      growthRate: assertNumber(momentumConfigObj.growthRate, 'momentumConfig.growthRate'),
      maxMultiplier: assertNumber(momentumConfigObj.maxMultiplier, 'momentumConfig.maxMultiplier'),
      validMoveMinOutput: assertNumber(momentumConfigObj.validMoveMinOutput, 'momentumConfig.validMoveMinOutput'),
    },
    signalConfig: {
      capacity: assertNumber(signalConfigObj.capacity, 'signalConfig.capacity'),
      pulseBoostMult: assertNumber(signalConfigObj.pulseBoostMult, 'signalConfig.pulseBoostMult'),
      gridCleanCount: assertNumber(signalConfigObj.gridCleanCount, 'signalConfig.gridCleanCount'),
    },
    forge: {
      rerollCost: assertNumber(forgeObj.rerollCost, 'forge.rerollCost'),
      maxCatalysts: assertNumber(forgeObj.maxCatalysts, 'forge.maxCatalysts'),
      itemCounts: {
        catalysts: assertNumber(forgeItemCountsObj.catalysts, 'forge.itemCounts.catalysts'),
        signals: assertNumber(forgeItemCountsObj.signals, 'forge.itemCounts.signals'),
        patterns: assertNumber(forgeItemCountsObj.patterns, 'forge.itemCounts.patterns'),
        utilities: assertNumber(forgeItemCountsObj.utilities, 'forge.itemCounts.utilities'),
      },
      sellRefundByRarity: {
        common: assertNumber(forgeSellRefundObj.common, 'forge.sellRefundByRarity.common'),
        rare: assertNumber(forgeSellRefundObj.rare, 'forge.sellRefundByRarity.rare'),
        epic: assertNumber(forgeSellRefundObj.epic, 'forge.sellRefundByRarity.epic'),
      },
      patternSellRefund: assertNumber(forgeObj.patternSellRefund, 'forge.patternSellRefund'),
      signalSellRefund: assertNumber(forgeObj.signalSellRefund, 'forge.signalSellRefund'),
      patternPrice: assertNumber(forgeObj.patternPrice, 'forge.patternPrice'),
      signalPrice: assertNumber(forgeObj.signalPrice, 'forge.signalPrice'),
      utilityPrices: {
        energy: assertNumber(forgeUtilityPricesObj.energy, 'forge.utilityPrices.energy'),
        steps: assertNumber(forgeUtilityPricesObj.steps, 'forge.utilityPrices.steps'),
        multiplier: assertNumber(forgeUtilityPricesObj.multiplier, 'forge.utilityPrices.multiplier'),
      },
      utilityValues: {
        energy: assertNumber(forgeUtilityValuesObj.energy, 'forge.utilityValues.energy'),
        steps: assertNumber(forgeUtilityValuesObj.steps, 'forge.utilityValues.steps'),
        multiplier: assertNumber(forgeUtilityValuesObj.multiplier, 'forge.utilityValues.multiplier'),
      },
    },
    rarityRulesByRound,
    patternBonusByLevel,
    patternEmptySpaceCap: assertNumber(root.patternEmptySpaceCap, 'patternEmptySpaceCap'),
    collapseFieldPeriod: assertNumber(root.collapseFieldPeriod, 'collapseFieldPeriod'),
    spawn4Probability: assertNumber(root.spawn4Probability, 'spawn4Probability'),
    luckySeedSpawn4Probability: assertNumber(root.luckySeedSpawn4Probability, 'luckySeedSpawn4Probability'),
    startingEnergy: assertNumber(root.startingEnergy, 'startingEnergy'),
    displayScoreScale: assertNumber(root.displayScoreScale, 'displayScoreScale'),
    tileDisplayMode: assertString(root.tileDisplayMode, 'tileDisplayMode') as TileDisplayMode,
    streak: {
      minOutput: assertNumber(streakObj.minOutput, 'streak.minOutput'),
      bonusThreshold: assertNumber(streakObj.bonusThreshold, 'streak.bonusThreshold'),
      energyBonus: assertNumber(streakObj.energyBonus, 'streak.energyBonus'),
    },
    jackpot: {
      probability: assertNumber(jackpotObj.probability, 'jackpot.probability'),
      minOutput: assertNumber(jackpotObj.minOutput, 'jackpot.minOutput'),
      outputBonus: assertNumber(jackpotObj.outputBonus, 'jackpot.outputBonus'),
      energyBonus: assertNumber(jackpotObj.energyBonus, 'jackpot.energyBonus'),
    },
    roundCompleteReward: {
      energyBonus: assertNumber(roundCompleteRewardObj.energyBonus, 'roundCompleteReward.energyBonus'),
      multiplierBonus: assertNumber(roundCompleteRewardObj.multiplierBonus, 'roundCompleteReward.multiplierBonus'),
    },
    buildIdentity: {
      minConfidenceForClear: assertNumber(buildIdentityObj.minConfidenceForClear, 'buildIdentity.minConfidenceForClear'),
      mixedThreshold: assertNumber(buildIdentityObj.mixedThreshold, 'buildIdentity.mixedThreshold'),
    },
    benchmarkTuning: {
      baselineCandidate: {
        stepsMultiplier: assertNumber(baselineCandidateObj.stepsMultiplier, 'benchmarkTuning.baselineCandidate.stepsMultiplier'),
        targetOutputMultiplier: assertNumber(baselineCandidateObj.targetOutputMultiplier, 'benchmarkTuning.baselineCandidate.targetOutputMultiplier'),
        roundScaleMultiplier: assertNumber(baselineCandidateObj.roundScaleMultiplier, 'benchmarkTuning.baselineCandidate.roundScaleMultiplier'),
        startingEnergy: assertNumber(baselineCandidateObj.startingEnergy, 'benchmarkTuning.baselineCandidate.startingEnergy'),
        energyIncomeMultiplier: assertNumber(baselineCandidateObj.energyIncomeMultiplier, 'benchmarkTuning.baselineCandidate.energyIncomeMultiplier'),
      },
      bounds: {
        stepsMultiplier: parseRange(boundsObj.stepsMultiplier, 'benchmarkTuning.bounds.stepsMultiplier'),
        targetOutputMultiplier: parseRange(boundsObj.targetOutputMultiplier, 'benchmarkTuning.bounds.targetOutputMultiplier'),
        roundScaleMultiplier: parseRange(boundsObj.roundScaleMultiplier, 'benchmarkTuning.bounds.roundScaleMultiplier'),
        startingEnergy: parseRange(boundsObj.startingEnergy, 'benchmarkTuning.bounds.startingEnergy'),
        energyIncomeMultiplier: parseRange(boundsObj.energyIncomeMultiplier, 'benchmarkTuning.bounds.energyIncomeMultiplier'),
      },
      heuristicTargets: {
        avgMovesPerPhase: parseMetricRange(heuristicTargetsObj.avgMovesPerPhase, 'benchmarkTuning.heuristicTargets.avgMovesPerPhase'),
        avgHighestTierPerPhase: parseMetricRange(heuristicTargetsObj.avgHighestTierPerPhase, 'benchmarkTuning.heuristicTargets.avgHighestTierPerPhase'),
        lateGameClearSpeed: parseMetricRange(heuristicTargetsObj.lateGameClearSpeed, 'benchmarkTuning.heuristicTargets.lateGameClearSpeed'),
        energyIncomePerRound: parseMetricRange(heuristicTargetsObj.energyIncomePerRound, 'benchmarkTuning.heuristicTargets.energyIncomePerRound'),
        forgeAffordabilityRate: parseMetricRange(heuristicTargetsObj.forgeAffordabilityRate, 'benchmarkTuning.heuristicTargets.forgeAffordabilityRate'),
        buildMaturityRound3: parseMetricRange(heuristicTargetsObj.buildMaturityRound3, 'benchmarkTuning.heuristicTargets.buildMaturityRound3'),
      },
    },
  };
}
