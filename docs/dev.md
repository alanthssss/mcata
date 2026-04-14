# Merge Catalyst — Developer Guide

> **Audience:** contributors extending or maintaining the codebase.

---

## Architecture Overview

```
src/
├── core/          Pure TypeScript — no browser APIs, fully testable
│   ├── types.ts          All shared type definitions
│   ├── config.ts         Centralised tuning constants
│   ├── engine.ts         Game state machine (createInitialState, processMoveAction, …)
│   ├── score.ts          Scoring formula
│   ├── catalysts.ts      Catalyst definitions
│   ├── protocols.ts      Protocol definitions
│   ├── phases.ts         Phase list (thin wrapper around PHASE_CONFIG)
│   ├── synergies.ts      Synergy definitions
│   ├── signals.ts        Signal definitions
│   ├── anomalies.ts      Anomaly effect logic
│   ├── profile.ts        ProfileState helpers
│   └── unlockConfig.ts   Default unlock sets and costs
├── store/
│   ├── gameStore.ts      Zustand store wrapping the engine
│   └── profileStore.ts   Persistent profile store (localStorage)
├── ui/
│   ├── App.tsx           Root component + screen routing
│   ├── style.css         All styles
│   └── components/       Individual UI components
├── i18n/                 Internationalisation (en / zh-CN)
├── theme/                Visual theme system
├── benchmark/            Benchmark agents + suites (Node-only)
├── ai/                   AI agents (Node-only)
└── scripts/              CLI runners (Node-only)
```

The `benchmark/`, `ai/`, and `scripts/` directories are excluded from the web
build via `tsconfig.json`.

---

## State Design

### GameState

`GameState` (in `src/core/types.ts`) is the single source of truth for a run.
It is **immutable** — every engine function takes a state and returns a new one.

Key fields:

| Field | Description |
|---|---|
| `screen` | Current screen: `start`, `playing`, `forge`, `infusion`, `game_over`, `run_complete` |
| `protocol` | Active `ProtocolId` for this run |
| `phaseIndex` | 0-based index into `PHASES` |
| `stepsRemaining` | Steps left in current phase |
| `energy` | Spendable energy |
| `output` | Accumulated output for current phase |
| `totalOutput` | Accumulated across all phases |
| `activeCatalysts` | IDs of currently equipped catalysts (max 3) |
| `unlockedCatalysts` | Available catalyst pool for this run (`undefined` = full pool) |
| `globalMultiplier` | Base multiplier accumulator (Infusion rewards) |
| `momentumMultiplier` | Current momentum bonus |
| `protocol` | Active protocol for this run |

### ProfileState

`ProfileState` (in `src/core/types.ts`) is the **persistent** player record,
kept separate from `GameState` so the engine stays pure.

```ts
interface ProfileState {
  unlockedCatalysts:      CatalystId[];
  unlockedSignals:        SignalId[];
  unlockedProtocols:      ProtocolId[];
  unlockedAnomalies:      AnomalyId[];
  unlockedAscensionLevel: AscensionLevel;  // 0–8
  metaCurrency:           number;           // Core Shards
}
```

The profile is managed by `useProfileStore` (Zustand) in
`src/store/profileStore.ts`.

---

## Storage Design

### Key: `merge_catalyst_progress`

```json
{
  "unlockedCatalysts": ["corner_crown", "twin_burst", "..."],
  "unlockedSignals": [],
  "unlockedProtocols": ["corner_protocol"],
  "unlockedAnomalies": ["entropy_tax", "collapse_field"],
  "unlockedAscensionLevel": 0,
  "metaCurrency": 0
}
```

### Initialisation Logic

```ts
// profileStore.ts
function loadProfile(): ProfileState {
  if (?debug=unlock_all) return allUnlocked;
  try {
    const raw = localStorage.getItem('merge_catalyst_progress');
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { ...DEFAULT_PROFILE };
}
```

This ensures:
- First visit → DEFAULT_PROFILE (8 legacy catalysts only)
- Returning visit → persisted progress
- Incognito → DEFAULT_PROFILE (no crash, correct locked state)
- `?debug=unlock_all` → all catalysts visible (development only)

### Persistence

`useProfileStore.setProfile()` and `unlockCatalysts()` both call
`persistProfile()` which writes to localStorage synchronously.  Errors (e.g.
quota exceeded in incognito) are silently swallowed to avoid crashing the game.

---

## Run Flow

```
Start Screen
  │  user selects protocol + clicks "Start Run"
  ▼
useGameStore.initAndStart(seed, protocol)
  │  → createInitialState(seed, protocol)  (screen: 'playing')
  ▼
Playing Screen
  │  processMoveAction(state, dir) per move
  ▼
Phase Clear (output >= targetOutput) OR Steps Exhausted
  │
  ├── Steps remain: infusion screen → selectInfusion()
  └── Steps exhausted: game_over
  │
Phase 3 Clear → Forge Screen (buyFromForge / rerollForge / skipForge)
  │
Phase 6 Clear → run_complete
```

---

## Extension Guide

### Adding a New Protocol

1. Add `ProtocolId` literal to `src/core/types.ts`
2. Add `ProtocolDef` to `PROTOCOL_DEFS` in `src/core/protocols.ts`
3. Add i18n keys (`protocol.<id>.name`, `protocol.<id>.description`)
4. Add icon + difficulty tag to `src/ui/components/StartScreen.tsx`

### Adding a New Catalyst

1. Add `CatalystId` literal to `src/core/types.ts`
2. Add `CatalystDef` to `CATALYST_DEFS` in `src/core/catalysts.ts`
3. Implement effect in `src/core/score.ts` and/or `src/core/engine.ts`
4. Add i18n entries and unlock condition

### Adding a New Phase

1. Append entry to `PHASE_CONFIG` in `src/core/config.ts`
   ```ts
   {
     phaseNumber: 7,
     targetOutput: 100,
     steps: 10,
     expectedOutput: 130,
     highSkillOutput: 220,
     challengeTier: 'big',
   }
   ```
2. No engine changes needed — the engine reads `PHASES.length` dynamically

### Adding an Unlock Condition

- Score-based: check `state.totalOutput` in `calculateRunReward`
- Phase completion: hook into `advancePhase` in engine
- Discovery: add flag to `ProfileState` and set it on first encounter

---

## Build & Test Commands

```bash
npm run dev            # start Vite dev server
npm run build          # TypeScript + Vite production build
npm test               # run all unit tests (vitest)
npm run benchmark      # run baseline benchmark suite
npm run balance        # run balance probe + generate report
npm run docs:assets    # generate Mermaid diagram SVGs
```

---

## Debug Tools

| Tool | How to Activate |
|---|---|
| Unlock all catalysts | Add `?debug=unlock_all` to URL |
| Run benchmark in CI | `npx tsx src/scripts/runBenchmark.ts --suite smoke` |
| Meta benchmark | `npm run benchmark:meta` |

---

## Code Conventions

- **Pure engine** — `src/core/` has zero browser API dependencies.
- **One source of truth** — all tuning constants in `src/core/config.ts`.
- **Immutable state** — every engine function returns a new state object.
- **i18n everywhere** — all user-facing strings use `useT()` / `t()`.
- **No magic numbers** — reference named constants from `config.ts`.
