import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useLocaleStore } from '../../i18n';

const state = {
  hasRunLogs: true,
};

const downloadRunLogs = vi.fn();
const downloadRunLogsCsv = vi.fn();

vi.mock('../../store/runLogStore', () => ({
  hasRunLogs: () => state.hasRunLogs,
}));

vi.mock('../../scripts/exportRunLogs', () => ({
  downloadRunLogs: (...args: unknown[]) => downloadRunLogs(...args),
  downloadRunLogsCsv: (...args: unknown[]) => downloadRunLogsCsv(...args),
}));

import { EndScreen, createEndScreenRunLogExportControls } from './EndScreen';

describe('EndScreen run log export', () => {
  beforeEach(() => {
    state.hasRunLogs = true;
    downloadRunLogs.mockReset();
    downloadRunLogsCsv.mockReset();
    useLocaleStore.getState().setLocale('en');
  });

  it('renders export buttons on end screen', () => {
    const html = renderToStaticMarkup(
      React.createElement(EndScreen, { isVictory: true, totalOutput: 1234, onRestart: () => undefined })
    );

    expect(html).toContain('Export Run Log (JSON)');
    expect(html).toContain('Export Run Log (CSV)');
    expect(html).not.toContain('disabled');
  });

  it('renders disabled export buttons when no run data exists', () => {
    state.hasRunLogs = false;

    const html = renderToStaticMarkup(
      React.createElement(EndScreen, { isVictory: false, totalOutput: 0, onRestart: () => undefined })
    );

    expect(html).toContain('Export Run Log (JSON)');
    expect(html).toContain('disabled');
    expect(html).toContain('No run log data available yet.');
  });

  it('triggers JSON/CSV export actions through controls', () => {
    const controls = createEndScreenRunLogExportControls(true);

    controls.exportJson();
    controls.exportCsv();

    expect(downloadRunLogs).toHaveBeenCalledWith(undefined, { scope: 'current' });
    expect(downloadRunLogsCsv).toHaveBeenCalledWith(undefined, { scope: 'current' });
  });
});
