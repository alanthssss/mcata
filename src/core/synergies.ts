import { CatalystId, SynergyDef, SynergyId } from './types';

export const SYNERGY_DEFS: Record<SynergyId, SynergyDef> = {
  corner_empire: {
    id: 'corner_empire',
    name: 'Corner Empire',
    catalysts: ['corner_crown', 'empty_amplifier'],
    multiplier: 1.3,
    description: 'Corner Crown + Empty Amplifier: empty board space amplifies corner dominance',
  },
  chain_echo: {
    id: 'chain_echo',
    name: 'Chain Echo',
    catalysts: ['chain_reactor', 'echo_multiplier'],
    multiplier: 1.4,
    description: 'Chain Reactor + Echo Multiplier: chain length echoes into next move',
  },
  generator_surplus: {
    id: 'generator_surplus',
    name: 'Generator Surplus',
    catalysts: ['double_spawn', 'rich_merge'],
    multiplier: 1.25,
    description: 'Double Spawn + Rich Merge: extra tiles convert directly to energy',
  },
  amplified_stability: {
    id: 'amplified_stability',
    name: 'Amplified Stability',
    catalysts: ['stability_field', 'threshold_surge'],
    multiplier: 1.35,
    description: 'Stability Field + Threshold Surge: stable board unlocks surge multiplier',
  },
  phase_reactor: {
    id: 'phase_reactor',
    name: 'Phase Reactor',
    catalysts: ['phase_resonance', 'energy_loop'],
    multiplier: 1.3,
    description: 'Phase Resonance + Energy Loop: late-phase output feeds energy loop',
  },
};

export const ALL_SYNERGIES = Object.values(SYNERGY_DEFS);

/**
 * Returns all synergy IDs that are active given the current set of catalysts.
 */
export function getActiveSynergies(activeCatalysts: CatalystId[]): SynergyId[] {
  const active: SynergyId[] = [];
  for (const synergy of ALL_SYNERGIES) {
    if (
      activeCatalysts.includes(synergy.catalysts[0]) &&
      activeCatalysts.includes(synergy.catalysts[1])
    ) {
      active.push(synergy.id);
    }
  }
  return active;
}

/**
 * Computes the combined synergy multiplier from all active synergies.
 */
export function computeSynergyMultiplier(activeSynergies: SynergyId[]): number {
  let mult = 1.0;
  for (const id of activeSynergies) {
    mult *= SYNERGY_DEFS[id].multiplier;
  }
  return mult;
}
