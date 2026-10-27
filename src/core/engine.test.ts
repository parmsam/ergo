import { describe, expect, it } from 'vitest';
import { anchorFor, anchorStartingIn, cycleMs, phaseAt, phaseKey, untilNext, upcoming } from './engine';
import type { Phase } from './types';

const MIN = 60_000;
const p2082: Phase[] = [
  { kind: 'work', sec: 1200, label: 'Sit' },
  { kind: 'cue', sec: 480, label: 'Stand' },
  { kind: 'break', sec: 120, label: 'Move' },
];

describe('phaseAt', () => {
  it('finds the phase and remaining time from the anchor', () => {
    const s = phaseAt(p2082, 0, 25 * MIN);
    expect(s.phase.label).toBe('Stand');
    expect(s.remaining).toBe(3 * MIN);
    expect(s.cycle).toBe(0);
  });

  it('wraps into later cycles', () => {
    const s = phaseAt(p2082, 0, 30 * MIN + 1000);
    expect(s.index).toBe(0);
    expect(s.cycle).toBe(1);
    expect(s.start).toBe(30 * MIN);
  });

  it('handles an anchor in the future (after a snooze) by wrapping backwards', () => {
    const s = phaseAt(p2082, 10 * MIN, 5 * MIN);
    expect(s.cycle).toBe(-1);
    expect(s.phase.label).toBe('Stand');
  });

  it('gives distinct keys per occurrence', () => {
    expect(phaseKey(phaseAt(p2082, 0, 1000))).not.toBe(phaseKey(phaseAt(p2082, 0, 30 * MIN + 1000)));
  });
});

describe('anchors', () => {
  it('anchorFor puts now at the start of a phase', () => {
    const now = 1_000_000;
    const s = phaseAt(p2082, anchorFor(p2082, now, 2), now);
    expect(s.phase.label).toBe('Move');
    expect(s.elapsed).toBe(0);
  });

  it('anchorStartingIn makes a break start after the snooze', () => {
    const now = 5_000_000;
    const a = anchorStartingIn(p2082, now, 2, 5 * MIN);
    expect(phaseAt(p2082, a, now).phase.label).toBe('Stand');
    expect(phaseAt(p2082, a, now + 5 * MIN).phase.label).toBe('Move');
  });

  it('caps a snooze longer than the phases before the break', () => {
    const eye: Phase[] = [
      { kind: 'work', sec: 120, label: 'Work' },
      { kind: 'break', sec: 20, label: 'Look' },
    ];
    const now = 10 * MIN;
    const a = anchorStartingIn(eye, now, 1, 5 * MIN);
    expect(phaseAt(eye, a, now).phase.kind).toBe('work');
  });
});

describe('upcoming / untilNext', () => {
  it('lists phase starts in a window', () => {
    const u = upcoming(p2082, 0, 0, 60 * MIN);
    expect(u.map((x) => x.at / MIN)).toEqual([20, 28, 30, 50, 58, 60]);
  });

  it('measures time to the next break', () => {
    expect(untilNext(p2082, 0, 10 * MIN, 'break')).toBe(18 * MIN);
    expect(untilNext(p2082, 0, 29 * MIN, 'break')).toBe(0);
    expect(cycleMs(p2082)).toBe(30 * MIN);
  });
});
