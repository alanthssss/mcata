import { CatalystDef, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

export function generateForgeOffers(
  activeCatalysts: CatalystId[],
  count: number,
  rngFn: () => number
): CatalystDef[] {
  // Can offer any catalyst, including ones you already have (for replacement)
  void activeCatalysts;
  const available = [...ALL_CATALYSTS];
  const shuffled = [...available].sort(() => rngFn() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
