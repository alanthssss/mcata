import { MergeInfo, MultiplierRecord, CatalystId, SynergyId } from './types';
import { getActiveSynergies, computeSynergyMultiplier } from './synergies';
import {
  CATALYST_MULTIPLIERS,
  MOMENTUM_CONFIG,
  CHAIN_MULTIPLIERS,
  CHAIN_MULTIPLIER_4PLUS,
  CORNER_MERGE_MULT,
  HIGHEST_TILE_MULT,
} from './config';

export interface ScoreResult {
  base: number;
  multipliers: MultiplierRecord[];
  finalOutput: number;
  triggeredCatalysts: CatalystId[];
  synergyMultiplier: number;
  triggeredSynergies: SynergyId[];
  momentumMultiplier: number;
}

export function computeScore(params: {
  merges: MergeInfo[];
  activeCatalysts: CatalystId[];
  globalMultiplier: number;
  comboWireActive: boolean;
  emptyCells?: number;
  phaseIndex?: number;
  echoOutputLast?: number;
  consecutiveValidMoves?: number;
  anomalyTriggered?: boolean;
  stabilityCount?: number;
  diagonalMoveCount?: number;
}): ScoreResult {
  const {
    merges,
    activeCatalysts,
    globalMultiplier,
    comboWireActive,
    emptyCells = 0,
    phaseIndex = 0,
    echoOutputLast = 0,
    consecutiveValidMoves = 0,
    anomalyTriggered = false,
    stabilityCount = 0,
    diagonalMoveCount = 0,
  } = params;

  if (merges.length === 0) {
    return {
      base: 0,
      multipliers: [],
      finalOutput: 0,
      triggeredCatalysts: [],
      synergyMultiplier: 1.0,
      triggeredSynergies: [],
      momentumMultiplier: 1.0,
    };
  }

  const base = merges.reduce((sum, m) => sum + m.value, 0);
  const multipliers: MultiplierRecord[] = [];
  const triggered: CatalystId[] = [];

  // ── Chain multiplier ──────────────────────────────────────────────────────
  let chain: number;
  if (activeCatalysts.includes('chain_reactor')) {
    // Chain Reactor: scales with extra 0.2 per merge beyond first
    chain = 1.0 + (merges.length - 1) * (1.0 + CATALYST_MULTIPLIERS.chain_reactor_extra);
    triggered.push('chain_reactor');
  } else {
    chain = CHAIN_MULTIPLIERS[merges.length] ?? CHAIN_MULTIPLIER_4PLUS;
  }
  if (chain > 1.0) multipliers.push({ name: `Chain x${merges.length}`, value: chain });

  // ── Condition: corner ─────────────────────────────────────────────────────
  let condition = 1.0;
  const hasCorner = merges.some(m => m.isCorner);
  if (hasCorner) {
    condition *= CORNER_MERGE_MULT;
    multipliers.push({ name: 'Corner Merge', value: CORNER_MERGE_MULT });
  }

  // ── Condition: highest tile ───────────────────────────────────────────────
  const hasHighest = merges.some(m => m.isHighest);
  if (hasHighest) {
    condition *= HIGHEST_TILE_MULT;
    multipliers.push({ name: 'Highest Tile Merge', value: HIGHEST_TILE_MULT });
  }

  // ── Catalyst multipliers ──────────────────────────────────────────────────
  let catalystMult = 1.0;

  if (activeCatalysts.includes('corner_crown') && hasCorner) {
    catalystMult *= CATALYST_MULTIPLIERS.corner_crown;
    triggered.push('corner_crown');
    multipliers.push({ name: 'Corner Crown', value: CATALYST_MULTIPLIERS.corner_crown });
  }

  if (activeCatalysts.includes('twin_burst') && merges.length >= 2) {
    catalystMult *= CATALYST_MULTIPLIERS.twin_burst;
    triggered.push('twin_burst');
    multipliers.push({ name: 'Twin Burst', value: CATALYST_MULTIPLIERS.twin_burst });
  }

  if (activeCatalysts.includes('combo_wire') && comboWireActive) {
    catalystMult *= CATALYST_MULTIPLIERS.combo_wire;
    triggered.push('combo_wire');
    multipliers.push({ name: 'Combo Wire', value: CATALYST_MULTIPLIERS.combo_wire });
  }

  if (activeCatalysts.includes('high_tribute') && hasHighest) {
    catalystMult *= CATALYST_MULTIPLIERS.high_tribute;
    triggered.push('high_tribute');
    multipliers.push({ name: 'High Tribute', value: CATALYST_MULTIPLIERS.high_tribute });
  }

  // Empty Amplifier
  if (activeCatalysts.includes('empty_amplifier') && emptyCells > 0) {
    const emptyMult = 1.0 + emptyCells * CATALYST_MULTIPLIERS.empty_amplifier_per_cell;
    catalystMult *= emptyMult;
    triggered.push('empty_amplifier');
    multipliers.push({ name: 'Empty Amplifier', value: emptyMult });
  }

  // Echo Multiplier
  if (activeCatalysts.includes('echo_multiplier') && echoOutputLast > 0 && base > 0) {
    const echoBonus = 1.0 + (echoOutputLast * CATALYST_MULTIPLIERS.echo_multiplier_carry) / base;
    catalystMult *= echoBonus;
    triggered.push('echo_multiplier');
    multipliers.push({ name: 'Echo Multiplier', value: echoBonus });
  }

  // Threshold Surge
  if (activeCatalysts.includes('threshold_surge') && base > CATALYST_MULTIPLIERS.threshold_surge_value) {
    catalystMult *= CATALYST_MULTIPLIERS.threshold_surge_mult;
    triggered.push('threshold_surge');
    multipliers.push({ name: 'Threshold Surge', value: CATALYST_MULTIPLIERS.threshold_surge_mult });
  }

  // Phase Resonance
  if (activeCatalysts.includes('phase_resonance') && phaseIndex > 0) {
    const phaseMult = 1.0 + phaseIndex * CATALYST_MULTIPLIERS.phase_resonance_per_phase;
    catalystMult *= phaseMult;
    triggered.push('phase_resonance');
    multipliers.push({ name: 'Phase Resonance', value: phaseMult });
  }

  // Gravity Well (corner bonus)
  if (activeCatalysts.includes('gravity_well') && hasCorner) {
    catalystMult *= CATALYST_MULTIPLIERS.gravity_well_mult;
    triggered.push('gravity_well');
    multipliers.push({ name: 'Gravity Well', value: CATALYST_MULTIPLIERS.gravity_well_mult });
  }

  // Stability Field
  if (activeCatalysts.includes('stability_field') && stabilityCount >= CATALYST_MULTIPLIERS.stability_field_period) {
    catalystMult *= CATALYST_MULTIPLIERS.stability_field_mult;
    triggered.push('stability_field');
    multipliers.push({ name: 'Stability Field', value: CATALYST_MULTIPLIERS.stability_field_mult });
  }

  // Inversion Field
  if (activeCatalysts.includes('inversion_field')) {
    catalystMult *= CATALYST_MULTIPLIERS.inversion_field_mult;
    triggered.push('inversion_field');
    multipliers.push({ name: 'Inversion Field', value: CATALYST_MULTIPLIERS.inversion_field_mult });
  }

  // Anomaly Sync
  if (activeCatalysts.includes('anomaly_sync') && anomalyTriggered) {
    catalystMult *= CATALYST_MULTIPLIERS.anomaly_sync_mult;
    triggered.push('anomaly_sync');
    multipliers.push({ name: 'Anomaly Sync', value: CATALYST_MULTIPLIERS.anomaly_sync_mult });
  }

  // Diagonal Merge
  const diagonalPeriod = CATALYST_MULTIPLIERS.diagonal_merge_period;
  if (activeCatalysts.includes('diagonal_merge') && diagonalMoveCount > 0 && diagonalMoveCount % diagonalPeriod === 0) {
    catalystMult *= CATALYST_MULTIPLIERS.diagonal_merge_mult;
    triggered.push('diagonal_merge');
    multipliers.push({ name: 'Diagonal Merge', value: CATALYST_MULTIPLIERS.diagonal_merge_mult });
  }

  // ── Synergy multiplier ────────────────────────────────────────────────────
  const activeSynergies = getActiveSynergies(activeCatalysts);
  const synergyMultiplier = computeSynergyMultiplier(activeSynergies);
  if (synergyMultiplier > 1.0) {
    multipliers.push({ name: 'Synergy', value: synergyMultiplier });
  }

  // ── Momentum multiplier ───────────────────────────────────────────────────
  const momentumMultiplier = Math.min(
    1.0 + consecutiveValidMoves * MOMENTUM_CONFIG.growthRate,
    MOMENTUM_CONFIG.maxMultiplier
  );
  if (momentumMultiplier > 1.0) {
    multipliers.push({ name: 'Momentum', value: momentumMultiplier });
  }

  // ── Global multiplier ─────────────────────────────────────────────────────
  if (globalMultiplier !== 1.0) {
    multipliers.push({ name: 'Global', value: globalMultiplier });
  }

  const finalOutput = Math.floor(
    base * chain * condition * catalystMult * synergyMultiplier * momentumMultiplier * globalMultiplier
  );

  return {
    base,
    multipliers,
    finalOutput,
    triggeredCatalysts: triggered,
    synergyMultiplier,
    triggeredSynergies: activeSynergies,
    momentumMultiplier,
  };
}
