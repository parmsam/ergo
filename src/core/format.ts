/** 75_000 → "1:15"; 3_700_000 → "1:01:40". Rounds up so a countdown never shows 0:00 early. */
export function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** 5_400 → "1h 30m"; 300 → "5m"; 40 → "40s". */
export function duration(sec: number) {
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function timeOfDay(t: number) {
  return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const pct = (v: number | null) => (v == null ? '–' : `${Math.round(v * 100)}%`);
