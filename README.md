# Merge Catalyst

A 2048-style roguelike puzzle game with Catalysts, Anomaly phases, and a full AI benchmark framework.
Built with React, Vite, and TypeScript.

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

## Phases

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

## Architecture Summary

```
src/
  core/         Pure game engine (types, board, move, engine, score, phases, …)
  ai/           Agent implementations and policy helpers
    agents/     RandomAgent, GreedyAgent, HeuristicAgent, BeamSearchAgent, MCTSAgent
    policy/     features.ts, evaluation.ts, scoring.ts
  benchmark/    Headless simulation framework
  scripts/      CLI entry points (run via npm scripts)
  ui/           React components (browser only)
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

## Docs

- [DESIGN.md](DESIGN.md) — game design and architecture
- [BENCHMARK.md](BENCHMARK.md) — benchmark goals, suites, metrics
- [BALANCE.md](BALANCE.md) — balancing philosophy and tuning knobs
- [AI.md](AI.md) — agent interface and RL roadmap

