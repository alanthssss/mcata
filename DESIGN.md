# Merge Catalyst — Design Document

## Overview

Merge Catalyst is a roguelike puzzle game built on 2048-style grid mechanics. The player progresses through 6 Phases, each with an Output target and step limit. Between Phase 3 and 4, the Forge allows purchasing Catalysts. After each phase, an Infusion reward is offered. Two Anomaly phases add asymmetric challenges.

---

## Terminology

| Term | Meaning |
|------|---------|
| Catalyst | Power-up modifier (NOT Joker) |
| Phase | Game stage/level (NOT Stage) |
| Anomaly | Special challenge modifier (NOT Boss) |
| Forge | Shop for buying Catalysts (NOT Shop) |
| Infusion | Post-phase reward (NOT Reward) |
| Energy | Currency for the Forge (NOT Coins) |
| Output | Score (NOT Score) |
| Steps | Moves remaining (NOT Moves) |
| Grid | 4×4 play field (NOT Board) |
| Reaction Log | Move history log (NOT Log) |

---

## Grid Rules

- 4×4 grid
- Standard 2048 merge: tiles of equal value combine into their sum
- Each tile merges only once per move
- A new tile spawns only if the move changed the grid
- Default spawn: 90% chance of 2, 10% chance of 4

---

## Phase Structure

```
Phase 1: targetOutput=120,  steps=12
Phase 2: targetOutput=260,  steps=12
Phase 3: targetOutput=500,  steps=10
→ Forge Phase (between 3 and 4)
Phase 4: targetOutput=900,  steps=8   [Anomaly: Entropy Tax]
Phase 5: targetOutput=1400, steps=10
Phase 6: targetOutput=2200, steps=8   [Anomaly: Collapse Field]
```

Completing Phase 6 = Run Complete (victory).

If Steps reach 0 before Output target is met = game over (defeat).

---

## Scoring Formula

```
finalOutput = floor(base × chain × condition × catalyst × global)
```

### Base
Sum of merged tile values in that move.

### Chain Multiplier
| Merges | Multiplier |
|--------|-----------|
| 1 | 1.0 |
| 2 | 1.2 |
| 3 | 1.5 |
| 4+ | 2.0 |

### Condition Multipliers
- Corner merge (destination is a corner cell): ×1.2
- Highest tile merge (result exceeds prior max): ×1.2
- Both conditions stack multiplicatively.

### Catalyst Multipliers
Applied from active Catalysts (see below).

### Global Multiplier
Starts at 1.0. Increased by +0.1 for each Infusion multiplier choice taken.

---

## Catalysts (8 total, max 3 active)

| ID | Name | Rarity | Cost | Effect |
|----|------|--------|------|--------|
| corner_crown | Corner Crown | Rare | 5 | Corner merges × 2.0 Output |
| twin_burst | Twin Burst | Common | 3 | ≥2 merges in a move × 1.5 Output |
| lucky_seed | Lucky Seed | Common | 3 | Spawn: 75% 2, 25% 4 |
| bankers_edge | Banker's Edge | Common | 3 | +2 Energy on phase clear |
| reserve | Reserve | Rare | 5 | +20 Output per unused step on phase clear |
| frozen_cell | Frozen Cell | Common | 3 | One cell (1,1) cannot spawn tiles |
| combo_wire | Combo Wire | Rare | 5 | 3 consecutive scoring moves → × 1.3 Output |
| high_tribute | High Tribute | Rare | 5 | Highest tile merge → × 1.4 Output |

---

## Anomalies

### Entropy Tax (Phase 4)
- Before each move, 1 random empty cell is blocked from receiving a spawn tile.
- The blocked cell is highlighted in the UI.

### Collapse Field (Phase 6)
- Every 3 valid moves, the highest tile on the grid is reduced by one level (value / 2).
- Counter resets per phase.

---

## Forge (Between Phase 3 and 4)

- 3 random Catalyst offers shown
- Player may buy any (if affordable) or reroll
- Reroll costs 1 Energy
- If all 3 slots are full, player must choose which Catalyst to replace
- Player may skip the Forge entirely at no cost
- Grid resets (2 fresh tiles) when entering Phase 4

---

## Infusion (After Each Phase Clear)

Player chooses one of up to 4 options:
1. **Gain a Catalyst** — add a random catalyst not already active (if < 3 slots)
2. **Gain 3 Energy** — adds 3 to energy reserve
3. **Gain +2 Steps** — adds 2 steps to the next phase's step limit
4. **+10% Global Multiplier** — increments globalMultiplier by 0.1

---

## Reaction Log

Each valid move records:
- `step`: which step number this was
- `action`: direction (up/down/left/right)
- `gridBefore`, `gridAfter`: full grid snapshots
- `merges`: list of merge events with positions and values
- `spawn`: position of the newly spawned tile (or null)
- `anomalyEffect`: description of any anomaly effect that fired
- `base`, `multipliers`, `finalOutput`: scoring breakdown
- `triggeredCatalysts`: list of catalyst IDs that activated

The UI displays the last 10 log entries.

---

## RNG

Uses a seeded xorshift32 PRNG. Seed is derived from `Date.now()` at game start. The seed advances per move to ensure reproducibility within a run while varying across runs.

---

## Architecture

```
src/
  core/          Pure game logic (no React)
    types.ts     All TypeScript types and interfaces
    rng.ts       Seeded PRNG
    board.ts     Grid utilities
    move.ts      Move application and merge logic
    score.ts     Output scoring calculation
    catalysts.ts Catalyst definitions
    anomalies.ts Anomaly effects
    phases.ts    Phase configuration
    forge.ts     Forge offer generation
    infusion.ts  Infusion option generation
    engine.ts    Main game state machine
  store/
    gameStore.ts Zustand state store
  ui/
    App.tsx      Root component and keyboard handler
    style.css    Dark theme CSS
    components/  Individual UI components
```

---

## Tech Stack

- **React 18** — UI rendering
- **Vite 5** — dev server and bundler
- **TypeScript 5** — type safety
- **Zustand 4** — minimal global state management
