import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { localizeIntermissionMessage } from './ForgeModal';
import { PatternPanel } from './PatternPanel';
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
  it('shows active pattern state', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(React.createElement(PatternPanel, { activePattern: 'chain', level: 2 }));
    expect(html).toContain('Chain Pattern');
    expect(html).toContain('Level 2');
  });
});
