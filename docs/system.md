# Merge Catalyst — System Reference

> **Audience:** contributors and modders who want to understand or extend the
> core game systems.

---

## 1. Protocol System

Protocols are **per-run rule modifiers** chosen on the Start Screen before a
run begins.  They affect fundamental game parameters rather than individual
catalyst interactions.

### Available Protocols

| Protocol | Corner Bonus | Start Tiles | Spawn Factor | Output Scale | Steps Reduction |
|---|---|---|---|---|---|
| `corner_protocol` | ×1.5 | 2 | ×1.0 | ×1.0 | 0 |
| `sparse_protocol` | ×1.0 | 1 | ×2.0 (less frequent) | ×1.2 | 0 |
| `overload_protocol` | ×1.0 | 2 | ×1.0 | ×1.4 | −2 |

### How to Add a Protocol

1. Add a new `ProtocolId` literal to `src/core/types.ts`.
2. Add the `ProtocolDef` entry to `PROTOCOL_DEFS` in `src/core/protocols.ts`.
3. Add i18n keys to `src/i18n/en.ts` and `src/i18n/zh-CN.ts`:
   - `protocol.<id>.name`
   - `protocol.<id>.description`
4. Add the icon and difficulty mapping in `src/ui/components/StartScreen.tsx`.
5. The new protocol is automatically shown on the Start Screen selection grid.

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

## 2. Catalyst System

Catalysts are **passive build modifiers** equipped during a run.  Up to 3 may
be active simultaneously.  They are purchased at the Forge (after Phase 3) and
chosen via Infusion rewards after each phase clear.

### Catalyst Schema (`CatalystDef`)

| Field | Type | Description |
|---|---|---|
| `id` | `CatalystId` | Unique identifier |
| `name` | `string` | Display name |
| `description` | `string` | Effect summary |
| `rarity` | `common` \| `rare` \| `epic` | Affects unlock cost |
| `cost` | `number` | Energy cost to purchase in Forge |
| `category` | `amplifier` \| `stabilizer` \| `generator` \| `modifier` \| `legacy` | Functional group |
| `trigger` | `CatalystTrigger` | When the catalyst fires |
| `effectParams` | `CatalystEffectParams` | Numeric parameters |
| `tags` | `CatalystTag[]` | Semantic tags for filtering |
| `flavorText` | `string?` | Optional lore text |
| `unlockCondition` | `string` | Human-readable unlock requirement |

### Categories

- **amplifier** — output multipliers (e.g. Corner Crown, Chain Reactor)
- **stabilizer** — board control (e.g. Buffer Zone, Merge Shield)
- **generator** — resource / spawn economy (e.g. Rich Merge, Energy Loop)
- **modifier** — rule changes (e.g. Diagonal Merge, Inversion Field)
- **legacy** — original 8 catalysts, always available

### Adding a New Catalyst

1. Add the `CatalystId` literal to `src/core/types.ts`.
2. Add the `CatalystDef` entry to `CATALYST_DEFS` in `src/core/catalysts.ts`.
3. Implement the effect in `src/core/score.ts` and/or `src/core/engine.ts`.
4. Add i18n entries to `src/i18n/en.ts` and `src/i18n/zh-CN.ts`.
5. Update unlock costs in `src/core/unlockConfig.ts` if needed.

---

## 3. Phase System

A run consists of 6 phases.  Each phase has a target output, step budget,
optional anomaly, and benchmark data.

### Phase Structure

| Phase | Target | Steps | Challenge Tier | Anomaly |
|---|---|---|---|---|
| 1 | 70 | 12 | small | — |
| 2 | 80 | 12 | big | — |
| 3 | 75 | 10 | boss | corner bonus disabled |
| 4 | 40 | 8  | small | Entropy Tax |
| 5 | 80 | 10 | big | — |
| 6 | 55 | 8  | boss | Collapse Field |

### Challenge Tiers

- **small** — warm-up phase, players should clear with ease
- **big** — primary challenge of the section; typical win rate gate
- **boss** — carries a rule modifier; requires adaptation

### Extending the Phase System

All phase configuration lives in `src/core/config.ts` → `PHASE_CONFIG`.  To
add a phase or change targets, edit that array.  The engine reads it via
`src/core/phases.ts`.

The type definition lives in `src/core/types.ts` → `PhaseDef`.  New fields
added there should be optional to avoid breaking existing serialised runs.

---

## 4. Synergy System

Certain catalyst pairs unlock **synergy bonuses** when both are equipped.

Synergies are defined in `src/core/synergies.ts`.  Each `SynergyDef` requires:
- `catalysts: [CatalystId, CatalystId]` — the triggering pair
- `multiplier: number` — the output bonus multiplier

Synergy multipliers are tuned in `src/core/config.ts` → `SYNERGY_MULTIPLIERS`.

---

## 5. Signal System

Signals are **one-use tactical abilities** held between moves (max 2).  They
are defined in `src/core/signals.ts` and queued via `queueSignal()`.

---

## 6. Momentum System

Consecutive scoring moves build the momentum multiplier (up to ×2.0).  A
non-scoring move resets it.  Tuning lives in `src/core/config.ts` →
`MOMENTUM_CONFIG`.

---

## 7. Unlock System

Player progress is persisted via `useProfileStore` in
`src/store/profileStore.ts`.

- **Storage key:** `merge_catalyst_progress`
- **Default state:** `DEFAULT_PROFILE` (8 legacy catalysts + corner_protocol)
- **Debug mode:** add `?debug=unlock_all` to the URL to unlock everything

On first visit (or incognito), the store falls back to `DEFAULT_PROFILE`,
ensuring new players start with a restricted catalyst pool.
