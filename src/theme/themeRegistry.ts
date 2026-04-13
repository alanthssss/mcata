/**
 * Theme registry for Merge Catalyst.
 *
 * All available themes are registered here.  The active theme is stored
 * in a lightweight Zustand slice so it can be switched at runtime without
 * reloading the game state.
 *
 * Why the default is progression-based (not fruit / numeric):
 *  - Fruit themes carry trademark risk or evoke competing titles.
 *  - Raw numeric labels ("2 / 4 / 8…") visually echo classic 2048 and may
 *    confuse players about the game genre.
 *  - A generic material / rank ladder is instantly understandable, broadly
 *    appealing, easy to localise, and genre-neutral.
 */

import { create } from 'zustand';
import { TileTheme, TileThemeEntry } from './types';
import { defaultTheme } from './defaultTheme';
import { progressionTheme } from './progressionTheme';
import { mathTheme } from './mathTheme';
import { historyTheme } from './historyTheme';
import { cultureTheme } from './cultureTheme';

// ─── Registry ────────────────────────────────────────────────────────────────

/** All registered themes keyed by their id. */
export const THEME_REGISTRY: Record<string, TileTheme> = {
  [defaultTheme.id]:     defaultTheme,
  [progressionTheme.id]: progressionTheme,
  [mathTheme.id]:        mathTheme,
  [historyTheme.id]:     historyTheme,
  [cultureTheme.id]:     cultureTheme,
};

export const DEFAULT_THEME_ID = defaultTheme.id;

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Return the TileThemeEntry for a given internal value within a theme.
 * Falls back to a generated stub when the value is not in the entries list
 * (e.g. if a future tile value exceeds the theme's defined range).
 */
export function getThemeEntry(theme: TileTheme, internalValue: number): TileThemeEntry {
  const entry = theme.entries.find(e => e.internalValue === internalValue);
  if (entry) return entry;

  // Fallback: generate a minimal stub so the tile still renders.
  return {
    internalValue,
    displayLabel: String(internalValue),
    shortLabel: String(internalValue),
    colorToken: '#cdc1b4',
    textColorToken: '#776e65',
    progressionIndex: Math.log2(internalValue),
  };
}

// ─── Zustand store ────────────────────────────────────────────────────────────

interface ThemeStore {
  activeThemeId: string;
  setTheme: (id: string) => void;
  getActiveTheme: () => TileTheme;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  activeThemeId: DEFAULT_THEME_ID,

  setTheme: (id: string) => {
    if (THEME_REGISTRY[id]) {
      set({ activeThemeId: id });
    }
  },

  getActiveTheme: () => {
    const { activeThemeId } = get();
    return THEME_REGISTRY[activeThemeId] ?? defaultTheme;
  },
}));
