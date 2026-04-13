import { CatalystDef, CatalystId } from './types';
import { ALL_CATALYSTS } from './catalysts';

export function generateForgeOffers(
  activeCatalysts: CatalystId[],
  count: number,
  rngFn: () => number,
  unlockedCatalysts?: CatalystId[]
): CatalystDef[] {
  // Can offer any catalyst, including ones you already have (for replacement)
  void activeCatalysts;
  const pool = unlockedCatalysts
    ? ALL_CATALYSTS.filter(c => unlockedCatalysts.includes(c.id))
    : [...ALL_CATALYSTS];
  const shuffled = [...pool].sort(() => rngFn() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
