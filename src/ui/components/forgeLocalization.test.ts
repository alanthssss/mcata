import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForgeModal, localizeIntermissionMessage } from './ForgeModal';
import { PatternPanel } from './PatternPanel';
import { SignalPanel } from './SignalPanel';
import { createT, useLocaleStore } from '../../i18n';
import type { ForgeShopItem } from '../../core/types';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/** Represents the full shop screenshot: 3 boosts + 1 style + 1 skill + 1 utility */
function fullShopItems(): ForgeShopItem[] {
  return [
    {
      id: 'cat:double_spawn',
      type: 'catalyst',
      category: 'generator',
      price: 3,
      name: 'Double Spawn',
      description: '25% chance to spawn 2 tiles instead of 1',
      catalyst: {
        id: 'double_spawn',
        name: 'Double Spawn',
        description: '25% chance to spawn 2 tiles instead of 1',
        rarity: 'common',
        cost: 3,
        category: 'generator',
        trigger: 'on_spawn',
        effectParams: {},
        tags: ['spawn'],
        flavorText: '',
        unlockCondition: '',
      },
    },
    {
      id: 'cat:lucky_seed',
      type: 'catalyst',
      category: 'legacy',
      price: 3,
      name: 'Lucky Seed',
      description: '75% chance to spawn a 2, 25% to spawn a 4',
      catalyst: {
        id: 'lucky_seed',
        name: 'Lucky Seed',
        description: '75% chance to spawn a 2, 25% to spawn a 4',
        rarity: 'common',
        cost: 3,
        category: 'legacy',
        trigger: 'on_spawn',
        effectParams: {},
        tags: ['spawn'],
        flavorText: '',
        unlockCondition: '',
      },
    },
    {
      id: 'cat:bankers_edge',
      type: 'catalyst',
      category: 'legacy',
      price: 3,
      name: "Banker's Edge",
      description: '+2 Energy on phase clear',
      catalyst: {
        id: 'bankers_edge',
        name: "Banker's Edge",
        description: '+2 Energy on phase clear',
        rarity: 'common',
        cost: 3,
        category: 'legacy',
        trigger: 'on_phase_clear',
        effectParams: {},
        tags: ['economy'],
        flavorText: '',
        unlockCondition: '',
      },
    },
    {
      id: 'pattern:corner',
      type: 'pattern',
      category: 'archetype',
      price: 4,
      name: 'corner',
      description: 'corner',
      pattern: 'corner',
    },
    {
      id: 'signal:freeze_step',
      type: 'signal',
      category: 'tactical',
      price: 3,
      name: 'Freeze Step',
      description: 'Skip tile spawn this turn',
      signal: 'freeze_step',
    },
    {
      id: 'util:steps',
      type: 'utility',
      category: 'utility',
      price: 3,
      name: 'steps',
      description: 'steps',
      utility: 'steps',
      amount: 2,
    },
  ];
}

function renderFullShop(
  overrides: {
    energy?: number;
    activeCatalysts?: ForgeShopItem['type'] extends 'catalyst' ? never : string[];
    items?: ForgeShopItem[];
  } = {}
): string {
  useLocaleStore.getState().setLocale('en');
  return renderToStaticMarkup(React.createElement(ForgeModal, {
    items: overrides.items ?? fullShopItems(),
    activeCatalysts: (overrides.activeCatalysts as any) ?? [],
    activePattern: null,
    activePatternLevel: 0,
    reactionLog: [],
    signals: [],
    energy: overrides.energy ?? 10,
    lastIntermissionMessage: null,
    onBuy: () => undefined,
    onSell: () => undefined,
    onSellPattern: () => undefined,
    onSellSignal: () => undefined,
    onReroll: () => undefined,
    onSkip: () => undefined,
  }));
}

// ─── Terminology replacements in the modal ────────────────────────────────────

describe('Shop modal terminology (Forge → Shop, Catalyst → Boost, etc.)', () => {
  it('title shows "⚗ Shop" not "⚗ Forge"', () => {
    const html = renderFullShop();
    expect(html).toContain('⚗ Shop');
    expect(html).not.toContain('⚗ Forge');
  });

  it('skip button reads "Skip Shop"', () => {
    const html = renderFullShop();
    expect(html).toContain('Skip Shop');
    expect(html).not.toContain('Skip Forge');
  });

  it('active boosts section reads "Active Boosts:" not "Active Catalysts:"', () => {
    const html = renderFullShop();
    expect(html).toContain('Active Boosts:');
    expect(html).not.toContain('Active Catalysts:');
  });

  it('reroll button reads "Reroll (⚡1)"', () => {
    const html = renderFullShop();
    expect(html).toContain('Reroll (⚡1)');
  });

  it('Banker\'s Edge description uses "stage clear" not "phase clear"', () => {
    const html = renderFullShop();
    expect(html).toContain('stage clear');
    expect(html).not.toContain('phase clear');
  });

  it('utility steps description uses "stage" not "phase"', () => {
    const html = renderFullShop();
    expect(html).toContain('for this stage');
    expect(html).not.toContain('for this phase');
  });

  it('corner pattern name shows as "Corner Style"', () => {
    const html = renderFullShop();
    expect(html).toContain('Corner Style');
    expect(html).not.toContain('Corner Pattern');
  });

  it('utility item title is "Tactical Steps"', () => {
    const html = renderFullShop();
    expect(html).toContain('Tactical Steps');
  });
});

// ─── Button text per item type ────────────────────────────────────────────────

describe('Shop modal button text', () => {
  it('catalyst items show "Equip" when affordable and not owned', () => {
    const html = renderFullShop({ energy: 10 });
    const equipCount = (html.match(/Equip/g) ?? []).length;
    expect(equipCount).toBe(3); // 3 catalyst cards
  });

  it('non-catalyst items show "Buy" when affordable', () => {
    const html = renderFullShop({ energy: 10 });
    const buyCount = (html.match(/\bBuy\b/g) ?? []).length;
    expect(buyCount).toBe(3); // pattern + signal + utility
  });

  it('catalyst shows "Owned" when already in activeCatalysts', () => {
    const html = renderFullShop({ activeCatalysts: ['double_spawn'] as any });
    expect(html).toContain('Owned');
  });

  it('catalyst shows "Not enough Energy" when energy < price', () => {
    const html = renderFullShop({ energy: 0 });
    // All items cost ≥ 3, so all buttons should be disabled with not-enough text
    expect(html).toContain('Not enough Energy');
  });

  it('non-catalyst shows "Not enough Energy" when energy < price', () => {
    const items: ForgeShopItem[] = [{
      id: 'signal:pulse_boost',
      type: 'signal',
      category: 'tactical',
      price: 3,
      name: 'Pulse Boost',
      description: 'Current move output ×2',
      signal: 'pulse_boost',
    }];
    const html = renderFullShop({ energy: 0, items });
    expect(html).toContain('Not enough Energy');
    expect(html).not.toContain('Buy');
  });
});

// ─── Item tag classification ──────────────────────────────────────────────────

describe('Shop modal simplified tags', () => {
  it('shows simple Score / Energy / Control tags for first-shop style offers', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(ForgeModal, {
      items: [
        {
          id: 'cat:empty_amplifier',
          type: 'catalyst',
          category: 'amplifier',
          price: 5,
          name: 'Empty Amplifier',
          description: '+5% Output per empty cell on the board',
          catalyst: {
            id: 'empty_amplifier',
            name: 'Empty Amplifier',
            description: '+5% Output per empty cell on the board',
            rarity: 'rare',
            cost: 5,
            category: 'amplifier',
            trigger: 'on_merge',
            effectParams: {},
            tags: ['combo'],
            flavorText: '',
            unlockCondition: '',
          },
        },
        {
          id: 'cat:rich_merge',
          type: 'catalyst',
          category: 'generator',
          price: 5,
          name: 'Rich Merge',
          description: 'Each merge generates +1 Energy',
          catalyst: {
            id: 'rich_merge',
            name: 'Rich Merge',
            description: 'Each merge generates +1 Energy',
            rarity: 'rare',
            cost: 5,
            category: 'generator',
            trigger: 'on_merge',
            effectParams: {},
            tags: ['energy'],
            flavorText: '',
            unlockCondition: '',
          },
        },
        {
          id: 'signal:grid_clean',
          type: 'signal',
          category: 'tactical',
          price: 3,
          name: 'Grid Clean',
          description: 'Remove 2 lowest-value tiles from the board',
          signal: 'grid_clean',
        },
      ],
      activeCatalysts: [],
      activePattern: null,
      activePatternLevel: 0,
      reactionLog: [],
      signals: [],
      energy: 10,
      lastIntermissionMessage: null,
      onBuy: () => undefined,
      onSell: () => undefined,
      onSellPattern: () => undefined,
      onSellSignal: () => undefined,
      onReroll: () => undefined,
      onSkip: () => undefined,
    }));
    expect(html).toContain('Score');
    expect(html).toContain('Energy');
    expect(html).toContain('Control');
    expect(html).toContain('Creates a new build direction');
  });

  it('shows build-direction tags (Chain / Hybrid / High-Tier when applicable)', () => {
    const html = renderFullShop({
      items: [{
        id: 'cat:phase_resonance',
        type: 'catalyst',
        category: 'amplifier',
        price: 7,
        name: 'Phase Resonance',
        description: '...',
        catalyst: {
          id: 'phase_resonance',
          name: 'Phase Resonance',
          description: '...',
          rarity: 'epic',
          cost: 7,
          category: 'amplifier',
          trigger: 'on_merge',
          effectParams: {},
          tags: ['phase'],
          flavorText: '',
          unlockCondition: '',
        },
      }],
      activeCatalysts: ['high_tribute'] as any,
    });
    expect(html).toContain('High-Tier');
  });

  it('generator catalyst gets Energy tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'cat:double_spawn',
      type: 'catalyst',
      category: 'generator',
      price: 3,
      name: 'Double Spawn',
      description: '...',
      catalyst: {
        id: 'double_spawn',
        name: 'Double Spawn',
        description: '...',
        rarity: 'common',
        cost: 3,
        category: 'generator',
        trigger: 'on_spawn',
        effectParams: {},
        tags: ['spawn'],
        flavorText: '',
        unlockCondition: '',
      },
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Energy');
    expect(html).not.toContain('Score');
    expect(html).not.toContain('Control');
  });

  it('legacy catalyst gets Score tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'cat:lucky_seed',
      type: 'catalyst',
      category: 'legacy',
      price: 3,
      name: 'Lucky Seed',
      description: '...',
      catalyst: {
        id: 'lucky_seed',
        name: 'Lucky Seed',
        description: '...',
        rarity: 'common',
        cost: 3,
        category: 'legacy',
        trigger: 'on_spawn',
        effectParams: {},
        tags: ['spawn'],
        flavorText: '',
        unlockCondition: '',
      },
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Score');
  });

  it('stabilizer catalyst gets Control tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'cat:stability_field',
      type: 'catalyst',
      category: 'stabilizer',
      price: 5,
      name: 'Stability Field',
      description: '...',
      catalyst: {
        id: 'stability_field',
        name: 'Stability Field',
        description: '...',
        rarity: 'rare',
        cost: 5,
        category: 'stabilizer',
        trigger: 'on_move',
        effectParams: {},
        tags: ['combo'],
        flavorText: '',
        unlockCondition: '',
      },
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Control');
  });

  it('modifier catalyst gets Control tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'cat:inversion_field',
      type: 'catalyst',
      category: 'modifier',
      price: 5,
      name: 'Inversion Field',
      description: '...',
      catalyst: {
        id: 'inversion_field',
        name: 'Inversion Field',
        description: '...',
        rarity: 'rare',
        cost: 5,
        category: 'modifier',
        trigger: 'on_merge',
        effectParams: {},
        tags: ['board'],
        flavorText: '',
        unlockCondition: '',
      },
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Control');
  });

  it('pattern item gets Control tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'pattern:chain',
      type: 'pattern',
      category: 'archetype',
      price: 4,
      name: 'chain',
      description: 'chain',
      pattern: 'chain',
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Control');
  });

  it('freeze_step signal gets Control tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'signal:freeze_step',
      type: 'signal',
      category: 'tactical',
      price: 3,
      name: 'Freeze Step',
      description: 'Skip tile spawn this turn',
      signal: 'freeze_step',
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Control');
  });

  it('pulse_boost signal gets Score tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'signal:pulse_boost',
      type: 'signal',
      category: 'tactical',
      price: 3,
      name: 'Pulse Boost',
      description: 'Current move output ×2',
      signal: 'pulse_boost',
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Score');
  });

  it('keeps localization for fit-state copy in zh-CN', () => {
    expect(createT('zh-CN')('ui.shop_creates_direction')).toBe('可开启新构筑方向');
  });

  it('utility energy item gets Energy tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'util:energy',
      type: 'utility',
      category: 'utility',
      price: 2,
      name: 'energy',
      description: 'energy',
      utility: 'energy',
      amount: 2,
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Energy');
  });

  it('utility steps item gets Control tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'util:steps',
      type: 'utility',
      category: 'utility',
      price: 3,
      name: 'steps',
      description: 'steps',
      utility: 'steps',
      amount: 2,
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Control');
  });

  it('utility multiplier item gets Score tag', () => {
    const items: ForgeShopItem[] = [{
      id: 'util:multiplier',
      type: 'utility',
      category: 'utility',
      price: 4,
      name: 'multiplier',
      description: 'multiplier',
      utility: 'multiplier',
      amount: 0.08,
    }];
    const html = renderFullShop({ items });
    expect(html).toContain('Score');
  });
});

// ─── Tooltip content ──────────────────────────────────────────────────────────

describe('Shop modal tooltips', () => {
  it('catalyst card title attribute contains name and description', () => {
    const html = renderFullShop();
    // Double Spawn tooltip: "Double Spawn — <description>"
    expect(html).toContain('Double Spawn —');
  });

  it('non-catalyst card title attribute contains name and description', () => {
    const html = renderFullShop();
    // pattern corner: "Corner Style — Corner merges gain lasting run bonus."
    expect(html).toContain('Corner Style —');
  });

  it('signal card title attribute contains signal description', () => {
    const html = renderFullShop();
    expect(html).toContain('Skip tile spawn this turn');
  });
});

// ─── 6-slot full prompt ────────────────────────────────────────────────────────

describe('Shop modal 6-slot replace prompt', () => {
  it('does not show replace prompt when slots are not full', () => {
    const html = renderFullShop({ activeCatalysts: ['corner_crown'] as any });
    expect(html).not.toContain('Slots full');
  });
});

// ─── Remaining existing tests (intermission, pattern, signal panels) ──────────

describe('Forge signal localization', () => {
  it('renders intermission signal text in zh-CN and updates on locale switch', () => {
    const message = {
      key: 'ui.forge_sold_signal',
      params: { name: 'pulse_boost', energy: 2 },
    };
    expect(localizeIntermissionMessage(message, createT('en'))).toBe('Sold Skill Pulse Boost for +2 Energy');
    expect(localizeIntermissionMessage(message, createT('zh-CN'))).toBe('出售技能 脉冲强化，获得 +2 能量');
  });
});

describe('Pattern panel', () => {
  it('renders empty panel state when no pattern is active', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(PatternPanel, { activePattern: null, level: 0 }));
    expect(html).toContain('None');
    expect(html).not.toContain('How to get: buy Style in Shop.');
  });

  it('shows active pattern state', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(PatternPanel, { activePattern: 'chain', level: 2 }));
    expect(html).toContain('Chain Style');
    expect(html).not.toContain('Level 2');
  });
});

describe('Signal panel', () => {
  it('renders empty panel state when no signal is equipped', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(SignalPanel, {
      signals: [],
      pendingSignal: null,
      onActivate: () => undefined,
    }));
    expect(html).toContain('Skills (0/2)');
    expect(html).toContain('Empty');
  });

  it('localizes empty-state text in zh-CN', () => {
    const t = createT('zh-CN');
    expect(t('ui.signals', { count: 0, max: 2 })).toBe('技能 (0/2)');
    expect(t('ui.no_signals_equipped')).toBe('空');
  });
});

describe('Forge intermission localization', () => {
  it('localizes pattern message params', () => {
    const message = {
      key: 'ui.forge_sell_pattern',
      params: { name: 'chain', level: 1 },
    };
    const localized = localizeIntermissionMessage(message, createT('en'));
    expect(localized).toContain('Chain Style');
  });
});
