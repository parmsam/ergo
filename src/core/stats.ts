import type { DayTotals, LaneId, LogEntry } from './types';

/** Local calendar date, YYYY-MM-DD. */
export function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Midnight (local) of the day `n` days before `t`. Uses calendar arithmetic so DST days aren't miscounted. */
export function dayStart(t: number, back = 0) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}

export interface Counts {
  done: number;
  skipped: number;
  missed: number;
  snoozed: number;
  /** Seconds spent on completed breaks. */
  sec: number;
}

const emptyCounts = (): Counts => ({ done: 0, skipped: 0, missed: 0, snoozed: 0, sec: 0 });

/** Share of breaks taken, ignoring snoozes (a snoozed break comes back). null when nothing was due. */
export function adherence(c: Counts): number | null {
  const due = c.done + c.skipped + c.missed;
  return due ? c.done / due : null;
}

export interface DaySummary {
  key: string;
  eye: Counts;
  body: Counts;
  /** Standing cues acknowledged / shown, and seconds stood. */
  stand: { shown: number; done: number; sec: number };
  /** Exercise snacks prompted / done. */
  snacks: { shown: number; done: number };
  nudges: number;
  activeSec: number;
  /** Estimated sitting: running time minus standing and body breaks. */
  sittingSec: number;
}

export function summarize(log: LogEntry[], days: Record<string, DayTotals>, key: string): DaySummary {
  const s: DaySummary = {
    key,
    eye: emptyCounts(),
    body: emptyCounts(),
    stand: { shown: 0, done: 0, sec: 0 },
    snacks: { shown: 0, done: 0 },
    nudges: 0,
    activeSec: days[key]?.activeSec ?? 0,
    sittingSec: 0,
  };
  for (const e of log) {
    if (dayKey(e.t) !== key) continue;
    if (e.kind === 'break' && (e.lane === 'eye' || e.lane === 'body')) {
      const c = s[e.lane];
      if (e.status === 'done') {
        c.done++;
        c.sec += e.sec;
      } else if (e.status === 'skipped') c.skipped++;
      else if (e.status === 'missed') c.missed++;
      else if (e.status === 'snoozed') c.snoozed++;
    } else if (e.kind === 'cue' && e.lane === 'body') {
      s.stand.shown++;
      if (e.status === 'done') {
        s.stand.done++;
        s.stand.sec += e.sec;
      }
    } else if (e.kind === 'cue' && e.lane === 'snack') {
      s.snacks.shown++;
      if (e.status === 'done') s.snacks.done++;
    } else if (e.kind === 'cue') s.nudges++;
  }
  s.sittingSec = Math.max(0, s.activeSec - s.body.sec - s.stand.sec);
  return s;
}

/** Oldest first, ending today. */
export function lastDays(log: LogEntry[], days: Record<string, DayTotals>, now: number, n = 7): DaySummary[] {
  return Array.from({ length: n }, (_, i) => summarize(log, days, dayKey(dayStart(now, n - 1 - i))));
}

/** Combined eye + body adherence for a day. */
export function dayAdherence(d: DaySummary): number | null {
  return adherence({
    done: d.eye.done + d.body.done,
    skipped: d.eye.skipped + d.body.skipped,
    missed: d.eye.missed + d.body.missed,
    snoozed: 0,
    sec: 0,
  });
}

/**
 * Consecutive days meeting the goal, ending today (or yesterday, if today has nothing due yet).
 * Days with nothing due (weekends, days off) don't break the streak; they're skipped.
 */
export function streak(log: LogEntry[], days: Record<string, DayTotals>, now: number, goalPct: number, lookback = 120): number {
  let count = 0;
  for (let back = 0; back < lookback; back++) {
    const a = dayAdherence(summarize(log, days, dayKey(dayStart(now, back))));
    if (a == null) continue;
    if (a * 100 >= goalPct) count++;
    else break;
  }
  return count;
}

/** How many of the most recent breaks on a lane were skipped in a row. Drives gentle escalation. */
export function skipRun(log: LogEntry[], lane: LaneId): number {
  let n = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.lane !== lane || e.kind !== 'break' || e.status === 'snoozed') continue;
    if (e.status === 'skipped' || e.status === 'missed') n++;
    else break;
  }
  return n;
}

/**
 * Daily 0–100 score: eye and body follow-through, plus workstation setup.
 * A part with nothing to measure yet is left out and the rest are reweighted.
 */
export function ergoScore(d: DaySummary, setupPct: number): number | null {
  const parts: [number | null, number][] = [
    [adherence(d.eye), 0.4],
    [adherence(d.body), 0.4],
    [setupPct, 0.2],
  ];
  const usable = parts.filter((p): p is [number, number] => p[0] != null);
  if (usable.length < 2) return null;
  const w = usable.reduce((s, [, wt]) => s + wt, 0);
  return Math.round((usable.reduce((s, [v, wt]) => s + v * wt, 0) / w) * 100);
}
