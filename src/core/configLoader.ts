import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { GameConfig, validateGameConfig } from './gameConfigSchema';

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config', 'game.yaml');

function normalizeSpecialNumbers(input: string): string {
  return input.replace(/:\s*\.inf\b/g, ': Infinity');
}

export function parseGameConfigYaml(yamlText: string, source = 'inline'): GameConfig {
  try {
    const parsed = parse(normalizeSpecialNumbers(yamlText));
    return validateGameConfig(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load game config from ${source}: ${message}`);
  }
}

export function loadGameConfigFromFile(configPath = DEFAULT_CONFIG_PATH): GameConfig {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Game config file not found: ${resolved}`);
  }
  const yamlText = fs.readFileSync(resolved, 'utf-8');
  return parseGameConfigYaml(yamlText, resolved);
}
