# Merge Catalyst — Balance Guide

> **Audience:** designers and developers tuning the game's difficulty curve.

---

## Benchmark Targets

Each phase defines three output tiers used by the benchmark suite:

| Phase | Target | Expected (avg player) | High-Skill |
|---|---|---|---|
| 1 (small) | 70 | 90 | 140 |
| 2 (big) | 80 | 110 | 180 |
| 3 (boss) | 75 | 100 | 160 |
| 4 (small + Entropy Tax) | 40 | 55 | 90 |
| 5 (big) | 80 | 110 | 200 |
| 6 (boss + Collapse Field) | 55 | 75 | 130 |

### Interpretation

- **Target** — minimum output to pass the phase; set to be achievable by a
  casual player with basic strategy.
- **Expected** — what a typical player actually achieves on a winning run.
  Should be 20–50% above target.
- **High-Skill** — output a skilled player with an optimised build can
  consistently reach.  Used to detect overpowered catalysts.

---

## Round-Clear Goals

| Player Tier | Target Avg Rounds Cleared |
|---|---|
| New player (no strategy) | 0–1 |
| Intermediate | 1–3 |
| Skilled (synergy builds) | 2–5 |

Run `npm run balance` to generate a live balance report at
`artifacts/benchmark/latest/balance_report.md`.

`npm run balance` runs three suites in sequence:
- `balance`
- `pacing`
- `round_stress`

---

## Scaling Rules

### Difficulty Curve

Phase targets grow roughly 1.5–2× per section:

```
Phase 1–2:  entry zone  (targets 70–80)
Phase 3:    boss gate   (modifier introduces, target slightly lower to compensate)
Phase 4:    anomaly tax (low target offset by board disruption)
Phase 5–6:  endgame     (targets 80 / 55 with compounding anomalies)
```

### Exponential Growth Reference (for future phases)

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

Each phase provides 8–12 steps.  Average output-per-step for a typical player
is roughly 7–10.  A skilled player with synergies can reach 15–20 per step.

To increase difficulty without changing targets: reduce `steps`.
To reduce difficulty without changing feel: increase `steps`.

---

## Key Tuning Knobs

All tunable constants live in `src/core/config.ts`.

### Phase Targets & Steps

```ts
PHASE_CONFIG = [
  { phaseNumber: 1, targetOutput: 70,  steps: 12, expectedOutput: 90,  highSkillOutput: 140, challengeTier: 'small' },
  { phaseNumber: 2, targetOutput: 80,  steps: 12, expectedOutput: 110, highSkillOutput: 180, challengeTier: 'big'   },
  { phaseNumber: 3, targetOutput: 75,  steps: 10, expectedOutput: 100, highSkillOutput: 160, challengeTier: 'boss'  },
  { phaseNumber: 4, targetOutput: 40,  steps: 8,  expectedOutput: 55,  highSkillOutput: 90,  challengeTier: 'small' },
  { phaseNumber: 5, targetOutput: 80,  steps: 10, expectedOutput: 110, highSkillOutput: 200, challengeTier: 'big'   },
  { phaseNumber: 6, targetOutput: 55,  steps: 8,  expectedOutput: 75,  highSkillOutput: 130, challengeTier: 'boss'  },
]
```

**To reduce difficulty:** lower `targetOutput` values or increase `steps`.
**To increase difficulty:** raise targets or reduce steps.

### Catalyst Power Budget

| Rarity | Expected win-rate uplift | Multiplier cap |
|---|---|---|
| Common | +5% | ×1.5 |
| Rare | +10% | ×2.0 |
| Epic | +15% | ×2.5 |

### Synergy Caps

Synergy multipliers should stay in the ×1.25–×1.40 range.  Exceeding ×1.50
tends to make synergy-enabled builds dominate regardless of player skill.

### Momentum Cap

`MOMENTUM_CONFIG.maxMultiplier = 2.0`.  The grow rate
(`MOMENTUM_CONFIG.growthRate = 0.05`) means the cap is reached after 20
consecutive scoring moves.  Adjusting these changes how quickly skilled
players pull ahead.

---

## How Benchmark Informs Tuning

Run `npm run balance` to generate `artifacts/benchmark/latest/balance_report.md`.

| Flag | Suggested Action |
|---|---|
| Avg rounds cleared < 1 (all agents) | Reduce early/mid target outputs by 10–15% |
| Avg rounds cleared > 8 (best agent) | Increase Phase 4+ targets or reduce steps |
| Catalyst pick rate < 5% | Reduce cost or increase multiplier |
| Catalyst win rate > 2× global | Reduce multiplier by 0.1–0.2 |
| Anomaly survival < 30% | Increase `COLLAPSE_FIELD_PERIOD` or reduce spawn block frequency |
| Average momentum > 1.6× | Reduce `MOMENTUM_CONFIG.growthRate` |

---

## Balance Version History

| Version | Key Changes |
|---|---|
| v1 | Initial targets (too high, near-0% win rates) |
| v2 | Phase targets drastically reduced to establish reachable floor |
| v3 | New catalysts + synergy system; benchmark fields added to PHASE_CONFIG |
