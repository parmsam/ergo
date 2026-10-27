/**
 * Soft chimes generated in code (no audio files). Sounds for upcoming breaks are scheduled ahead on the
 * AudioContext clock, which keeps time precisely even when the browser throttles background-tab timers.
 */
export type Tone = 'eye' | 'body' | 'cue' | 'end';

let ctx: AudioContext | null = null;
let scheduled: AudioScheduledSourceNode[] = [];
/** Epoch times of chimes queued on the audio clock, so the page doesn't play them a second time. */
let queuedAt: number[] = [];

/** Must be called from a user gesture once (browsers block audio until then). */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export const audioReady = () => ctx?.state === 'running';

const NOTES: Record<Tone, number[]> = {
  eye: [659.25, 987.77], // E5 → B5, bright and short
  body: [523.25, 659.25, 783.99], // C5 E5 G5, a little longer
  cue: [587.33], // D5, a single soft ding
  end: [783.99, 523.25], // G5 → C5, "back to it"
};

function bell(freq: number, at: number, volume: number) {
  if (!ctx) return;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25 * volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
  gain.connect(ctx.destination);
  // A sine plus a quiet overtone reads as a bell rather than a beep.
  for (const [mult, level] of [
    [1, 1],
    [2.76, 0.18],
  ] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(at);
    osc.stop(at + 1.7);
    scheduled.push(osc);
    osc.onended = () => (scheduled = scheduled.filter((n) => n !== osc));
  }
}

function playAt(tone: Tone, at: number, volume: number) {
  NOTES[tone].forEach((f, i) => bell(f, at + i * 0.18, volume));
}

export function playNow(tone: Tone, volume: number) {
  unlockAudio();
  manualUntil = Date.now() + TAIL;
  syncSession(Date.now());
  if (ctx) playAt(tone, ctx.currentTime + 0.02, volume);
  setTimeout(() => syncSession(Date.now()), TAIL + 100);
}

/** Replace all pending chimes with these (epoch ms). Past or far-future events are ignored. */
export function scheduleTones(events: { at: number; tone: Tone }[], volume: number) {
  cancelTones();
  if (!ctx || ctx.state !== 'running') return;
  const now = Date.now();
  for (const e of events) {
    const inSec = (e.at - now) / 1000;
    if (inSec > 0.05 && inSec < 3600) {
      playAt(e.tone, ctx.currentTime + inSec, volume);
      queuedAt.push(e.at);
    }
  }
}

export const wasScheduled = (at: number) => queuedAt.some((t) => Math.abs(t - at) < 1500);

/*
 * iPhone silent switch. Safari (iOS 17+) exposes navigator.audioSession; type "playback" plays
 * through the silent switch, like a real timer app. It can also pause other audio (music), so
 * ergo only holds it from just before a chime until just after, then hands back "auto".
 */
type AudioSession = { type: string };
const audioSession = () => (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
export const canRingWhenSilenced = () => !!audioSession();

/** Hold the playback session from LEAD ms before a chime until TAIL ms after it starts. */
const LEAD = 2500;
const TAIL = 2500;
export const sessionTypeFor = (chimes: number[], now: number) =>
  chimes.some((t) => now >= t - LEAD && now <= t + TAIL) ? 'playback' : 'auto';

let ringWhenSilenced = true;
let manualUntil = 0;
export function setRingWhenSilenced(on: boolean) {
  ringWhenSilenced = on;
  syncSession(Date.now());
}

/** Called every tick: switch the session to "playback" around queued chimes, "auto" otherwise. */
export function syncSession(now: number) {
  const session = audioSession();
  if (!session) return;
  const want = ringWhenSilenced && (now < manualUntil || sessionTypeFor(queuedAt, now) === 'playback') ? 'playback' : 'auto';
  if (session.type === want) return;
  try {
    session.type = want;
  } catch {
    /* unsupported value in this browser */
  }
}

export function cancelTones() {
  // Keep recent entries: a chime that already played still counts as played.
  const now = Date.now();
  queuedAt = queuedAt.filter((t) => t <= now && now - t < 10_000);
  for (const n of scheduled) {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
  }
  scheduled = [];
}
