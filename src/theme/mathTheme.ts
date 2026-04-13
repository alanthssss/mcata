/**
 * Math / Science theme — placeholder.
 *
 * Intended audience: enthusiast / STEM players.
 * Tile labels would map powers-of-two to mathematical concepts
 * (e.g. 2→Unit, 4→Square, 8→Cube, 16→Tesseract, …).
 *
 * Not implemented yet — scaffold kept for future theme pack.
 */

import { TileTheme } from './types';

export const mathTheme: TileTheme = {
  id: 'math',
  name: 'Math & Science',
  description: 'Powers of two expressed as mathematical / scientific concepts.',
  audience: 'enthusiast',
  readabilityScore: 6,
  iconStyleHint: 'text',
  entries: [], // TODO: populate in future theme pack
};
