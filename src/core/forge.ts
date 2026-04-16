import { CatalystDef, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';
import { getRarityRulesForRound } from './config';

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
