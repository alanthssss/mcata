import { CATALYST_DEFS } from './catalysts';
import { BUILD_IDENTITY_CONFIG } from './config';
import type { CatalystId, ForgeShopItem, PatternId, ReactionLogEntry, SignalId } from './types';

export type BuildDirection = 'score' | 'chain' | 'control' | 'energy' | 'high_tier' | 'hybrid';
export type BuildLabel = 'score' | 'chain' | 'control' | 'energy' | 'hybrid' | 'mixed' | 'none';

export interface BuildIdentityResult {
  label: BuildLabel;
  labelKey: string;
  summaryKey: string;
  confidence: number;
  dominance: number;
  directionScores: Record<'score' | 'chain' | 'control' | 'energy', number>;
  topContributors: Array<{ type: 'boost' | 'combo' | 'style'; id: string; score: number }>;
}

const SIGNAL_DIRECTION: Record<SignalId, BuildDirection[]> = {
  pulse_boost: ['score'],
  chain_trigger: ['chain'],
  grid_clean: ['control'],
  freeze_step: ['control'],
};

const PATTERN_DIRECTION: Record<PatternId, BuildDirection[]> = {
  corner: ['score'],
  chain: ['chain'],
  empty_space: ['score', 'control'],
  high_tier: ['high_tier', 'score'],
  economy: ['energy'],
  survival: ['control'],
};

function getDirectionsFromTags(tags: string[]): BuildDirection[] {
  const result = new Set<BuildDirection>();
  for (const tag of tags) {
    if (tag === 'chain' || tag === 'combo' || tag === 'echo') result.add('chain');
    if (tag === 'energy' || tag === 'economy' || tag === 'spawn') result.add('energy');
    if (tag === 'control' || tag === 'board' || tag === 'shield') result.add('control');
    if (tag === 'surge' || tag === 'corner' || tag === 'phase' || tag === 'risk') result.add('score');
  }
  return result.size > 0 ? [...result] : ['score'];
}

export function getBuildDirectionsForCatalyst(catalystId: CatalystId): BuildDirection[] {
  const def = CATALYST_DEFS[catalystId];
  if (!def) return ['score'];
  const fromTags = getDirectionsFromTags(def.tags);
  if (def.id === 'high_tribute' || def.id === 'phase_resonance') {
    fromTags.unshift('high_tier');
  }
  if (fromTags.length > 1) return fromTags;
  if (def.category === 'generator') return ['energy'];
  if (def.category === 'stabilizer' || def.category === 'modifier') return ['control'];
  return fromTags;
}

export function getBuildDirectionsForPattern(patternId: PatternId): BuildDirection[] {
  return PATTERN_DIRECTION[patternId];
}

export function getBuildDirectionsForSignal(signalId: SignalId): BuildDirection[] {
  return SIGNAL_DIRECTION[signalId];
}

export function getBuildDirectionsForShopItem(item: ForgeShopItem): BuildDirection[] {
  if (item.type === 'catalyst') return getBuildDirectionsForCatalyst(item.catalyst.id);
  if (item.type === 'pattern') return getBuildDirectionsForPattern(item.pattern);
  if (item.type === 'signal') return getBuildDirectionsForSignal(item.signal);
  if (item.utility === 'energy') return ['energy'];
  if (item.utility === 'steps') return ['control'];
  return ['score'];
}

function addDirectionScore(scores: Record<'score' | 'chain' | 'control' | 'energy', number>, direction: BuildDirection, value: number) {
  if (direction === 'high_tier') {
    scores.score += value;
    return;
  }
  if (direction === 'hybrid') {
    scores.score += value * 0.5;
    scores.chain += value * 0.5;
    return;
  }
  if (direction in scores) {
    scores[direction as 'score' | 'chain' | 'control' | 'energy'] += value;
  }
}

function toLabelKey(label: BuildLabel): string {
  if (label === 'score') return 'ui.build_label_score';
  if (label === 'chain') return 'ui.build_label_chain';
  if (label === 'control') return 'ui.build_label_control';
  if (label === 'energy') return 'ui.build_label_energy';
  if (label === 'hybrid') return 'ui.build_label_hybrid';
  if (label === 'mixed') return 'ui.build_label_mixed';
  return 'ui.build_label_none';
}

function toSummaryKey(label: BuildLabel): string {
  if (label === 'score') return 'ui.build_summary_score';
  if (label === 'chain') return 'ui.build_summary_chain';
  if (label === 'control') return 'ui.build_summary_control';
  if (label === 'energy') return 'ui.build_summary_energy';
  if (label === 'hybrid') return 'ui.build_summary_hybrid';
  if (label === 'mixed') return 'ui.build_summary_mixed';
  return 'ui.build_summary_none';
}

export function deriveBuildIdentity(params: {
  activeCatalysts: CatalystId[];
  activePattern: PatternId | null;
  reactionLog: ReactionLogEntry[];
  energy?: number;
}): BuildIdentityResult {
  const scores: Record<'score' | 'chain' | 'control' | 'energy', number> = {
    score: 0,
    chain: 0,
    control: 0,
    energy: 0,
  };
  const contributors: BuildIdentityResult['topContributors'] = [];

  params.activeCatalysts.forEach((id) => {
    const directions = getBuildDirectionsForCatalyst(id);
    directions.forEach((direction, idx) => addDirectionScore(scores, direction, idx === 0 ? 2 : 1));
    contributors.push({ type: 'boost', id, score: directions.length > 1 ? 3 : 2 });
  });

  if (params.activePattern) {
    const patternDirections = getBuildDirectionsForPattern(params.activePattern);
    patternDirections.forEach((direction, idx) => addDirectionScore(scores, direction, idx === 0 ? 2 : 1));
    contributors.push({ type: 'style', id: params.activePattern, score: 2.5 });
  }

  params.reactionLog.slice(0, 8).forEach((entry, index) => {
    const recencyWeight = Math.max(0.35, 1 - index * 0.1);
    if (entry.merges.length >= 2) addDirectionScore(scores, 'chain', 0.7 * recencyWeight);
    if (entry.synergyMultiplier > 1) {
      addDirectionScore(scores, 'score', 0.6 * recencyWeight);
      addDirectionScore(scores, 'chain', 0.4 * recencyWeight);
    }
    if (entry.signalUsed && SIGNAL_DIRECTION[entry.signalUsed]) {
      SIGNAL_DIRECTION[entry.signalUsed].forEach(direction => addDirectionScore(scores, direction, 0.8 * recencyWeight));
      contributors.push({ type: 'combo', id: entry.signalUsed, score: 0.8 * recencyWeight });
    }
    const multiplierNames = entry.multipliers.map(m => m.name.toLowerCase());
    if (multiplierNames.some(name => name.includes('chain') || name.includes('combo'))) {
      addDirectionScore(scores, 'chain', 0.8 * recencyWeight);
    }
    if (multiplierNames.some(name => name.includes('corner') || name.includes('highest') || name.includes('surge'))) {
      addDirectionScore(scores, 'score', 0.8 * recencyWeight);
    }
    if (entry.anomalyEffect) {
      addDirectionScore(scores, 'control', 0.5 * recencyWeight);
    }
  });

  if ((params.energy ?? 0) >= 8) {
    addDirectionScore(scores, 'energy', 0.4);
  }

  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[keyof typeof scores, number]>;
  const [topAxis, topScore] = ordered[0];
  const secondScore = ordered[1]?.[1] ?? 0;
  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const confidence = totalScore > 0 ? topScore / totalScore : 0;
  const dominance = topScore > 0 ? (topScore - secondScore) / topScore : 0;

  let label: BuildLabel = topAxis;
  if (topScore < BUILD_IDENTITY_CONFIG.minScoreForLabel) {
    label = 'none';
  } else if (dominance < BUILD_IDENTITY_CONFIG.mixedThreshold) {
    label = 'mixed';
  } else if (confidence < BUILD_IDENTITY_CONFIG.minConfidenceForClear) {
    label = 'hybrid';
  }

  return {
    label,
    labelKey: toLabelKey(label),
    summaryKey: toSummaryKey(label),
    confidence,
    dominance,
    directionScores: scores,
    topContributors: contributors.sort((a, b) => b.score - a.score).slice(0, 3),
  };
}

export function getShopBuildFitState(
  itemDirections: BuildDirection[],
  currentLabel: BuildLabel,
): 'fits_current' | 'creates_direction' | 'low_synergy' {
  if (currentLabel === 'none' || currentLabel === 'mixed') return 'creates_direction';
  if (currentLabel === 'hybrid') {
    return itemDirections.length > 1 ? 'fits_current' : 'creates_direction';
  }
  if (itemDirections.includes(currentLabel)) return 'fits_current';
  if (itemDirections.length > 1 || itemDirections.includes('hybrid')) return 'creates_direction';
  return 'low_synergy';
}

export function buildDirectionToTagKey(direction: BuildDirection): string {
  if (direction === 'score') return 'tag.build_score';
  if (direction === 'chain') return 'tag.build_chain';
  if (direction === 'control') return 'tag.build_control';
  if (direction === 'energy') return 'tag.build_energy';
  if (direction === 'high_tier') return 'tag.build_high_tier';
  return 'tag.build_hybrid';
}
