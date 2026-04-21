/**
 * metaHealthAnalysis.ts
 *
 * Minimal meta-health detection for Merge Boost / Merge Catalyst.
 *
 * Aggregates build-level statistics from exported run-log bundles and
 * classifies the build ecosystem into dominant / dead / trap categories,
 * producing a human-readable Markdown report with actionable suggestions.
 *
 * Usage:
 *   tsx src/scripts/metaHealthAnalysis.ts <export.json> [export2.json ...] [out.md]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseRunLogExportJson, type ExportRunRecord, type RunLogExportBundle } from './exportRunLogs';
import { wrapMarkdownInHtml } from './generateRunReport';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Per-build-identity aggregated statistics. */
export interface BuildStat {
  /** Build identity label (e.g. "combo-heavy", "mixed", "skill-first"). */
  label: string;
  /** Number of runs with this build identity. */
  count: number;
  /** Fraction of all runs with this identity (0–1). */
  pickRate: number;
  /** Mean final output across runs with this identity. */
  avgOutput: number;
  /** Mean rounds cleared across runs with this identity. */
  avgRoundsCleared: number;
  /** Mean highest tier reached across runs with this identity. */
  avgHighestTier: number;
  /** Mean avg moves per stage. */
  avgMovesPerStage: number;
  /** Mean energy balance (earned − spent). */
  avgEnergyBalance: number;
}

/** Classification of a build identity. */
export type BuildClass =
  | 'dominant'  // high pick rate, above-average performance
  | 'healthy'   // moderate presence, competitive performance
  | 'niche'     // low pick rate, adequate performance
  | 'dead'      // low pick rate, below-average performance
  | 'trap';     // present in runs but correlated with weaker performance

/** Fully classified build entry. */
export interface ClassifiedBuild {
  stat: BuildStat;
  classification: BuildClass;
  /** Human-readable reason for the classification. */
  reason: string;
  /** Concrete tuning suggestion. */
  suggestion: string;
}

/** Output of the meta-health analysis. */
export interface MetaHealthResult {
  totalRuns: number;
  globalAvgOutput: number;
  globalAvgRoundsCleared: number;
  builds: ClassifiedBuild[];
  /** Quick summary flags. */
  flags: string[];
}

// ─── Build stats aggregation ─────────────────────────────────────────────────

/** Extract build-level statistics from one or more run-log bundles. */
export function aggregateBuildStats(bundles: RunLogExportBundle[]): BuildStat[] {
  const allRuns: ExportRunRecord[] = bundles.flatMap(b => b.runs);
  if (allRuns.length === 0) return [];

  // Group runs by build identity label.
  const groups = new Map<string, ExportRunRecord[]>();
  for (const run of allRuns) {
    const label = run.buildSnapshot.buildIdentityLabel ?? 'unknown';
    let group = groups.get(label);
    if (!group) {
      group = [];
      groups.set(label, group);
    }
    group.push(run);
  }

  const stats: BuildStat[] = [];
  for (const [label, runs] of groups) {
    const count = runs.length;
    stats.push({
      label,
      count,
      pickRate: count / allRuns.length,
      avgOutput: avg(runs, r => r.runMetadata.finalOutput),
      avgRoundsCleared: avg(runs, r => r.runMetadata.roundsCleared),
      avgHighestTier: avg(runs, r => r.runMetadata.highestTierReached),
      avgMovesPerStage: avg(runs, r => r.analysis.avgMovesPerStage),
      avgEnergyBalance: avg(runs, r => r.analysis.energyEarnedTotal - r.analysis.energySpentTotal),
    });
  }

  // Sort by pick rate descending for readability.
  return stats.sort((a, b) => b.pickRate - a.pickRate);
}

function avg(runs: ExportRunRecord[], fn: (r: ExportRunRecord) => number): number {
  if (runs.length === 0) return 0;
  return runs.reduce((s, r) => s + fn(r), 0) / runs.length;
}

// ─── Classification thresholds ───────────────────────────────────────────────

// Dominant: pick rate >= 30% AND avg output >= 1.30× global average.
const DOMINANT_PICK_RATE_THRESHOLD = 0.30;
const DOMINANT_PERFORMANCE_MULTIPLIER = 1.30;

// Dead: pick rate < 10% AND avg output < 0.80× global average.
const DEAD_PICK_RATE_THRESHOLD = 0.10;
const DEAD_PERFORMANCE_MULTIPLIER = 0.80;

// Trap: pick rate >= 10% AND avg output < 0.85× global average.
// A trap build appears in runs often enough to matter but consistently underperforms.
const TRAP_PICK_RATE_THRESHOLD = 0.10;
const TRAP_PERFORMANCE_MULTIPLIER = 0.85;

// Niche: pick rate < 10% but performance at or above global average.
const NICHE_PICK_RATE_THRESHOLD = 0.10;

// Suggestion helpers: move-count thresholds
// < 5 moves/stage: trivial clears — build is clearing too quickly
const TRIVIAL_CLEAR_MOVES_THRESHOLD = 5;
// > 12 moves/stage: slow build — may exhaust steps before clearing
const SLOW_BUILD_MOVES_THRESHOLD = 12;

// ─── Meta-health classifier ───────────────────────────────────────────────────

/**
 * Classify each build identity and produce the full meta-health result.
 * All thresholds are explicit constants above — easy to tune.
 */
export function classifyMetaHealth(
  bundles: RunLogExportBundle[],
): MetaHealthResult {
  const allRuns = bundles.flatMap(b => b.runs);
  const totalRuns = allRuns.length;

  if (totalRuns === 0) {
    return { totalRuns: 0, globalAvgOutput: 0, globalAvgRoundsCleared: 0, builds: [], flags: ['No runs to analyze.'] };
  }

  const globalAvgOutput = avg(allRuns, r => r.runMetadata.finalOutput);
  const globalAvgRoundsCleared = avg(allRuns, r => r.runMetadata.roundsCleared);
  const buildStats = aggregateBuildStats(bundles);

  const classified: ClassifiedBuild[] = buildStats.map(stat => {
    const { label, pickRate, avgOutput } = stat;
    const perfRatio = globalAvgOutput > 0 ? avgOutput / globalAvgOutput : 1;

    if (pickRate >= DOMINANT_PICK_RATE_THRESHOLD && perfRatio >= DOMINANT_PERFORMANCE_MULTIPLIER) {
      return {
        stat,
        classification: 'dominant',
        reason: `High pick rate (${pct(pickRate)}) and ${fmt(perfRatio)}× the global avg output — dominates the meta.`,
        suggestion: dominantSuggestion(label, stat),
      };
    }

    if (pickRate < DEAD_PICK_RATE_THRESHOLD && perfRatio < DEAD_PERFORMANCE_MULTIPLIER) {
      return {
        stat,
        classification: 'dead',
        reason: `Low pick rate (${pct(pickRate)}) and weak output (${fmt(perfRatio)}× global) — not viable.`,
        suggestion: deadSuggestion(label, stat),
      };
    }

    if (pickRate >= TRAP_PICK_RATE_THRESHOLD && perfRatio < TRAP_PERFORMANCE_MULTIPLIER) {
      return {
        stat,
        classification: 'trap',
        reason: `Appears in ${pct(pickRate)} of runs but underperforms (${fmt(perfRatio)}× global avg) — likely a trap choice.`,
        suggestion: trapSuggestion(label, stat),
      };
    }

    if (pickRate < NICHE_PICK_RATE_THRESHOLD && perfRatio >= 1.0) {
      return {
        stat,
        classification: 'niche',
        reason: `Low pick rate (${pct(pickRate)}) but performs at or above average (${fmt(perfRatio)}×) — valid niche.`,
        suggestion: `Keep as-is; consider surfacing in tutorial or hint text so players discover the build path.`,
      };
    }

    return {
      stat,
      classification: 'healthy',
      reason: `Moderate pick rate (${pct(pickRate)}) and competitive performance (${fmt(perfRatio)}× global).`,
      suggestion: `No tuning needed. Monitor over time for drift.`,
    };
  });

  // Ecosystem-level flags
  const flags: string[] = [];
  const dominantBuilds = classified.filter(c => c.classification === 'dominant');
  const deadBuilds = classified.filter(c => c.classification === 'dead');
  const trapBuilds = classified.filter(c => c.classification === 'trap');
  const healthyOrNiche = classified.filter(c => c.classification === 'healthy' || c.classification === 'niche');

  if (dominantBuilds.length >= 2) {
    flags.push(`⚠️ Multiple dominant builds detected (${dominantBuilds.length}) — diversity may be illusory.`);
  } else if (dominantBuilds.length === 1) {
    flags.push(`⚠️ One dominant build: "${dominantBuilds[0].stat.label}" — watch for over-centralisation.`);
  }

  if (deadBuilds.length > Math.max(1, buildStats.length * 0.4)) {
    flags.push(`⚠️ Many dead builds (${deadBuilds.length}/${buildStats.length}) — players may have very few real choices.`);
  }

  if (trapBuilds.length > 0) {
    flags.push(`⚠️ Trap choices detected (${trapBuilds.map(t => `"${t.stat.label}"`).join(', ')}) — may frustrate players.`);
  }

  if (healthyOrNiche.length >= Math.ceil(buildStats.length * 0.5) && dominantBuilds.length === 0) {
    flags.push(`✅ Ecosystem looks healthy: majority of builds are competitive or viable niche.`);
  }

  if (buildStats.length <= 1 && totalRuns >= 10) {
    flags.push(`⚠️ All runs share the same build identity — no diversity to evaluate.`);
  }

  return {
    totalRuns,
    globalAvgOutput,
    globalAvgRoundsCleared,
    builds: classified,
    flags,
  };
}

// ─── Suggestion generators ───────────────────────────────────────────────────

function dominantSuggestion(label: string, stat: BuildStat): string {
  const suggestions: string[] = [];
  if (stat.avgMovesPerStage < TRIVIAL_CLEAR_MOVES_THRESHOLD) {
    suggestions.push('Raise phase targets or reduce step budget to prevent trivial clears.');
  }
  suggestions.push(`Increase shop price for key boosts in the "${label}" build.`);
  suggestions.push(`Reduce rarity weight or multiplier for top contributing boosts.`);
  suggestions.push(`Consider adding a counter-mechanic or hazard that specifically pressures this build.`);
  return suggestions.join(' ');
}

function deadSuggestion(label: string, stat: BuildStat): string {
  const suggestions: string[] = [];
  if (stat.avgEnergyBalance < 0) {
    suggestions.push('Reduce energy cost of key boosts for this build.');
  }
  suggestions.push(`Lower shop price or increase rarity weight for boosts in the "${label}" build.`);
  suggestions.push(`Improve synergy payoff: buff a core combo or boost multiplier.`);
  suggestions.push(`Consider making a key boost available earlier (lower unlock requirement).`);
  return suggestions.join(' ');
}

function trapSuggestion(label: string, stat: BuildStat): string {
  const suggestions: string[] = [];
  suggestions.push(`Buff core output for the "${label}" build (raise multiplier or reduce cost).`);
  if (stat.avgMovesPerStage > SLOW_BUILD_MOVES_THRESHOLD) {
    suggestions.push('Reduce phase targets slightly so this slower build can clear without exhausting steps.');
  }
  suggestions.push('Add a tutorial hint or description update to help players understand how to use this build effectively.');
  return suggestions.join(' ');
}

// ─── Markdown report generator ───────────────────────────────────────────────

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

const CLASS_EMOJI: Record<BuildClass, string> = {
  dominant: '🔴',
  healthy: '🟢',
  niche: '🔵',
  dead: '⚫',
  trap: '🟡',
};

/**
 * Generate a Markdown meta-health report from classified build data.
 */
export function generateMetaHealthMarkdown(result: MetaHealthResult): string {
  const lines: string[] = [
    `# Meta-Health Report`,
    ``,
    `> ${result.totalRuns} run(s) analyzed · Global avg output: ${result.globalAvgOutput.toFixed(0)} · Global avg rounds cleared: ${result.globalAvgRoundsCleared.toFixed(1)}`,
    ``,
    `---`,
    ``,
    `## Ecosystem Flags`,
    ``,
  ];

  if (result.flags.length === 0) {
    lines.push('_No significant ecosystem issues detected._');
  } else {
    for (const flag of result.flags) {
      lines.push(`- ${flag}`);
    }
  }

  lines.push(``, `---`, ``, `## Build Classification`, ``);

  if (result.builds.length === 0) {
    lines.push('_No build data available._');
  } else {
    lines.push(
      `| Build | Class | Pick Rate | Avg Output | Avg Rounds | Avg Tier | Avg Moves/Stage |`,
      `|---|---|---|---|---|---|---|`,
    );
    for (const b of result.builds) {
      const s = b.stat;
      lines.push(
        `| **${s.label}** | ${CLASS_EMOJI[b.classification]} ${b.classification} | ${pct(s.pickRate)} | ${s.avgOutput.toFixed(0)} | ${s.avgRoundsCleared.toFixed(1)} | ${s.avgHighestTier.toFixed(0)} | ${s.avgMovesPerStage.toFixed(1)} |`,
      );
    }
  }

  // Sections by classification
  const groups: BuildClass[] = ['dominant', 'trap', 'dead', 'niche', 'healthy'];
  for (const cls of groups) {
    const items = result.builds.filter(b => b.classification === cls);
    if (items.length === 0) continue;

    const headings: Record<BuildClass, string> = {
      dominant: '🔴 Dominant Builds',
      trap: '🟡 Trap Choices',
      dead: '⚫ Dead Builds',
      niche: '🔵 Niche Builds',
      healthy: '🟢 Healthy Builds',
    };

    lines.push(``, `---`, ``, `## ${headings[cls]}`, ``);

    for (const item of items) {
      lines.push(
        `### ${item.stat.label}`,
        ``,
        `**Analysis:** ${item.reason}`,
        ``,
        `**Suggestion:** ${item.suggestion}`,
        ``,
        `| Metric | Value |`,
        `|---|---|`,
        `| Pick Rate | ${pct(item.stat.pickRate)} (${item.stat.count} run(s)) |`,
        `| Avg Final Output | ${item.stat.avgOutput.toFixed(0)} |`,
        `| Avg Rounds Cleared | ${item.stat.avgRoundsCleared.toFixed(1)} |`,
        `| Avg Highest Tier | ${item.stat.avgHighestTier.toFixed(0)} |`,
        `| Avg Moves/Stage | ${item.stat.avgMovesPerStage.toFixed(1)} |`,
        `| Avg Energy Balance | ${item.stat.avgEnergyBalance >= 0 ? '+' : ''}${item.stat.avgEnergyBalance.toFixed(1)} |`,
        ``,
      );
    }
  }

  lines.push(`---`, ``, `*Classification thresholds: dominant ≥ ${pct(DOMINANT_PICK_RATE_THRESHOLD)} pick rate + ≥ ${DOMINANT_PERFORMANCE_MULTIPLIER}× global output; dead < ${pct(DEAD_PICK_RATE_THRESHOLD)} pick rate + < ${DEAD_PERFORMANCE_MULTIPLIER}× global output; trap ≥ ${pct(TRAP_PICK_RATE_THRESHOLD)} pick rate + < ${TRAP_PERFORMANCE_MULTIPLIER}× global output.*`);

  return lines.join('\n');
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`Usage:
  tsx src/scripts/metaHealthAnalysis.ts <export.json> [export2.json ...] [out.md]

Reads one or more exported run-log bundles and writes:
  out.md    Markdown meta-health report (stdout if omitted)
  out.html  HTML version (alongside out.md if a path is given)
`);
    return;
  }

  const jsonPaths = args.filter(a => a.endsWith('.json'));
  const outputPath = args.find(a => a.endsWith('.md'));

  if (jsonPaths.length === 0) {
    console.error('Error: provide at least one exported run-log JSON file.');
    process.exitCode = 1;
    return;
  }

  const bundles: RunLogExportBundle[] = [];
  for (const p of jsonPaths) {
    const raw = await fs.readFile(path.resolve(p), 'utf8');
    bundles.push(parseRunLogExportJson(raw));
  }

  const result = classifyMetaHealth(bundles);
  const markdown = generateMetaHealthMarkdown(result);

  if (outputPath) {
    const mdPath = path.resolve(outputPath);
    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.writeFile(mdPath, markdown, 'utf8');
    const htmlPath = mdPath.replace(/\.md$/, '.html');
    await fs.writeFile(htmlPath, wrapMarkdownInHtml('Meta-Health Report', markdown), 'utf8');
    console.log(`Wrote ${mdPath} and ${htmlPath}`);
  } else {
    console.log(markdown);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
