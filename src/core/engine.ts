import type { Phase } from './types';

/**
 * Cycle math. A lane is a repeating list of phases plus an anchor (epoch ms where position 0 is).
 * Everything is derived from the clock, so throttled background tabs, sleep and reloads can't drift it.
 */

export const cycleMs = (phases: Phase[]) => phases.reduce((sum, p) => sum + p.sec * 1000, 0);

/** Offset (ms) of a phase's start within the cycle. */
export const phaseOffset = (phases: Phase[], index: number) => phases.slice(0, index).reduce((sum, p) => sum + p.sec * 1000, 0);

export interface PhaseState {
  /** Which repetition of the cycle (can be negative if the anchor is in the future). */
  cycle: number;
  index: number;
  phase: Phase;
  /** Absolute start/end of this phase (epoch ms). */
  start: number;
  end: number;
  elapsed: number;
  remaining: number;
  /** 0..1 through this phase. */
  progress: number;
  /** 0..1 through the whole cycle. */
  cycleProgress: number;
}

export function phaseAt(phases: Phase[], anchor: number, now: number): PhaseState {
  const total = cycleMs(phases);
  const t = now - anchor;
  const cycle = Math.floor(t / total);
  const cycleStart = anchor + cycle * total;
  let pos = t - cycle * total;
  let start = cycleStart;
  for (let i = 0; i < phases.length; i++) {
    const d = phases[i].sec * 1000;
    if (pos < d || i === phases.length - 1) {
      return {
        cycle,
        index: i,
        phase: phases[i],
        start,
        end: start + d,
        elapsed: pos,
        remaining: start + d - now,
        progress: d ? Math.min(1, pos / d) : 1,
        cycleProgress: (now - cycleStart) / total,
      };
    }
    pos -= d;
    start += d;
  }
  throw new Error('empty phase list');
}

/** Identifies one occurrence of a phase, to detect transitions between ticks. */
export const phaseKey = (s: PhaseState) => `${s.cycle}:${s.index}`;

/** Anchor that puts `now` exactly `intoMs` into phase `index`. */
export const anchorFor = (phases: Phase[], now: number, index: number, intoMs = 0) => now - phaseOffset(phases, index) - intoMs;

/**
 * Anchor that makes phase `index` start `inMs` from now (used for snooze).
 * Capped at the phase's own offset so a long snooze can't wrap back into an earlier break.
 */
export function anchorStartingIn(phases: Phase[], now: number, index: number, inMs: number) {
  const offset = phaseOffset(phases, index);
  return now + Math.min(inMs, offset) - offset;
}

export interface Upcoming {
  at: number;
  index: number;
  phase: Phase;
}

/** Phase starts in (from, until], in order. */
export function upcoming(phases: Phase[], anchor: number, from: number, until: number): Upcoming[] {
  const out: Upcoming[] = [];
  const total = cycleMs(phases);
  if (total <= 0) return out;
  let cycleStart = anchor + Math.floor((from - anchor) / total) * total;
  while (cycleStart <= until) {
    let at = cycleStart;
    for (let i = 0; i < phases.length; i++) {
      if (at > from && at <= until) out.push({ at, index: i, phase: phases[i] });
      at += phases[i].sec * 1000;
    }
    cycleStart += total;
  }
  return out;
}

/** Time until the next phase of a kind starts, or 0 if one is running now. */
export function untilNext(phases: Phase[], anchor: number, now: number, kind: Phase['kind']): number {
  const cur = phaseAt(phases, anchor, now);
  if (cur.phase.kind === kind) return 0;
  const next = upcoming(phases, anchor, now, now + cycleMs(phases) + 1).find((u) => u.phase.kind === kind);
  return next ? next.at - now : Infinity;
}
