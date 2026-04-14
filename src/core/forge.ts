import { CatalystDef, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

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
  catalystPool?: CatalystId[]
): CatalystDef[] {
  // Start from the provided pool (or the full catalogue) then exclude any
  // catalysts the player has already equipped this run.
  const basePool = catalystPool !== undefined
    ? ALL_CATALYSTS.filter(c => catalystPool.includes(c.id))
    : [...ALL_CATALYSTS];

  const available = basePool.filter(c => !activeCatalysts.includes(c.id));

  if (available.length === 0) return [];

  const shuffled = [...available].sort(() => rngFn() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
