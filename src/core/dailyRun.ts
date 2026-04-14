/**
 * Daily Run system for Merge Catalyst.
 * Each day all players share the same seed derived from the date.
 * Local leaderboard persists best runs.
 */

const DAILY_RUN_STORAGE_KEY = 'merge_catalyst_daily_runs';

export interface DailyRunRecord {
  date: string;        // YYYY-MM-DD
  seed: number;
  bestOutput: number;
  bestRound: number;
  playCount: number;
}

/**
 * Generate a deterministic seed from a date string (YYYY-MM-DD).
 * Uses a simple hash to produce a consistent number.
 */
export function getDailySeed(dateStr?: string): number {
  const date = dateStr ?? getTodayString();
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // convert to 32-bit int
  }
  return Math.abs(hash);
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadDailyRuns(): DailyRunRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DAILY_RUN_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DailyRunRecord[];
  } catch {
    return [];
  }
}

export function getTodayRecord(): DailyRunRecord | null {
  const today = getTodayString();
  const records = loadDailyRuns();
  return records.find(r => r.date === today) ?? null;
}

export function saveDailyRunResult(output: number, roundsCleared: number): void {
  if (typeof window === 'undefined') return;
  const today = getTodayString();
  const seed = getDailySeed(today);
  const records = loadDailyRuns();
  const existing = records.find(r => r.date === today);

  if (existing) {
    existing.bestOutput = Math.max(existing.bestOutput, output);
    existing.bestRound = Math.max(existing.bestRound, roundsCleared);
    existing.playCount++;
  } else {
    records.push({ date: today, seed, bestOutput: output, bestRound: roundsCleared, playCount: 1 });
  }

  // Keep only last 30 days
  const recent = records.slice(-30);
  window.localStorage.setItem(DAILY_RUN_STORAGE_KEY, JSON.stringify(recent));
}
