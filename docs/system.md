# Merge Boost — System Reference

> **Audience:** contributors and modders who want to understand or extend the
> core game systems.

---

## Simplified Naming Plan

The goal is to keep every player-facing label short, literal, and easy to guess.
Internal identifiers remain unchanged for compatibility.

| Old | New | Current meaning | Why it is confusing |
|---|---|---|---|
| Catalyst | Boost | Passive modifier item | Theme-heavy and not instantly functional |
| Signal | Skill | One-use tactical action | Sounds like telemetry/system data |
| Pattern | Style | Run-wide build path | Abstract and non-specific |
| Protocol | Rule | Run-start ruleset | Technical wording increases cognitive load |
| Synergy | Combo | Pair bonus between items | Design jargon instead of plain gameplay wording |
| Momentum | Streak | Consecutive-score multiplier | Physics term, not immediate gameplay action |
| Forge | Shop | Buy/sell screen | Flavor-first naming hides function |
| Infusion | Pick | Post-clear reward choice | Meaning is unclear without tutorial context |
| Phase | Stage | Single gameplay segment | Abstract progression term |
| Round | Level | Group of 6 stages | Can be confused with turns/steps |
| Anomaly | Hazard | Special challenge modifier | Lore-first naming over gameplay meaning |

### Naming rationale

- Use short, common words that explain function directly.
- Keep style concrete: nouns players already know from other games.
- Prefer consistency (`Shop` + `Pick`, `Stage` + `Level`, `Boost` + `Combo`).

### Risky replacements

- **Momentum → Streak**: `streak` is also a statistic label in some contexts.
- **Pattern → Style**: can read as cosmetic if not paired with effect text.
- **Round → Level**: may imply finite campaign progression.

---

## 1. Rule System

Rules are **per-run rule modifiers** chosen on the Start Screen before a
run begins.  They affect fundamental game parameters rather than individual
boost interactions.

### Available Rules

| Rule | Corner Bonus | Start Tiles | Spawn Factor | Output Scale | Steps Reduction |
|---|---|---|---|---|---|
| `corner_protocol` | ×1.5 | 2 | ×1.0 | ×1.0 | 0 |
| `sparse_protocol` | ×1.0 | 1 | ×2.0 (less frequent) | ×1.2 | 0 |
| `overload_protocol` | ×1.0 | 2 | ×1.0 | ×1.4 | −2 |

### How to Add a Rule

1. Add a new `ProtocolId` literal to `src/core/types.ts`.
2. Add the `ProtocolDef` entry to `PROTOCOL_DEFS` in `src/core/protocols.ts`.
3. Add i18n keys to `src/i18n/en.ts` and `src/i18n/zh-CN.ts`:
   - `protocol.<id>.name`
   - `protocol.<id>.description`
4. Provide `icon` + `stakes` in the protocol definition (UI reads these directly).
5. The new rule is automatically shown on the Start Screen selection grid.

### State Flow

```
StartScreen  (user selects protocol)
     │  ProtocolId
     ▼
useGameStore.initAndStart(seed, protocol)
     │
     ▼  createInitialState(seed, protocol)
GameState.protocol = protocol
     │
     ▼  Used by:
        score.ts  (cornerMultiplier)
        engine.ts (startTiles, stepsReduction, spawnFrequencyFactor, outputScale)
```

---

## Mode Availability

- Standard Run is the only enabled run mode.
- Challenge Mode and Daily Run are currently disabled via guarded store actions
  and removed start-screen entry points.
- Challenge/daily modules are retained in isolated code paths for future
  re-enable work.

---

## 2. Boost System

Boosts are **passive build modifiers** equipped during a run. Up to 6 can be
active simultaneously. Shop is the unified post-stage acquisition path.
Shop also supports selling Boosts, Style, and Skills for partial refunds.

### Boost Schema (`CatalystDef`)

| Field | Type | Description |
|---|---|---|
| `id` | `CatalystId` | Unique identifier |
| `name` | `string` | Display name |
| `description` | `string` | Effect summary |
| `rarity` | `common` \| `rare` \| `epic` | Affects unlock cost |
| `cost` | `number` | Energy cost to purchase in Shop |
| `category` | `amplifier` \| `stabilizer` \| `generator` \| `modifier` \| `legacy` | Functional group |
| `trigger` | `CatalystTrigger` | When the boost fires |
| `effectParams` | `CatalystEffectParams` | Numeric parameters |
| `tags` | `CatalystTag[]` | Semantic tags for filtering |
| `flavorText` | `string?` | Optional lore text |
| `unlockCondition` | `string` | Human-readable unlock requirement |

### Categories

- **amplifier** — output multipliers (e.g. Corner Crown, Chain Reactor)
- **stabilizer** — board control (e.g. Buffer Zone, Merge Shield)
- **generator** — resource / spawn economy (e.g. Rich Merge, Energy Loop)
- **modifier** — rule changes (e.g. Diagonal Merge, Inversion Field)
- **legacy** — original 8 boosts, always available

### Adding a New Boost

1. Add the `CatalystId` literal to `src/core/types.ts`.
2. Add the `CatalystDef` entry to `CATALYST_DEFS` in `src/core/catalysts.ts`.
3. Implement the effect in `src/core/score.ts` and/or `src/core/engine.ts`.
4. Add i18n entries to `src/i18n/en.ts` and `src/i18n/zh-CN.ts`.
5. Update unlock costs in `src/core/unlockConfig.ts` if needed.

---

## 2.1 Style System (Run Archetype Growth)

Styles are a separate run-level progression layer from Boosts and Skills.
Style purchases are sourced from Shop and strengthen one archetype
for the rest of the run (`corner`, `chain`, `empty_space`, `high_tier`,
`economy`, `survival`).

Player-facing flow:
- Acquisition: buy a Style in Shop
- Canonical source: Shop is the acquisition path
- Replacement/upgrade: one active Style at a time — same Style upgrades level, different Style replaces active Style at Lv.1
- Active display: Style panel in the run HUD shows active style + level
- Empty-state visibility: Skill/Style/Boost/Combo/Streak/Rule panels remain visible with compact localized placeholders even before acquisition
- Effect visibility: move logs/output panel include Style multiplier entries

---

## 3. Stage System

A run consists of 6 stages.  Each stage has a target output, step budget,
optional hazard, and benchmark data.

### Stage Structure

| Stage | Target | Steps | Challenge Tier | Hazard |
|---|---|---|---|---|
| 1 | 170+ | 20+ | small | — |
| 2 | 205+ | 21+ | big | — |
| 3 | 190+ | 20+ | boss | corner bonus disabled |
| 4 | 165+ | 20+ | small | Entropy Tax |
| 5 | 235+ | 23+ | big | — |
| 6 | 220+ | 24+ | boss | Collapse Field |

### Challenge Tiers

- **small** — warm-up stage, players should clear with ease
- **big** — primary challenge of the section; typical win rate gate
- **boss** — carries a rule modifier; requires adaptation

### Extending the Stage System

All stage configuration is authored in `config/game.yaml` (`phaseConfig`).
Run `npm run sync:config` to validate and regenerate runtime exports consumed by
`src/core/phases.ts`.

The type definition lives in `src/core/types.ts` → `PhaseDef`.  New fields
added there should be optional to avoid breaking existing serialised runs.

---

## 4. Combo System

Certain boost pairs unlock **combo bonuses** when both are equipped.

Combos are defined in `src/core/synergies.ts`.  Each `SynergyDef` requires:
- `catalysts: [CatalystId, CatalystId]` — the triggering pair
- `multiplier: number` — the output bonus multiplier

Combo multipliers are tuned in `config/game.yaml` (`synergyMultipliers`).

---

## 5. Skill System

Skills are **one-use tactical abilities** held between moves (max 2).  They
are defined in `src/core/signals.ts` and queued via `queueSignal()`.

UI behavior:
- queued skill shows an armed state
- trigger shows immediate feedback (log + toast text)
- consumed state is visible after use

---

## 6. Streak System

Consecutive scoring moves build the streak multiplier (up to ×2.0).  A
non-scoring move resets it.  Tuning lives in `config/game.yaml` (`momentumConfig`)
and is exported via `src/core/config.ts`.

---

## HUD Compact + Detail Interaction

Gameplay/system cards use a unified compact-first presentation:
- Default card content: name + tag/category + minimal essential numeric info.
- Detailed descriptions are shown on hover/focus (desktop) and tap/click toggle
  (touch fallback).
- A shared `CompactDetail` component handles interaction consistency, outside
  click close, and keyboard focus behavior.
- Last Move Breakdown and Reaction Log panels are collapsible from the right
  column to keep the default gameplay view compact.
- Build Identity panel summarizes current run direction (Score/Chain/Control/Energy/Hybrid),
  shows confidence, and provides drill-down score reasons.
- Shop cards include category + build-direction tags and fit-state hints
  (fits current build / creates direction / low synergy).

---

## Structured Run Log Export

Run completion writes structured telemetry to localStorage (`mcata_run_logs`).
Each run log includes:

- versioned run metadata (runId, seed, start/end time, rounds/stages reached, final output)
- build snapshot (Boosts, Combos, Skills, Style, Rule)
- per-stage + per-step records (board before/after, action, score breakdown, triggers, energy deltas)
- replay actions and derived analysis metrics

Exports are available from End Screen (current run JSON/CSV) and debug Start Screen
(`?debug=export_logs`, all-runs bundle/CSV summary). Export bundles include a config
snapshot (`GAME_CONFIG`) and config version for reproducibility.

---

## 7. Unlock System

Player progress is persisted via `useProfileStore` in
`src/store/profileStore.ts`.

- **Storage key:** `merge_catalyst_progress`
- **Default state:** `DEFAULT_PROFILE` (8 legacy boosts + corner_protocol)
- **Debug mode:** add `?debug=unlock_all` to the URL to unlock everything

On first visit (or incognito), the store falls back to `DEFAULT_PROFILE`,
ensuring new players start with a restricted boost pool.
