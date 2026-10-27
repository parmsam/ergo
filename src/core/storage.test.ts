import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, loadAll, mergeSettings, parseBackup, write } from './storage';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('fills in new settings without losing saved ones', () => {
    const s = mergeSettings({ eyeRule: '30-30-30', nudges: { snack: { on: true, everyMin: 90 } } } as never);
    expect(s.eyeRule).toBe('30-30-30');
    expect(s.nudges.snack).toEqual({ on: true, everyMin: 90 });
    expect(s.nudges.posture.on).toBe(true);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('ergo:v1:settings', '{nope');
    expect(loadAll().settings.eyeRule).toBe('20-20-20');
  });

  it('drops log entries past the retention window', () => {
    const now = Date.now();
    write('log', [
      { t: now - 200 * 86_400_000, lane: 'eye', rule: 'x', kind: 'break', status: 'done', sec: 20 },
      { t: now, lane: 'eye', rule: 'x', kind: 'break', status: 'done', sec: 20 },
    ]);
    expect(loadAll(now).log).toHaveLength(1);
  });

  it('round-trips a backup and rejects foreign files', () => {
    const p = loadAll();
    p.checklist = { glare: true };
    expect(parseBackup(exportBackup(p)).checklist).toEqual({ glare: true });
    expect(() => parseBackup('{"app":"pomo"}')).toThrow();
  });
});
