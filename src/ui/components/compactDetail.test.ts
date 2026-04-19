import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useLocaleStore } from '../../i18n';
import { CatalystPanel } from './CatalystPanel';
import { SynergyPanel } from './SynergyPanel';
import { SignalPanel } from './SignalPanel';
import { PatternPanel } from './PatternPanel';
import { ProtocolPanel } from './ProtocolBadge';
import { MomentumBar } from './MomentumBar';
import { StartScreen } from './StartScreen';
import { COMPACT_DETAIL_INITIAL_STATE, reduceCompactDetailState } from './CompactDetail';

function isOpen(state: typeof COMPACT_DETAIL_INITIAL_STATE): boolean {
  return state.hovered || state.focused || state.pinned;
}

describe('compact detail interaction', () => {
  it('opens on hover and supports click/tap toggle fallback', () => {
    let state = COMPACT_DETAIL_INITIAL_STATE;
    state = reduceCompactDetailState(state, 'hover_enter');
    expect(isOpen(state)).toBe(true);
    state = reduceCompactDetailState(state, 'hover_leave');
    expect(isOpen(state)).toBe(false);
    state = reduceCompactDetailState(state, 'toggle_pin');
    expect(isOpen(state)).toBe(true);
    state = reduceCompactDetailState(state, 'dismiss');
    expect(isOpen(state)).toBe(false);
  });
});

describe('compact panel rendering', () => {
  it('renders compact summaries without legacy always-visible descriptions', () => {
    useLocaleStore.getState().setLocale('en');

    const catalystHtml = renderToStaticMarkup(
      React.createElement(CatalystPanel, { activeCatalysts: ['corner_crown'], frozenCell: null })
    );
    expect(catalystHtml).toContain('Corner Crown');
    expect(catalystHtml).not.toContain('Corner merges deal ×2 Output');

    const synergyHtml = renderToStaticMarkup(
      React.createElement(SynergyPanel, {
        activeCatalysts: ['corner_crown', 'empty_amplifier'],
        lastTriggeredSynergies: [],
      })
    );
    expect(synergyHtml).toContain('Corner Empire');
    expect(synergyHtml).not.toContain('empty board space amplifies corner dominance');

    const signalHtml = renderToStaticMarkup(
      React.createElement(SignalPanel, {
        signals: ['pulse_boost'],
        pendingSignal: null,
        onActivate: () => undefined,
      })
    );
    expect(signalHtml).toContain('Pulse Boost');
    expect(signalHtml).not.toContain('Current move output ×2');

    const patternHtml = renderToStaticMarkup(
      React.createElement(PatternPanel, { activePattern: 'chain', level: 2 })
    );
    expect(patternHtml).toContain('Chain Style');
    expect(patternHtml).not.toContain('Multi-merge moves gain lasting run bonus.');

    const protocolHtml = renderToStaticMarkup(
      React.createElement(ProtocolPanel, { protocol: 'corner_protocol' })
    );
    expect(protocolHtml).toContain('Corner Rule');
    expect(protocolHtml).not.toContain('Corner merges always gain an extra ×1.5 multiplier on top of base bonuses');

    const momentumHtml = renderToStaticMarkup(
      React.createElement(MomentumBar, { momentumMultiplier: 1.2, consecutiveValidMoves: 3 })
    );
    expect(momentumHtml).toContain('Streak');
    expect(momentumHtml).not.toContain('Momentum rises with consecutive scoring moves and boosts Output.');
  });

  it('keeps the start screen compact and standard-only', () => {
    useLocaleStore.getState().setLocale('en');
    const html = renderToStaticMarkup(
      React.createElement(StartScreen, { onStart: () => undefined })
    );
    expect(html).toContain('Start Run');
    expect(html).not.toContain('⚔ Challenge');
    expect(html).not.toContain('📅 Daily Run');
    expect(html).not.toContain('Reach target Output before Steps run out');
  });
});
