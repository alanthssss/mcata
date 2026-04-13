#!/usr/bin/env tsx
/**
 * Run meta-progression benchmarks: ascension difficulty sweep and unlock
 * pool comparison.
 *
 * Usage:
 *   npm run benchmark:meta              → ascension sweep + unlock comparison
 *   tsx src/scripts/runMetaBenchmark.ts --mode ascension
 *   tsx src/scripts/runMetaBenchmark.ts --mode unlock
 *   tsx src/scripts/runMetaBenchmark.ts --mode simulate
 */

import { HeuristicAgent, MCTSAgent } from '../ai/agents/index';
import { runAscensionSuite, runUnlockComparisonSuite } from '../benchmark/suites';
import { AscensionLevel } from '../core/types';
import { ALL_ASCENSION_LEVELS, ASCENSION_MODIFIER_DEFS } from '../core/ascensionModifiers';
import { DEFAULT_PROFILE } from '../core/profile';
import { applyRunReward, calculateRunReward } from '../core/profile';
import { createInitialState, startGame, processMoveAction, selectInfusion, buyFromForge, skipForge } from '../core/engine';
import { ProfileState } from '../core/types';

const args    = process.argv.slice(2);
const modeArg = args.indexOf('--mode');
const mode    = modeArg >= 0 && args[modeArg + 1] ? args[modeArg + 1] : 'all';

const RUN_COUNT = 20; // small but meaningful

// ─── Ascension difficulty sweep ───────────────────────────────────────────────

function runAscensionAnalysis() {
  console.log('\n=== Ascension Difficulty Sweep ===');
  const agents = [new HeuristicAgent(), new MCTSAgent({ rollouts: 10, rolloutDepth: 6 })];

  const result = runAscensionSuite(agents, RUN_COUNT, 5000, ALL_ASCENSION_LEVELS,
    (level, agent, done, total) => {
      if (done === total) process.stdout.write(`  A${level} ${agent}: ${done}/${total}\n`);
    },
  );

  console.log('\n  Level | Description                                    | WinRate (Heuristic) | WinRate (MCTS)');
  console.log('  ------|------------------------------------------------|---------------------|---------------');

  for (const level of ALL_ASCENSION_LEVELS) {
    const desc = ASCENSION_MODIFIER_DEFS[level].description.padEnd(46);
    const hWin  = result.metricsByLevel[level]['HeuristicAgent']?.winRate ?? 0;
    const mWin  = result.metricsByLevel[level]['MCTSAgent']?.winRate ?? 0;
    console.log(
      `  A${level}    | ${desc} | ${(hWin * 100).toFixed(1).padStart(19)}% | ${(mWin * 100).toFixed(1).padStart(13)}%`
    );
  }
}

// ─── Unlock pool comparison ───────────────────────────────────────────────────

function runUnlockAnalysis() {
  console.log('\n=== Unlock Pool Comparison (Base vs Full) ===');
  const agents = [new HeuristicAgent()];

  const result = runUnlockComparisonSuite(agents, RUN_COUNT, 6000,
    (pool, agent, done, total) => {
      if (done === total) process.stdout.write(`  ${pool.padEnd(4)} ${agent}: ${done}/${total}\n`);
    },
  );

  console.log('\n  Pool | Agent          | Win%   | Mean Output');
  console.log('  -----|----------------|--------|------------');
  for (const agentName of Object.keys(result.baseMetrics)) {
    const b = result.baseMetrics[agentName];
    const f = result.fullMetrics[agentName];
    console.log(`  base | ${agentName.padEnd(14)} | ${(b.winRate * 100).toFixed(1).padStart(5)}% | ${b.meanOutput.toFixed(0)}`);
    console.log(`  full | ${agentName.padEnd(14)} | ${(f.winRate * 100).toFixed(1).padStart(5)}% | ${f.meanOutput.toFixed(0)}`);
  }
}

// ─── Meta progression simulation ─────────────────────────────────────────────

function simulateProgression() {
  console.log('\n=== Meta Progression Simulation (20 runs) ===');
  const agent = new HeuristicAgent();
  let profile: ProfileState = { ...DEFAULT_PROFILE };

  console.log('\n  Run | Shards | Total | Phases | Won');
  console.log('  ----|--------|-------|--------|----');

  for (let i = 0; i < 20; i++) {
    let state = startGame(createInitialState(7000 + i));
    let steps = 0;
    let anomalyPhaseCount = 0;
    let anomalyPhasesSurvived = 0;

    while (state.screen !== 'game_over' && state.screen !== 'run_complete' && steps < 2000) {
      if (state.screen === 'playing') {
        const dir = agent.nextAction(state);
        const prev = state;
        state = processMoveAction(state, dir);
        if (state === prev) {
          for (const d of ['up','down','left','right'] as const) {
            const n = processMoveAction(state, d);
            if (n !== state) { state = n; break; }
          }
        }
        steps++;
      } else if (state.screen === 'infusion') {
        const choice = state.infusionOptions[0];
        if (choice) state = selectInfusion(state, choice);
        else state = { ...state, screen: 'playing' };
      } else if (state.screen === 'forge') {
        const affordable = state.forgeOffers.filter(c => state.energy >= c.cost).sort((a,b) => a.cost - b.cost);
        if (affordable.length) state = buyFromForge(state, affordable[0]);
        state = skipForge(state);
      } else break;
    }

    const won = state.screen === 'run_complete';
    const phasesCleared = state.phaseIndex + (won ? 1 : 0);
    // rough anomaly survival
    if (state.phaseIndex >= 3) { anomalyPhaseCount = 1; anomalyPhasesSurvived = 1; }
    if (state.phaseIndex >= 5) { anomalyPhaseCount = 2; anomalyPhasesSurvived = 2; }
    const anomalySurvivalRate = anomalyPhaseCount > 0 ? anomalyPhasesSurvived / anomalyPhaseCount : 0;

    const reward = calculateRunReward(state, anomalySurvivalRate);
    profile = applyRunReward(profile, reward);

    console.log(
      `  ${String(i + 1).padStart(3)} | ${String(reward.metaCurrencyEarned).padStart(6)} | ${String(profile.metaCurrency).padStart(5)} | ${String(phasesCleared).padStart(6)} | ${won ? 'Y' : 'N'}`
    );
  }

  console.log(`\n  Final Core Shards: ${profile.metaCurrency}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (mode === 'all' || mode === 'ascension') runAscensionAnalysis();
if (mode === 'all' || mode === 'unlock')    runUnlockAnalysis();
if (mode === 'all' || mode === 'simulate')  simulateProgression();

console.log('\nDone.');
