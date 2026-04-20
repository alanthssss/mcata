import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuildIdentityPanel } from './BuildIdentityPanel';
import { useLocaleStore } from '../../i18n';
import type { ReactionLogEntry } from '../../core/types';

function renderPanel(overrides: {
  activeCatalysts?: any[];
  activePattern?: any;
  energy?: number;
  reactionLog?: ReactionLogEntry[];
} = {}): string {
  useLocaleStore.getState().setLocale('en');
  return renderToStaticMarkup(React.createElement(BuildIdentityPanel, {
    activeCatalysts: overrides.activeCatalysts ?? [],
    activePattern: overrides.activePattern ?? null,
    reactionLog: overrides.reactionLog ?? [],
    energy: overrides.energy ?? 5,
  }));
}

const chainLog: ReactionLogEntry = {
  step: 1,
  action: 'left',
  gridBefore: [],
  gridAfter: [],
  merges: [
    { from: [{ row: 0, col: 0 }, { row: 0, col: 1 }], to: { row: 0, col: 0 }, value: 4, isCorner: false, isHighest: false },
    { from: [{ row: 1, col: 0 }, { row: 1, col: 1 }], to: { row: 1, col: 0 }, value: 8, isCorner: false, isHighest: false },
  ],
  spawn: null,
  anomalyEffect: null,
  base: 10,
  multipliers: [{ name: 'Chain', value: 1.5 }],
  finalOutput: 15,
  triggeredCatalysts: ['combo_wire'],
  synergyMultiplier: 1,
  triggeredSynergies: [],
  momentumMultiplier: 1,
  signalUsed: null,
  signalEffect: null,
};

describe('BuildIdentityPanel', () => {
  it('renders empty-state build label when there is no strong direction', () => {
    const html = renderPanel();
    expect(html).toContain('No clear build yet');
  });

  it('shows energy-focused label for economy catalysts', () => {
    const html = renderPanel({ activeCatalysts: ['rich_merge', 'energy_loop', 'reserve_bank'], energy: 10 });
    expect(html).toContain('Energy Build');
  });

  it('changes label when state shifts to chain tools', () => {
    const html = renderPanel({ activeCatalysts: ['chain_reactor', 'combo_wire'], reactionLog: [chainLog], activePattern: 'chain' });
    expect(html).toContain('Chain Build');
  });

  it('handles mixed build state when competing directions are close', () => {
    const html = renderPanel({
      activeCatalysts: ['chain_reactor', 'gravity_well', 'rich_merge'],
      activePattern: 'empty_space',
      reactionLog: [chainLog],
    });
    expect(html.includes('Mixed Build') || html.includes('Hybrid Build')).toBe(true);
  });
});
