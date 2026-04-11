import { CatalystDef, CatalystId } from './types';

export const CATALYST_DEFS: Record<CatalystId, CatalystDef> = {
  corner_crown: {
    id: 'corner_crown',
    name: 'Corner Crown',
    description: 'Corner merges deal x2 Output',
    rarity: 'rare',
    cost: 5,
  },
  twin_burst: {
    id: 'twin_burst',
    name: 'Twin Burst',
    description: 'If ≥2 merges in one move, x1.5 Output',
    rarity: 'common',
    cost: 3,
  },
  lucky_seed: {
    id: 'lucky_seed',
    name: 'Lucky Seed',
    description: 'Spawn probability: 75% "2" / 25% "4"',
    rarity: 'common',
    cost: 3,
  },
  bankers_edge: {
    id: 'bankers_edge',
    name: "Banker's Edge",
    description: '+2 Energy after phase clear',
    rarity: 'common',
    cost: 3,
  },
  reserve: {
    id: 'reserve',
    name: 'Reserve',
    description: 'Each unused step gives +20 Output on phase clear',
    rarity: 'rare',
    cost: 5,
  },
  frozen_cell: {
    id: 'frozen_cell',
    name: 'Frozen Cell',
    description: 'One cell cannot spawn tiles',
    rarity: 'common',
    cost: 3,
  },
  combo_wire: {
    id: 'combo_wire',
    name: 'Combo Wire',
    description: '3 consecutive scoring moves → x1.3 Output',
    rarity: 'rare',
    cost: 5,
  },
  high_tribute: {
    id: 'high_tribute',
    name: 'High Tribute',
    description: 'If highest tile merges → x1.4 Output',
    rarity: 'rare',
    cost: 5,
  },
};

export const ALL_CATALYSTS = Object.values(CATALYST_DEFS);

export function getRandomCatalystOffers(
  exclude: CatalystId[],
  count: number,
  rng: () => number
): CatalystDef[] {
  const available = ALL_CATALYSTS.filter(c => !exclude.includes(c.id));
  const shuffled = [...available].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
