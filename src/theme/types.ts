/**
 * Theme abstraction layer for Merge Catalyst.
 *
 * The core engine always operates on internal numeric values (2, 4, 8, …).
 * The theme layer maps each internal value to a player-facing presentation —
 * label, colour token, icon, and tier metadata — without touching game logic.
 */

/** One entry in the tile progression ladder. */
export interface TileThemeEntry {
  /** The internal power-of-two tile value this entry represents. */
  internalValue: number;

  /** Large label shown prominently on the tile (e.g. "Gold"). */
  displayLabel: string;

  /** Compact label for small contexts (e.g. "Au"). */
  shortLabel: string;

  /** Optional flavour subtitle shown below the main label. */
  subtitle?: string;

  /** CSS colour string for the tile background. */
  colorToken: string;

  /** CSS colour string for the tile text. */
  textColorToken: string;

  /** Optional emoji / unicode icon badge displayed on the tile. */
  iconToken?: string;

  /** Tier / rarity tag (e.g. "common", "rare", "legendary"). */
  rarityTag?: string;

  /** 0-based position in the progression (used for relative sizing / glow). */
  progressionIndex: number;
}

/** Full theme descriptor. */
export interface TileTheme {
  /** Unique machine-readable identifier. */
  id: string;

  /** Human-readable theme name. */
  name: string;

  /** Short description of the theme's concept. */
  description: string;

  /** Intended audience hint (e.g. "general", "enthusiast", "casual"). */
  audience: string;

  /** Subjective readability score 1–10. */
  readabilityScore: number;

  /** Style hint for icon rendering (e.g. "text", "emoji", "badge"). */
  iconStyleHint: 'text' | 'emoji' | 'badge' | 'none';

  /**
   * Ordered list of tile theme entries.
   * Keys are internal values; order defines the progression ladder.
   */
  entries: TileThemeEntry[];
}
