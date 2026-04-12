# Merge Catalyst — Balance Guide

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
