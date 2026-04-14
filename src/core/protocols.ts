import { ProtocolDef, ProtocolId } from './types';

export const PROTOCOL_DEFS: Record<ProtocolId, ProtocolDef> = {
  corner_protocol: {
    id: 'corner_protocol',
    name: 'Corner Protocol',
    description: 'Corner merges always gain an extra ×1.5 multiplier on top of base bonuses',
    icon: '📐',
    stakes: 'standard',
    cornerMultiplier: 1.5,
    startTiles: 2,
    spawnFrequencyFactor: 1.0,
    outputScale: 1.0,
    stepsReduction: 0,
  },
  sparse_protocol: {
    id: 'sparse_protocol',
    name: 'Sparse Protocol',
    description: 'Start with 1 tile instead of 2; spawn frequency halved but output scaled up',
    icon: '🌑',
    stakes: 'tactical',
    cornerMultiplier: 1.0,
    startTiles: 1,
    spawnFrequencyFactor: 2.0,
    outputScale: 1.2,
    stepsReduction: 0,
  },
  overload_protocol: {
    id: 'overload_protocol',
    name: 'Overload Protocol',
    description: 'Higher output scaling (×1.4) but each phase has 2 fewer steps',
    icon: '⚡',
    stakes: 'overclocked',
    cornerMultiplier: 1.0,
    startTiles: 2,
    spawnFrequencyFactor: 1.0,
    outputScale: 1.4,
    stepsReduction: 2,
  },
};

export const ALL_PROTOCOLS = Object.values(PROTOCOL_DEFS);

export const DEFAULT_PROTOCOL: ProtocolId = 'corner_protocol';
