import { create } from 'zustand';
import { Locale, TranslationMap } from './types';
import en from './en';
import zhCN from './zh-CN';

// ─── Translation maps ────────────────────────────────────────────────────────

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  en,
  'zh-CN': zhCN,
};

// ─── Locale store ─────────────────────────────────────────────────────────────

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}));

// ─── Translation function ─────────────────────────────────────────────────────

/**
 * Translate a key with optional interpolation params.
 * Falls back to English if key is missing in selected locale.
 * Falls back to the raw key if not found in English either.
 *
 * Usage:
 *   t('ui.phase')                        → "Phase"
 *   t('ui.active_catalysts', { count: 2 }) → "Active Catalysts (2/3)"
 */
export function createT(locale: Locale) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const map = TRANSLATIONS[locale];
    let str = map[key] ?? TRANSLATIONS['en'][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

// ─── React hook ───────────────────────────────────────────────────────────────

/**
 * React hook that returns the translation function bound to the current locale.
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return createT(locale);
}

export { type Locale };
