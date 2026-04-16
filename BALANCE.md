# Merge Catalyst — Balance Guide

## Balancing Goals

1. The game should feel progressively harder across rounds (6 phases per round, endless)
2. Each round should feel meaningfully different thanks to rotating templates
3. Catalysts should each offer a meaningful choice — especially with 6 active slots
4. Anomaly phases should be challenging but survivable with good play
5. Better agents should clearly outperform weaker ones (strategic depth)
6. Best agent averages 2–5 rounds cleared per run; later agents clear fewer rounds (strategic depth)
7. Catalyst rarity must be gameplay-significant in probability, pacing, and cost

---

## Catalyst Rarity as a Hard Rule

Rarity is config-driven (`src/core/config.ts`) with:
- offer weight
- minimum round gate
- per-run cap (optional)
- economy cost (from catalyst defs)

Forge offer generation uses weighted rarity selection; early rounds strongly favor Common, mid rounds increase Rare share, and Epic is late + scarce.
Infusion direct Catalyst rewards (rare by design) also use the same rarity gate/weights.

---

## Forge / Infusion Separation

- **Forge** = permanent Catalyst acquisition and Catalyst sell/pivot loop.
- **Infusion** = mostly tactical/economy rewards; direct Catalyst gain is uncommon.
- Full-slot direct Catalyst infusion is deterministic and explicit: conversion to Energy (no silent no-op).

---

## Catalyst Sell Economy

Catalyst selling refunds a rarity-based percentage of cost:
- Common: 60%
- Rare: 50%
- Epic: 40%

This enables build pivots while preserving long-term economy pressure.

---

## Round Scaling

The game now uses **endless round progression**: every 6 phases complete a round, and rounds continue until the player fails a phase.

### Scaling Parameters

```ts
// src/core/config.ts
export const ROUND_TARGET_SCALE  = 0.12; // targetOutput × (1 + (round-1) × 0.12)
export const ROUND_ECONOMY_SCALE = 0.08; // future energy-gain scaling hook
```

### Phase Templates

Three templates rotate across rounds.  Each defines a different 6-phase arc:

| Template | ID | Pacing | Anomaly Placement |
|----------|----|--------|--------------------|
| Standard Circuit | `alpha` | Balanced ramp | Phases 4 + 6 |
| Pressure Gauntlet | `beta` | Early anomaly pressure | Phases 2 + 4 |
| Economic Surge | `gamma` | Long economy phases | Phases 3 + 5 |

Round assignment: `templateIndex = (roundNumber - 1) % 3`

### Expected Run Length (Heuristic agent, ascension 0)

| Round | Expected Survival% (approx) |
|-------|------------------------|
| 1 | 55–75% survive to Round 2 |
| 2 | 30–55% survive to Round 3 |
| 3 | 10–25% survive to Round 4 |
| 4+ | < 15% survive to Round 5 |

These are rough targets, not guarantees. Use benchmark data to calibrate.

---

## Catalyst Slot Expansion (3 → 6)

The active catalyst capacity was expanded from **3** to **6** slots.

### Risks to Monitor

| Risk | Mitigation |
|------|-----------|
| Runaway synergy stacking | Synergies cap at one bonus per pair — adding more catalysts doesn't stack the same synergy twice |
| Build identity too easy to achieve | 6 slots means players can hold an entire economy _and_ scoring build simultaneously — watch avgRoundsCleared across catalyst counts |
| Forge economy flooding | Forge now appears every phase; consider adjusting `STARTING_ENERGY` if agents accumulate too much energy |

### Economy Review

Because the Forge is now accessible after every phase (via Intermission):
- Each phase clear yields an Infusion reward AND Forge access
- Average energy inflow per phase is unchanged (Infusion → energy option still grants 3)
- Players can buy more catalysts per run on average — this is intentional

### Recommended Tuning Knobs

If 6-slot builds feel too easy by Round 2:
- Increase catalyst costs by 1–2 energy
- Reduce `STARTING_ENERGY` from 5 to 3
- Add a per-round surcharge to Forge reroll

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
- Flag as overpowered if synergy avgRoundsCleared > 2× global

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

If `pulse_boost` avgRoundsCleared > 3× global, reduce `PULSE_BOOST_MULT` to 1.7.

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
| Catalyst avgRoundsCleared > 2× global | Reduce multiplier by 0.1–0.2 |
| Synergy avgRoundsCleared > 2× global | Reduce synergy multiplier by 0.05–0.1 |
| Anomaly survival < 30% | Increase `COLLAPSE_FIELD_PERIOD` or reduce spawn block frequency |
| Agent similarity (< 10% output gap) | Increase phase complexity or heuristic weight on synergy |
| Average momentum > 1.6× | Reduce `MOMENTUM_CONFIG.growthRate` |

---

## Build Analysis (New in v3)

`artifacts/benchmark/latest/build_stats.json` shows the top 10 most common catalyst combinations. Use this to identify:

- **Dominant builds**: High frequency + high avgRoundsCleared → may need nerf
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
4. **Check `synergy_stats.json`** — no synergy should have > 2× global avgRoundsCleared
5. **Check `build_stats.json`** — no single 3-catalyst build should dominate > 30% of wins
6. **Check `anomaly_stats.json`** — survival rates should be >30% for best agents
7. **Iterate**: adjust config, re-run, compare

### Target Balance State

| Metric | Target |
|--------|--------|
| HeuristicAgent avgRoundsCleared | 2.0–5.0 |
| RandomAgent vs Heuristic output gap | > 20% |
| Anomaly survival (Heuristic) | 40%–70% |
| Catalyst pick rate (any catalyst) | > 10% |
| No single catalyst with > 2× global avgRoundsCleared | |
| No single synergy with > 2× global avgRoundsCleared | |
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
| Catalyst avgRoundsCleared > 2× global | Reduce multiplier by 0.1–0.2 |
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
- Monitor pick rate and avgRoundsCleared once phase difficulty is adjusted

### Reserve
- "+20 per unused step" is strong with a step-conservative strategy
- Worth monitoring — may drive all winning strategies toward "reserve hoarding"

---

## Balance v2 — Applied Changes

**Version tag**: `balanceVersion: "v2"` in `src/core/config.ts`

### Problem Summary (v1)

All tested agents cleared 0 rounds in v1 because phase targets were too high relative to what the tile merging system can produce in the given step budget.

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
| HeuristicAgent avgRoundsCleared | 2.0–5.0 |
| RandomAgent vs Heuristic output gap | > 20% |
| Anomaly survival (Heuristic) | 40%–70% |
| Catalyst pick rate (any catalyst) | > 10% |
| No single catalyst with > 2× global avgRoundsCleared |  |

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

| Ascension | Expected Best-Agent AvgRoundsCleared |
|-----------|------------------------------|
| 0 | 10–40% |
| 1 | 5–20% |
| 2 | 2–10% |
| 3–5 | 1–5% |
| 6–7 | <2% |
| 8 | <1% |

These are guidelines, not hard targets. If Ascension 1 avgRoundsCleared drops to < 0.5 in benchmarks, consider:
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

- **Base pool (only legacy catalysts)**: ~1.5–3.0 avgRoundsCleared for HeuristicAgent (restricted diversity).
- **Full pool (all catalysts)**: ~3.0–5.0 avgRoundsCleared for HeuristicAgent (more synergy options).

This ~20 percentage point gap is intentional and meaningful — it validates that unlocking content provides real power while the game remains playable from the start.

All values remain centralised in `src/core/unlockConfig.ts` and `src/core/ascensionModifiers.ts`.

---

## v5 — Reward Systems Balance

### Round-End Rewards
- **+3 Energy per round**: Equivalent to ~1 Forge purchase every 2–3 rounds. This is intentionally generous to keep the Forge feel of progression alive.
- **+5% Global Multiplier per round**: Stacks multiplicatively. By Round 10, the player has an extra ×1.5 on top of base multiplier. This is the primary driver of "score feels bigger over time" without breaking individual phase targets (which scale by +12% per round).

### Jackpot System
- Triggered at 2% probability when a single move scores ≥50 output
- Expected jackpots per run: ~2–5 depending on skill
- Output bonus (+100 internal = +1,000 display) is ~1–2 phases worth of bonus; felt but not dominant
- Recommendation: monitor `avgJackpots` in benchmark. If > 8 per run, lower `JACKPOT_PROBABILITY` to 0.015.

### Streak System
- Qualifies at ≥5 output per move (very easy to maintain in mid-game)
- Energy reward: +1 every 5 qualifying moves ≈ +2–4 energy per phase in good runs
- Does not affect output multipliers, only economy; safe to have generous thresholds
- Reset condition is intentionally lenient (any sub-5 output move) to be forgiving

### Milestone Rewards
- Energy rewards (small): designed to give small boosts, never enough to significantly shift the Forge economy
- Multiplier rewards: each milestone grants +0.1–0.2 to global multiplier; across all milestones this could add up to +1.5 multiplier in a long run, which is meaningful but earned over many rounds


---

## Balance v5 — Phase Pacing & Catalyst Pool

### Phase Pacing Overhaul

Previous phase targets (v4) were too low, causing phases to end in 2–3 moves.
v5 targets are calibrated so a skilled player with no catalysts needs
**6–12 moves** to clear any phase.

#### Alpha Template (Standard Circuit)

| Phase | v4 Target | v5 Target | v4 Steps | v5 Steps |
|-------|-----------|-----------|----------|----------|
| 1 | 70 | 150 | 12 | 15 |
| 2 | 80 | 180 | 12 | 15 |
| 3 | 75 | 160 | 10 | 13 |
| 4 (Entropy) | 40 | 90 | 8 | 11 |
| 5 | 80 | 200 | 10 | 13 |
| 6 (Collapse) | 55 | 130 | 8 | 11 |

#### Tuning Rationale

- A 2-tile board merge (4+4=8) gives ~8 base output.  A 3-chain merge at mid-game
  might give ~40 output.  The old target of 70 was reachable in 2 lucky merges.
- New target of 150 typically requires 5–8 productive moves, matching the design
  goal of meaningful phase length.
- Anomaly phases (Entropy Tax / Collapse Field) remain harder than clean phases
  per step, so their targets are still lower in absolute terms.

### Catalyst Pool — Build Diversity Impact

The run-level `catalystPool` enforces unique-per-run acquisition.  Balance impact:

- **Reduced re-roll gaming**: Previously a player could keep re-rolling the forge
  to see the same powerful catalyst repeatedly.  Now once acquired, it's gone.
- **Mid-game variety**: Late forge offerings pull from a smaller pool, encouraging
  creative builds rather than always picking the same catalyst.
- **Expected diversity**: In a typical 8-catalyst unlock pool, by phase 4 the
  player has acquired 1–3 catalysts, leaving 5–7 unique options still available.

### Pacing Metrics (Target)

| Metric | Target |
|--------|--------|
| Avg moves per phase | 6–12 |
| Avg max tile (round 1 end) | 32–64 |
| Phases ending on step limit | < 20 % |
| Phases ending on output target | > 80 % |

---

## Balance v6 — Late-Game Pacing Fix

### Root Cause Analysis

After v5, phases were still clearing in 2–3 moves by round 4+ despite the increased
targets.  The root cause was a **linear vs exponential mismatch**:

| Growth | Type | Rate |
|--------|------|------|
| Round target scaling (v5) | Linear | +12 % per round |
| Global multiplier (Infusion) | Additive / multiplicative | +0.1 per choice → 1.7+ by round 5 |
| Catalyst stack | Multiplicative | ×1.5 × 1.4 × 1.3 × … = 2–8× |
| Synergy bonuses | Multiplicative | ×1.25–1.4 on top |
| Momentum | Multiplicative | up to ×2.0 |
| Board tile values | Exponential | 16 → 64 → 256 |

By round 5 with 4–5 catalysts, a single good merge produced 300–500+ output against
targets of only 220 (150 × 1.48 linear).

### v6 Pacing Model

**Two complementary changes:**

#### 1. Segmented Composite Growth Curve
Round target generation now uses a configurable composite formula:

```
target = base * phaseFactor * roundFactor * smoothing

phaseFactor = 1 + (phaseIndex ^ 1.3)
roundFactor = 1 + (roundIndex ^ 2)
smoothing   = log(phaseIndex + roundIndex + 2)
```

All knobs are configurable in `SEGMENTED_GROWTH_SCALING` (`src/core/config.ts`):
- `baseMultiplier`
- `phaseExponent`
- `roundExponent`
- `smoothingOffset`
- `roundIndexOffset`
- `roundIndexScale`
- `phaseIndexByPhaseNumber`

Phase segmentation used by default:
- Early (P1–P2): lower phase index to keep onboarding accessible
- Mid (P3–P4): moderate index to raise development pressure
- Late (P5–P6): higher index to prevent 2–3 turn clears

Step budgets are aligned to the segmented pacing bands:
- Early: **10–16**
- Mid: **12–20**
- Late: **14–24**

#### 2. Build-Aware Target Scaling (`getBuildAwareTargetScale`)
At every phase transition the effective target is multiplied by a build factor that
directly counters the player's accumulated power:

```
buildFactor = min(
  1 + catalystCount × 0.12 + (globalMultiplier − 1.0) × 0.30,
  3.0
)
```

Examples:
| Build | Catalysts | Multiplier | Build Factor |
|-------|-----------|------------|-------------|
| No build | 0 | 1.0 | 1.00× |
| Early (round 2) | 1 | 1.1 | 1.15× |
| Mid (round 4) | 3 | 1.3 | 1.45× |
| Strong (round 6) | 5 | 1.6 | 1.78× |
| Expert (round 8+) | 6 | 2.0 | 2.02× (capped at 3.0) |

### Combined Effect

For a median player at round 5 (3 catalysts, mult 1.2):
- Compound round factor: `1.15^4 = 1.75`
- Build factor: `1 + 3×0.12 + 0.2×0.30 = 1.42`
- Alpha P1 effective target: `150 × 1.75 × 1.42 = 373`
- Typical output per move (32 tile, 4× mult stack): ~30–50
- **Expected moves: 7–12** ✓

For expert play at round 5 (5 cats, mult 1.5):
- Build factor: `1 + 5×0.12 + 0.5×0.30 = 1.75`
- Alpha P1 effective target: `150 × 1.75 × 1.75 = 459`
- Expert output per move: ~80–120
- **Expected moves: 4–6** (acceptable — they earned their build)

### phaseTargetOutput Field

`GameState.phaseTargetOutput` now stores the **pre-computed effective target** for
the current phase.  It is:

- Set at run start (phase 0 of round 1, no build = base × ascension only)
- Recomputed at every phase transition using the player's current build
- Used consistently for both the engine success check and the UI progress display

This also fixes a pre-existing UI bug: `Header` and `PhasePanel` previously showed
the stale round-1 template target (`PHASES[phaseIndex].targetOutput`) regardless of
the current round.  They now read `state.phaseTargetOutput`.

### Pacing Metrics (v6 Targets)

| Metric | v5 Target | v6 Target |
|--------|-----------|-----------|
| Avg moves per phase (all rounds) | 6–12 | 6–12 |
| Avg max tile | — | higher than v5 baseline |
| Late-game clear turns (round 4+) | — | > 3.0 |
| Short-clear rate (≤ 3 moves) | < 20 % | < 10 % |
| Late-game short-clear rate (round 4+) | — | < 5 % |
| Phases ending on step limit | < 20 % | < 15 % |
