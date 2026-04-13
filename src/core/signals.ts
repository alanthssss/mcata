import { SignalDef, SignalId } from './types';

export const SIGNAL_DEFS: Record<SignalId, SignalDef> = {
  pulse_boost: {
    id: 'pulse_boost',
    name: 'Pulse Boost',
    description: 'Current move output ×2',
  },
  grid_clean: {
    id: 'grid_clean',
    name: 'Grid Clean',
    description: 'Remove 2 lowest-value tiles from the board',
  },
  chain_trigger: {
    id: 'chain_trigger',
    name: 'Chain Trigger',
    description: 'Force one additional merge resolution this move',
  },
  freeze_step: {
    id: 'freeze_step',
    name: 'Freeze Step',
    description: 'Skip tile spawn this turn',
  },
};

export const ALL_SIGNALS = Object.values(SIGNAL_DEFS);
