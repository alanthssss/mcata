# Merge Catalyst — Benchmark Guide

## Goals

The benchmark framework lets you:
- Measure how well each AI agent plays the endless-round game
- Identify which phases or rounds are too hard or too easy
- Detect overpowered or underpowered Catalysts and Synergies
- Track score-chasing progression and build growth across rounds
- Measure pacing (moves per phase), late-game pressure, and survival depth
- Produce reproducible, comparable numbers across code changes

> **Theme note**: The UI presentation layer (tile labels, colours, display score
> scaling) has **no effect on benchmark results**.  All benchmark metrics —
> `finalOutput`, `meanOutput`, `avgRoundsCleared`, etc. — are raw internal numeric
> values.  `DISPLAY_SCORE_SCALE` is a UI-only multiplier and is never applied to
> benchmark output.  Benchmark results remain directly comparable across all
> theme changes.

---

## Game Architecture: Endless Rounds

The standard game is an **endless-round roguelike loop**:

- Every **6 phases** form one **round**
- After completing a round the game continues into Round N+1 (no fixed win state)
- The game ends when a phase target is not met within the step limit → `game_over`
- Rounds scale in difficulty automatically via compound target scaling

The benchmark **does not** measure "win rate" for the standard mode.  Instead it
measures **rounds cleared**, **output growth**, **failure depth**, and **pacing**.
Win rate only applies to finite challenge / legacy modes with an explicit win condition.

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

#### Primary Depth Metrics

| Metric | Description |
|--------|-------------|
| `roundsCleared` | Complete rounds finished in this run |
| `highestRound` | Highest round number reached (= roundsCleared + 1 if failed mid-round) |
| `failureRound` | Round number where the run ended with `game_over` (undefined if truncated at maxRounds) |
| `failurePhaseIndex` | Phase index (0–5) within the failure round (undefined if not failed) |
| `phasesCleared` | Total phases cleared across all rounds |
| `finalOutput` | Total Output accumulated across all phases |

#### Pacing & Board Metrics

| Metric | Description |
|--------|-------------|
| `avgOutputPerMove` | finalOutput / totalSteps |
| `avgMovesPerPhase` | Average moves spent per completed phase |
| `maxTile` | Highest tile value reached |
| `uniqueCatalystsAcquired` | Number of distinct catalyst IDs acquired |
| `anomalySurvivalRate` | Fraction of anomaly phases survived (0–1) |
| `avgMergesPerMove` | Average merges per step |
| `avgEmptyCells` | Average empty cells across all steps |
| `moveDiversity` | Normalised entropy of action distribution (0=one direction, 1=uniform) |

#### Per-Phase Granular Records (`phaseHistory`)

Each cleared or failed phase is recorded as a `PhaseRecord`:

| Field | Description |
|-------|-------------|
| `round` | Round number |
| `phaseIndex` | Phase index within the round (0–5) |
| `movesUsed` | Steps spent in this phase |
| `targetOutput` | Effective target (including build-aware factor) |
| `actualOutput` | Output achieved |
| `maxTile` | Highest board tile when the phase ended |
| `cleared` | Whether the phase was successfully cleared |

#### Meta Progression

| Metric | Description |
|--------|-------------|
| `ascensionLevel` | Ascension level used for this run |
| `coreShards` | Meta currency earned this run |
| `totalCatalysts` | How many catalysts were held at the end |
| `catalystReplacements` | How many times a catalyst was replaced |
| `totalEnergyEarned` | Proxy for energy economy |
| `forgeOfferRarityCounts` | Per-run Forge offer distribution by rarity |
| `acquiredRarityCounts` | Per-run Catalyst acquisition distribution by rarity |
| `firstRareRound` | Round of first Rare acquisition (if any) |
| `firstEpicRound` | Round of first Epic acquisition (if any) |
| `selectedPattern` | Pattern archetype active at run end |

---

### Aggregate Suite Metrics (`SuiteMetrics`)

#### Primary Endless-Mode Metrics

| Metric | Description |
|--------|-------------|
| `avgRoundsCleared` | Mean complete rounds cleared per run |
| `medianRoundsCleared` | Median complete rounds cleared per run |
| `p90RoundsCleared` | 90th-percentile complete rounds cleared |
| `meanHighestRound` | Mean highest round number reached |
| `maxRoundReached` | Highest round number reached across all runs |
| `outputGrowthByRound` | Mean finalOutput of runs that reached each round |
| `failureDistributionByRound` | Count of runs ending in each round (where difficulty wall is) |
| `failureDistributionByPhaseIndex` | Count of failures by phase index (0–5) |

#### Output Metrics

| Metric | Description |
|--------|-------------|
| `meanOutput` | Mean `finalOutput` across all runs |
| `medianOutput` | Median `finalOutput` |
| `p90Output` | 90th-percentile `finalOutput` |
| `scoreVariance` | Variance of `finalOutput` |
| `scoreStdDev` | Standard deviation |
| `avgOutputPerMove` | Mean output efficiency |

#### Pacing Metrics

| Metric | Description |
|--------|-------------|
| `avgMovesPerPhase` | Mean moves per completed phase |
| `avgMovesPerPhaseByRound` | Moves per phase broken down by round number |
| `lateGameClearTurns` | Avg moves to clear phases in round 4+ |
| `shortClearRate` | Fraction of cleared phases completed in ≤3 moves |
| `lateGameShortClearRate` | Same, restricted to round 4+ |
| `avgMaxTile` | Average of each run's maxTile value |

#### Other

| Metric | Description |
|--------|-------------|
| `avgStepsSurvived` | Mean total steps |
| `avgCatalystCount` | Mean catalysts held |
| `anomalySuccessRate` | Mean anomaly survival rate |
| `maxTileDistribution` | Histogram of max tile values |
| `phaseClearDist` | Histogram of total phases cleared |
| `avgUniqueCatalysts` | Mean distinct catalyst IDs acquired per run |
| `offerDistributionByRarity` | Suite-level Forge rarity distribution |
| `acquisitionDistributionByRarity` | Suite-level acquisition rarity distribution |
| `avgFirstRareRound` | Mean round of first Rare acquisition |
| `avgFirstEpicRound` | Mean round of first Epic acquisition |
| `patternOutcomeByPattern` | Runs + avgRoundsCleared by pattern archetype |

---

### Catalyst Metrics (`catalyst_stats.json`)

| Field | Description |
|-------|-------------|
| `pickRate` | Fraction of runs where this catalyst was held at end |
| `avgRoundsCleared` | Average rounds cleared in runs that held this catalyst |
| `meanOutput` | Average final output when catalyst was held |
| `avgOutputContribution` | Average output-per-move when catalyst was held |

### Synergy Metrics (`synergy_stats.json`)

| Field | Description |
|-------|-------------|
| `triggerRate` | Fraction of runs that had both synergy catalysts active |
| `avgRoundsCleared` | Avg rounds cleared when this synergy was active |
| `meanOutput` | Average final output when synergy was active |

### Build Metrics (`build_stats.json`)

Top 10 most common catalyst combinations, sorted by frequency.

| Field | Description |
|-------|-------------|
| `catalysts` | List of catalyst IDs in the build |
| `frequency` | Fraction of runs with this exact combo |
| `avgRoundsCleared` | Average rounds cleared with this build |
| `meanOutput` | Average final output for this build |

### Highlighting Dominant / Weak Builds

The analysis engine flags:
- **OP catalyst**: pick rate > 10% AND avgRoundsCleared > 1.5× global
- **Weak catalyst**: pick rate < 5% (in run count > 20)
- **OP synergy**: trigger rate > 5% AND avgRoundsCleared > 2× global

---

## Suite Definitions

| Suite | Agents | Runs/Agent | Purpose |
|-------|--------|-----------|---------|
| `smoke` | All 5 | 5 | Quick sanity — verify runs complete and artifacts generate |
| `baseline` | All 5 | 100 | Standard agent comparison — score-chasing and depth |
| `long` | All 5 | 500 | High-confidence comparison — rounds, output growth, failure distribution |
| `balance` | Greedy, Heuristic | 50 | Catalyst diversity, synergy density, economy and anomaly pressure |
| `pacing` | Heuristic, MCTS | 50 | Moves per phase, late-game clear speed, max tier by round |
| `round_stress` | Heuristic, MCTS | 50 | Later-round failure patterns, anomaly survival in rounds 3+ |

---

## Generated Charts

| File | Description |
|------|-------------|
| `rounds_cleared.svg` | Avg rounds cleared by agent |
| `output_distribution.svg` | Mean final output by agent |
| `phase_clear.svg` | Avg phases cleared by agent |
| `max_tile.svg` | Avg max tile by agent |
| `output_growth.svg` | Output growth by round (first agent) |
| `failure_distribution.svg` | Failure count by round number (all agents) |

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
    AR --> FC["failure_distribution.svg"]
    AR --> OG["output_growth.svg"]
```

---

## How to Run

```bash
npm run benchmark             # baseline suite (100 runs/agent)
npm run benchmark:long        # long suite (500 runs/agent)
npm run balance               # balance + pacing suites
npx tsx src/scripts/runBenchmark.ts --suite smoke
npx tsx src/scripts/runBenchmark.ts --suite round_stress
```

---

## How to Interpret Results

| Observation | Interpretation |
|-------------|---------------|
| `avgRoundsCleared < 1` for HeuristicAgent | Game too hard — reduce early phase targets |
| `avgRoundsCleared > 8` for MCTS | Game too easy — increase targets or reduce steps |
| All agents clear same number of rounds | Game lacks strategic depth |
| `lateGameShortClearRate > 10%` | Build power is outpacing target curve in late rounds |
| `failureDistributionByRound` spikes at Round 1 | Early game is the difficulty wall |
| `failureDistributionByRound` spikes at Round 3–4 | Mid-game scaling is the difficulty wall |
| Anomaly survival < 30% | Entropy Tax / Collapse Field too punishing |
| Catalyst pick rate < 5% | Catalyst too expensive or too weak |
| Catalyst `avgRoundsCleared` >> global | Catalyst potentially overpowered |
| Synergy `avgRoundsCleared` >> global | Synergy potentially overpowered |
| High score variance | Game is swingy (possibly by design) |
| Dominant build > 30% of runs | Build diversity too low |

---

## What "Good Benchmark Results" Look Like

- **Agent distinction**: HeuristicAgent and MCTS clearly outperform RandomAgent
- **Rounds cleared**: best agent averages 2–5 rounds cleared
- **Failure distribution**: most failures in rounds 2–4 (not round 1 or very late)
- **Pacing**: `avgMovesPerPhase` 6–12 across all rounds; no round averages < 4
- **Late-game**: `lateGameShortClearRate` < 10%; phases don't trivially clear in 1–2 moves
- **Anomaly challenge**: anomaly phases cause a measurable survival drop
- **Catalyst usage**: at least 3–5 catalysts see > 10% pick rate
- **Synergy spread**: no single synergy accounts for > 50% of deep runs
- **Build diversity**: top build frequency < 30%
- **Output growth**: `outputGrowthByRound` increases meaningfully each round
- **Reproducibility**: running the same suite twice gives < 5% difference in `avgRoundsCleared`

---

## Meta Progression Benchmarks

The `benchmark:meta` script (`src/scripts/runMetaBenchmark.ts`) adds three analysis modes.

### 1. Ascension Level Sweep (`--mode ascension`)

Runs the same agents across all 9 Ascension levels (0–8) and reports per-level rounds cleared.

```
npm run benchmark:meta -- --mode ascension
```

#### Expected output

```
Level | Description                    | AvgRounds (Heuristic) | AvgRounds (MCTS)
A0    | No modifiers — baseline        |                  3.50 |             5.20
A1    | -1 Step per Phase              |                  1.20 |             2.50
A2    | +15% target output             |                  0.80 |             1.50
...
A8    | Combined penalties             |                  0.00 |             0.10
```

A healthy difficulty curve shows a steady drop in rounds cleared across levels.

---

### 2. Unlock Pool Comparison (`--mode unlock`)

Compares agent performance with:
- **Base pool** — only the 8 legacy catalysts (fresh profile restriction)
- **Full pool** — all 24 catalysts (no unlock restrictions)

```
npm run benchmark:meta -- --mode unlock
```

#### What to look for

| Pool | Expected HeuristicAgent AvgRounds |
|------|-----------------------------------|
| Base (8 legacy only) | 1.5–3.0 |
| Full (all 24) | 3.0–5.0 |

A gap of ~1.5–2 rounds validates that unlocks provide real progression power.
If the gap is < 0.5, the advanced catalysts may be too weak.
If > 4, the base experience may be too punishing for new players.

---

### 3. Meta Progression Simulation (`--mode simulate`)

Simulates a player playing 20 runs in sequence, earning Core Shards each run.

```
npm run benchmark:meta -- --mode simulate
```

#### Sample output

```
Run | Shards | Total | Phases | Rounds
  1 |     20 |    20 |      4 |      0
  4 |     53 |   143 |      6 |      1
 11 |     53 |   306 |      6 |      1
```

---

## RunOptions Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ascensionLevel` | `0–8` | `0` | Ascension level for the run |
| `protocol` | `ProtocolId` | `corner_protocol` | Protocol to use |
| `maxRounds` | `number` | `10` | Maximum rounds to simulate (caps endless runs for benchmark) |
| `unlockedCatalysts` | `CatalystId[] \| undefined` | `undefined` (full pool) | Restricts Forge/Infusion pool |

---

## Phase Pacing Benchmark (v6)

### PhaseRecord Tracking

Every cleared (and failed) phase is recorded with:

| Field | Description |
|-------|-------------|
| `round` | Round number |
| `phaseIndex` | Phase index within the round (0–5) |
| `movesUsed` | Steps spent in this phase |
| `targetOutput` | Effective target (including build-aware factor) |
| `actualOutput` | Output achieved |
| `maxTile` | Highest board tile when the phase ended |
| `cleared` | Whether the phase was successfully cleared |

### v6 Benchmark Targets (HeuristicAgent, Ascension 0, 50 runs)

| Metric | Expected Range |
|--------|---------------|
| Avg moves per phase | 6–12 |
| Short-clear rate | < 10 % |
| Late-game short-clear rate (round 4+) | < 5 % |
| Avg rounds cleared (median) | 2–4 |

### Detecting Regressions

- **Short-clear rate above 10 %**: build power is outpacing target curve
  → increase `BUILD_AWARE_SCALING.catalystWeight` or `multiplierWeight`
- **Late-game short-clear rate above 5 %**: compound scaling insufficient for high rounds
  → increase `ROUND_TARGET_SCALE` or reduce `maxFactor`
- **avgRoundsCleared drops below 1** for HeuristicAgent: early-game overtightened
  → reduce base targets in `ROUND_TEMPLATES[0]` (alpha template, phase 1–3)
- **Avg moves per phase > 15**: targets are too high for typical builds
  → reduce `BUILD_AWARE_SCALING.maxFactor` or `catalystWeight`
