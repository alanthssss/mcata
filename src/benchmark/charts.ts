/**
 * Simple SVG chart generation (no external dependencies).
 * Generates lightweight bar / distribution charts as SVG strings.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SuiteMetrics } from './metrics';
import { applyTerminology } from '../i18n/terminology';

const CHARTS_DIR = path.resolve(process.cwd(), 'artifacts', 'benchmark', 'latest', 'charts');

function ensureDir(d: string) { fs.mkdirSync(d, { recursive: true }); }

function write(file: string, content: string) {
  ensureDir(CHARTS_DIR);
  fs.writeFileSync(path.join(CHARTS_DIR, file), content, 'utf-8');
  console.log(`  Wrote charts/${file}`);
}

const term = (text: string): string => applyTerminology('en', text);

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948'];

// ─── Bar chart helper ─────────────────────────────────────────────────────────
function barChart(
  title: string,
  labels: string[],
  values: number[],
  yLabel = '',
): string {
  const W = 600, H = 360, PAD = 60, BAR_GAP = 8;
  const barW = Math.floor((W - PAD * 2 - BAR_GAP * (labels.length - 1)) / labels.length);
  const maxVal = Math.max(...values, 1);

  const bars = labels.map((label, i) => {
    const h = Math.floor(((H - PAD * 2) * values[i]) / maxVal);
    const x = PAD + i * (barW + BAR_GAP);
    const y = H - PAD - h;
    const color = COLORS[i % COLORS.length];
    return `
    <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3"/>
    <text x="${x + barW / 2}" y="${H - PAD + 16}" text-anchor="middle" font-size="11" fill="#333">${label}</text>
    <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#555">${values[i].toFixed(1)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <text x="${W / 2}" y="28" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">${title}</text>
  <text x="18" y="${H / 2}" text-anchor="middle" transform="rotate(-90,18,${H/2})" font-size="11" fill="#666">${yLabel}</text>
  <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="#ccc"/>
  <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#ccc"/>
  ${bars}
</svg>`;
}

// ─── Rounds cleared chart (replaces win rate chart) ───────────────────────────
export function generateRoundsClearedChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => metrics[k].avgRoundsCleared);
  write('rounds_cleared.svg', barChart(term('Avg Rounds Cleared by Agent'), labels, values, term('Avg Rounds')));
}

// ─── Mean output chart ────────────────────────────────────────────────────────
export function generateOutputDistChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => metrics[k].meanOutput);
  write('output_distribution.svg', barChart(term('Mean Final Output by Agent'), labels, values, term('Mean Output')));
}

// ─── Phase clear chart ────────────────────────────────────────────────────────
export function generatePhaseClearChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => {
    const dist = k in metrics ? metrics[k].phaseClearDist : {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const weighted = Object.entries(dist).reduce((s, [ph, cnt]) => s + Number(ph) * cnt, 0);
    return total > 0 ? weighted / total : 0;
  });
  write('phase_clear.svg', barChart(term('Avg Phases Cleared by Agent'), labels, values, term('Avg Phases')));
}

// ─── Max tile chart ───────────────────────────────────────────────────────────
export function generateMaxTileChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => {
    const dist = metrics[k].maxTileDistribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const weighted = Object.entries(dist).reduce((s, [t, cnt]) => s + Number(t) * cnt, 0);
    return total > 0 ? weighted / total : 0;
  });
  write('max_tile.svg', barChart(term('Avg Max Tile by Agent'), labels, values, term('Avg Max Tile')));
}

// ─── Output growth by round chart ────────────────────────────────────────────
/**
 * Generates a line-style (bar-per-round) chart showing mean output growth
 * across rounds for the first agent in the metrics map. Useful for checking
 * whether score-chasing progression accelerates appropriately.
 */
export function generateOutputGrowthChart(metrics: Record<string, SuiteMetrics>): void {
  const firstAgent = Object.keys(metrics)[0];
  if (!firstAgent) return;
  const growth = metrics[firstAgent].outputGrowthByRound;
  const rounds = Object.keys(growth).map(Number).sort((a, b) => a - b);
  if (rounds.length === 0) return;
  const labels = rounds.map(r => `R${r}`);
  const values = rounds.map(r => growth[r]);
  write('output_growth.svg', barChart(term(`Output Growth by Round (${firstAgent})`), labels, values, term('Mean Output')));
}

// ─── Failure distribution chart ───────────────────────────────────────────────
/**
 * Shows how many runs ended in each round for each agent — highlights where
 * the difficulty wall is in the endless progression.
 */
export function generateFailureDistChart(metrics: Record<string, SuiteMetrics>): void {
  // Aggregate failure counts across all agents
  const combined: Record<number, number> = {};
  for (const m of Object.values(metrics)) {
    for (const [round, count] of Object.entries(m.failureDistributionByRound)) {
      combined[Number(round)] = (combined[Number(round)] ?? 0) + count;
    }
  }
  const rounds = Object.keys(combined).map(Number).sort((a, b) => a - b);
  if (rounds.length === 0) return;
  const labels = rounds.map(r => `R${r}`);
  const values = rounds.map(r => combined[r]);
  write('failure_distribution.svg', barChart(term('Failure Distribution by Round (all agents)'), labels, values, term('Run Count')));
}

// ─── Generate all charts ──────────────────────────────────────────────────────
export function generateAllCharts(metrics: Record<string, SuiteMetrics>): void {
  generateRoundsClearedChart(metrics);
  generateOutputDistChart(metrics);
  generatePhaseClearChart(metrics);
  generateMaxTileChart(metrics);
  generateOutputGrowthChart(metrics);
  generateFailureDistChart(metrics);
}
