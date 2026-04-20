import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parseGameConfigYaml, loadGameConfigFromFile } from './configLoader';
import { STARTING_ENERGY, BENCHMARK_TUNING_BASELINE_CANDIDATE } from './config';

describe('YAML game config loader', () => {
  it('loads config/game.yaml successfully', () => {
    const configPath = path.resolve(process.cwd(), 'config', 'game.yaml');
    const loaded = loadGameConfigFromFile(configPath);
    expect(loaded.startingEnergy).toBe(STARTING_ENERGY);
    expect(loaded.benchmarkTuning.baselineCandidate.startingEnergy).toBe(BENCHMARK_TUNING_BASELINE_CANDIDATE.startingEnergy);
  });

  it('fails clearly when required fields are missing', () => {
    expect(() => parseGameConfigYaml('balanceVersion: v1\nstartingEnergy: nope', 'test-inline')).toThrow(
      'Failed to load game config from test-inline',
    );
  });
});
