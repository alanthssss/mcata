/**
 * Display-score helpers.
 *
 * The game engine stores raw (internal) numeric scores.  For player-facing
 * displays we apply DISPLAY_SCORE_SCALE so numbers feel more rewarding.
 * Benchmark and replay logic always uses raw values — only the UI layer
 * applies the scale.
 */

import { DISPLAY_SCORE_SCALE } from '../core/config';

/**
 * Scale a raw internal score to the player-facing display value.
 * Multipliers (e.g. ×1.5) are NOT scaled — only absolute output values are.
 */
export function toDisplayScore(rawScore: number): number {
  return rawScore * DISPLAY_SCORE_SCALE;
}

/**
 * Format a display score with commas for readability.
 * e.g. 12345 → "12,345"
 */
export function formatScore(rawScore: number): string {
  const display = toDisplayScore(rawScore);
  return display.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Format a display score in compact form for tight spaces.
 * e.g. 12345 → "12.3k"
 */
export function formatScoreCompact(rawScore: number): string {
  const display = toDisplayScore(rawScore);
  if (display >= 1_000_000) return `${(display / 1_000_000).toFixed(1)}M`;
  if (display >= 10_000)    return `${(display / 1_000).toFixed(1)}k`;
  return display.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
