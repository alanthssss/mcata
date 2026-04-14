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
- Clear phases to earn **Infusion** rewards
- Visit the **Forge** (between Phase 3 and 4) to buy **Catalysts** with Energy
- Survive **Anomaly** phases with special modifiers
- Complete all 6 phases to win the run

## Protocols

A Protocol is a **run-level rule modifier** chosen before the run begins. It
changes fundamental game parameters — corner bonuses, starting tiles, spawn
frequency, output scaling, and step budgets.

### Choosing a Protocol

On the Start Screen you will see a **Protocol Selection** grid.  Click one of
the three cards to select it, then click **Start Run**.

| Protocol | Icon | Difficulty | Effect |
|---|---|---|---|
| Corner Protocol | 📐 | Standard | Corner merges gain an extra ×1.5 multiplier |
| Sparse Protocol | 🌑 | Tactical | Start with 1 tile; spawn halved, output ×1.2 |
| Overload Protocol | ⚡ | Overclocked | Output ×1.4, but each phase has 2 fewer steps |

The selected protocol is displayed in the top bar throughout the run, and
affects the engine's scoring formula immediately.

- **Default fallback**: if no protocol is explicitly chosen, `corner_protocol`
  is used.
- **Benchmark bypass**: the benchmark suite passes the protocol directly to
  `createInitialState(seed, protocol)`, skipping the UI entirely.
- **Localization**: protocol names, descriptions, and difficulty labels are all
  fully translated via the i18n system.

| Phase | Target Output | Steps | Anomaly |
|-------|--------------|-------|---------|
| 1 | 70 | 12 | — |
| 2 | 80 | 12 | — |
| 3 | 75 | 10 | — |
| → Forge | — | — | — |
| 4 | 40 | 8 | Entropy Tax |
| 5 | 80 | 10 | — |
| 6 | 55 | 8 | Collapse Field |

## Catalysts

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
npm run balance            # Balance probe + phase stress suites
npm run docs:assets        # Generate Mermaid diagrams + SVG assets
```

Custom suite:
```bash
npx tsx src/scripts/runBenchmark.ts --suite smoke
```

Available suites: `smoke`, `baseline`, `long`, `balance`, `phase_stress`

## Output Artifacts

```
artifacts/benchmark/latest/
  summary.json, per_agent.json, runs.csv
  catalyst_stats.json, anomaly_stats.json
  comparison.md, balance_report.md
  charts/  (SVG bar charts)
```

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


