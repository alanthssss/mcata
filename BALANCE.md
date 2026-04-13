# Merge Catalyst — Balance Guide

## Balancing Goals

1. The game should feel progressively harder across 6 phases
2. Catalysts should each offer a meaningful choice
3. Anomaly phases should be challenging but survivable with good play
4. Better agents should clearly outperform weaker ones (strategic depth)
5. Win rate for the best agent (MCTS/Heuristic) should be in the 5%–40% range

---

## Display Score Scaling

### Motivation

Internal score values from tile merges are relatively small integers (e.g. a strong
move produces a raw `finalOutput` of 80–200).  To make numbers feel more rewarding to
players without changing game mechanics, a display scale factor is applied.

### Implementation

```ts
// src/core/config.ts
export const DISPLAY_SCORE_SCALE = 10;
```

All player-facing score displays (`Header`, `PhasePanel`, `OutputPanel`, `LogPanel`,
`EndScreen`) call `formatScore(rawValue)` or `formatScoreCompact(rawValue)` from
`src/ui/scoreDisplay.ts`, which applies `× DISPLAY_SCORE_SCALE` and adds comma formatting.

### Internal vs Display

| Context | Value used |
|---------|-----------|
| Engine merge/score logic | Raw internal value |
| Benchmark / AI agents | Raw internal value |
| Phase target comparison (`output >= target`) | Raw internal value |
| All player-facing UI labels | `rawValue × DISPLAY_SCORE_SCALE` |

### Balance Impact

**No mechanical change.**  Phase targets, catalyst multipliers, and all engine logic
remain on raw values.  Only the display layer changes.  Benchmark reports show raw output
for direct comparability across versions.

To adjust the display feel: change `DISPLAY_SCORE_SCALE` in `src/core/config.ts`.
A value of 1 restores raw-number display.  Values of 10–100 are recommended for
mainstream appeal.

---

## Key Tuning Knobs (first block)

All parameters are centralised in **`src/core/config.ts`**.

### Scoring Config

```ts
// Chain multipliers
CHAIN_MULTIPLIERS = { 1: 1.0, 2: 1.2, 3: 1.5 }
CHAIN_MULTIPLIER_4PLUS = 2.0

// Condition multipliers
CORNER_MERGE_MULT = 1.2
HIGHEST_TILE_MULT = 1.2
```

### Catalyst Config

```ts
CATALYST_MULTIPLIERS = {
  corner_crown:   2.0,   // reduce to 1.5 if too dominant
  twin_burst:     1.5,   // reduce to 1.3 if stacks too easily
  combo_wire:     1.3,
  high_tribute:   1.4,
  // Amplifiers
  empty_amplifier_per_cell:   0.05, // per empty cell bonus
  chain_reactor_extra:        0.2,  // extra chain increment
  echo_multiplier_carry:      0.2,  // carry fraction
  threshold_surge_mult:       1.5,  // surge multiplier
  threshold_surge_value:      30,   // base output threshold
  phase_resonance_per_phase:  0.1,  // per-phase increment
  // Stabilizers
  gravity_well_mult:          1.1,
  stability_field_mult:       1.2,
  stability_field_period:     3,
  // Generators
  rich_merge_energy_per_merge: 1,
  energy_loop_fraction:       0.1,
  reserve_bank_energy_per_step: 1,
  double_spawn_probability:   0.25,
  // Modifiers
  diagonal_merge_mult:        1.2,
  diagonal_merge_period:      4,
  inversion_field_mult:       1.15,
  anomaly_sync_mult:          1.3,
}
```

### Synergy Config

```ts
SYNERGY_MULTIPLIERS = {
  corner_empire:        1.3,   // reduce to 1.2 if corner builds dominate
  chain_echo:           1.4,   // reduce to 1.25 if chain runs too strong
  generator_surplus:    1.25,
  amplified_stability:  1.35,
  phase_reactor:        1.3,
}
```

**Expected ranges**:
- Individual synergy bonus: 1.1 – 1.5×
- Combined synergy stack (2 synergies): up to ~1.8×
- Flag as overpowered if synergy win rate > 2× global win rate

### Momentum Config

```ts
MOMENTUM_CONFIG = {
  growthRate:    0.05,   // per consecutive valid move
  maxMultiplier: 2.0,    // cap
  validMoveMinOutput: 1, // minimum output to count
}
```

**Expected ranges**:
- Average momentum at phase end: 1.1–1.4×
- Peak momentum (uninterrupted run): up to 2.0×
- Flag as runaway if average > 1.6× across all agents

### Signal Config

```ts
SIGNAL_CAPACITY    = 2         // max signals held
PULSE_BOOST_MULT   = 2.0       // pulse_boost output multiplier
GRID_CLEAN_COUNT   = 2         // tiles removed by grid_clean
```

**Signal Strength Assessment**:
- `pulse_boost`: Strongest; can be timed on large merges for massive output
- `grid_clean`: Most versatile; removes board clutter
- `chain_trigger`: Situational; valuable when chain length is high
- `freeze_step`: Defensive; prevents bad spawns

If `pulse_boost` win rate > 3× global, reduce `PULSE_BOOST_MULT` to 1.7.

### Protocol Modifiers

```ts
// corner_protocol
cornerMultiplier: 1.5    // reduce if corner builds too dominant
outputScale: 1.0

// sparse_protocol
startTiles: 1            // increase to 2 if too hard
spawnFrequencyFactor: 2.0 // reduce to 1.5 if too slow
outputScale: 1.2

// overload_protocol
outputScale: 1.4         // reduce to 1.2 if too strong
stepsReduction: 2        // increase to 3 if too easy
```

### Phase Targets & Steps

```ts
PHASE_CONFIG = [
  { phaseNumber: 1, targetOutput: 70,  steps: 12 },
  { phaseNumber: 2, targetOutput: 80,  steps: 12 },
  { phaseNumber: 3, targetOutput: 75,  steps: 10 },
  { phaseNumber: 4, targetOutput: 40,  steps: 8  },  // Entropy Tax
  { phaseNumber: 5, targetOutput: 80,  steps: 10 },
  { phaseNumber: 6, targetOutput: 55,  steps: 8  },  // Collapse Field
]
```

**To reduce difficulty**: lower `targetOutput` values or increase `steps`.  
**To increase difficulty**: raise targets or reduce steps.

### Anomaly Intensity

```ts
COLLAPSE_FIELD_PERIOD = 4  // every N moves triggers collapse; raise to 5 to weaken further
SPAWN_4_PROBABILITY = 0.10 // base spawn-4 chance
```

### Economy

```ts
STARTING_ENERGY = 10        // raise to 12 to make Forge more accessible
FORGE_REROLL_COST = 1       // cost to reroll forge offers
```

---

## How Benchmark Informs Tuning

Run `npm run balance` to generate `artifacts/benchmark/latest/balance_report.md`.

The analysis flags:

| Flag | Suggested Action |
|------|-----------------|
| Win rate < 2% (all agents) | Reduce Phase 5–6 `targetOutput` by 10–15% |
| Win rate > 50% (best agent) | Increase Phase 4+ targets or reduce steps |
| Catalyst pick rate < 5% | Reduce cost or increase multiplier |
| Catalyst win rate > 2× global | Reduce multiplier by 0.1–0.2 |
| Synergy win rate > 2× global | Reduce synergy multiplier by 0.05–0.1 |
| Anomaly survival < 30% | Increase `COLLAPSE_FIELD_PERIOD` or reduce spawn block frequency |
| Agent similarity (< 10% output gap) | Increase phase complexity or heuristic weight on synergy |
| Average momentum > 1.6× | Reduce `MOMENTUM_CONFIG.growthRate` |

---

## Build Analysis (New in v3)

`artifacts/benchmark/latest/build_stats.json` shows the top 10 most common catalyst combinations. Use this to identify:

- **Dominant builds**: High frequency + high win rate → may need nerf
- **Underused builds**: Low frequency despite low cost → may need buff
- **Synergy-enabled builds**: Look for combinations matching synergy pairs

`artifacts/benchmark/latest/synergy_stats.json` tracks each synergy's trigger rate and impact.

---

## Balance v3 — New Systems Tuning Order

1. **Phase targets** (biggest lever)
2. **Protocol correctness** (verify each protocol produces measurable output/step difference)
3. **Synergy multipliers** (detect dominant 2-catalyst combos)
4. **Momentum growth rate** (ensure it rewards but doesn't trivialize phases)
5. **Signal strength** (especially pulse_boost — biggest single-move impact)
6. **New catalyst multipliers** (amplifiers → stabilizers → generators → modifiers)

---

## Balance v2 — Applied Changes

**Version tag**: `balanceVersion: "v2"` in `src/core/config.ts`

### Phase Target Changes

| Phase | v1 Target | v2 Target | Rationale |
|-------|-----------|-----------|-----------|
| 1 | 120 | 70 | Bring Phase 1 within reach of RandomAgent to establish a reachable floor |
| 2 | 260 | 80 | Reduce to match realistic 12-step output |
| 3 | 500 | 75 | Make Forge reachable so catalyst economy can be tested |
| 4 (Entropy Tax) | 900 | 40 | Reduce compound difficulty wall (anomaly + high target) |
| 5 | 1400 | 80 | Make Phases 5–6 reachable for strong agents |
| 6 (Collapse Field) | 2200 | 55 | Allow runs to complete and validate full catalyst/anomaly loop |

---

## Future Balance Workflow

1. **Run `npm run benchmark`** after each tuning change to the config
2. **Compare `comparison.md`** before and after
3. **Check `catalyst_stats.json`** — pick rates should be roughly comparable across catalysts
4. **Check `synergy_stats.json`** — no synergy should have > 2× global win rate
5. **Check `build_stats.json`** — no single 3-catalyst build should dominate > 30% of wins
6. **Check `anomaly_stats.json`** — survival rates should be >30% for best agents
7. **Iterate**: adjust config, re-run, compare

### Target Balance State

| Metric | Target |
|--------|--------|
| HeuristicAgent win rate | 5%–30% |
| RandomAgent vs Heuristic output gap | > 20% |
| Anomaly survival (Heuristic) | 40%–70% |
| Catalyst pick rate (any catalyst) | > 10% |
| No single catalyst with > 2× global win rate | |
| No single synergy with > 2× global win rate | |
| Average momentum at end of phase 6 | 1.2–1.5× |

---

## Tuning Priority Order

1. **Phase targets** (biggest lever — fix agent survivability first)
2. **Anomaly intensity** (once phases are reachable, test anomaly difficulty)
3. **Synergy multipliers** (balance after catalyst economy visible)
4. **Momentum growth rate** (fine-tune after synergy stable)
5. **Signal strength** (test in targeted benchmark)
6. **Catalyst costs/multipliers** (fine-tune after economy is visible)
7. **Step counts** (secondary lever after targets)
8. **Spawn probabilities** (minor effect; adjust last)


## Balancing Goals

1. The game should feel progressively harder across 6 phases
2. Catalysts should each offer a meaningful choice
3. Anomaly phases should be challenging but survivable with good play
4. Better agents should clearly outperform weaker ones (strategic depth)
5. Win rate for the best agent (MCTS/Heuristic) should be in the 5%–40% range

---

## Key Tuning Knobs

All parameters are centralised in **`src/core/config.ts`**.

### Phase Targets & Steps

```ts
PHASE_CONFIG = [
  { phaseNumber: 1, targetOutput: 70,  steps: 12 },
  { phaseNumber: 2, targetOutput: 80,  steps: 12 },
  { phaseNumber: 3, targetOutput: 75,  steps: 10 },
  { phaseNumber: 4, targetOutput: 40,  steps: 8  },  // Entropy Tax
  { phaseNumber: 5, targetOutput: 80,  steps: 10 },
  { phaseNumber: 6, targetOutput: 55,  steps: 8  },  // Collapse Field
]
```

**To reduce difficulty**: lower `targetOutput` values or increase `steps`.  
**To increase difficulty**: raise targets or reduce steps.

### Catalyst Multipliers

```ts
CATALYST_MULTIPLIERS = {
  corner_crown: 2.0,   // reduce to 1.5 if too dominant
  twin_burst:   1.5,   // reduce to 1.3 if stacks too easily
  combo_wire:   1.3,
  high_tribute: 1.4,
  reserve_bonus: 20,   // output per unused step; reduce if Reserve too strong
  bankers_edge_energy: 2,
}
```

### Anomaly Intensity

```ts
COLLAPSE_FIELD_PERIOD = 4  // every N moves triggers collapse; raise to 5 to weaken further
SPAWN_4_PROBABILITY = 0.10 // base spawn-4 chance
```

### Economy

```ts
STARTING_ENERGY = 10        // raise to 12 to make Forge more accessible
FORGE_REROLL_COST = 1       // cost to reroll forge offers
```

---

## How Benchmark Informs Tuning

Run `npm run balance` to generate `artifacts/benchmark/latest/balance_report.md`.

The analysis flags:

| Flag | Suggested Action |
|------|-----------------|
| Win rate < 2% (all agents) | Reduce Phase 5–6 `targetOutput` by 10–15% |
| Win rate > 50% (best agent) | Increase Phase 4+ targets or reduce steps |
| Catalyst pick rate < 5% | Reduce cost or increase multiplier |
| Catalyst win rate > 2× global | Reduce multiplier by 0.1–0.2 |
| Anomaly survival < 30% | Increase `COLLAPSE_FIELD_PERIOD` or reduce spawn block frequency |
| Agent similarity (< 10% output gap) | Increase phase complexity or heuristic weight on synergy |

---

## Initial Balance Concerns

Based on early benchmark runs:

### Phase Difficulty Slope
- Phases 1–3 are achievable for Greedy/Heuristic agents
- Phase 4 (Entropy Tax) causes the first major drop-off
- Phases 5–6 are currently unreachable for all tested agents
- **Recommendation**: Consider lowering Phase 5 target to ~1200 and Phase 6 to ~1800

### Catalyst Economy
- Agents never reach the Forge (dies before Phase 3 clear)
- All catalyst pick rates show as 0% — not because catalysts are bad, but because the game is too hard to reach the Forge
- Fix the phase difficulty first; catalyst balance can be assessed after

### Anomaly Phases
- Entropy Tax (Phase 4) combined with already-constrained steps creates a compound difficulty wall
- Consider giving +1 bonus step on entering Phase 4 as a buffer

### Corner Crown & Twin Burst
- Both have high multipliers (2.0 and 1.5) — likely dominant once Forge is reachable
- Monitor pick rate and win rate once phase difficulty is adjusted

### Reserve
- "+20 per unused step" is strong with a step-conservative strategy
- Worth monitoring — may drive all winning strategies toward "reserve hoarding"

---

## Balance v2 — Applied Changes

**Version tag**: `balanceVersion: "v2"` in `src/core/config.ts`

### Problem Summary (v1)

All tested agents had near-0% win rates in v1 because phase targets were too high relative to what the tile merging system can produce in the given step budget.

### Phase Target Changes

| Phase | v1 Target | v2 Target | Rationale |
|-------|-----------|-----------|-----------|
| 1 | 120 | 70 | Bring Phase 1 within reach of RandomAgent to establish a reachable floor |
| 2 | 260 | 80 | Reduce to match realistic 12-step output |
| 3 | 500 | 75 | Make Forge reachable so catalyst economy can be tested |
| 4 (Entropy Tax) | 900 | 40 | Reduce compound difficulty wall (anomaly + high target) |
| 5 | 1400 | 80 | Make Phases 5–6 reachable for strong agents |
| 6 (Collapse Field) | 2200 | 55 | Allow runs to complete and validate full catalyst/anomaly loop |

### Anomaly Intensity Changes

| Parameter | v1 | v2 | Rationale |
|-----------|----|----|-----------|
| `COLLAPSE_FIELD_PERIOD` | 3 | 4 | Trigger every 4 scoring moves instead of 3 — slightly less punishing |

### Expected Effects

- Greedy/Heuristic agents should now regularly reach Phase 4+ and the Forge
- Catalyst pick rates will become observable (previously stuck at 0%)
- Anomaly survival rates become measurable for adjustment
- Win rates for best agents should land in the 20%–40% target range

---

## Future Balance Workflow

1. **Run `npm run benchmark`** after each tuning change to the config
2. **Compare `comparison.md`** before and after
3. **Check `catalyst_stats.json`** — pick rates should be roughly comparable across catalysts
4. **Check `anomaly_stats.json`** — survival rates should be >30% for best agents
5. **Iterate**: adjust config, re-run, compare

### Target Balance State

| Metric | Target |
|--------|--------|
| HeuristicAgent win rate | 5%–30% |
| RandomAgent vs Heuristic output gap | > 20% |
| Anomaly survival (Heuristic) | 40%–70% |
| Catalyst pick rate (any catalyst) | > 10% |
| No single catalyst with > 2× global win rate |  |

---

## Tuning Priority Order

1. **Phase targets** (biggest lever — fix agent survivability first)
2. **Anomaly intensity** (once phases are reachable, test anomaly difficulty)
3. **Catalyst costs/multipliers** (fine-tune after economy is visible)
4. **Step counts** (secondary lever after targets)
5. **Spawn probabilities** (minor effect; adjust last)

---

## Meta Progression Balance

### Design Goals

- **Early game easier**: A fresh profile (Ascension 0, only legacy catalysts) should feel achievable — giving players a foothold and motivation to keep playing.
- **Late game harder**: Ascension 8 should be a genuine challenge even for skilled players with a full unlock pool.
- **Smooth scaling**: Each ascension level should feel meaningfully harder than the previous, but not a sudden cliff.

### Difficulty Curve Expectations

| Ascension | Expected Best-Agent Win Rate |
|-----------|------------------------------|
| 0 | 10–40% |
| 1 | 5–20% |
| 2 | 2–10% |
| 3–5 | 1–5% |
| 6–7 | <2% |
| 8 | <1% |

These are guidelines, not hard targets. If Ascension 1 win rate collapses to 0% in benchmarks, consider:
- Increasing starting energy at A0 (buffer before A1 penalty kicks in)
- Reducing the step penalty from -1 to -0.5 (averaged across phases)

### Unlock Pacing

A typical player session earns 15–50 Core Shards per run (depending on how many phases they clear).

Expected unlock pacing:
- **Run 5–10**: First common catalyst (15 shards) becomes affordable.
- **Run 10–20**: First protocol or rare catalyst unlock.
- **Run 20–30**: First signal or epic catalyst.
- **Run 30+**: Ascension level 1 (20 shards) feels earned, not gated.

If players feel progression is too slow, increase `META_CURRENCY_CONFIG.baseReward` in `src/core/unlockConfig.ts`.
If unlocks feel too cheap (trivial to obtain), increase `UNLOCK_COSTS` in the same file.

### Meta Progression Impact on Balance

- **Base pool (only legacy catalysts)**: ~30–40% win rate for HeuristicAgent (restricted diversity).
- **Full pool (all catalysts)**: ~50–60% win rate for HeuristicAgent (more synergy options).

This ~20 percentage point gap is intentional and meaningful — it validates that unlocking content provides real power while the game remains playable from the start.

All values remain centralised in `src/core/unlockConfig.ts` and `src/core/ascensionModifiers.ts`.
