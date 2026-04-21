# Merge Boost

A themeable merge roguelike puzzle game with Boosts, Hazard stages, and a full AI benchmark framework.
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
- Each **Stage** has a target **Output** you must reach within a step limit
- After every stage:
  1. Choose a **Pick** reward (primarily non-Boost: energy / steps / multiplier / skill / style / pool tools)
  2. Optionally shop at the **Shop** (primary permanent Boost acquisition path)
- Every **6 stages** complete a **Level** — then the next level starts automatically
- Levels grow harder each level (targets scale 12% per level)
- The run ends only when you **fail a stage** (output too low when steps run out)
- Survive **Hazard** stages with special modifiers (Entropy Tax, Collapse Field)
- Build a team of up to **6 Boosts** for deep combos and identity
- Grow one **Style** archetype (Corner / Chain / Empty-space / High-tier / Economy / Survival) from the **Shop** for run-long scaling
- Style rules: one active Style at a time; picking the same Style upgrades it, picking a different Style replaces it
- Sell Boosts in Shop to recover partial Energy and pivot builds safely
- Build Identity panel (left HUD) shows current run label, confidence, and top contributors
- Shop cards now show both category tags and build-direction fit hints

## Rules

A Rule is a **run-level rule modifier** chosen before the run begins. It
changes fundamental game parameters — corner bonuses, starting tiles, spawn
frequency, output scaling, and step budgets.

### Choosing a Rule

On the Start Screen you will see a **Rule Selection** grid.  Click one of
the three cards to select it, then click **Start Run**. Rule details are
shown on hover/focus or tap.

| Rule | Icon | Stakes | Effect |
|---|---|---|---|
| Corner Rule | 📐 | Standard | Corner merges gain an extra ×1.5 multiplier |
| Sparse Rule | 🌑 | Tactical | Start with 1 tile; spawn halved, output ×1.2 |
| Overload Rule | ⚡ | Overclocked | Output ×1.4, but each stage has 2 fewer steps |

The selected rule is displayed in the top bar throughout the run.

### Stage pacing

Stage pacing now uses one centralized formula:

- `steps = base + phaseScale + roundScale`
- `target = base + phaseScale + roundScale`

This keeps pacing predictable while still scaling by both stage and level.

## Boosts

Up to **6 Boosts** can be active at once. The Shop is the unified acquisition path for Boosts, Styles, Skills, and utility buys.

### Shop Duplicate Guard

- If a Boost is already owned, buying it is blocked in UI and engine.
- Blocked duplicate purchases do **not** consume Energy and do **not** change run state.
- Purchased Shop offers are removed immediately to prevent repeat-buy bugs.

| Name | Rarity | Effect |
|------|--------|--------|
| Corner Crown | Rare | Corner merges ×2 Output |
| Twin Burst | Common | ≥2 merges → ×1.5 Output |
| Lucky Seed | Common | 75% chance to spawn 2, 25% to spawn 4 |
| Banker's Edge | Common | +2 Energy on stage clear |
| Reserve | Rare | +20 Output per unused step on stage clear |
| Frozen Cell | Common | One cell blocked from spawning |
| Combo Wire | Rare | 3 consecutive scoring moves → ×1.3 |
| High Tribute | Rare | Highest tile merge → ×1.4 |

### Unlock System & Collection

The **Collection** screen shows every Boost in the game and whether it has
been unlocked.

**Unlock rule**: A Boost is **permanently unlocked** the first time you
**acquire** it in any run — either from the Shop or as a Pick reward.

- Unlock state is written to `localStorage` immediately on acquisition so the
  Collection updates without needing to restart the game.
- The same Boost can only be unlocked once — duplicate writes are silently
  ignored.
- On a fresh session (or incognito mode) only the 8 legacy Boosts are
  unlocked by default.
- Corrupted or missing storage data falls back safely to the default profile.

### Per-Run Boost Pool

Within a single run each Boost can be **acquired at most once**.  The
run-level pool starts as a copy of your unlocked Boosts:

- When you **acquire** a Boost (Shop purchase or Pick choice) it is
  permanently removed from the pool for that run.
- When a Boost is **shown but not selected** in the Shop it returns to the
  pool and may appear again later.
- If the pool is exhausted the Shop shows no boost cards and Pick offers
  only Energy / Steps / Multiplier.

Advanced Boosts beyond the 8 legacy ones can be unlocked by spending
**Core Shards** (see Meta Progression below).

## Scoring

```
finalOutput = floor(base × chain × condition × catalyst × global)
```

- **base**: sum of merged tile values
- **chain**: 1 merge=1.0, 2=1.2, 3=1.5, 4+=2.0
- **condition**: corner merge=×1.2, highest tile merge=×1.2
- **boost**: from active boost bonuses
- **global**: accumulated from Pick multiplier choices

**Display score**: All player-facing output values are multiplied by
`DISPLAY_SCORE_SCALE` (default ×10) for readability.  Internal raw scores
(used by the engine and benchmarks) are unchanged.

## Meta Progression

Merge Boost has a lightweight meta-progression layer built on top of the
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
| Common boost | 15 Core Shards |
| Rare boost | 25 Core Shards |
| Epic boost | 40 Core Shards |
| Rule | 30 Core Shards |
| Skill | 20 Core Shards |
| Ascension level N | N × 20 Core Shards |

### Ascension

**Ascension (0–8)** is an optional difficulty system.  Each level stacks one
additional penalty (fewer steps, higher targets, hazard frequency, etc.).
Level 0 is the baseline — identical to a classic run.

### Collection & Unlock Persistence

The Collection screen shows every Boost, Rule, Skill, and Hazard in
the game together with their unlock status.

- Unlocks are written to `localStorage` immediately on acquisition.
- A fresh profile (no prior data) ships with 8 legacy Boosts unlocked.
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
npm run benchmark          # Baseline suite (Heuristic-only tuning flow)
npm run benchmark:long     # Long suite (Heuristic-only tuning flow)
npm run balance            # Balance probe + pacing + round-stress (Heuristic-only)
npm run balance:tune       # Heuristic-driven iterative auto-tuning + artifacts
npm run docs:assets        # Generate Mermaid diagrams + SVG assets
```

Custom suite:
```bash
npx tsx src/scripts/runBenchmark.ts --suite smoke
```

Available suites: `smoke`, `baseline`, `long`, `balance`, `pacing`, `round_stress`, `debug_agents`

## Output Artifacts

```
artifacts/benchmark/latest/
  summary.json, per_agent.json, runs.csv
  catalyst_stats.json, anomaly_stats.json
  comparison.md, balance_report.md
  tuning_history.json, tuning_summary.md
  best_config.json, best_config.yaml, before_vs_after.md
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

## Run Log Export (JSON / CSV)

- End Screen includes one-click export for the current run:
  - `Export Run Log (JSON)`
  - `Export Run Log (CSV)`
- Add `?debug=export_logs` to enable developer exports on Start Screen:
  - all local runs bundle JSON
  - step-level CSV
  - run-summary CSV

For analysis/compare workflows:

```bash
npm run runlog:analyze -- path/to/runlog_a.json path/to/runlog_b.json
```

The analyzer prints summary metrics and before-vs-after deltas for fast tuning/debug checks.

## Numeric Tuning Config

- Source of truth: `config/game.yaml`
- `npm run sync:config` validates YAML and regenerates `src/core/generatedGameConfig.ts`
- All gameplay, economy, rarity, build-identity thresholds, and benchmark tuning baselines read from this YAML-derived config.

## Localization (i18n)

Merge Boost supports multiple languages via a lightweight built-in i18n layer.

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
1. Select a **Rule** (Corner / Sparse / Overload)
2. Play through **6 stages** per level (output target + step limit)
3. After each stage: **Pick** reward → optional **Shop** purchase
4. After 6 stages: **Level Complete** screen with stats and reward (+Energy, +Multiplier)
5. Continue into the next level (difficulty scales +12% per level)
6. Run ends only when you fail to reach a stage target within the step limit

### Mode Availability
- **Standard Run** is the only playable mode right now.
- Challenge Mode and Daily Run are intentionally disabled until balance
  stabilization.

### UI Detail Pattern
- Gameplay and start-screen system cards now render in compact form by default.
- Full descriptions are available through a shared hover/focus/tap detail
  popover.
- Last Move Breakdown and Reaction Log are collapsible from the right column.

### Milestones & Rewards
- **Milestones** trigger on output thresholds, level numbers, and max tile values
- Each milestone grants a bonus (energy or global multiplier)
- **Jackpot**: 2% chance on high-output moves for a big bonus (+output + energy)
- **Streaks**: consecutive high-output moves grant energy bonuses every 5 moves
