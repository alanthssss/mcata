import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { localizeIntermissionMessage } from './ForgeModal';
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
