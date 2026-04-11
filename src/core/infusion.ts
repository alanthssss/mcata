import { InfusionChoice, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

export function generateInfusionOptions(
  activeCatalysts: CatalystId[],
  rngFn: () => number
): InfusionChoice[] {
  // Always offer energy, steps, multiplier
  // Plus a random catalyst
  const available = ALL_CATALYSTS.filter(c => !activeCatalysts.includes(c.id));
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

  return options;
}
