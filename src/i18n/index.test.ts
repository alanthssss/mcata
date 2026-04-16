import { describe, expect, it, vi } from 'vitest';
import { createT } from './index';

describe('createT', () => {
  it('translates known zh-CN keys without warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = createT('zh-CN');

    expect(t('ui.header_title')).toBe('⚗ 融合催化器');
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
});
