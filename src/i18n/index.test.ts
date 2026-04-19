import { describe, expect, it, vi } from 'vitest';
import { createT } from './index';
import en from './en';
import zhCN from './zh-CN';

describe('createT', () => {
  it('translates known zh-CN keys without warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = createT('zh-CN');

    expect(t('ui.header_title')).toBe('⚗ 融合增益');
    expect(t('challenge.no_corners.name')).toBe('禁角模式');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses keyboard + swipe control help text', () => {
    const en = createT('en');
    const zh = createT('zh-CN');
    expect(en('ui.controls_desc')).toContain('Swipe');
    expect(en('ui.controls_desc')).not.toContain('On-screen buttons');
    expect(zh('ui.controls_desc')).toContain('滑动');
  });

  it('keeps en and zh-CN translation key sets in sync', () => {
    expect(new Set(Object.keys(zhCN))).toEqual(new Set(Object.keys(en)));
  });

  it('applies simplified terminology replacements in player-facing text', () => {
    const enT = createT('en');
    expect(enT('ui.active_catalysts', { count: 2 })).toBe('Active Boosts (2/6)');
    expect(enT('ui.signals', { count: 1, max: 2 })).toBe('Skills (1/2)');
    expect(enT('ui.forge_title')).toBe('⚗ Shop');
    expect(enT('ui.infusion_title')).toBe('⚡ Pick');
    expect(enT('ui.round_complete_title', { round: 2 })).toBe('🌀 Level 2 Complete!');
  });
});
