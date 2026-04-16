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
      key: 'ui.infusion_granted_signal',
      params: { name: 'pulse_boost' },
    };
    expect(localizeIntermissionMessage(message, createT('en'))).toBe('Infusion granted signal: Pulse Boost');
    expect(localizeIntermissionMessage(message, createT('zh-CN'))).toBe('注入获得信号：脉冲强化');
  });
});

describe('Pattern panel', () => {
  it('renders empty panel state when no pattern is active', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(PatternPanel, { activePattern: null, level: 0 }));
    expect(html).toContain('No active Pattern yet');
    expect(html).toContain('Pattern is obtained in Infusion');
  });

  it('shows active pattern state', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(PatternPanel, { activePattern: 'chain', level: 2 }));
    expect(html).toContain('Chain Pattern');
    expect(html).toContain('Level 2');
    expect(html).toContain('How to get');
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
    expect(html).toContain('Signals (0/2)');
    expect(html).toContain('No Signal equipped');
  });

  it('localizes empty-state text in zh-CN', () => {
    const t = createT('zh-CN');
    expect(t('ui.signals', { count: 0, max: 2 })).toBe('信号 (0/2)');
    expect(t('ui.no_signals_equipped')).toBe('未装备信号');
  });
});

describe('Forge intermission localization', () => {
  it('localizes pattern replacement message params', () => {
    const message = {
      key: 'ui.infusion_pattern_replaced',
      params: { from: 'chain', to: 'corner', level: 1 },
    };
    const localized = localizeIntermissionMessage(message, createT('en'));
    expect(localized).toContain('Chain Pattern');
    expect(localized).toContain('Corner Pattern');
  });
});
