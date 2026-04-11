# Merge Catalyst

A 2048-based roguelike puzzle game built with React, Vite, and TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Gameplay

- Merge tiles on a 4×4 grid using arrow keys or WASD
- Each **Phase** has a target **Output** you must reach within a step limit
- Clear phases to earn **Infusion** rewards
- Visit the **Forge** (between Phase 3 and 4) to buy **Catalysts** with Energy
- Survive **Anomaly** phases with special modifiers
- Complete all 6 phases to win the run

## Phases

| Phase | Target Output | Steps | Anomaly |
|-------|--------------|-------|---------|
| 1 | 120 | 12 | — |
| 2 | 260 | 12 | — |
| 3 | 500 | 10 | — |
| → Forge | — | — | — |
| 4 | 900 | 8 | Entropy Tax |
| 5 | 1400 | 10 | — |
| 6 | 2200 | 8 | Collapse Field |

## Catalysts

| Name | Rarity | Effect |
|------|--------|--------|
| Corner Crown | Rare | Corner merges x2 Output |
| Twin Burst | Common | ≥2 merges → x1.5 Output |
| Lucky Seed | Common | 75% chance to spawn 2, 25% to spawn 4 |
| Banker's Edge | Common | +2 Energy on phase clear |
| Reserve | Rare | +20 Output per unused step on phase clear |
| Frozen Cell | Common | One cell blocked from spawning |
| Combo Wire | Rare | 3 consecutive scoring moves → x1.3 |
| High Tribute | Rare | Highest tile merge → x1.4 |

## Scoring

```
finalOutput = floor(base × chain × condition × catalyst × global)
```

- **base**: sum of merged tile values
- **chain**: 1 merge=1.0, 2=1.2, 3=1.5, 4+=2.0
- **condition**: corner merge=×1.2, highest tile merge=×1.2
- **catalyst**: from active catalyst bonuses
- **global**: accumulated from Infusion multiplier choices
Merge Catalyst, a 2048-based roguelike puzzle game with a custom system design.
