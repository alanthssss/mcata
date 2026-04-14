import { InfusionChoice, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

/**
 * Generate the list of Infusion reward choices for the player.
 *
 * @param activeCatalysts  Catalysts already equipped — excluded from catalyst offer.
 * @param rngFn            RNG function.
 * @param catalystPool     Run-level availability pool.  `undefined` = full catalogue.
 *                         An empty array means the pool is exhausted and no catalyst
 *                         choice will be generated.
 * @param maxChoices       Cap on number of choices (ascension difficulty setting).
 */
export function generateInfusionOptions(
  activeCatalysts: CatalystId[],
  rngFn: () => number,
  catalystPool?: CatalystId[],
  maxChoices?: number
): InfusionChoice[] {
  const basePool = catalystPool !== undefined
    ? ALL_CATALYSTS.filter(c => catalystPool.includes(c.id))
    : ALL_CATALYSTS;
  // Always offer energy, steps, multiplier
  // Plus a random catalyst
  const available = basePool.filter(c => !activeCatalysts.includes(c.id));
  const shuffled = [...available].sort(() => rngFn() - 0.5);
  const catalystChoice = shuffled[0];

  const options: InfusionChoice[] = [
    { type: 'energy' },
    { type: 'steps' },
    { type: 'multiplier' },
  ];

  if (catalystChoice) {
    options.unshift({ type: 'catalyst', catalyst: catalystChoice });
  }

  // Apply maxChoices limit (for ascension difficulty)
  const limit = maxChoices ?? options.length;
  return options.slice(0, limit);
}
