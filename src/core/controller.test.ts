import { beforeEach, describe, expect, it, vi } from 'vitest';
import { breakLeft, createController, RING_EVERY, RING_MAX, type Effects } from './controller';
import { DEFAULT_SESSION, DEFAULT_SETTINGS, mergeSettings } from './storage';
import { createStore } from './store';

const MIN = 60_000;
const T0 = new Date('2026-06-01T09:00:00').getTime();

function setup(over: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const store = createStore({
    settings: mergeSettings({ ...DEFAULT_SETTINGS, nudges: { posture: { on: false, everyMin: 15 }, snack: { on: false, everyMin: 120 } }, ...over }),
    session: { ...DEFAULT_SESSION },
    log: [],
    days: {},
    checklist: {},
  });
  const fx: Effects = { breakStart: vi.fn(), breakAnswered: vi.fn(), breakEnd: vi.fn(), cue: vi.fn(), cueEnd: vi.fn(), away: vi.fn(), tones: vi.fn(), tick: vi.fn() };
  const ctrl = createController(store, fx);
  /** Tick once a second from `from` to `to` (ms since T0). */
  const run = (from: number, to: number, step = 1000) => {
    for (let t = from; t <= to; t += step) ctrl.tick(T0 + t);
  };
  return { store, ctrl, fx, run };
}

beforeEach(() => localStorage.clear());

describe('controller', () => {
  it('starts an eye break at 20 min and logs it done when it runs out (honor system)', () => {
    const { ctrl, fx, store, run } = setup();
    ctrl.start(T0);
    run(1000, 20 * MIN - 1000);
    expect(fx.breakStart).not.toHaveBeenCalled();
    run(20 * MIN, 20 * MIN);
    expect(fx.breakStart).toHaveBeenCalledTimes(1);
    expect(ctrl.activeBreaks()[0].lane).toBe('eye');
    run(20 * MIN + 1000, 20 * MIN + 21_000);
    expect(store.get().log.filter((e) => e.kind === 'break')).toEqual([expect.objectContaining({ lane: 'eye', status: 'done', sec: 20 })]);
  });

  it('logs missed when honor system is off and the break was never seen', () => {
    const { ctrl, store, run } = setup({ trustBreaks: false });
    ctrl.start(T0);
    run(1000, 20 * MIN + 21_000);
    expect(store.get().log.find((e) => e.lane === 'eye')?.status).toBe('missed');
  });

  it('fires the stand cue at 20 min and the move break at 28 min on 20-8-2', () => {
    const { ctrl, fx, store, run } = setup();
    ctrl.start(T0);
    run(1000, 20 * MIN);
    expect(fx.cue).toHaveBeenCalledWith(expect.objectContaining({ lane: 'body' }));
    ctrl.ackCue('body');
    expect(store.get().log.find((e) => e.kind === 'cue')).toMatchObject({ status: 'done', sec: 8 * 60 });
    ctrl.done('eye', T0 + 20 * MIN);
    run(20 * MIN + 1000, 28 * MIN);
    expect(ctrl.activeBreaks().map((b) => b.lane)).toEqual(['body']);
  });

  it('a finished body break restarts the eye timer', () => {
    const { ctrl, run } = setup({ eyeRule: '30-30-30' });
    ctrl.start(T0);
    run(1000, 28 * MIN);
    ctrl.done('body', T0 + 28 * MIN);
    const eye = ctrl.stateOf('eye', T0 + 28 * MIN)!;
    expect(eye.phase.kind).toBe('work');
    expect(eye.remaining).toBe(30 * MIN);
  });

  it('snooze pushes the break back and logs a snooze', () => {
    const { ctrl, store, run } = setup();
    ctrl.start(T0);
    run(1000, 20 * MIN);
    ctrl.snooze(5, 'eye', T0 + 20 * MIN);
    expect(ctrl.activeBreaks().some((b) => b.lane === 'eye')).toBe(false);
    expect(store.get().log.at(-1)).toMatchObject({ lane: 'eye', status: 'snoozed' });
    expect(ctrl.stateOf('eye', T0 + 25 * MIN)!.phase.kind).toBe('break');
  });

  it('pause freezes the cycle and resume shifts it', () => {
    const { ctrl } = setup();
    ctrl.start(T0);
    ctrl.pause(30, T0 + 10 * MIN);
    expect(ctrl.stateOf('eye', T0 + 30 * MIN)!.remaining).toBe(10 * MIN);
    ctrl.tick(T0 + 41 * MIN); // past pausedUntil: auto-resume
    expect(ctrl.stateOf('eye', T0 + 41 * MIN)!.remaining).toBe(10 * MIN);
  });

  it('a long stall (sleep) restarts cycles and does not count as screen time', () => {
    const { ctrl, fx, store, run } = setup();
    ctrl.start(T0);
    run(1000, 16_000);
    ctrl.tick(T0 + 60 * MIN);
    expect(fx.away).toHaveBeenCalled();
    expect(ctrl.stateOf('eye', T0 + 60 * MIN)!.remaining).toBe(20 * MIN);
    run(60 * MIN + 1000, 60 * MIN + 20_000);
    expect(Object.values(store.get().days)[0].activeSec).toBeLessThan(60);
  });

  it('logs a break that started and ended between two ticks', () => {
    const { ctrl, store, run } = setup();
    ctrl.start(T0);
    run(10_000, 19 * MIN + 50_000, 10_000);
    ctrl.tick(T0 + 20 * MIN + 40_000); // 50 s gap, eye break 20:00–20:20 fell in between
    expect(store.get().log.find((e) => e.lane === 'eye')).toMatchObject({ status: 'done', t: T0 + 20 * MIN });
  });

  it('exercise snack nudge cues on its interval and can be acknowledged', () => {
    const { ctrl, fx, store, run } = setup({ nudges: { posture: { on: false, everyMin: 15 }, snack: { on: true, everyMin: 120 } } });
    ctrl.start(T0);
    run(1000, 121 * MIN, 5000);
    expect(fx.cue).toHaveBeenCalledWith(expect.objectContaining({ lane: 'snack' }));
    ctrl.ackCue('snack', T0 + 121 * MIN);
    expect(store.get().log.find((e) => e.lane === 'snack')).toMatchObject({ status: 'done', sec: 60 });
  });

  it('runs only the body timer when the eye rule is off', () => {
    const { ctrl, fx, run } = setup({ eyeRule: 'off' });
    ctrl.start(T0);
    expect(ctrl.lanes().map((l) => l.id)).toEqual(['body']);
    expect(ctrl.stateOf('eye', T0)).toBeNull();
    run(1000, 29 * MIN);
    expect(fx.breakStart).toHaveBeenCalledTimes(1);
    expect(ctrl.activeBreaks()[0].lane).toBe('body');
    // Finishing the body break must not try to restart an eye timer that isn't there.
    ctrl.done('body', T0 + 29 * MIN);
    ctrl.breakNow('eye', T0 + 29 * MIN + 1000);
    expect(ctrl.activeBreaks()).toEqual([]);
  });

  it('runs only the eye timer when the body rule is off', () => {
    const { ctrl, fx, run } = setup({ bodyRule: 'off' });
    ctrl.start(T0);
    expect(ctrl.lanes().map((l) => l.id)).toEqual(['eye']);
    run(1000, 20 * MIN);
    expect(fx.cue).not.toHaveBeenCalled();
    expect(ctrl.activeBreaks().map((b) => b.lane)).toEqual(['eye']);
  });

  it('switching a timer off mid-break ends that break', () => {
    const { ctrl, fx, store } = setup();
    ctrl.start(T0);
    ctrl.breakNow('eye', T0 + MIN);
    const before = store.get().settings;
    store.update((d) => void (d.settings.eyeRule = 'off'), ['settings']);
    ctrl.settingsChanged(before, T0 + MIN + 1000);
    expect(ctrl.activeBreaks()).toEqual([]);
    expect(fx.breakEnd).toHaveBeenCalledTimes(1);
  });

  it('changing a rule restarts only that lane', () => {
    const { ctrl, store } = setup();
    ctrl.start(T0);
    const before = store.get().settings;
    store.update((d) => void (d.settings.eyeRule = '30-30-30'), ['settings']);
    ctrl.settingsChanged(before, T0 + 5 * MIN);
    expect(ctrl.stateOf('eye', T0 + 5 * MIN)!.remaining).toBe(30 * MIN);
    expect(ctrl.stateOf('body', T0 + 5 * MIN)!.remaining).toBe(15 * MIN);
  });

  describe('ring until answered', () => {
    it('holds the break until answered, then counts down from the answer', () => {
      const { ctrl, fx, store, run } = setup({ ringUntilAnswered: true });
      ctrl.start(T0);
      run(1000, 22 * MIN);
      const [b] = ctrl.activeBreaks();
      expect(b).toMatchObject({ lane: 'eye', ringing: true });
      expect(breakLeft(b, T0 + 22 * MIN)).toBe(20_000);
      expect(ctrl.stateOf('eye', T0 + 22 * MIN)).toMatchObject({ elapsed: 0 });
      expect(store.get().log.filter((e) => e.kind === 'break')).toEqual([]);

      ctrl.answer(undefined, T0 + 22 * MIN);
      expect(fx.breakAnswered).toHaveBeenCalledTimes(1);
      expect(ctrl.activeBreaks()[0]).toMatchObject({ ringing: false, start: T0 + 22 * MIN, end: T0 + 22 * MIN + 20_000 });
      run(22 * MIN + 1000, 22 * MIN + 21_000);
      expect(store.get().log.filter((e) => e.kind === 'break')).toEqual([expect.objectContaining({ lane: 'eye', status: 'done', sec: 20, t: T0 + 22 * MIN })]);
      // The next eye break is 20 min after this one ended, not after the original slot.
      expect(ctrl.stateOf('eye', T0 + 22 * MIN + 21_000)).toMatchObject({ elapsed: 1000 });
    });

    it('gives up after RING_MAX, logs missed and carries on', () => {
      const { ctrl, store, run } = setup({ ringUntilAnswered: true });
      ctrl.start(T0);
      run(1000, 20 * MIN + RING_MAX);
      expect(ctrl.activeBreaks().filter((b) => b.lane === 'eye')).toEqual([]);
      expect(store.get().log.find((e) => e.lane === 'eye')).toMatchObject({ status: 'missed', sec: 0 });
      expect(ctrl.stateOf('eye', T0 + 20 * MIN + RING_MAX)).toMatchObject({ elapsed: 0, phase: expect.objectContaining({ kind: 'work' }) });
    });

    it('pre-schedules repeat chimes after each break and drops them once answered', () => {
      const { ctrl, fx, run } = setup({ ringUntilAnswered: true, bodyRule: 'off' });
      ctrl.start(T0);
      const first = (fx.tones as ReturnType<typeof vi.fn>).mock.lastCall![0] as { at: number; tone: string }[];
      expect(first.filter((e) => e.at > T0 + 20 * MIN && e.at < T0 + 20 * MIN + RING_MAX)).toHaveLength(RING_MAX / RING_EVERY - 1);
      expect(first.some((e) => e.tone === 'end')).toBe(false);
      run(1000, 20 * MIN + 30_000);
      ctrl.answer(undefined, T0 + 20 * MIN + 30_000);
      const after = (fx.tones as ReturnType<typeof vi.fn>).mock.lastCall![0] as { at: number; tone: string }[];
      expect(after[0]).toEqual({ at: T0 + 20 * MIN + 50_000, tone: 'end' });
      expect(after[1].at).toBe(T0 + 40 * MIN + 50_000);
    });

    it('done and snooze work on a ringing break; a break you start yourself does not ring', () => {
      const { ctrl, store, run } = setup({ ringUntilAnswered: true });
      ctrl.start(T0);
      run(1000, 20 * MIN + 5000);
      ctrl.done('eye', T0 + 20 * MIN + 5000);
      expect(store.get().log.find((e) => e.lane === 'eye')).toMatchObject({ status: 'done', sec: 0 });
      ctrl.breakNow('eye', T0 + 21 * MIN);
      expect(ctrl.activeBreaks().find((b) => b.lane === 'eye')).toMatchObject({ ringing: false });
    });
  });
});
