/**
 * Simple SVG chart generation (no external dependencies).
 * Generates lightweight bar / distribution charts as SVG strings.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SuiteMetrics } from './metrics';

const CHARTS_DIR = path.resolve(process.cwd(), 'artifacts', 'benchmark', 'latest', 'charts');

function ensureDir(d: string) { fs.mkdirSync(d, { recursive: true }); }

function write(file: string, content: string) {
  ensureDir(CHARTS_DIR);
  fs.writeFileSync(path.join(CHARTS_DIR, file), content, 'utf-8');
  console.log(`  Wrote charts/${file}`);
}

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
    <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="#555">${values[i].toFixed(0)}</text>`;
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

// ─── Win rate chart ───────────────────────────────────────────────────────────
export function generateWinRateChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => metrics[k].winRate * 100);
  write('win_rate.svg', barChart('Win Rate by Agent (%)', labels, values, 'Win Rate (%)'));
}

// ─── Mean output chart ────────────────────────────────────────────────────────
export function generateOutputDistChart(metrics: Record<string, SuiteMetrics>): void {
  const labels = Object.keys(metrics);
  const values = labels.map(k => metrics[k].meanOutput);
  write('output_distribution.svg', barChart('Mean Final Output by Agent', labels, values, 'Mean Output'));
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
  write('phase_clear.svg', barChart('Avg Phases Cleared by Agent', labels, values, 'Avg Phases'));
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
  write('max_tile.svg', barChart('Avg Max Tile by Agent', labels, values, 'Avg Max Tile'));
}

// ─── Generate all charts ──────────────────────────────────────────────────────
export function generateAllCharts(metrics: Record<string, SuiteMetrics>): void {
  generateWinRateChart(metrics);
  generateOutputDistChart(metrics);
  generatePhaseClearChart(metrics);
  generateMaxTileChart(metrics);
}
