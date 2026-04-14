/**
 * Profile store — persists the player's unlock progress in localStorage.
 *
 * Key: "merge_catalyst_progress"
 *
 * Debug mode: add ?debug=unlock_all to the URL to treat all catalysts
 * as unlocked (useful for development / playtesting).
 */
import { create } from 'zustand';
import { ProfileState, CatalystId } from '../core/types';
import { DEFAULT_PROFILE } from '../core/profile';
import { ALL_CATALYSTS } from '../core/catalysts';

export const PROFILE_STORAGE_KEY = 'merge_catalyst_progress';

// ─── Debug helpers ────────────────────────────────────────────────────────────

function isDebugUnlockAll(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('debug') === 'unlock_all';
  } catch {
    return false;
  }
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadProfile(): ProfileState {
  if (isDebugUnlockAll()) {
    return {
      ...DEFAULT_PROFILE,
      unlockedCatalysts: ALL_CATALYSTS.map(c => c.id) as CatalystId[],
    };
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProfileState>;
      // Merge with DEFAULT_PROFILE to fill any missing fields added in future versions
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
      };
    }
  } catch {
    // Storage unavailable (e.g. incognito with blocked storage, or corrupt data)
  }

  return { ...DEFAULT_PROFILE };
}

function persistProfile(profile: ProfileState): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Silently ignore — incognito / quota errors should not crash the game
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ProfileStore {
  profile: ProfileState;
  /** Replace the whole profile and persist to localStorage. */
  setProfile: (profile: ProfileState) => void;
  /** Mark additional catalysts as unlocked and persist. */
  unlockCatalysts: (ids: CatalystId[]) => void;
  /** Reset to DEFAULT_PROFILE and clear localStorage. */
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: loadProfile(),

  setProfile: (profile) => {
    persistProfile(profile);
    set({ profile });
  },

  unlockCatalysts: (ids) => {
    set(state => {
      const current = state.profile.unlockedCatalysts;
      const merged = Array.from(new Set([...current, ...ids])) as CatalystId[];
      const updated = { ...state.profile, unlockedCatalysts: merged };
      persistProfile(updated);
      return { profile: updated };
    });
  },

  resetProfile: () => {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch { /* ignore */ }
    set({ profile: { ...DEFAULT_PROFILE } });
  },
}));
