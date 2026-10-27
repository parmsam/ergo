import { describe, expect, it } from 'vitest';
import { adherence, dayKey, ergoScore, lastDays, skipRun, streak, summarize } from './stats';
import type { LogEntry } from './types';

const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();
const e = (t: number, lane: LogEntry['lane'], status: LogEntry['status'], kind: LogEntry['kind'] = 'break'): LogEntry => ({ t, lane, rule: 'x', kind, status, sec: 20 });

describe('summaries', () => {
  const log = [e(at('2026-03-07'), 'eye', 'done'), e(at('2026-03-07'), 'eye', 'skipped'), e(at('2026-03-07'), 'eye', 'snoozed'), e(at('2026-03-07'), 'body', 'done'), e(at('2026-03-07'), 'body', 'shown', 'cue'), e(at('2026-03-06'), 'eye', 'done')];

  it('counts by lane and ignores snoozes in adherence', () => {
    const s = summarize(log, { '2026-03-07': { activeSec: 3600 } }, '2026-03-07');
    expect(s.eye).toMatchObject({ done: 1, skipped: 1, snoozed: 1 });
    expect(adherence(s.eye)).toBe(0.5);
    expect(s.stand.shown).toBe(1);
    expect(s.activeSec).toBe(3600);
  });

  it('builds the last N days across a DST change', () => {
    // 2026-03-08 is the US spring-forward day.
    const days = lastDays(log, {}, at('2026-03-09'), 4);
    expect(days.map((d) => d.key)).toEqual(['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09']);
    expect(dayKey(at('2026-03-08', 3))).toBe('2026-03-08');
  });
});

describe('streak', () => {
  it('counts goal days, skipping days with nothing due', () => {
    const log = [e(at('2026-05-01'), 'eye', 'done'), e(at('2026-05-03'), 'eye', 'done'), e(at('2026-05-04'), 'eye', 'done'), e(at('2026-05-04'), 'eye', 'skipped')];
    expect(streak(log, {}, at('2026-05-04'), 50)).toBe(3);
    expect(streak(log, {}, at('2026-05-04'), 70)).toBe(0);
  });
});

describe('skipRun', () => {
  it('counts trailing skips/misses per lane, ignoring snoozes', () => {
    const log = [e(1, 'eye', 'done'), e(2, 'eye', 'skipped'), e(3, 'body', 'done'), e(4, 'eye', 'snoozed'), e(5, 'eye', 'missed')];
    expect(skipRun(log, 'eye')).toBe(2);
    expect(skipRun(log, 'body')).toBe(0);
  });
});

describe('ergoScore', () => {
  it('is null until there is something to measure', () => {
    expect(ergoScore(summarize([], {}, '2026-01-01'), 0.5)).toBeNull();
  });
  it('reweights when one lane has nothing due', () => {
    const s = summarize([e(at('2026-01-01'), 'eye', 'done')], {}, '2026-01-01');
    // eye 100% (0.4) + setup 50% (0.2) → (0.4 + 0.1) / 0.6
    expect(ergoScore(s, 0.5)).toBe(83);
  });
});
