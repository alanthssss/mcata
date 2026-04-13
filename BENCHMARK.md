# Merge Catalyst — Benchmark Guide

## Goals

The benchmark framework lets you:
- Measure how well each AI agent plays the game
- Identify which phases are too hard or too easy
- Detect overpowered or underpowered Catalysts
- Detect overpowered Synergy combinations
- Measure Protocol impact on outcomes
- Measure Momentum average and max per run
- Produce reproducible, comparable numbers across code changes

---

## Agent Overview

| Agent | Strategy | Notes |
|-------|----------|-------|
| RandomAgent | Uniform random from legal moves | Baseline lower bound |
| GreedyAgent | Best immediate heuristic (output, empty, corner) | Fast, no lookahead |
| HeuristicAgent | Weighted multi-factor evaluation (empty/mono/smooth/corner/merge/anomaly) | Configurable weights |
| BeamSearchAgent | Beam search, configurable depth and width | Lookahead without full tree |
| MCTSAgent | Monte Carlo Tree Search with random rollouts | Best-effort quality |

All agents implement the `Agent` interface from `src/ai/types.ts`.

---

## Agent Evaluation Pipeline

```mermaid
flowchart LR
    S["GameState"] --> LA["legalMoves()"]
    LA --> E["evaluate each move"]
    E --> D["AgentDecision"]
    D --> Sim["processMoveAction()"]
    Sim --> NS["Next GameState"]
    NS --> S
```

---

## Metrics Explained

### Per-Run Metrics (`RunMetrics`)

| Metric | Description |
|--------|-------------|
| `finalOutput` | Total Output accumulated across all phases |
| `phasesCleared` | How many phases were completed |
| `won` | Whether Phase 6 was completed |
| `maxTile` | Highest tile value reached |
| `totalSteps` | Total valid moves made |
| `totalCatalysts` | How many catalysts were held at the end |
| `catalystReplacements` | How many times a catalyst was replaced |
| `totalEnergyEarned` | Proxy for energy economy |
| `avgOutputPerMove` | finalOutput / totalSteps |
| `anomalySurvivalRate` | Fraction of anomaly phases survived (0–1) |
| `avgMergesPerMove` | Average merges per step |
| `avgEmptyCells` | Average empty cells across all steps |
| `moveDiversity` | Normalised entropy of action distribution (0=one direction, 1=uniform) |

### Aggregate Suite Metrics (`SuiteMetrics`)

| Metric | Description |
|--------|-------------|
| `meanOutput` | Mean `finalOutput` across all runs |
| `medianOutput` | Median `finalOutput` |
| `p90Output` | 90th-percentile `finalOutput` |
| `winRate` | Fraction of runs that completed Phase 6 |
| `maxTileDistribution` | Histogram of max tile values |
| `phaseClearDist` | Histogram of phases cleared |
| `avgStepsSurvived` | Mean total steps |
| `avgOutputPerMove` | Mean output efficiency |
| `avgCatalystCount` | Mean catalysts held |
| `anomalySuccessRate` | Mean anomaly survival rate |
| `scoreVariance` | Variance of `finalOutput` |
| `scoreStdDev` | Standard deviation |

---

## Build Analysis (New in v3)

### Catalyst Metrics (`catalyst_stats.json`)

| Field | Description |
|-------|-------------|
| `pickRate` | Fraction of runs where this catalyst was held at end |
| `winRate` | Win rate of runs that held this catalyst |
| `meanOutput` | Average final output when catalyst was held |
| `avgOutputContribution` | Average output-per-move when catalyst was held |

### Synergy Metrics (`synergy_stats.json`)

| Field | Description |
|-------|-------------|
| `triggerRate` | Fraction of runs that had both synergy catalysts active |
| `winRate` | Win rate when this synergy was active |
| `meanOutput` | Average final output when synergy was active |

### Build Metrics (`build_stats.json`)

Top 10 most common catalyst combinations, sorted by frequency.

| Field | Description |
|-------|-------------|
| `catalysts` | List of catalyst IDs in the build |
| `frequency` | Fraction of runs with this exact combo |
| `winRate` | Win rate for this build |
| `meanOutput` | Average final output for this build |

### Highlighting Dominant / Weak Builds

The analysis engine flags:
- **OP catalyst**: pick rate > 10% AND win rate > 1.5× global
- **Weak catalyst**: pick rate < 5% (in run count > 20)
- **OP synergy**: trigger rate > 5% AND win rate > 2× global

---

## Suite Definitions

| Suite | Agents | Runs/Agent | Use |
|-------|--------|-----------|-----|
| `smoke` | All 5 | 5 | Quick sanity check |
| `baseline` | All 5 | 100 | Standard comparison |
| `long` | All 5 | 500 | Stable / publication-ready |
| `balance` | Greedy, Heuristic | 50 | Balance probing |
| `phase_stress` | Heuristic, MCTS | 50 | Anomaly phase survival |

---

## Benchmark Workflow

```mermaid
flowchart TD
    PS["Select Suite (presets.ts)"]
    PS --> RA["Run Agents (runner.ts)"]
    RA --> CM["Collect RunMetrics"]
    CM --> AG["Aggregate SuiteMetrics"]
    AG --> AN["analyseResults (analysis.ts)"]
    AN --> EX["Export JSON / CSV / MD (exporters.ts)"]
    AN --> CH["Generate SVG Charts (charts.ts)"]
    EX --> AR["artifacts/benchmark/latest/"]
    CH --> AR
    AR --> CS["catalyst_stats.json"]
    AR --> SS["synergy_stats.json"]
    AR --> BS["build_stats.json"]
```

---

## How to Run

```bash
npm run benchmark             # baseline suite
npm run benchmark:long        # long suite
npm run balance               # balance + phase stress suites
npx tsx src/scripts/runBenchmark.ts --suite smoke
```

---

## How to Interpret Results

| Observation | Interpretation |
|-------------|---------------|
| All win rates ≈ 0% | Game too hard — consider reducing phase targets |
| All win rates > 50% | Game too easy — increase targets or reduce steps |
| RandomAgent ≈ HeuristicAgent | Game lacks strategic depth |
| Anomaly survival < 30% | Entropy Tax / Collapse Field too punishing |
| Catalyst pick rate < 5% | Catalyst too expensive or too weak |
| Catalyst win rate >> global | Catalyst potentially overpowered |
| Synergy win rate >> global | Synergy potentially overpowered |
| High score variance | Game is swingy (possibly by design) |
| Dominant build > 30% of wins | Build diversity too low |

---

## What "Good Benchmark Results" Look Like

- **Agent distinction**: HeuristicAgent and MCTS clearly outperform RandomAgent
- **Win rate**: somewhere between 5%–40% for the best agent
- **Phase ramp**: most runs clear Phases 1–3, fewer clear Phases 4–6
- **Anomaly challenge**: Phase 4 and 6 cause a measurable survival drop
- **Catalyst usage**: at least 2–3 catalysts see > 10% pick rate
- **Synergy spread**: no single synergy accounts for > 50% of wins
- **Build diversity**: top build frequency < 30%
- **Reproducibility**: running the same suite twice gives < 5% difference in mean output


## Goals

The benchmark framework lets you:
- Measure how well each AI agent plays the game
- Identify which phases are too hard or too easy
- Detect overpowered or underpowered Catalysts
- Produce reproducible, comparable numbers across code changes

---

## Agent Overview

| Agent | Strategy | Notes |
|-------|----------|-------|
| RandomAgent | Uniform random from legal moves | Baseline lower bound |
| GreedyAgent | Best immediate heuristic (output, empty, corner) | Fast, no lookahead |
| HeuristicAgent | Weighted multi-factor evaluation (empty/mono/smooth/corner/merge/anomaly) | Configurable weights |
| BeamSearchAgent | Beam search, configurable depth and width | Lookahead without full tree |
| MCTSAgent | Monte Carlo Tree Search with random rollouts | Best-effort quality |

All agents implement the `Agent` interface from `src/ai/types.ts`.

---

## Agent Evaluation Pipeline

```mermaid
flowchart LR
    S["GameState"] --> LA["legalMoves()"]
    LA --> E["evaluate each move"]
    E --> D["AgentDecision"]
    D --> Sim["processMoveAction()"]
    Sim --> NS["Next GameState"]
    NS --> S
```

---

## Metrics Explained

### Per-Run Metrics (`RunMetrics`)

| Metric | Description |
|--------|-------------|
| `finalOutput` | Total Output accumulated across all phases |
| `phasesCleared` | How many phases were completed |
| `won` | Whether Phase 6 was completed |
| `maxTile` | Highest tile value reached |
| `totalSteps` | Total valid moves made |
| `totalCatalysts` | How many catalysts were held at the end |
| `catalystReplacements` | How many times a catalyst was replaced |
| `totalEnergyEarned` | Proxy for energy economy |
| `avgOutputPerMove` | finalOutput / totalSteps |
| `anomalySurvivalRate` | Fraction of anomaly phases survived (0–1) |
| `avgMergesPerMove` | Average merges per step |
| `avgEmptyCells` | Average empty cells across all steps |
| `moveDiversity` | Normalised entropy of action distribution (0=one direction, 1=uniform) |

### Aggregate Suite Metrics (`SuiteMetrics`)

| Metric | Description |
|--------|-------------|
| `meanOutput` | Mean `finalOutput` across all runs |
| `medianOutput` | Median `finalOutput` |
| `p90Output` | 90th-percentile `finalOutput` |
| `winRate` | Fraction of runs that completed Phase 6 |
| `maxTileDistribution` | Histogram of max tile values |
| `phaseClearDist` | Histogram of phases cleared |
| `avgStepsSurvived` | Mean total steps |
| `avgOutputPerMove` | Mean output efficiency |
| `avgCatalystCount` | Mean catalysts held |
| `anomalySuccessRate` | Mean anomaly survival rate |
| `scoreVariance` | Variance of `finalOutput` |
| `scoreStdDev` | Standard deviation |

---

## Suite Definitions

| Suite | Agents | Runs/Agent | Use |
|-------|--------|-----------|-----|
| `smoke` | All 5 | 5 | Quick sanity check |
| `baseline` | All 5 | 100 | Standard comparison |
| `long` | All 5 | 500 | Stable / publication-ready |
| `balance` | Greedy, Heuristic | 50 | Balance probing |
| `phase_stress` | Heuristic, MCTS | 50 | Anomaly phase survival |

---

## Benchmark Workflow

```mermaid
flowchart TD
    PS["Select Suite (presets.ts)"]
    PS --> RA["Run Agents (runner.ts)"]
    RA --> CM["Collect RunMetrics"]
    CM --> AG["Aggregate SuiteMetrics"]
    AG --> AN["analyseResults (analysis.ts)"]
    AN --> EX["Export JSON / CSV / MD (exporters.ts)"]
    AN --> CH["Generate SVG Charts (charts.ts)"]
    EX --> AR["artifacts/benchmark/latest/"]
    CH --> AR
```

---

## How to Run

```bash
npm run benchmark             # baseline suite
npm run benchmark:long        # long suite
npm run balance               # balance + phase stress suites
npx tsx src/scripts/runBenchmark.ts --suite smoke
```

---

## How to Interpret Results

| Observation | Interpretation |
|-------------|---------------|
| All win rates ≈ 0% | Game too hard — consider reducing phase targets |
| All win rates > 50% | Game too easy — increase targets or reduce steps |
| RandomAgent ≈ HeuristicAgent | Game lacks strategic depth |
| Anomaly survival < 30% | Entropy Tax / Collapse Field too punishing |
| Catalyst pick rate < 5% | Catalyst too expensive or too weak |
| Catalyst win rate >> global | Catalyst potentially overpowered |
| High score variance | Game is swingy (possibly by design) |

---

## What "Good Benchmark Results" Look Like

- **Agent distinction**: HeuristicAgent and MCTS clearly outperform RandomAgent
- **Win rate**: somewhere between 5%–40% for the best agent
- **Phase ramp**: most runs clear Phases 1–3, fewer clear Phases 4–6
- **Anomaly challenge**: Phase 4 and 6 cause a measurable survival drop
- **Catalyst usage**: at least 2–3 catalysts see > 10% pick rate
- **Reproducibility**: running the same suite twice gives < 5% difference in mean output
