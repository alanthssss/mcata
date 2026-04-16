import { InfusionChoice, CatalystId, PatternId } from './types';
import { SIGNAL_DEFS } from './signals';
import { generateForgeOffers } from './forge';
import { getInfusionCatalystOfferChance } from './config';

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
  maxChoices?: number,
  roundNumber = 1
): InfusionChoice[] {
  const options: InfusionChoice[] = [
    { type: 'energy' },
    { type: 'steps' },
    { type: 'multiplier' },
  ];

  // Signals are tactical one-shots and should appear regularly in Infusion.
  if (rngFn() < 0.6) {
    const signalIds = Object.keys(SIGNAL_DEFS) as Array<keyof typeof SIGNAL_DEFS>;
    const signal = signalIds[Math.floor(rngFn() * signalIds.length)];
    options.push({ type: 'signal', signal });
  }

  // Pattern = run-long archetype growth layer.
  if (rngFn() < 0.45) {
    const patterns: PatternId[] = ['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival'];
    const pattern = patterns[Math.floor(rngFn() * patterns.length)];
    options.push({ type: 'pattern', pattern });
  }

  // Additional non-catalyst infusions.
  if (activeCatalysts.length > 0 && rngFn() < 0.35) {
    options.push({ type: 'catalyst_upgrade' });
  }
  if (rngFn() < 0.3) {
    options.push(rngFn() < 0.5 ? { type: 'pool_reroll' } : { type: 'pool_convert' });
  }

  // Direct catalyst from Infusion: rare and explicit.
  const catalystOfferChance = getInfusionCatalystOfferChance(roundNumber);
  if (rngFn() < catalystOfferChance) {
    const [catalystChoice] = generateForgeOffers(
      activeCatalysts,
      1,
      rngFn,
      catalystPool,
      roundNumber,
    );
    if (catalystChoice) {
      options.push({ type: 'catalyst', catalyst: catalystChoice });
    }
  }

  // Apply maxChoices limit (for ascension difficulty)
  const limit = maxChoices ?? options.length;
  return options
    .sort(() => rngFn() - 0.5)
    .slice(0, limit);
}
