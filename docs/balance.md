# Merge Boost — Balance Guide

> **Audience:** designers and developers tuning the game's difficulty curve.

---

## Benchmark Targets

Each stage defines three output tiers used by the benchmark suite:

| Stage | Target | Expected (avg player) | High-Skill |
|---|---|---|---|
| 1 (small) | 170 | 225 | 320 |
| 2 (big) | 205 | 280 | 410 |
| 3 (boss) | 190 | 255 | 380 |
| 4 (small + Entropy Tax) | 165 | 220 | 320 |
| 5 (big) | 235 | 320 | 470 |
| 6 (boss + Collapse Field) | 220 | 295 | 430 |

### Interpretation

- **Target** — minimum output to pass the stage; set to be achievable by a
  casual player with basic strategy.
- **Expected** — what a typical player actually achieves on a winning run.
  Should be 20–50% above target.
- **High-Skill** — output a skilled player with an optimised build can
  consistently reach.  Used to detect overpowered boosts.

---

## Level-Clear Goals

| Player Tier | Target Avg Levels Cleared |
|---|---|
| New player (no strategy) | 0–1 |
| Intermediate | 1–3 |
| Skilled (combo builds) | 2–5 |

Run `npm run balance` to generate a live balance report at
`artifacts/benchmark/latest/balance_report.md`.

`npm run balance` runs three Heuristic-focused suites in sequence:
- `balance`
- `pacing`
- `round_stress`

For iterative numeric tuning, run `npm run balance:tune` to execute the
Heuristic auto-tuning loop and generate:
- `tuning_history.json`
- `tuning_summary.md`
- `best_config.json`
- `best_config.yaml`
- `before_vs_after.md`

---

## Scaling Rules

### Difficulty Curve

Stage targets and steps now scale additively with both stage and level:

```
steps  = base + phaseScale + roundScale
target = base + phaseScale + roundScale
```

### Exponential Growth Reference (for future stages)

```
Phase N target ≈ 50 × 1.5^(N-1)

Phase 1:  50
Phase 2:  75
Phase 3:  112
Phase 4:  168
Phase 5:  252
Phase 6:  378
```

The current targets are set lower than the pure exponential model to ensure
win rates stay within the goal range given the step budget.

### Step Economy

Each stage provides ~20+ steps in level 1 and scales upward by level. Average output-per-step for a typical player
is roughly 7–10.  A skilled player with combos can reach 15–20 per step.

### Energy Economy

- Starting Energy: **5**
- Level-complete Energy bonus: **2**
- Shop is now the single post-stage acquisition layer (no free Pick rewards)

To increase difficulty without changing targets: reduce `steps`.
To reduce difficulty without changing feel: increase `steps`.

---

## Key Tuning Knobs

All tunable constants are authored in `config/game.yaml` (then validated and synced to `src/core/generatedGameConfig.ts` via `npm run sync:config`).

### Stage Targets & Steps

```ts
PHASE_CONFIG = [
  { phaseNumber: 1, targetOutput: 170, steps: 20, expectedOutput: 225, highSkillOutput: 320, challengeTier: 'small' },
  { phaseNumber: 2, targetOutput: 205, steps: 20, expectedOutput: 280, highSkillOutput: 410, challengeTier: 'big'   },
  { phaseNumber: 3, targetOutput: 190, steps: 18, expectedOutput: 255, highSkillOutput: 380, challengeTier: 'boss'  },
  { phaseNumber: 4, targetOutput: 165, steps: 17, expectedOutput: 220, highSkillOutput: 320, challengeTier: 'small' },
  { phaseNumber: 5, targetOutput: 235, steps: 19, expectedOutput: 320, highSkillOutput: 470, challengeTier: 'big'   },
  { phaseNumber: 6, targetOutput: 220, steps: 19, expectedOutput: 295, highSkillOutput: 430, challengeTier: 'boss'  },
]
```

**To reduce difficulty:** lower `targetOutput` values or increase `steps`.
**To increase difficulty:** raise targets or reduce steps.

### Boost Power Budget

| Rarity | Expected win-rate uplift | Multiplier cap |
|---|---|---|
| Common | +5% | ×1.5 |
| Rare | +10% | ×2.0 |
| Epic | +15% | ×2.5 |

### Combo Caps

Combo multipliers should stay in the ×1.25–×1.40 range.  Exceeding ×1.50
tends to make combo-enabled builds dominate regardless of player skill.

### Streak Cap

`MOMENTUM_CONFIG.maxMultiplier = 2.0`.  The grow rate
(`MOMENTUM_CONFIG.growthRate = 0.05`) means the cap is reached after 20
consecutive scoring moves.  Adjusting these changes how quickly skilled
players pull ahead.

---

## How Benchmark Informs Tuning

Run `npm run balance` to generate `artifacts/benchmark/latest/balance_report.md`.

| Flag | Suggested Action |
|---|---|
| Avg levels cleared < 1 (all agents) | Reduce early/mid target outputs by 10–15% |
| Avg levels cleared > 8 (best agent) | Increase Stage 4+ targets or reduce steps |
| Boost pick rate < 5% | Reduce cost or increase multiplier |
| Boost win rate > 2× global | Reduce multiplier by 0.1–0.2 |
| Hazard survival < 30% | Increase `COLLAPSE_FIELD_PERIOD` or reduce spawn block frequency |
| Average streak > 1.6× | Reduce `MOMENTUM_CONFIG.growthRate` |

Additional tuning-loop targets (see `src/benchmark/tuning.ts`):
- `avgMovesPerPhase` and `avgMovesPerPhaseByRound`
- `avgHighestTierPerPhase` and `avgHighestTierPerRound`
- `highTierReachDistribution`
- `energyIncomePerRound` / `energySpentPerRound`
- `forgeAffordabilityRate`
- `buildMaturityByRound`
- `lateGameClearSpeed`

---

## Run Log Export in Balance Reviews

Use structured run log exports to complement benchmark suites with real gameplay traces:

- Export current run JSON/CSV from End Screen
- Export all local run bundles from Start Screen in `?debug=export_logs`
- Compare before/after exported bundles with:

```bash
npm run runlog:analyze -- artifacts/runlog_before.json artifacts/runlog_after.json
```

Key exported fields for tuning:
- `avgOutputPerMove`, `avgMovesPerStage`, `roundsCleared`, `highestTierReached`
- `energyEarnedTotal`, `energySpentTotal`, `lateGameClearSpeed`
- per-step triggers (combo/skill/surge) and raw board/action data for deep-dive analysis

### Generating Analysis Reports

Use `report:run` and `report:compare` for human-readable Markdown + HTML reports:

```bash
# Single-run health check
npm run report:run -- artifacts/runlog_current.json report.md

# Before-vs-after config comparison
npm run report:compare -- artifacts/runlog_before.json artifacts/runlog_after.json comparison.md
```

The before-vs-after report answers:
- Did phases become longer or shorter?
- Did higher-tier merges become more common?
- Did economy become tighter?
- Did late-game speed-clears reduce?

### Meta-Health Analysis

Identify dominant, dead, and trap build identities across a set of exported run logs:

```bash
npm run report:meta -- artifacts/runlog_all.json artifacts/meta_health.md
```

**Build classifications:**

| Class | Definition |
|---|---|
| 🔴 Dominant | High pick rate (≥ 30%) + significantly above-average output (≥ 1.30×). Nerf candidates. |
| 🟢 Healthy | Moderate presence and competitive performance. No action needed. |
| 🔵 Niche | Low pick rate but adequate performance. May need discoverability help. |
| ⚫ Dead | Low pick rate (< 10%) + below-average output (< 0.80×). Buff candidates. |
| 🟡 Trap | Present in runs but consistently underperforms (< 0.85× global). Misleading to players. |

**Actionable suggestions are included per build:**
- Dominant: raise shop price, reduce rarity weight or multiplier, add counter-mechanic
- Dead: lower shop price, buff combo/synergy payoff, improve availability
- Trap: buff core output, reduce phase targets for this build style, add hint text

---

## Balance Version History

| Version | Key Changes |
|---|---|
| v1 | Initial targets (too high, near-0% win rates) |
| v2 | Stage targets drastically reduced to establish reachable floor |
| v3 | New boosts + combo system; benchmark fields added to PHASE_CONFIG |
