export type Locale = 'en' | 'zh-CN';

/**
 * Flat translation map. Keys use dot-notation grouped by domain.
 * Supports simple {placeholder} interpolation.
 */
export type TranslationMap = Record<string, string>;
