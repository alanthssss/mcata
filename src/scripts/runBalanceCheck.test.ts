import { describe, expect, it } from 'vitest';
import { SUITE_BALANCE, SUITE_PACING, SUITE_ROUND_STRESS, SUITE_DEBUG_AGENTS } from '../benchmark/presets';

describe('balance suite wiring', () => {
  it('includes all suites used by npm run balance', () => {
    expect(SUITE_BALANCE).toBeDefined();
    expect(SUITE_PACING).toBeDefined();
    expect(SUITE_ROUND_STRESS).toBeDefined();
    expect(SUITE_BALANCE.agents.map(a => a.name)).toEqual(['HeuristicAgent']);
    expect(SUITE_PACING.agents.map(a => a.name)).toEqual(['HeuristicAgent']);
    expect(SUITE_ROUND_STRESS.agents.map(a => a.name)).toEqual(['HeuristicAgent']);
    expect(SUITE_DEBUG_AGENTS.category).toBe('debug');
  });
});
