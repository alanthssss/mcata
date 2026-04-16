import { describe, expect, it } from 'vitest';
import { SUITE_BALANCE, SUITE_PACING, SUITE_ROUND_STRESS } from '../benchmark/presets';

describe('balance suite wiring', () => {
  it('includes all suites used by npm run balance', () => {
    expect(SUITE_BALANCE).toBeDefined();
    expect(SUITE_PACING).toBeDefined();
    expect(SUITE_ROUND_STRESS).toBeDefined();
  });
});
