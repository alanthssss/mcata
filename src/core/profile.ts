/**
 * Profile system — persistent player state, meta-currency, and unlock helpers.
 *
 * ProfileState is intentionally separate from GameState so the engine stays
 * pure.  Use the runAdapter.ts helpers to bridge the two.
 */
import { ProfileState, RunReward, CatalystId, SignalId, ProtocolId, AnomalyId, AscensionLevel, GameState } from './types';
import {
  BASE_UNLOCKED_CATALYSTS,
  BASE_UNLOCKED_SIGNALS,
  BASE_UNLOCKED_PROTOCOLS,
  BASE_UNLOCKED_ANOMALIES,
  UNLOCK_COSTS,
  META_CURRENCY_CONFIG,
} from './unlockConfig';
import { CATALYST_DEFS, ALL_CATALYSTS } from './catalysts';
import { ALL_ASCENSION_LEVELS } from './ascensionModifiers';

// ─── Default profile ──────────────────────────────────────────────────────────

export const DEFAULT_PROFILE: ProfileState = {
  unlockedCatalysts:     [...BASE_UNLOCKED_CATALYSTS],
  unlockedSignals:       [...BASE_UNLOCKED_SIGNALS],
  unlockedProtocols:     [...BASE_UNLOCKED_PROTOCOLS],
  unlockedAnomalies:     [...BASE_UNLOCKED_ANOMALIES],
  unlockedAscensionLevel: 0,
  metaCurrency: 0,
};

// ─── Run reward calculation ───────────────────────────────────────────────────

/**
 * Calculate the Core Shards reward for a completed (or failed) run.
 */
export function calculateRunReward(
  state: GameState,
  anomalySurvivalRate: number,
): RunReward {
  const cfg = META_CURRENCY_CONFIG;

  const base = cfg.baseReward;

  const won = state.screen === 'run_complete';
  // phasesCleared = phaseIndex + 1 if run_complete, else phaseIndex
  const phasesCleared = state.phaseIndex + (won ? 1 : 0);
  const phasesBonus   = phasesCleared * cfg.perPhaseClearedBonus;

  const anomalyBonus  = anomalySurvivalRate > 0 ? cfg.anomalyClearBonus : 0;

  const outputAboveThreshold = Math.max(0, state.totalOutput - cfg.highOutputThreshold);
  const outputBonus = Math.floor(outputAboveThreshold / 100) * cfg.highOutputBonusPerHundred;

  const metaCurrencyEarned = base + phasesBonus + anomalyBonus + outputBonus;

  return {
    metaCurrencyEarned,
    breakdown: { base, phasesBonus, anomalyBonus, outputBonus },
  };
}

// ─── Apply reward to profile ──────────────────────────────────────────────────

export function applyRunReward(profile: ProfileState, reward: RunReward): ProfileState {
  return {
    ...profile,
    metaCurrency: profile.metaCurrency + reward.metaCurrencyEarned,
  };
}

// ─── Unlock helpers ───────────────────────────────────────────────────────────

function withCurrency(profile: ProfileState, cost: number): ProfileState | null {
  if (profile.metaCurrency < cost) return null;
  return { ...profile, metaCurrency: profile.metaCurrency - cost };
}

export function unlockCatalyst(profile: ProfileState, id: CatalystId): ProfileState | null {
  if (profile.unlockedCatalysts.includes(id)) return profile;
  const def = CATALYST_DEFS[id];
  const cost = UNLOCK_COSTS.catalyst[def.rarity];
  const updated = withCurrency(profile, cost);
  if (!updated) return null;
  return { ...updated, unlockedCatalysts: [...updated.unlockedCatalysts, id] };
}

export function unlockSignal(profile: ProfileState, id: SignalId): ProfileState | null {
  if (profile.unlockedSignals.includes(id)) return profile;
  const updated = withCurrency(profile, UNLOCK_COSTS.signal);
  if (!updated) return null;
  return { ...updated, unlockedSignals: [...updated.unlockedSignals, id] };
}

export function unlockProtocol(profile: ProfileState, id: ProtocolId): ProfileState | null {
  if (profile.unlockedProtocols.includes(id)) return profile;
  const updated = withCurrency(profile, UNLOCK_COSTS.protocol);
  if (!updated) return null;
  return { ...updated, unlockedProtocols: [...updated.unlockedProtocols, id] };
}

export function unlockAnomaly(profile: ProfileState, id: AnomalyId): ProfileState | null {
  if (profile.unlockedAnomalies.includes(id)) return profile;
  // Anomalies cost like a common catalyst
  const updated = withCurrency(profile, UNLOCK_COSTS.catalyst.common);
  if (!updated) return null;
  return { ...updated, unlockedAnomalies: [...updated.unlockedAnomalies, id] };
}

export function unlockAscensionLevel(profile: ProfileState, level: AscensionLevel): ProfileState | null {
  if (profile.unlockedAscensionLevel >= level) return profile;
  const cost = UNLOCK_COSTS.ascensionLevelPerLevel * level;
  const updated = withCurrency(profile, cost);
  if (!updated) return null;
  return { ...updated, unlockedAscensionLevel: level };
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/** Returns true if the profile has enough meta currency for the given unlock. */
export function canAffordCatalyst(profile: ProfileState, id: CatalystId): boolean {
  const def = CATALYST_DEFS[id];
  return profile.metaCurrency >= UNLOCK_COSTS.catalyst[def.rarity];
}

export function canAffordSignal(profile: ProfileState): boolean {
  return profile.metaCurrency >= UNLOCK_COSTS.signal;
}

export function canAffordProtocol(profile: ProfileState): boolean {
  return profile.metaCurrency >= UNLOCK_COSTS.protocol;
}

export function canAffordAscension(profile: ProfileState, level: AscensionLevel): boolean {
  return profile.metaCurrency >= UNLOCK_COSTS.ascensionLevelPerLevel * level;
}

/** Returns the list of catalysts that are still locked for this profile. */
export function getLockedCatalysts(profile: ProfileState): CatalystId[] {
  return ALL_CATALYSTS
    .map(c => c.id)
    .filter(id => !profile.unlockedCatalysts.includes(id));
}

/** Returns the maximum ascension level a profile can play (capped at 8). */
export function getMaxPlayableAscension(profile: ProfileState): AscensionLevel {
  const levels = ALL_ASCENSION_LEVELS.filter(l => l <= profile.unlockedAscensionLevel);
  return levels[levels.length - 1] ?? 0;
}
