#!/usr/bin/env tsx
/**
 * Generate documentation assets (Mermaid diagram sources + placeholder SVG).
 *
 * Usage:
 *   npm run docs:assets
 */

import * as fs from 'fs';
import * as path from 'path';

const DOCS_ASSETS = path.resolve(process.cwd(), 'docs', 'assets');
fs.mkdirSync(DOCS_ASSETS, { recursive: true });

function write(file: string, content: string) {
  const p = path.join(DOCS_ASSETS, file);
  fs.writeFileSync(p, content, 'utf-8');
  console.log(`  Wrote docs/assets/${file}`);
}

// ─── Architecture diagram (Mermaid) ──────────────────────────────────────────
write('architecture.mmd', `flowchart TD
    UI["UI Layer (React)"]
    Store["Zustand Store"]
    Engine["Core Engine (pure)"]
    Board["Board / Move"]
    Score["Score / Catalysts"]
    AI["AI Agents"]
    Bench["Benchmark Runner"]
    Export["Artifact Exporter"]

    UI --> Store
    Store --> Engine
    Engine --> Board
    Engine --> Score
    AI --> Engine
    Bench --> AI
    Bench --> Export
`);

// ─── Game flow diagram (Mermaid) ──────────────────────────────────────────────
write('game_flow.mmd', `stateDiagram-v2
    [*] --> Start
    Start --> Playing: startGame()
    Playing --> Playing: processMoveAction()
    Playing --> PhaseEnd: output >= target or steps = 0
    PhaseEnd --> Infusion: phase < last and not forge phase
    PhaseEnd --> Forge: forge phase
    PhaseEnd --> GameOver: output < target
    PhaseEnd --> RunComplete: all phases cleared
    Infusion --> Playing: selectInfusion()
    Forge --> Playing: buyFromForge() / skipForge()
    GameOver --> [*]
    RunComplete --> [*]
`);

// ─── Agent evaluation pipeline (Mermaid) ──────────────────────────────────────
write('agent_pipeline.mmd', `flowchart LR
    S["GameState"] --> LA["legalMoves()"]
    LA --> E["evaluate each move"]
    E --> D["AgentDecision"]
    D --> Sim["processMoveAction()"]
    Sim --> NS["Next GameState"]
    NS --> S
`);

// ─── Benchmark workflow (Mermaid) ─────────────────────────────────────────────
write('benchmark_workflow.mmd', `flowchart TD
    PS["Select Suite (presets.ts)"]
    PS --> RA["Run Agents (runner.ts)"]
    RA --> CM["Collect RunMetrics"]
    CM --> AG["Aggregate SuiteMetrics"]
    AG --> AN["analyseResults (analysis.ts)"]
    AN --> EX["Export JSON / CSV / MD (exporters.ts)"]
    AN --> CH["Generate SVG Charts (charts.ts)"]
    EX --> AR["artifacts/benchmark/latest/"]
    CH --> AR
`);

// ─── Simple SVG illustration ─────────────────────────────────────────────────
const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
  <rect width="220" height="220" fill="#bbada0" rx="8"/>
  ${[0,1,2,3].flatMap(r => [0,1,2,3].map(c => {
    const val = [[2,4,8,16],[32,64,128,256],[512,1024,2048,0],[0,0,0,0]][r][c];
    const bg  = val === 0 ? '#cdc1b4' : val <= 4 ? '#eee4da' : val <= 16 ? '#f2b179' : val <= 64 ? '#f59563' : '#f67c5f';
    const fg  = val <= 4 ? '#776e65' : '#f9f6f2';
    const fs  = val >= 1024 ? 14 : 18;
    return `<rect x="${c*50+5}" y="${r*50+5}" width="42" height="42" fill="${bg}" rx="4"/>
    ${val > 0 ? `<text x="${c*50+26}" y="${r*50+31}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${fg}">${val}</text>` : ''}`;
  }).join('')).join('')}
</svg>`;

write('grid_example.svg', gridSvg);

console.log('\nDocs assets generated in docs/assets/');
console.log('Include Mermaid diagrams in Markdown with:');
console.log('  ```mermaid');
console.log('  <contents of .mmd file>');
console.log('  ```');
