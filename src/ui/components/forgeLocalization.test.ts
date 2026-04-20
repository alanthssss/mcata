import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ForgeModal, localizeIntermissionMessage } from './ForgeModal';
import { PatternPanel } from './PatternPanel';
import { SignalPanel } from './SignalPanel';
import { createT, useLocaleStore } from '../../i18n';

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

describe('Forge modal simplified tags', () => {
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
  });
});
