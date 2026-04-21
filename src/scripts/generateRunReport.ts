/**
 * generateRunReport.ts
 *
 * Generates human-readable Markdown (and optional HTML wrapper) analysis
 * reports from exported run-log bundles.
 *
 * Usage:
 *   tsx src/scripts/generateRunReport.ts run   <export.json> [out.md]
 *   tsx src/scripts/generateRunReport.ts compare <before.json> <after.json> [out.md]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  parseRunLogExportJson,
  type ExportRunRecord,
  type RunLogExportBundle,
} from './exportRunLogs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function tier(value: number): string {
  if (value <= 0) return '—';
  const log = Math.round(Math.log2(value));
  return `${value} (T${log})`;
}

function outcomeLabel(outcome: string): string {
  return outcome === 'cleared' ? '✅ Cleared' : '❌ Game Over';
}

function buildLabel(build: ExportRunRecord['buildSnapshot']): string {
  return build.buildIdentityLabel ?? 'unknown';
}

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

/** Return the step with the highest `scoreBreakdown.finalOutput` in a run. */
function highestOutputStep(run: ExportRunRecord) {
  let best = run.steps[0] ?? null;
  for (const step of run.steps) {
    if (!best || step.scoreBreakdown.finalOutput > best.scoreBreakdown.finalOutput) {
      best = step;
    }
  }
  return best;
}

/** Return the step that triggered the most synergies in a single move. */
function strongestComboStep(run: ExportRunRecord) {
  let best = run.steps[0] ?? null;
  for (const step of run.steps) {
    const count = step.triggeredEffects.synergies.length;
    if (!best || count > best.triggeredEffects.synergies.length) {
      best = step;
    }
  }
  return best;
}

/** Identify the last step before the run ended in game_over. */
function failurePoint(run: ExportRunRecord): string {
  if (run.runMetadata.outcome !== 'game_over') return '—';
  const last = run.steps[run.steps.length - 1];
  if (!last) return 'No step data';
  return `Round ${last.roundNumber}, Stage ${last.stageIndex}, Step ${last.stepNumber}`;
}

/** Phases that cleared very quickly (≤ 3 moves). */
function quickPhases(run: ExportRunRecord): number {
  return run.phases.filter(p => p.cleared && p.entries.length <= 3).length;
}

/** Phase with the most moves used. */
function longestPhase(run: ExportRunRecord): string {
  if (run.phases.length === 0) return '—';
  const p = run.phases.reduce((a, b) => (a.entries.length >= b.entries.length ? a : b));
  return `Round ${p.round}, Stage ${p.phaseIndex + 1} (${p.entries.length} moves)`;
}

// ─── Single-Run Report ────────────────────────────────────────────────────────

/**
 * Generates a Markdown analysis report for a single exported run record.
 * Missing optional fields are handled gracefully (shown as "—").
 */
export function generateSingleRunMarkdown(run: ExportRunRecord): string {
  const m = run.runMetadata;
  const b = run.buildSnapshot;
  const a = run.analysis;

  const bestStep = highestOutputStep(run);
  const comboStep = strongestComboStep(run);
  const runDuration = m.startedAt
    ? `${((m.endedAt - m.startedAt) / 1000).toFixed(0)}s`
    : '—';

  const energyNet = a.energyEarnedTotal - a.energySpentTotal;
  const shopAffordability = a.energySpentTotal > 0
    ? `${fmt((a.energySpentTotal / Math.max(a.energyEarnedTotal, 1)) * 100)}% of earned energy spent`
    : 'No shop purchases';

  // Diagnosis helpers
  const hadCombos = b.combosCount > 0;
  const hadSkills = b.skillsCount > 0;
  const reachedLateGame = m.roundsCleared >= 3;
  const highEconomy = energyNet >= 0;

  const helpers: string[] = [];
  if (b.boostsCount >= 3) helpers.push(`strong boost count (${b.boostsCount} active)`);
  if (hadCombos) helpers.push(`combo activations (${b.combosCount} combos)`);
  if (hadSkills) helpers.push(`skill usage (${b.skillsCount} skills)`);
  if (reachedLateGame) helpers.push(`surviving to round ${m.roundsCleared}`);
  if (highEconomy) helpers.push(`positive energy balance (+${energyNet})`);

  const limiters: string[] = [];
  if (b.boostsCount < 2) limiters.push('few boosts acquired');
  if (!hadCombos) limiters.push('no combos active');
  if (!hadSkills) limiters.push('no skills used');
  if (!reachedLateGame && m.outcome === 'game_over') limiters.push('early exit (round < 3)');
  if (!highEconomy) limiters.push(`negative energy balance (${energyNet})`);

  const lines: string[] = [
    `# Run Analysis Report`,
    ``,
    `> Generated at ${fmtDate(Date.now())}`,
    ``,
    `---`,
    ``,
    `## Run Overview`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Run ID | \`${m.runId}\` |`,
    `| Seed | ${m.seed ?? '—'} |`,
    `| Outcome | ${outcomeLabel(m.outcome)} |`,
    `| Rounds Reached | ${m.roundsReached} |`,
    `| Rounds Cleared | ${m.roundsCleared} |`,
    `| Stages Reached | ${m.stagesReached} |`,
    `| Final Output | ${m.finalOutput} |`,
    `| Highest Tier | ${tier(m.highestTierReached)} |`,
    `| Build Identity | ${buildLabel(b)} |`,
    `| Protocol / Rule | ${m.protocol} |`,
    `| Duration | ${runDuration} |`,
    ``,
    `---`,
    ``,
    `## Build Summary`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Active Boosts | ${b.activeBoosts.length > 0 ? b.activeBoosts.join(', ') : '—'} |`,
    `| Active Combos | ${b.activeCombos.length > 0 ? b.activeCombos.join(', ') : '—'} |`,
    `| Skills Used | ${b.equippedSkills.length > 0 ? b.equippedSkills.join(', ') : '—'} |`,
    `| Style / Pattern | ${b.activeStyle ?? '—'} |`,
    `| Rule / Mode | ${b.selectedRule} |`,
    `| Boosts Count | ${b.boostsCount} |`,
    `| Combos Count | ${b.combosCount} |`,
    `| Skills Count | ${b.skillsCount} |`,
    ``,
    `---`,
    ``,
    `## Pacing Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Avg Output per Move | ${fmt(a.avgOutputPerMove)} |`,
    `| Avg Moves per Stage | ${fmt(a.avgMovesPerStage)} |`,
    `| Phases Cleared | ${run.summary.clearedPhaseCount} / ${run.summary.phaseCount} |`,
    `| Quick-Clear Phases (≤ 3 moves) | ${quickPhases(run)} |`,
    `| Longest Phase | ${longestPhase(run)} |`,
    ``,
    `---`,
    ``,
    `## Economy Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Energy Earned Total | ${a.energyEarnedTotal} |`,
    `| Energy Spent Total | ${a.energySpentTotal} |`,
    `| Energy Balance | ${energyNet >= 0 ? '+' : ''}${energyNet} |`,
    `| Shop Affordability | ${shopAffordability} |`,
    ``,
    `---`,
    ``,
    `## Key Moments`,
    ``,
    `| Moment | Details |`,
    `|---|---|`,
    `| Highest-Output Move | ${bestStep ? `Step ${bestStep.stepNumber}: output ${bestStep.scoreBreakdown.finalOutput} (Round ${bestStep.roundNumber}, Stage ${bestStep.stageIndex})` : '—'} |`,
    `| Strongest Combo / Surge | ${comboStep && comboStep.triggeredEffects.synergies.length > 0 ? `Step ${comboStep.stepNumber}: ${comboStep.triggeredEffects.synergies.join(', ')}` : '—'} |`,
    `| Turning Point | ${reachedLateGame ? `Reached round ${m.roundsCleared} — build matured` : 'Did not reach late-game'} |`,
    `| Failure Point | ${failurePoint(run)} |`,
    ``,
    `---`,
    ``,
    `## End-of-Run Diagnosis`,
    ``,
    `**What likely helped most:**`,
    helpers.length > 0 ? helpers.map(h => `- ${h}`).join('\n') : '- No clear stand-out factors.',
    ``,
    `**What likely limited the run most:**`,
    limiters.length > 0 ? limiters.map(l => `- ${l}`).join('\n') : '- No clear limiting factors.',
    ``,
    `---`,
    ``,
    `*Report generated from bundle schema \`${RUN_LOG_EXPORT_SCHEMA_VERSION_PLACEHOLDER}\`*`,
  ];

  return lines.join('\n');
}

// Placeholder filled at call site — avoids a circular import from exportRunLogs
const RUN_LOG_EXPORT_SCHEMA_VERSION_PLACEHOLDER = 'run-log-export.v1';

/**
 * Wraps a Markdown report in a minimal HTML page for browser viewing.
 */
export function wrapMarkdownInHtml(title: string, markdown: string): string {
  // Convert basic Markdown to HTML (headers, tables, bold, lists, code, hr)
  let body = markdown
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // List items
    .replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> blocks in <ul>
  body = body.replace(/(<li>.*<\/li>\n?)+/gs, match => `<ul>\n${match}</ul>\n`);

  // Simple Markdown table → HTML table
  body = body.replace(
    /((?:\|[^\n]+\|(?:\n|$))+)/g,
    (tableBlock) => {
      const rawLines = tableBlock.trim().split('\n');
      // Filter out separator rows like |---|---|
      const dataLines = rawLines.filter(l => !/^\|[\s|:-]+\|$/.test(l));
      if (dataLines.length < 2) return tableBlock;
      const [headerLine, ...bodyLines] = dataLines;
      const parseRow = (line: string, tag: string) => {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        return `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
      };
      const thead = `<thead>${parseRow(headerLine, 'th')}</thead>`;
      const tbody = `<tbody>${bodyLines.map(l => parseRow(l, 'td')).join('')}</tbody>`;
      return `<table>\n${thead}\n${tbody}\n</table>\n`;
    },
  );

  // Wrap remaining plain paragraphs (non-tag lines) in <p>
  body = body
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<[a-z]/.test(trimmed)) return line; // already HTML
      return `<p>${line}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  h1, h2, h3 { border-bottom: 1px solid #ddd; padding-bottom: .25rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #ccc; padding: .4rem .75rem; text-align: left; }
  th { background: #f5f5f5; }
  tr:nth-child(even) td { background: #fafafa; }
  code { background: #f0f0f0; padding: 0.1rem .35rem; border-radius: 3px; font-size: .9em; }
  blockquote { border-left: 3px solid #aaa; margin: .5rem 0; padding-left: 1rem; color: #666; }
  hr { border: none; border-top: 1px solid #ddd; }
  ul { padding-left: 1.5rem; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Multi-Run Comparison Report ─────────────────────────────────────────────

/**
 * Generates a Markdown comparison report from two or more run bundles.
 */
export function generateMultiRunComparisonMarkdown(bundles: RunLogExportBundle[]): string {
  if (bundles.length === 0) return '# Multi-Run Comparison\n\nNo bundles provided.\n';

  const allRuns = bundles.flatMap(b => b.runs);
  if (allRuns.length === 0) return '# Multi-Run Comparison\n\nNo runs found in bundles.\n';

  const lines: string[] = [
    `# Multi-Run Comparison Report`,
    ``,
    `> Generated at ${fmtDate(Date.now())} · ${allRuns.length} run(s) across ${bundles.length} bundle(s)`,
    ``,
    `---`,
    ``,
    `## Run Summary Table`,
    ``,
    `| Run ID | Outcome | Rounds Cleared | Final Output | Highest Tier | Avg Out/Move | Build | Boosts | Energy Balance |`,
    `|---|---|---|---|---|---|---|---|---|`,
  ];

  for (const run of allRuns) {
    const m = run.runMetadata;
    const a = run.analysis;
    const b = run.buildSnapshot;
    const energyBalance = a.energyEarnedTotal - a.energySpentTotal;
    lines.push(
      `| \`${m.runId}\` | ${outcomeLabel(m.outcome)} | ${m.roundsCleared} | ${m.finalOutput} | ${tier(m.highestTierReached)} | ${fmt(a.avgOutputPerMove)} | ${buildLabel(b)} | ${b.boostsCount} | ${energyBalance >= 0 ? '+' : ''}${energyBalance} |`,
    );
  }

  // Simple interpretation
  const sorted = [...allRuns].sort(
    (a, b) => b.runMetadata.finalOutput - a.runMetadata.finalOutput,
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const avgRoundsCleared =
    allRuns.reduce((s, r) => s + r.runMetadata.roundsCleared, 0) / allRuns.length;
  const avgOutput =
    allRuns.reduce((s, r) => s + r.runMetadata.finalOutput, 0) / allRuns.length;
  const avgMovesPerStage =
    allRuns.reduce((s, r) => s + r.analysis.avgMovesPerStage, 0) / allRuns.length;

  lines.push(
    ``,
    `---`,
    ``,
    `## Aggregate Metrics`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Runs | ${allRuns.length} |`,
    `| Avg Final Output | ${fmt(avgOutput, 0)} |`,
    `| Avg Rounds Cleared | ${fmt(avgRoundsCleared)} |`,
    `| Avg Moves per Stage | ${fmt(avgMovesPerStage)} |`,
    ``,
    `---`,
    ``,
    `## Interpretation`,
    ``,
    `- **Best run:** \`${best.runMetadata.runId}\` — output ${best.runMetadata.finalOutput}, ${best.runMetadata.roundsCleared} rounds cleared`,
    `- **Weakest run:** \`${worst.runMetadata.runId}\` — output ${worst.runMetadata.finalOutput}, ${worst.runMetadata.roundsCleared} rounds cleared`,
    ``,
  );

  // Pacing thresholds: < 5 moves/stage → build power outpacing targets (benchmark target: 6–12);
  // > 15 moves/stage → targets too tight for the builds observed.
  if (avgMovesPerStage < 5) {
    lines.push(`- ⚠️ Avg moves/stage is low (${fmt(avgMovesPerStage)}) — builds may be outpacing targets (short-clear risk).`);
  } else if (avgMovesPerStage > 15) {
    lines.push(`- ⚠️ Avg moves/stage is high (${fmt(avgMovesPerStage)}) — targets may be too tight for these builds.`);
  } else {
    lines.push(`- ✅ Pacing looks healthy (avg ${fmt(avgMovesPerStage)} moves/stage).`);
  }

  // Build diversity
  const identities = new Set(allRuns.map(r => r.buildSnapshot.buildIdentityLabel ?? 'unknown'));
  if (identities.size <= 1 && allRuns.length > 2) {
    lines.push(`- ⚠️ All runs share the same build identity ("${[...identities][0]}") — consider testing more builds.`);
  } else {
    lines.push(`- ✅ Build diversity: ${identities.size} distinct identities (${[...identities].join(', ')}).`);
  }

  lines.push(``, `---`, ``);
  lines.push(`*Report generated from ${bundles.length} bundle(s)*`);

  return lines.join('\n');
}

// ─── Before-vs-After Config Comparison Report ────────────────────────────────

/** Compute a simple percent-change string. */
function pctChange(before: number, after: number): string {
  if (before === 0) return after === 0 ? '0%' : '+∞%';
  const pct = ((after - before) / Math.abs(before)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/** Diff two plain objects and return changed key paths. */
function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix = '',
): Array<{ key: string; before: unknown; after: unknown }> {
  const diffs: Array<{ key: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of allKeys) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    const bv = before[k];
    const av = after[k];
    if (
      bv !== null &&
      av !== null &&
      typeof bv === 'object' &&
      typeof av === 'object' &&
      !Array.isArray(bv) &&
      !Array.isArray(av)
    ) {
      diffs.push(
        ...diffObjects(
          bv as Record<string, unknown>,
          av as Record<string, unknown>,
          fullKey,
        ),
      );
    } else if (JSON.stringify(bv) !== JSON.stringify(av)) {
      diffs.push({ key: fullKey, before: bv, after: av });
    }
  }
  return diffs;
}

/**
 * Generates a Markdown before-vs-after config comparison report.
 * Compares metrics AND config snapshots (if present in bundles).
 */
export function generateBeforeVsAfterMarkdown(
  beforeBundle: RunLogExportBundle,
  afterBundle: RunLogExportBundle,
): string {
  const beforeRuns = beforeBundle.runs;
  const afterRuns = afterBundle.runs;

  const avg = (runs: ExportRunRecord[], fn: (r: ExportRunRecord) => number) =>
    runs.length === 0 ? 0 : runs.reduce((s, r) => s + fn(r), 0) / runs.length;

  const bFinalOutput = avg(beforeRuns, r => r.runMetadata.finalOutput);
  const aFinalOutput = avg(afterRuns, r => r.runMetadata.finalOutput);
  const bRoundsCleared = avg(beforeRuns, r => r.runMetadata.roundsCleared);
  const aRoundsCleared = avg(afterRuns, r => r.runMetadata.roundsCleared);
  const bHighestTier = avg(beforeRuns, r => r.runMetadata.highestTierReached);
  const aHighestTier = avg(afterRuns, r => r.runMetadata.highestTierReached);
  const bMovesPerStage = avg(beforeRuns, r => r.analysis.avgMovesPerStage);
  const aMovesPerStage = avg(afterRuns, r => r.analysis.avgMovesPerStage);
  const bEnergyBalance = avg(beforeRuns, r => r.analysis.energyEarnedTotal - r.analysis.energySpentTotal);
  const aEnergyBalance = avg(afterRuns, r => r.analysis.energyEarnedTotal - r.analysis.energySpentTotal);
  const bLateGame = avg(beforeRuns, r => r.analysis.lateGameClearSpeed);
  const aLateGame = avg(afterRuns, r => r.analysis.lateGameClearSpeed);

  const lines: string[] = [
    `# Before-vs-After Config Comparison`,
    ``,
    `> Generated at ${fmtDate(Date.now())} · Before: ${beforeBundle.configVersion} (${beforeRuns.length} run(s)) · After: ${afterBundle.configVersion} (${afterRuns.length} run(s))`,
    ``,
    `---`,
    ``,
    `## Metric Diff`,
    ``,
    `| Metric | Before | After | Change |`,
    `|---|---|---|---|`,
    `| Avg Final Output | ${fmt(bFinalOutput, 0)} | ${fmt(aFinalOutput, 0)} | ${pctChange(bFinalOutput, aFinalOutput)} |`,
    `| Avg Rounds Cleared | ${fmt(bRoundsCleared)} | ${fmt(aRoundsCleared)} | ${pctChange(bRoundsCleared, aRoundsCleared)} |`,
    `| Avg Highest Tier | ${fmt(bHighestTier, 0)} | ${fmt(aHighestTier, 0)} | ${pctChange(bHighestTier, aHighestTier)} |`,
    `| Avg Moves per Stage | ${fmt(bMovesPerStage)} | ${fmt(aMovesPerStage)} | ${pctChange(bMovesPerStage, aMovesPerStage)} |`,
    `| Avg Energy Balance | ${fmt(bEnergyBalance)} | ${fmt(aEnergyBalance)} | ${pctChange(bEnergyBalance, aEnergyBalance)} |`,
    `| Late-Game Clear Speed | ${fmt(bLateGame)} | ${fmt(aLateGame)} | ${pctChange(bLateGame, aLateGame)} |`,
    ``,
    `---`,
    ``,
    `## Interpretation`,
    ``,
  ];

  // Answer practical questions
  const roundsChange = aRoundsCleared - bRoundsCleared;
  const movesChange = aMovesPerStage - bMovesPerStage;
  const tierChange = aHighestTier - bHighestTier;
  const economyChange = aEnergyBalance - bEnergyBalance;

  if (Math.abs(roundsChange) < 0.1) {
    lines.push(`- **Rounds cleared**: essentially unchanged (Δ${fmt(roundsChange)}).`);
  } else {
    lines.push(
      `- **Rounds cleared**: ${roundsChange > 0 ? 'improved' : 'regressed'} by ${fmt(Math.abs(roundsChange))} rounds avg (${pctChange(bRoundsCleared, aRoundsCleared)}).`,
    );
  }

  if (movesChange > 1) {
    lines.push(`- **Phases became longer** (avg +${fmt(movesChange)} moves/stage) — difficulty may have increased or builds take longer to develop.`);
  } else if (movesChange < -1) {
    lines.push(`- **Phases became shorter** (avg ${fmt(movesChange)} moves/stage) — build power may be outpacing targets (short-clear risk).`);
  } else {
    lines.push(`- **Pacing unchanged** (moves/stage Δ${fmt(movesChange)}).`);
  }

  // Tier threshold: 16 raw tile units ≈ one tier step (tiles are powers of 2; a change of 16
  // on the raw value corresponds to a meaningful board-development shift, e.g. 64→80 or 128→144).
  if (tierChange > 16) {
    lines.push(`- **Higher-tier merges became more common** (avg tile Δ+${fmt(tierChange, 0)}).`);
  } else if (tierChange < -16) {
    lines.push(`- **Higher-tier merges became less common** (avg tile Δ${fmt(tierChange, 0)}).`);
  } else {
    lines.push(`- **Board tier development unchanged**.`);
  }

  if (economyChange < -1) {
    lines.push(`- **Economy became tighter** (energy balance Δ${fmt(economyChange)}).`);
  } else if (economyChange > 1) {
    lines.push(`- **Economy became looser** (energy balance Δ+${fmt(economyChange)}).`);
  } else {
    lines.push(`- **Economy unchanged**.`);
  }

  const lateGameChange = aLateGame - bLateGame;
  if (lateGameChange < -0.5) {
    lines.push(`- **Late-game speed-clears reduced** (clear speed Δ${fmt(lateGameChange)}) — late-game pressure increased.`);
  } else if (lateGameChange > 0.5) {
    lines.push(`- **Late-game became faster** (clear speed Δ+${fmt(lateGameChange)}) — possible overpowered late-game builds.`);
  } else {
    lines.push(`- **Late-game clear speed unchanged**.`);
  }

  // Config diff (if configs are present and different)
  const bConfig = beforeBundle.configSnapshot?.resolvedConfig as unknown;
  const aConfig = afterBundle.configSnapshot?.resolvedConfig as unknown;
  if (bConfig && aConfig) {
    const diffs = diffObjects(
      bConfig as Record<string, unknown>,
      aConfig as Record<string, unknown>,
    );
    if (diffs.length > 0) {
      lines.push(``, `---`, ``, `## Config Diff`, ``, `| Key | Before | After |`, `|---|---|---|`);
      for (const d of diffs) {
        lines.push(`| \`${d.key}\` | ${JSON.stringify(d.before)} | ${JSON.stringify(d.after)} |`);
      }
    } else {
      lines.push(``, `---`, ``, `## Config Diff`, ``, `_No config changes detected between bundles._`);
    }
  }

  lines.push(``, `---`, ``, `*Report generated from bundle schemas \`${beforeBundle.schemaVersion}\` → \`${afterBundle.schemaVersion}\`*`);

  return lines.join('\n');
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [mode, ...rest] = process.argv.slice(2);

  if (!mode || mode === '--help' || mode === '-h') {
    console.log(`Usage:
  tsx src/scripts/generateRunReport.ts run     <export.json> [out.md]
  tsx src/scripts/generateRunReport.ts compare <before.json> <after.json> [out.md]
`);
    return;
  }

  if (mode === 'run') {
    const [inputPath, outputPath] = rest;
    if (!inputPath) {
      console.error('Error: provide an export JSON path.');
      process.exitCode = 1;
      return;
    }
    const raw = await fs.readFile(path.resolve(inputPath), 'utf8');
    const bundle = parseRunLogExportJson(raw);
    if (bundle.runs.length === 0) {
      console.error('No runs found in bundle.');
      process.exitCode = 1;
      return;
    }
    const markdown = generateSingleRunMarkdown(bundle.runs[0]);
    if (outputPath) {
      const mdPath = path.resolve(outputPath);
      await fs.writeFile(mdPath, markdown, 'utf8');
      const htmlPath = mdPath.replace(/\.md$/, '.html');
      await fs.writeFile(htmlPath, wrapMarkdownInHtml('Run Report', markdown), 'utf8');
      console.log(`Wrote ${mdPath} and ${htmlPath}`);
    } else {
      console.log(markdown);
    }
    return;
  }

  if (mode === 'compare') {
    const paths = rest.filter(a => a.endsWith('.json'));
    const outputPath = rest.find(a => a.endsWith('.md'));
    if (paths.length < 2) {
      console.error('Error: provide at least two export JSON paths.');
      process.exitCode = 1;
      return;
    }
    const bundles: RunLogExportBundle[] = [];
    for (const p of paths) {
      const raw = await fs.readFile(path.resolve(p), 'utf8');
      bundles.push(parseRunLogExportJson(raw));
    }
    const [beforeBundle, afterBundle, ...extra] = bundles;
    // If exactly 2 bundles, generate a before-vs-after report; otherwise multi-run
    const markdown =
      extra.length === 0
        ? generateBeforeVsAfterMarkdown(beforeBundle, afterBundle)
        : generateMultiRunComparisonMarkdown(bundles);
    if (outputPath) {
      const mdPath = path.resolve(outputPath);
      await fs.writeFile(mdPath, markdown, 'utf8');
      const htmlPath = mdPath.replace(/\.md$/, '.html');
      await fs.writeFile(htmlPath, wrapMarkdownInHtml('Run Comparison Report', markdown), 'utf8');
      console.log(`Wrote ${mdPath} and ${htmlPath}`);
    } else {
      console.log(markdown);
    }
    return;
  }

  console.error(`Unknown mode: "${mode}". Use "run" or "compare".`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
