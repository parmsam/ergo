import type { DayTotals, LogEntry, NudgeId, Session, Settings } from './types';

/** All persistence goes through here. Keys are namespaced and versioned; every access tolerates a broken or missing store. */
const NS = 'ergo:v1:';

export const DEFAULT_SETTINGS: Settings = {
  eyeRule: '20-20-20',
  bodyRule: '20-8-2',
  custom: {
    eye: { workMin: 20, breakSec: 20 },
    body: { sitMin: 25, standMin: 0, moveMin: 5 },
  },
  nudges: {
    posture: { on: true, everyMin: 15 },
    snack: { on: false, everyMin: 120 },
  },
  sound: true,
  volume: 0.6,
  notify: true,
  trustBreaks: true,
  bodyResetsEye: true,
  awayMin: 5,
  escalate: true,
  overlay: 'full',
  theme: 'auto',
  autoStart: false,
  goalPct: 70,
  sitBudgetH: 8,
};

export const DEFAULT_SESSION: Session = { running: false, pausedAt: null, pausedUntil: null, anchors: {}, lastTick: null };

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep running from memory */
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}

/** Fill in missing fields (new settings added in later versions) without dropping the user's values. */
export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    custom: {
      eye: { ...DEFAULT_SETTINGS.custom.eye, ...s.custom?.eye },
      body: { ...DEFAULT_SETTINGS.custom.body, ...s.custom?.body },
    },
    nudges: Object.fromEntries(
      (Object.keys(DEFAULT_SETTINGS.nudges) as NudgeId[]).map((k) => [k, { ...DEFAULT_SETTINGS.nudges[k], ...s.nudges?.[k] }]),
    ) as Settings['nudges'],
  };
}

/** Log entries older than this are dropped on load. */
export const KEEP_DAYS = 120;

export interface Persisted {
  settings: Settings;
  session: Session;
  log: LogEntry[];
  days: Record<string, DayTotals>;
  checklist: Record<string, boolean>;
}

export function loadAll(now = Date.now()): Persisted {
  const cutoff = now - KEEP_DAYS * 86_400_000;
  const log = read<LogEntry[]>('log', []);
  return {
    settings: mergeSettings(read<Partial<Settings>>('settings', {})),
    session: { ...DEFAULT_SESSION, ...read<Partial<Session>>('session', {}) },
    log: Array.isArray(log) ? log.filter((e) => e && typeof e.t === 'number' && e.t >= cutoff) : [],
    days: read<Record<string, DayTotals>>('days', {}),
    checklist: read<Record<string, boolean>>('checklist', {}),
  };
}

/** JSON backup of everything, for moving between browsers. */
export function exportBackup(p: Persisted) {
  return JSON.stringify({ app: 'ergo', version: 1, exportedAt: new Date().toISOString(), ...p, session: undefined }, null, 2);
}

export function parseBackup(text: string): Omit<Persisted, 'session'> {
  const data = JSON.parse(text) as Partial<Persisted> & { app?: string };
  if (data.app !== 'ergo') throw new Error('Not an ergo backup');
  return {
    settings: mergeSettings(data.settings),
    log: Array.isArray(data.log) ? data.log : [],
    days: data.days ?? {},
    checklist: data.checklist ?? {},
  };
}
