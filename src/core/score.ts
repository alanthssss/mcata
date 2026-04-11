import { MergeInfo, MultiplierRecord, CatalystId } from './types';

export interface ScoreResult {
  base: number;
  multipliers: MultiplierRecord[];
  finalOutput: number;
  triggeredCatalysts: CatalystId[];
}

export function computeScore(params: {
  merges: MergeInfo[];
  activeCatalysts: CatalystId[];
  globalMultiplier: number;
  comboWireActive: boolean;
}): ScoreResult {
  const { merges, activeCatalysts, globalMultiplier, comboWireActive } = params;

  if (merges.length === 0) {
    return { base: 0, multipliers: [], finalOutput: 0, triggeredCatalysts: [] };
  }

  const base = merges.reduce((sum, m) => sum + m.value, 0);
  const multipliers: MultiplierRecord[] = [];
  const triggered: CatalystId[] = [];

  // Chain multiplier
  let chain = 1.0;
  if (merges.length === 1) chain = 1.0;
  else if (merges.length === 2) chain = 1.2;
  else if (merges.length === 3) chain = 1.5;
  else chain = 2.0;

  if (chain > 1.0) multipliers.push({ name: `Chain x${merges.length}`, value: chain });

  // Condition: corner
  let condition = 1.0;
  const hasCorner = merges.some(m => m.isCorner);
  if (hasCorner) {
    condition *= 1.2;
    multipliers.push({ name: 'Corner Merge', value: 1.2 });
  }

  // Condition: highest tile
  const hasHighest = merges.some(m => m.isHighest);
  if (hasHighest) {
    condition *= 1.2;
    multipliers.push({ name: 'Highest Tile Merge', value: 1.2 });
  }

  // Catalyst multipliers
  let catalystMult = 1.0;

  if (activeCatalysts.includes('corner_crown') && hasCorner) {
    catalystMult *= 2.0;
    triggered.push('corner_crown');
    multipliers.push({ name: 'Corner Crown', value: 2.0 });
  }

  if (activeCatalysts.includes('twin_burst') && merges.length >= 2) {
    catalystMult *= 1.5;
    triggered.push('twin_burst');
    multipliers.push({ name: 'Twin Burst', value: 1.5 });
  }

  if (activeCatalysts.includes('combo_wire') && comboWireActive) {
    catalystMult *= 1.3;
    triggered.push('combo_wire');
    multipliers.push({ name: 'Combo Wire', value: 1.3 });
  }

  if (activeCatalysts.includes('high_tribute') && hasHighest) {
    catalystMult *= 1.4;
    triggered.push('high_tribute');
    multipliers.push({ name: 'High Tribute', value: 1.4 });
  }

  // Global multiplier
  if (globalMultiplier !== 1.0) {
    multipliers.push({ name: 'Global', value: globalMultiplier });
  }

  const finalOutput = Math.floor(base * chain * condition * catalystMult * globalMultiplier);

  return { base, multipliers, finalOutput, triggeredCatalysts: triggered };
}
