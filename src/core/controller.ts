import { anchorFor, anchorStartingIn, phaseAt, phaseKey, upcoming, type PhaseState } from './engine';
import { nudgePhases, ruleFor } from './rules';
import { dayKey, skipRun } from './stats';
import type { Store } from './store';
import type { Tone } from './audio';
import type { LaneId, LogEntry, NudgeId, Phase, Settings, Status } from './types';

export interface Lane {
  id: LaneId;
  rule: string;
  phases: Phase[];
}

export interface ActiveBreak {
  lane: LaneId;
  rule: string;
  phase: Phase;
  index: number;
  start: number;
  end: number;
  /** The overlay was on screen, or a notification was clicked. */
  seen: boolean;
  /** Recent breaks on this lane were skipped; show it more prominently. */
  escalated: boolean;
}

export interface ActiveCue {
  lane: LaneId;
  phase: Phase;
  start: number;
  end: number;
}

export interface Effects {
  breakStart(b: ActiveBreak): void;
  breakEnd(b: ActiveBreak, status: Status, auto: boolean): void;
  cue(c: ActiveCue): void;
  cueEnd(lane: LaneId): void;
  away(ms: number): void;
  tones(events: { at: number; tone: Tone }[]): void;
  tick(now: number): void;
}

export function lanesFor(s: Settings): Lane[] {
  const eye = ruleFor(s, 'eye');
  const body = ruleFor(s, 'body');
  const out: Lane[] = [
    { id: 'eye', rule: eye.id, phases: eye.phases },
    { id: 'body', rule: body.id, phases: body.phases },
  ];
  for (const id of Object.keys(s.nudges) as NudgeId[]) {
    if (s.nudges[id].on) out.push({ id, rule: id, phases: nudgePhases(id, s.nudges[id].everyMin) });
  }
  return out;
}

const TONE_HORIZON = 30 * 60_000;
const FLUSH_MS = 15_000;

export function createController(store: Store, fx: Effects) {
  /** Phase occurrence each lane was in at the last tick. */
  const prev = new Map<LaneId, string>();
  const active = new Map<LaneId, ActiveBreak>();
  const cues = new Map<LaneId, ActiveCue>();
  let lastTick: number | null = null;
  let lastFlush = 0;
  let lastToneSchedule = 0;
  let pendingActive = 0;

  const settings = () => store.get().settings;
  const session = () => store.get().session;
  const lanes = () => lanesFor(settings());
  const lane = (id: LaneId) => lanes().find((l) => l.id === id);
  /** The clock the cycles read: frozen while paused. */
  const effectiveNow = (now = Date.now()) => session().pausedAt ?? now;

  function stateOf(id: LaneId, now = Date.now()): PhaseState | null {
    const l = lane(id);
    const anchor = session().anchors[id];
    if (!l || anchor == null) return null;
    return phaseAt(l.phases, anchor, effectiveNow(now));
  }

  function setAnchors(next: Partial<Record<LaneId, number>>) {
    store.update((d) => Object.assign(d.session.anchors, next), ['session']);
  }

  /** Record current phase keys without firing transitions (after a deliberate jump). */
  function sync(now: number) {
    prev.clear();
    for (const l of lanes()) {
      const s = stateOf(l.id, now);
      if (s) prev.set(l.id, phaseKey(s));
    }
  }

  function log(e: LogEntry) {
    store.update((d) => void d.log.push(e), ['log']);
  }

  function flush(now: number) {
    const add = Math.round(pendingActive / 1000);
    pendingActive -= add * 1000;
    store.update(
      (d) => {
        d.session.lastTick = now;
        if (add > 0) {
          const k = dayKey(now);
          d.days[k] = { activeSec: (d.days[k]?.activeSec ?? 0) + add };
        }
      },
      ['session', 'days'],
    );
    lastFlush = now;
  }

  function scheduleTones(now = Date.now()) {
    lastToneSchedule = now;
    const s = session();
    if (!settings().sound || !s.running || s.pausedAt) return fx.tones([]);
    const events: { at: number; tone: Tone }[] = [];
    for (const l of lanes()) {
      const anchor = s.anchors[l.id];
      if (anchor == null) continue;
      for (const u of upcoming(l.phases, anchor, now, now + TONE_HORIZON)) {
        const before = l.phases[(u.index - 1 + l.phases.length) % l.phases.length];
        if (u.phase.kind === 'break') events.push({ at: u.at, tone: l.id === 'eye' ? 'eye' : 'body' });
        else if (u.phase.kind === 'cue') events.push({ at: u.at, tone: 'cue' });
        else if (before.kind === 'break') events.push({ at: u.at, tone: 'end' });
      }
    }
    // Two lanes landing on the same moment play one chime; a body break outranks an eye break.
    const rank: Record<Tone, number> = { body: 3, eye: 2, end: 1, cue: 0 };
    events.sort((a, b) => a.at - b.at || rank[b.tone] - rank[a.tone]);
    fx.tones(events.filter((e, i) => i === 0 || e.at - events[i - 1].at > 1500));
  }

  function beginBreak(l: Lane, s: PhaseState) {
    const b: ActiveBreak = {
      lane: l.id,
      rule: l.rule,
      phase: s.phase,
      index: s.index,
      start: s.start,
      end: s.end,
      seen: false,
      escalated: settings().escalate && skipRun(store.get().log, l.id) >= 2,
    };
    active.set(l.id, b);
    fx.breakStart(b);
  }

  function finalize(id: LaneId, status: Status | undefined, now: number) {
    const b = active.get(id);
    if (!b) return;
    active.delete(id);
    const auto = status === undefined;
    const final: Status = status ?? (settings().trustBreaks || b.seen ? 'done' : 'missed');
    log({ t: b.start, lane: id, rule: b.rule, kind: 'break', status: final, sec: Math.max(0, Math.round((Math.min(now, b.end) - b.start) / 1000)) });
    fx.breakEnd(b, final, auto);
    // Moving around means you looked away too: restart the eye cycle so the next eye break isn't seconds away.
    if (id === 'body' && final === 'done' && settings().bodyResetsEye && session().anchors.eye != null) {
      if (active.has('eye')) finalize('eye', 'done', now);
      const eye = lane('eye')!;
      setAnchors({ eye: anchorFor(eye.phases, now, 0) });
      const st = stateOf('eye', now);
      if (st) prev.set('eye', phaseKey(st));
    }
  }

  function endCue(id: LaneId) {
    if (cues.delete(id)) fx.cueEnd(id);
  }

  function away(now: number, gap: number) {
    for (const id of [...active.keys()]) finalize(id, 'done', now);
    for (const id of [...cues.keys()]) endCue(id);
    const fresh: Partial<Record<LaneId, number>> = {};
    for (const l of lanes()) fresh[l.id] = now;
    setAnchors(fresh);
    sync(now);
    fx.away(gap);
    scheduleTones(now);
  }

  function tick(now = Date.now()) {
    const s = session();
    if (!s.running) return fx.tick(now);
    if (s.pausedAt != null) {
      if (s.pausedUntil != null && now >= s.pausedUntil) resume(now);
      else return fx.tick(now);
    }
    const last = lastTick ?? session().lastTick;
    lastTick = now;
    const gap = last ? now - last : 0;
    if (gap > settings().awayMin * 60_000) return away(now, gap);
    pendingActive += Math.max(0, gap);

    for (const l of lanes()) {
      const anchor = session().anchors[l.id];
      if (anchor == null) {
        setAnchors({ [l.id]: now }); // a nudge just switched on
        continue;
      }
      const cur = phaseAt(l.phases, anchor, now);
      const key = phaseKey(cur);
      const before = prev.get(l.id);
      if (before === key) continue;
      prev.set(l.id, key);

      // Breaks that started and ended between two ticks (a stalled tab) still get logged.
      if (before !== undefined && last) {
        for (const u of upcoming(l.phases, anchor, last, now)) {
          if (u.phase.kind === 'break' && u.at + u.phase.sec * 1000 <= now && u.at !== cur.start)
            log({ t: u.at, lane: l.id, rule: l.rule, kind: 'break', status: settings().trustBreaks ? 'done' : 'missed', sec: u.phase.sec });
        }
      }
      if (active.has(l.id)) finalize(l.id, undefined, now);
      if (cues.has(l.id)) endCue(l.id);

      if (cur.phase.kind === 'break') beginBreak(l, cur);
      else if (cur.phase.kind === 'cue' && (before !== undefined || cur.elapsed < 60_000)) {
        const c: ActiveCue = { lane: l.id, phase: cur.phase, start: cur.start, end: cur.end };
        cues.set(l.id, c);
        log({ t: cur.start, lane: l.id, rule: l.rule, kind: 'cue', status: 'shown', sec: 0 });
        fx.cue(c);
      }
    }

    if (now - lastFlush >= FLUSH_MS) flush(now);
    if (now - lastToneSchedule >= 10 * 60_000) scheduleTones(now);
    fx.tick(now);
  }

  function start(now = Date.now()) {
    const anchors: Partial<Record<LaneId, number>> = {};
    for (const l of lanes()) anchors[l.id] = now;
    store.update((d) => {
      d.session = { running: true, pausedAt: null, pausedUntil: null, anchors, lastTick: now };
    }, ['session']);
    lastTick = now;
    sync(now);
    scheduleTones(now);
    fx.tick(now);
  }

  function stop(now = Date.now()) {
    for (const id of [...active.keys()]) finalize(id, undefined, now);
    for (const id of [...cues.keys()]) endCue(id);
    flush(now);
    store.update((d) => {
      d.session = { ...d.session, running: false, pausedAt: null, pausedUntil: null, lastTick: null };
    }, ['session']);
    lastTick = null;
    prev.clear();
    fx.tones([]);
    fx.tick(now);
  }

  function pause(minutes: number | null, now = Date.now()) {
    if (!session().running || session().pausedAt != null) return;
    for (const id of [...active.keys()]) finalize(id, undefined, now);
    for (const id of [...cues.keys()]) endCue(id);
    flush(now);
    store.update((d) => {
      d.session.pausedAt = now;
      d.session.pausedUntil = minutes ? now + minutes * 60_000 : null;
    }, ['session']);
    fx.tones([]);
    fx.tick(now);
  }

  function resume(now = Date.now()) {
    const s = session();
    if (s.pausedAt == null) return;
    const shift = now - s.pausedAt;
    store.update((d) => {
      for (const k of Object.keys(d.session.anchors) as LaneId[]) d.session.anchors[k]! += shift;
      d.session.pausedAt = null;
      d.session.pausedUntil = null;
      d.session.lastTick = now;
    }, ['session']);
    lastTick = now;
    sync(now);
    scheduleTones(now);
    fx.tick(now);
  }

  /** Move a lane to the start of phase `index` and swallow the transition (the caller handles effects). */
  function jump(id: LaneId, index: number, now: number) {
    const l = lane(id);
    if (!l) return;
    setAnchors({ [id]: anchorFor(l.phases, now, index % l.phases.length) });
    const st = stateOf(id, now);
    if (st) prev.set(id, phaseKey(st));
  }

  /** Finish (done/skip) the given or all active breaks and move on to the next phase. */
  function resolve(status: 'done' | 'skipped', id?: LaneId, now = Date.now()) {
    const ids = id ? [id] : [...active.keys()];
    for (const lid of ids) {
      const b = active.get(lid);
      if (!b) continue;
      finalize(lid, status, now);
      jump(lid, b.index + 1, now);
    }
    scheduleTones(now);
    fx.tick(now);
  }

  function snooze(minutes: number, id?: LaneId, now = Date.now()) {
    const ids = id ? [id] : [...active.keys()];
    for (const lid of ids) {
      const b = active.get(lid);
      const l = lane(lid);
      if (!b || !l) continue;
      finalize(lid, 'snoozed', now);
      setAnchors({ [lid]: anchorStartingIn(l.phases, now, b.index, minutes * 60_000) });
      const st = stateOf(lid, now);
      if (st) prev.set(lid, phaseKey(st));
    }
    scheduleTones(now);
    fx.tick(now);
  }

  /** Start a lane's break right now. */
  function breakNow(id: LaneId, now = Date.now()) {
    const l = lane(id);
    if (!l || !session().running || session().pausedAt != null) return;
    const idx = l.phases.findIndex((p) => p.kind === 'break');
    if (idx < 0) return;
    if (active.has(id)) return;
    endCue(id);
    setAnchors({ [id]: anchorFor(l.phases, now, idx) });
    prev.delete(id);
    tick(now);
    scheduleTones(now);
  }

  /** "I'm standing" on a body cue. */
  function ackCue(id: LaneId) {
    const c = cues.get(id);
    if (!c) return;
    store.update((d) => {
      for (let i = d.log.length - 1; i >= 0; i--) {
        const e = d.log[i];
        if (e.lane === id && e.kind === 'cue' && e.t === c.start) {
          e.status = 'done';
          break;
        }
      }
    }, ['log']);
    endCue(id);
  }

  function markSeen(id?: LaneId) {
    for (const [lid, b] of active) if (!id || lid === id) b.seen = true;
  }

  /** After settings change: lanes whose rule changed (or were toggled on) restart from the top. */
  function settingsChanged(before: Settings, now = Date.now()) {
    const oldLanes = new Map(lanesFor(before).map((l) => [l.id, l]));
    const fresh: Partial<Record<LaneId, number>> = {};
    for (const l of lanes()) {
      const o = oldLanes.get(l.id);
      if (!o || JSON.stringify(o.phases) !== JSON.stringify(l.phases)) {
        if (active.has(l.id)) finalize(l.id, 'skipped', now);
        endCue(l.id);
        fresh[l.id] = effectiveNow(now);
      }
    }
    for (const id of oldLanes.keys()) if (!lanes().some((l) => l.id === id)) endCue(id);
    if (Object.keys(fresh).length && session().running) {
      setAnchors(fresh);
      sync(now);
    }
    scheduleTones(now);
    fx.tick(now);
  }

  return {
    tick,
    start,
    stop,
    pause,
    resume,
    breakNow,
    done: (id?: LaneId, now?: number) => resolve('done', id, now),
    skip: (id?: LaneId, now?: number) => resolve('skipped', id, now),
    snooze,
    ackCue,
    markSeen,
    settingsChanged,
    scheduleTones,
    lanes,
    stateOf,
    effectiveNow,
    activeBreaks: () => [...active.values()],
    activeCues: () => [...cues.values()],
  };
}

export type Controller = ReturnType<typeof createController>;
