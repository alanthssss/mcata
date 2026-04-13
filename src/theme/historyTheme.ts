/**
 * History / Civilisation theme — placeholder.
 *
 * Intended audience: general / history enthusiasts.
 * Tile labels would map progression to historical eras or civilisations
 * (e.g. 2→Tribe, 4→Village, 8→City-State, 16→Kingdom, …).
 *
 * Not implemented yet — scaffold kept for future theme pack.
 */

import { TileTheme } from './types';

export const historyTheme: TileTheme = {
  id: 'history',
  name: 'History & Civilisation',
  description: 'Progression through historical eras from Tribe to Empire.',
  audience: 'general',
  readabilityScore: 8,
  iconStyleHint: 'emoji',
  entries: [], // TODO: populate in future theme pack
};
