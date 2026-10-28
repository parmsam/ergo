/** The two main break tracks. Each runs its own repeating cycle of phases. */
export type TrackId = 'eye' | 'body';
/** Lightweight cue-only reminders that run alongside the tracks. */
export type NudgeId = 'posture' | 'snack';
export type LaneId = TrackId | NudgeId;

/**
 * work: you're at the screen, counting down to the next cue/break.
 * cue: a prompt to change something without stopping (e.g. "stand up for 8 min"). Notifies, no overlay.
 * break: step away / look away. Shows the break overlay and is tracked for adherence.
 */
export type PhaseKind = 'work' | 'cue' | 'break';

/** How well a rule is supported. See evidence/README.md for the grading scale. */
export type Strength = 'strong' | 'moderate' | 'observational' | 'limited' | 'expert';

/** What a cue/break asks you to do; picks the animation and exercises shown. */
export type Focus = 'far' | 'eyes' | 'stretch' | 'walk' | 'active' | 'stand' | 'blink' | 'posture';

export interface Phase {
  kind: PhaseKind;
  sec: number;
  label: string;
  prompt?: string;
  focus?: Focus;
}

export interface Rule {
  id: string;
  track: TrackId;
  name: string;
  /** One line, e.g. "Every 20 min, look 20 ft away for 20 s". */
  tagline: string;
  summary: string;
  phases: Phase[];
  strength: Strength;
  /** Slug of the file in evidence/ that backs this rule. */
  evidence: string;
}

export interface Settings {
  eyeRule: string;
  bodyRule: string;
  custom: {
    eye: { workMin: number; breakSec: number };
    body: { sitMin: number; standMin: number; moveMin: number };
  };
  nudges: Record<NudgeId, { on: boolean; everyMin: number }>;
  sound: boolean;
  volume: number;
  /** iPhone/iPad: play chimes even with the silent switch on (Safari's Audio Session API). */
  ringWhenSilenced: boolean;
  notify: boolean;
  /** Count a break as done when it runs out without being skipped (you may be looking away, not clicking). */
  trustBreaks: boolean;
  /** A completed body break also restarts the eye timer, since you looked away while moving. */
  bodyResetsEye: boolean;
  /**
   * A gap this long between the app's own ticks (laptop asleep, lid closed) restarts the cycles.
   * This is the only "away" signal: ergo never monitors keyboard, mouse or system activity.
   */
  awayMin: number;
  /** Make the next break more prominent after repeated skips. */
  escalate: boolean;
  /** Breaks keep chiming, and wait, until you respond (or RING_MAX passes). */
  ringUntilAnswered: boolean;
  overlay: 'full' | 'card';
  theme: 'auto' | 'dark' | 'light';
  autoStart: boolean;
  /** Daily adherence goal, used for streaks. */
  goalPct: number;
  /** Daily sitting budget in hours (Canadian 24-Hour Movement Guidelines: 8 h or less). 0 hides it. */
  sitBudgetH: number;
}

export interface Session {
  running: boolean;
  pausedAt: number | null;
  /** Auto-resume time for a timed pause (meetings). */
  pausedUntil: number | null;
  /** Epoch ms where each lane's cycle position is 0. Positions are derived from Date.now(), never counted down. */
  anchors: Partial<Record<LaneId, number>>;
  /** Last time the tick loop ran, to detect sleep / long absences. */
  lastTick: number | null;
}

export type Status = 'done' | 'skipped' | 'missed' | 'snoozed' | 'shown';

export interface LogEntry {
  /** When the break/cue started (epoch ms). */
  t: number;
  lane: LaneId;
  rule: string;
  kind: 'break' | 'cue';
  status: Status;
  /** Seconds actually spent (for breaks). */
  sec: number;
}

export interface DayTotals {
  /** Seconds the reminders were running (not paused) — a proxy for screen time. */
  activeSec: number;
}
