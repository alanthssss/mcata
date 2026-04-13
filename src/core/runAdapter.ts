/**
 * Run adapter — bridges ProfileState and the pure game engine.
 *
 * The engine (createInitialState et al.) is kept pure.
 * This adapter translates profile constraints into engine parameters.
 */
import { ProfileState, RunReward, AscensionLevel, CatalystId } from './types';
import { ProtocolId } from './types';
import { createInitialState, startGame } from './engine';
import { GameState } from './types';
import { DEFAULT_PROTOCOL } from './protocols';
import { calculateRunReward, applyRunReward } from './profile';

// ─── Run configuration ────────────────────────────────────────────────────────

export interface RunConfig {
  seed: number;
  protocol?: ProtocolId;
  ascensionLevel?: AscensionLevel;
  /**
   * When true the run ignores unlock restrictions — useful for benchmark
   * "full pool" comparisons.
   */
  ignoreUnlocks?: boolean;
}

// ─── Create a game state configured by the profile ───────────────────────────

/**
 * Creates the initial GameState for a run, applying the profile's unlock
 * restrictions and the requested ascension level.
 *
 * If `ignoreUnlocks` is true (benchmark full-pool mode) the unlock filter is
 * not applied and all catalysts are available.
 */
export function createRunState(profile: ProfileState, config: RunConfig): GameState {
  const protocol  = config.protocol ?? DEFAULT_PROTOCOL;
  const requested = config.ascensionLevel ?? 0;

  // Cap ascension to what the profile has unlocked
  const ascensionLevel = Math.min(
    requested, profile.unlockedAscensionLevel
  ) as AscensionLevel;

  const unlockedCatalysts: CatalystId[] | undefined = config.ignoreUnlocks
    ? undefined                         // undefined → full pool
    : profile.unlockedCatalysts;

  return startGame(createInitialState(config.seed, protocol, {
    ascensionLevel,
    unlockedCatalysts,
  }));
}

// ─── Finalize a run and update the profile ────────────────────────────────────

export interface RunSummary {
  reward:         RunReward;
  updatedProfile: ProfileState;
}

/**
 * Called after a run ends.  Calculates the Core Shards earned and returns the
 * updated ProfileState.
 *
 * @param anomalySurvivalRate  0–1 fraction of anomaly phases survived
 *                             (pass 1 if the run was won, 0 if first anomaly
 *                             phase wasn't reached).
 */
export function finalizeRun(
  profile: ProfileState,
  finalState: GameState,
  anomalySurvivalRate: number,
): RunSummary {
  const reward         = calculateRunReward(finalState, anomalySurvivalRate);
  const updatedProfile = applyRunReward(profile, reward);
  return { reward, updatedProfile };
}
