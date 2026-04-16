import { CatalystDef, CatalystId, ForgeShopItem, PatternId, SignalId } from './types';
import { ALL_CATALYSTS } from './catalysts';
import {
  FORGE_ITEM_COUNTS,
  FORGE_PATTERN_PRICE,
  FORGE_SIGNAL_PRICE,
  FORGE_UTILITY_PRICES,
  FORGE_UTILITY_VALUES,
  getRarityRulesForRound,
} from './config';
import { SIGNAL_DEFS } from './signals';

function pickWeightedIndex(weights: number[], rngFn: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let roll = rngFn() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

function isEligibleByRarityRule(
  catalyst: CatalystDef,
  rarityRules: ReturnType<typeof getRarityRulesForRound>,
  roundNumber: number,
  ownedByRarity: Record<'common' | 'rare' | 'epic', number>
): boolean {
  const rule = rarityRules[catalyst.rarity];
  if (roundNumber < rule.minRound) return false;
  if (rule.perRunCap !== undefined && ownedByRarity[catalyst.rarity] >= rule.perRunCap) return false;
  return rule.offerWeight > 0;
}

/**
 * Draws one catalyst from the candidate pool using rarity-weighted selection.
 * Each candidate receives weight from the round-resolved rarity rules; higher
 * weight means proportionally higher chance to be selected.
 */
function drawWeightedCatalyst(
  available: CatalystDef[],
  rarityRules: ReturnType<typeof getRarityRulesForRound>,
  rngFn: () => number
): CatalystDef | null {
  if (available.length === 0) return null;
  const weights = available.map(c => rarityRules[c.rarity].offerWeight);
  const idx = pickWeightedIndex(weights, rngFn);
  if (idx < 0) return null;
  return available[idx];
}

/**
 * Generate a list of Catalyst offers for the Forge.
 *
 * @param activeCatalysts  Catalysts already equipped in this run — excluded from offers.
 * @param count            How many offers to generate.
 * @param rngFn            RNG function.
 * @param catalystPool     Run-level availability pool.  Pass `undefined` for the full
 *                         catalogue (used in benchmark / full-pool mode).  An empty
 *                         array means the pool is exhausted and no catalyst offers
 *                         can be made.
 */
export function generateForgeOffers(
  activeCatalysts: CatalystId[],
  count: number,
  rngFn: () => number,
  catalystPool?: CatalystId[],
  roundNumber = 1
): CatalystDef[] {
  // Start from the provided pool (or the full catalogue) then exclude any
  // catalysts the player has already equipped this run.
  const basePool = catalystPool !== undefined
    ? ALL_CATALYSTS.filter(c => catalystPool.includes(c.id))
    : [...ALL_CATALYSTS];

  const ownedByRarity: Record<'common' | 'rare' | 'epic', number> = { common: 0, rare: 0, epic: 0 };
  for (const id of activeCatalysts) {
    const found = ALL_CATALYSTS.find(c => c.id === id);
    if (found) ownedByRarity[found.rarity]++;
  }
  const rarityRules = getRarityRulesForRound(roundNumber);
  const available = basePool.filter(
    c => !activeCatalysts.includes(c.id) && isEligibleByRarityRule(c, rarityRules, roundNumber, ownedByRarity)
  );

  if (available.length === 0) return [];

  const picked: CatalystDef[] = [];
  let pool = [...available];
  const take = Math.min(count, pool.length);
  while (picked.length < take && pool.length > 0) {
    const drawn = drawWeightedCatalyst(pool, rarityRules, rngFn);
    if (!drawn) break;
    picked.push(drawn);
    pool = pool.filter(c => c.id !== drawn.id);
  }
  return picked;
}

const ALL_PATTERNS: PatternId[] = ['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival'];
const ALL_SIGNALS: SignalId[] = ['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step'];

function pickRandom<T>(items: T[], rngFn: () => number): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rngFn() * items.length)];
}

export function generateForgeItems(
  activeCatalysts: CatalystId[],
  activePattern: PatternId | null,
  ownedSignals: SignalId[],
  rngFn: () => number,
  catalystPool?: CatalystId[],
  roundNumber = 1,
): ForgeShopItem[] {
  const catalysts = generateForgeOffers(
    activeCatalysts,
    FORGE_ITEM_COUNTS.catalysts,
    rngFn,
    catalystPool,
    roundNumber,
  ).map((catalyst): ForgeShopItem => ({
    id: `cat:${catalyst.id}`,
    type: 'catalyst',
    category: catalyst.category,
    price: catalyst.cost,
    name: catalyst.name,
    description: catalyst.description,
    catalyst,
  }));

  const patternPool = activePattern
    ? ALL_PATTERNS.filter(p => p !== activePattern)
    : ALL_PATTERNS;
  const patternItems: ForgeShopItem[] = [];
  for (let i = 0; i < FORGE_ITEM_COUNTS.patterns; i++) {
    const picked = pickRandom(patternPool, rngFn);
    if (!picked) break;
    patternItems.push({
      id: `pattern:${picked}`,
      type: 'pattern',
      category: 'archetype',
      price: FORGE_PATTERN_PRICE,
      name: picked,
      description: picked,
      pattern: picked,
    });
  }

  const signalPool = ALL_SIGNALS.filter(s => !ownedSignals.includes(s));
  const signalItems: ForgeShopItem[] = [];
  for (let i = 0; i < FORGE_ITEM_COUNTS.signals; i++) {
    const picked = pickRandom(signalPool, rngFn);
    if (!picked) break;
    signalItems.push({
      id: `signal:${picked}`,
      type: 'signal',
      category: 'tactical',
      price: FORGE_SIGNAL_PRICE,
      name: SIGNAL_DEFS[picked].name,
      description: SIGNAL_DEFS[picked].description,
      signal: picked,
    });
  }

  const utilityPool: Array<{ key: keyof typeof FORGE_UTILITY_PRICES; label: string }> = [
    { key: 'energy', label: 'energy' },
    { key: 'steps', label: 'steps' },
    { key: 'multiplier', label: 'multiplier' },
  ];
  const utilityItems: ForgeShopItem[] = [];
  for (let i = 0; i < FORGE_ITEM_COUNTS.utilities; i++) {
    const picked = pickRandom(utilityPool, rngFn);
    if (!picked) break;
    utilityItems.push({
      id: `util:${picked.key}`,
      type: 'utility',
      category: 'utility',
      price: FORGE_UTILITY_PRICES[picked.key],
      name: picked.label,
      description: picked.label,
      utility: picked.key,
      amount: FORGE_UTILITY_VALUES[picked.key],
    });
  }

  return [...catalysts, ...patternItems, ...signalItems, ...utilityItems];
}
