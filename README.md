# Merge Catalyst

A themeable merge roguelike puzzle game with Catalysts, Anomaly phases, and a full AI benchmark framework.
Built with React, Vite, and TypeScript.

> **Commercial shell note**: The game no longer relies on a 2048-style presentation.
> Tile visuals are driven by a pluggable **theme system** — the default shell uses a
> generic progression ladder (Seed → Iron → Bronze → … → Singularity).
> The underlying numeric merge engine remains unchanged and benchmark-compatible.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview
```

## Gameplay

- Merge tiles on a 4×4 grid using arrow keys
- Each **Phase** has a target **Output** you must reach within a step limit
- After every phase:
  1. Choose an **Infusion** reward (primarily non-Catalyst: energy / steps / multiplier / signal / pattern / pool tools)
  2. Optionally shop at the **Forge** (primary permanent Catalyst acquisition path)
- Every **6 phases** complete a **Round** — then the next round starts automatically
- Rounds grow harder each round (targets scale 12% per round)
- The run ends only when you **fail a phase** (output too low when steps run out)
- Survive **Anomaly** phases with special modifiers (Entropy Tax, Collapse Field)
- Build a team of up to **6 Catalysts** for deep synergies and identity
- Grow one **Pattern** archetype (Corner / Chain / Empty-space / High-tier / Economy / Survival) from **Infusion** rewards for run-long scaling
- Pattern rules: one active Pattern at a time; picking the same Pattern upgrades it, picking a different Pattern replaces it
- Sell Catalysts in Forge to recover partial Energy and pivot builds safely

## Protocols

A Protocol is a **run-level rule modifier** chosen before the run begins. It
changes fundamental game parameters — corner bonuses, starting tiles, spawn
frequency, output scaling, and step budgets.

### Choosing a Protocol

On the Start Screen you will see a **Protocol Selection** grid.  Click one of
the three cards to select it, then click **Start Run**.

| Protocol | Icon | Stakes | Effect |
|---|---|---|---|
| Corner Protocol | 📐 | Standard | Corner merges gain an extra ×1.5 multiplier |
| Sparse Protocol | 🌑 | Tactical | Start with 1 tile; spawn halved, output ×1.2 |
| Overload Protocol | ⚡ | Overclocked | Output ×1.4, but each phase has 2 fewer steps |

The selected protocol is displayed in the top bar throughout the run.

### Round Templates (phase patterns)

Three templates rotate across rounds:

| Template | Flavour |
|----------|---------|
| Standard Circuit (alpha) | Balanced ramp — two anomaly climaxes |
| Pressure Gauntlet (beta) | Anomalies arrive early and often |
| Economic Surge (gamma) | Long phases reward patient economy |

## Catalysts

Up to **6 Catalysts** can be active at once. The Forge is the default permanent acquisition path; direct Catalyst Infusion rewards are intentionally rare and rarity-gated.

### Forge Duplicate Guard

- If a Catalyst is already owned, buying it is blocked in UI and engine.
- Blocked duplicate purchases do **not** consume Energy and do **not** change run state.
- Purchased Forge offers are removed immediately to prevent repeat-buy bugs.

| Name | Rarity | Effect |
|------|--------|--------|
| Corner Crown | Rare | Corner merges ×2 Output |
| Twin Burst | Common | ≥2 merges → ×1.5 Output |
| Lucky Seed | Common | 75% chance to spawn 2, 25% to spawn 4 |
| Banker's Edge | Common | +2 Energy on phase clear |
| Reserve | Rare | +20 Output per unused step on phase clear |
| Frozen Cell | Common | One cell blocked from spawning |
| Combo Wire | Rare | 3 consecutive scoring moves → ×1.3 |
| High Tribute | Rare | Highest tile merge → ×1.4 |

### Unlock System & Collection

The **Collection** screen shows every Catalyst in the game and whether it has
been unlocked.

**Unlock rule**: A Catalyst is **permanently unlocked** the first time you
**acquire** it in any run — either from the Forge or as an Infusion reward.

- Unlock state is written to `localStorage` immediately on acquisition so the
  Collection updates without needing to restart the game.
- The same Catalyst can only be unlocked once — duplicate writes are silently
  ignored.
- On a fresh session (or incognito mode) only the 8 legacy Catalysts are
  unlocked by default.
- Corrupted or missing storage data falls back safely to the default profile.

### Per-Run Catalyst Pool

Within a single run each Catalyst can be **acquired at most once**.  The
run-level pool starts as a copy of your unlocked Catalysts:

- When you **acquire** a Catalyst (Forge purchase or Infusion choice) it is
  permanently removed from the pool for that run.
- When a Catalyst is **shown but not selected** in the Forge it returns to the
  pool and may appear again later.
- If the pool is exhausted the Forge shows no catalyst cards and Infusion offers
  only Energy / Steps / Multiplier.

Advanced Catalysts beyond the 8 legacy ones can be unlocked by spending
**Core Shards** (see Meta Progression below).

## Scoring

```
finalOutput = floor(base × chain × condition × catalyst × global)
```

- **base**: sum of merged tile values
- **chain**: 1 merge=1.0, 2=1.2, 3=1.5, 4+=2.0
- **condition**: corner merge=×1.2, highest tile merge=×1.2
- **catalyst**: from active catalyst bonuses
- **global**: accumulated from Infusion multiplier choices

**Display score**: All player-facing output values are multiplied by
`DISPLAY_SCORE_SCALE` (default ×10) for readability.  Internal raw scores
(used by the engine and benchmarks) are unchanged.

## Meta Progression

Merge Catalyst has a lightweight meta-progression layer built on top of the
run loop.

### Core Shards

Every run earns **Core Shards** — the meta currency:

```
shards = base(10) + phases_cleared × 5 + anomaly_survived × 10
       + floor((output − 200) / 100)
```

Shards accumulate across runs and are spent in the Collection screen to unlock
new content.

| Content | Cost |
|---------|------|
| Common catalyst | 15 Core Shards |
| Rare catalyst | 25 Core Shards |
| Epic catalyst | 40 Core Shards |
| Protocol | 30 Core Shards |
| Signal | 20 Core Shards |
| Ascension level N | N × 20 Core Shards |

### Ascension

**Ascension (0–8)** is an optional difficulty system.  Each level stacks one
additional penalty (fewer steps, higher targets, anomaly frequency, etc.).
Level 0 is the baseline — identical to a classic run.

### Collection & Unlock Persistence

The Collection screen shows every Catalyst, Protocol, Signal, and Anomaly in
the game together with their unlock status.

- Unlocks are written to `localStorage` immediately on acquisition.
- A fresh profile (no prior data) ships with 8 legacy Catalysts unlocked.
- Corrupted or missing storage falls back safely to the default profile.
- The Collection reflects new unlocks in real time — no restart needed.

## Theme System

Tile visuals are fully decoupled from game logic.

```
src/theme/
  types.ts           — TileThemeEntry + TileTheme interfaces
  defaultTheme.ts    — Default progression theme (Seed → Singularity)
  progressionTheme.ts — Re-export of the default theme
  mathTheme.ts       — Placeholder for math/science theme
  historyTheme.ts    — Placeholder for history/civilisation theme
  cultureTheme.ts    — Placeholder for internet culture theme
  themeRegistry.ts   — Registry + useThemeStore (runtime theme switching)
```

The active theme is stored in a Zustand slice (`useThemeStore`) and can be
switched at runtime without restarting the game.  The benchmark and AI agents
always operate on internal numeric values; the theme layer is UI-only.

### Default Theme — Progression Ladder

| Internal Value | Display Label | Rarity |
|----------------|--------------|--------|
| 2 | Seed | Common |
| 4 | Iron | Common |
| 8 | Bronze | Common |
| 16 | Silver | Uncommon |
| 32 | Gold | Uncommon |
| 64 | Platinum | Rare |
| 128 | Emerald | Rare |
| 256 | Diamond | Epic |
| 512 | Master | Epic |
| 1024 | Apex | Legendary |
| 2048 | Transcendent | Legendary |
| 4096 | Eternal | Mythic |
| 8192 | Singularity | Mythic |

Why progression-based (not fruit / raw numbers):
- Fruit themes carry trademark risk or evoke competing titles.
- Raw numeric labels ("2 / 4 / 8…") echo classic 2048 visually.
- A material / rank ladder is instantly understandable, broadly appealing, and easy to localise.

## Architecture Summary

```
src/
  core/         Pure game engine (types, board, move, engine, score, phases, …)
  theme/        Tile presentation abstraction (theme types, registry, default theme)
  ai/           Agent implementations and policy helpers
    agents/     RandomAgent, GreedyAgent, HeuristicAgent, BeamSearchAgent, MCTSAgent
    policy/     features.ts, evaluation.ts, scoring.ts
  benchmark/    Headless simulation framework
  scripts/      CLI entry points (run via npm scripts)
  ui/           React components (browser only)
    scoreDisplay.ts  — toDisplayScore / formatScore helpers
  store/        Zustand game store
```

## How to Run Benchmarks

```bash
npm run benchmark          # Baseline suite (100 runs × 5 agents)
npm run benchmark:long     # Long suite (500 runs × 5 agents)
npm run balance            # Balance probe + pacing + round-stress suites
npm run docs:assets        # Generate Mermaid diagrams + SVG assets
```

Custom suite:
```bash
npx tsx src/scripts/runBenchmark.ts --suite smoke
```

Available suites: `smoke`, `baseline`, `long`, `balance`, `pacing`, `round_stress`

## Output Artifacts

```
artifacts/benchmark/latest/
  summary.json, per_agent.json, runs.csv
  catalyst_stats.json, anomaly_stats.json
  comparison.md, balance_report.md
  charts/  (SVG bar charts)
```

## Documentation

- [docs/README.md](docs/README.md)
- [docs/design.md](docs/design.md)
- [docs/system.md](docs/system.md)
- [docs/dev.md](docs/dev.md)
- [docs/benchmark.md](docs/benchmark.md)
- [docs/balance.md](docs/balance.md)
- [docs/ai.md](docs/ai.md)

## Localization (i18n)

Merge Catalyst supports multiple languages via a lightweight built-in i18n layer.

### Supported Languages

| Code | Language |
|------|----------|
| `en` | English (default) |
| `zh-CN` | Simplified Chinese (简体中文) |

### Architecture

```
src/i18n/
  types.ts    — Locale type + TranslationMap type
  en.ts       — English translation map
  zh-CN.ts    — Simplified Chinese translation map
  index.ts    — useT() hook, createT() factory, useLocaleStore (Zustand)
```

### Usage

```typescript
import { useT } from '../i18n';

const MyComponent = () => {
  const t = useT();
  return <div>{t('ui.phase')}</div>;
};
```

With interpolation:

```typescript
t('ui.active_catalysts', { count: 2 })  // "Active Catalysts (2/3)"
t('ui.signal_queued', { name: 'Pulse Boost' })
```

### Switching Languages

A `<LocaleSwitcher>` component is embedded in the Header. Clicking it toggles between English and 简体中文. The locale is stored in Zustand state (in-memory, resets on reload).

### Adding a New Language

1. Create `src/i18n/your-locale.ts` exporting a `TranslationMap`
2. Add the locale to `TRANSLATIONS` in `src/i18n/index.ts`
3. Add the locale to the `Locale` union type in `src/i18n/types.ts`
4. Add the locale option to `<LocaleSwitcher>`

---



## Game Flow

### Standard Run
1. Select a **Protocol** (Corner / Sparse / Overload)
2. Play through **6 phases** per round (output target + step limit)
3. After each phase: **Infusion** reward → optional **Forge** purchase
4. After 6 phases: **Round Complete** screen with stats and reward (+Energy, +Multiplier)
5. Continue into the next round (difficulty scales +12% per round)
6. Run ends only when you fail to reach a phase target within the step limit

### Challenge Mode
1. Click **⚔ Challenge** on the Start Screen
2. Select one of 4 challenge runs with unique constraints
3. The run applies rule overrides on top of the base protocol

Available challenges:
- **No Corners**: corner bonuses disabled
- **Energy Starved**: energy gain at 30% of normal
- **Chain Master**: only chain-based scoring counts
- **Anomaly Storm**: anomaly frequency doubled

### Daily Run
1. Click **📅 Daily Run** on the Start Screen
2. Every player shares the same seed derived from today's date (`YYYY-MM-DD`)
3. Your best result (output + rounds) is saved locally

### Milestones & Rewards
- **Milestones** trigger on output thresholds, round numbers, and max tile values
- Each milestone grants a bonus (energy or global multiplier)
- **Jackpot**: 2% chance on high-output moves for a big bonus (+output + energy)
- **Streaks**: consecutive high-output moves grant energy bonuses every 5 moves
