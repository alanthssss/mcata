import { InfusionChoice, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

export function generateInfusionOptions(
  activeCatalysts: CatalystId[],
  rngFn: () => number,
  unlockedCatalysts?: CatalystId[],
  maxChoices?: number
): InfusionChoice[] {
  const pool = unlockedCatalysts
    ? ALL_CATALYSTS.filter(c => unlockedCatalysts.includes(c.id))
    : ALL_CATALYSTS;
  // Always offer energy, steps, multiplier
  // Plus a random catalyst
  const available = pool.filter(c => !activeCatalysts.includes(c.id));
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
