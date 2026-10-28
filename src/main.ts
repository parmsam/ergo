import './styles.css';
import { audioReady, playNow, scheduleTones, setRingWhenSilenced, syncSession, unlockAudio, wasScheduled } from './core/audio';
import { coach } from './core/coach';
import { createController, type ActiveBreak } from './core/controller';
import { clock } from './core/format';
import { NUDGES, trackOn } from './core/rules';
import { dayKey, skipRun, summarize } from './core/stats';
import { createStore } from './core/store';
import { closeNotifications, notify, notifyGranted, requestNotify } from './core/notify';
import type { LaneId, NudgeId, Settings } from './core/types';
import type { AppCtx, View } from './ui/ctx';
import { $ } from './ui/dom';
import { bindGuide, renderGuide } from './ui/guide';
import { icons, logo } from './ui/icons';
import { createFullscreenButton, fullscreenSupported } from './ui/fullscreen';
import { createOverlay } from './ui/overlay';
import { createPip, pipSupported, type PipState } from './ui/pip';
import { setupPwa } from './ui/pwa';
import { bindSettings, renderSettings } from './ui/settings';
import { bindStats, renderStats } from './ui/stats';
import { dismissToast, toast } from './ui/toast';
import { bindToday, laneView, renderToday, tickToday } from './ui/today';

const store = createStore();
const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: icons.home },
  { id: 'stats', label: 'Progress', icon: icons.chart },
  { id: 'guide', label: 'Guide', icon: icons.book },
  { id: 'settings', label: 'Settings', icon: icons.gear },
];
const viewFromHash = (): View => (VIEWS.find((v) => `#${v.id}` === location.hash)?.id ?? 'today');
let view: View = viewFromHash();

const LANE_TITLE: Record<LaneId, string> = { eye: 'Eye break', body: 'Body break', posture: NUDGES.posture.name, snack: NUDGES.snack.name };

function coachLine(b: ActiveBreak) {
  const { log, days, checklist, settings } = store.get();
  const today = summarize(log, days, dayKey(Date.now()));
  return coach({ today, skips: { eye: skipRun(log, 'eye'), body: skipRun(log, 'body') }, checklist, activeMin: today.activeSec / 60, sitBudgetH: settings.sitBudgetH, seed: b.start }).text;
}

/** Play a chime now unless one was already scheduled on the audio clock for this moment. */
function chimeIfMissed(at: number, tone: 'eye' | 'body' | 'cue') {
  const s = store.get().settings;
  if (s.sound && Date.now() - at < 3000 && !wasScheduled(at)) playNow(tone, s.volume);
}

const ctrl = createController(store, {
  breakStart(b) {
    overlay.open();
    chimeIfMissed(b.start, b.lane === 'eye' ? 'eye' : 'body');
    if (store.get().settings.notify && document.visibilityState !== 'visible')
      void notify(`${b.phase.label} · ${LANE_TITLE[b.lane]}`, {
        body: b.phase.prompt ?? '',
        tag: `ergo-${b.lane}`,
        sticky: b.escalated,
        actions: [
          { action: 'done', title: 'Done' },
          { action: 'snooze', title: 'Snooze 5 min' },
        ],
      });
    title();
  },
  breakEnd(b, status) {
    overlay.ended(b, status);
    void closeNotifications(`ergo-${b.lane}`);
    if (view === 'today' || view === 'stats') render(false);
  },
  cue(c) {
    chimeIfMissed(c.start, 'cue');
    const stand = c.lane === 'body';
    const snack = c.lane === 'snack';
    toast(c.phase.prompt ?? c.phase.label, {
      id: `cue-${c.lane}`,
      title: stand ? 'Time to stand' : NUDGES[c.lane as NudgeId]?.name,
      icon: stand ? 'stand' : snack ? 'bolt' : 'posture',
      tone: stand || snack || c.lane === 'posture' ? 'body' : 'eye',
      duration: stand ? 0 : snack ? 60_000 : 12_000,
      actions: stand
        ? [{ label: 'I’m standing', primary: true, run: () => ctrl.ackCue('body') }, { label: 'Not now', run: () => {} }]
        : snack
          ? [{ label: 'Did it', primary: true, run: () => ctrl.ackCue('snack') }, { label: 'Skip', run: () => {} }]
          : [],
    });
    if (store.get().settings.notify && document.visibilityState !== 'visible')
      void notify(stand ? 'Time to stand' : (NUDGES[c.lane as NudgeId]?.name ?? 'ergo'), { body: c.phase.prompt ?? '', tag: `ergo-cue-${c.lane}` });
  },
  cueEnd(lane) {
    dismissToast(`cue-${lane}`);
    if ((lane === 'body' || lane === 'snack') && view === 'today') render(false);
  },
  away(ms) {
    overlay.close();
    toast(`You were away for ${Math.round(ms / 60_000)} min, which counts as a break. Timers restarted.`, { icon: 'check', title: 'Welcome back' });
    render(false);
  },
  tones(events) {
    scheduleTones(events, store.get().settings.volume);
  },
  tick(now) {
    syncSession(now);
    if (view === 'today') tickToday(viewRoot(), app, now);
    overlay.refresh(now);
    pip.update();
    title(now);
  },
});

const overlay = createOverlay({ ctrl, settings: () => store.get().settings, coachLine });

/** Start, pause or resume, from Space or the pop-out. */
function toggleRunning() {
  const s = store.get().session;
  if (!s.running) app.actions.start();
  else if (s.pausedAt) ctrl.resume();
  else ctrl.pause(null);
  render(false);
}

function pipState(): PipState {
  const now = Date.now();
  const s = store.get().session;
  const b = ctrl.activeBreaks().sort((x, y) => y.end - x.end)[0];
  const lanes = (['eye', 'body'] as const).filter((id) => trackOn(store.get().settings, id)).map((id) => {
    const v = laneView(app, id, now);
    return { id, title: id === 'eye' ? 'Eyes' : 'Posture & movement', time: v?.time ?? '–', sub: v?.sub ?? '', frac: v?.frac ?? 0 };
  });
  return {
    running: s.running,
    paused: s.pausedAt != null,
    lanes,
    brk: b && (b.lane === 'eye' || b.lane === 'body') ? { lane: b.lane, label: b.phase.label, time: clock(b.end - now), frac: (b.end - now) / (b.end - b.start) } : null,
  };
}

const pip = createPip({
  getState: pipState,
  toggle: toggleRunning,
  done: () => ctrl.done(),
  skip: () => ctrl.skip(),
  onClose: () => $('[data-act="pip"]')?.setAttribute('aria-pressed', 'false'),
});

function togglePip() {
  if (!pipSupported()) return toast('The pop-out timer works in Chrome and Edge.', { icon: 'bell' });
  pip.toggle();
  $('[data-act="pip"]')?.setAttribute('aria-pressed', String(!pip.isOpen()));
}

const app: AppCtx = {
  store,
  ctrl,
  actions: {
    start() {
      unlockAudio();
      const s = store.get().settings;
      if (s.notify && typeof Notification !== 'undefined' && Notification.permission === 'default') void requestNotify();
      ctrl.start();
      render(false);
    },
  },
  updateSettings(fn: (s: Settings) => void) {
    const before = store.get().settings;
    store.update((d) => fn(d.settings), ['settings']);
    applyTheme();
    applyAudioPrefs();
    ctrl.settingsChanged(before);
    render(false);
  },
  go(v) {
    if (location.hash !== `#${v}`) location.hash = v;
    else render(true);
  },
  refresh: () => render(false),
};

/* ---------- Rendering ---------- */
const viewRoot = () => $('#view')!;

function shell() {
  $('#app')!.innerHTML = `<div class="shell">
    <header class="topbar">
      <a class="brand" href="#today">${logo(32)}ergo</a>
      <a class="ver" href="https://github.com/parmsam/ergo/blob/main/CHANGELOG.md" target="_blank" rel="noopener" title="What’s new">v${__APP_VERSION__}</a>
      <span class="spacer"></span>
      <span class="chip" data-bind="status"></span>
      ${
        pipSupported() || fullscreenSupported()
          ? `<div class="top-nav top-tools" role="group" aria-label="View">${pipSupported() ? `<button class="top-link" data-act="pip" aria-label="Pop out mini timer" title="Pop out mini timer (P)" aria-pressed="false">${icons.popout}</button>` : ''}<button class="top-link" data-act="fullscreen"></button></div>`
          : ''
      }
      <nav class="top-nav" aria-label="Pages">${VIEWS.map((v) => `<a class="top-link" href="#${v.id}" data-view="${v.id}" aria-label="${v.label}" title="${v.label} (${VIEWS.indexOf(v) + 1})">${v.icon}</a>`).join('')}</nav>
    </header>
    <main id="view"></main>
    <footer class="foot">ergo v${__APP_VERSION__} · <a href="https://github.com/parmsam/ergo/tree/main/evidence" target="_blank" rel="noopener">evidence</a> · <a href="https://github.com/parmsam/ergo" target="_blank" rel="noopener">source</a> · not medical advice</footer>
  </div>`;
}

function render(animate: boolean) {
  const root = viewRoot();
  const html = view === 'today' ? renderToday(app) : view === 'stats' ? renderStats(app) : view === 'guide' ? renderGuide(app) : renderSettings(app);
  const y = window.scrollY;
  root.innerHTML = html;
  const section = root.firstElementChild as HTMLElement | null;
  if (!animate && section) section.style.animation = 'none';
  if (view === 'today') bindToday(root, app);
  else if (view === 'stats') bindStats(root);
  else if (view === 'guide') bindGuide(root, app);
  else bindSettings(root, app);
  root.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => b.addEventListener('click', () => app.go(b.dataset.go as View)));
  document.querySelectorAll<HTMLElement>('.top-link').forEach((t) => (t.dataset.view === view ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  if (!animate) window.scrollTo(0, y);
  status();
  ctrl.tick();
  pip.update();
}

function status() {
  const el = $('[data-bind="status"]');
  if (!el) return;
  const s = store.get().session;
  const state = !s.running ? ['', 'Off'] : s.pausedAt ? ['paused', 'Paused'] : ['on', 'Running'];
  document.documentElement.dataset.run = state[0] || 'off';
  el.innerHTML = `<span class="status-dot ${state[0]}"></span><span class="status-text">${state[1]}</span>`;
  el.title = state[1];
}

function title(now = Date.now()) {
  const s = store.get().session;
  const active = ctrl.activeBreaks()[0];
  if (active) document.title = `${active.phase.label} ${clock(active.end - now)} · ergo`;
  else if (!s.running) document.title = 'ergo';
  else {
    // Paused keeps the lane icons and frozen times, so the tab still reads as ergo at a glance.
    const e = ctrl.stateOf('eye', now);
    const b = ctrl.stateOf('body', now);
    const lanes = [e && `👁 ${clock(e.remaining)}`, b && `🧍 ${clock(b.remaining)}`].filter(Boolean).join(' · ');
    document.title = s.pausedAt ? `⏸ ${lanes || 'Paused · ergo'}` : lanes || 'ergo';
  }
}

function applyAudioPrefs() {
  setRingWhenSilenced(store.get().settings.ringWhenSilenced);
}

function applyTheme() {
  const t = store.get().settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const bg = getComputedStyle(document.body).getPropertyValue('background-color');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#0e1a1f');
}

/* ---------- Input ---------- */
function onKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t.closest('input, select, textarea, [contenteditable]')) return;
  const inBreak = ctrl.activeBreaks().length > 0;
  const k = e.key.toLowerCase();
  if (k === ' ' && !t.closest('button, a')) {
    e.preventDefault();
    toggleRunning();
  } else if (k === 'd' && inBreak) ctrl.done();
  else if (k === 'z' && inBreak) ctrl.snooze(5);
  else if (k === 's' && inBreak) ctrl.skip();
  else if (k === 'e') ctrl.breakNow('eye');
  else if (k === 'b') ctrl.breakNow('body');
  else if (['1', '2', '3', '4'].includes(k)) app.go(VIEWS[Number(k) - 1].id);
  else if (k === 'p') togglePip();
  else if (k === 'f') void fullscreen.toggle();
  else if (k === '?') help();
}

function help() {
  let d = document.querySelector<HTMLDialogElement>('dialog.help');
  if (!d) {
    d = document.createElement('dialog');
    d.className = 'help';
    d.innerHTML = `<h2>Keyboard shortcuts</h2><div class="keys">
      <kbd>Space</kbd><span>Start · pause · resume</span>
      <kbd>E</kbd><span>Eye break now</span>
      <kbd>B</kbd><span>Body break now</span>
      <kbd>D</kbd><span>Done (during a break)</span>
      <kbd>Z</kbd><span>Snooze 5 min</span>
      <kbd>S</kbd><span>Skip</span>
      <kbd>P</kbd><span>Pop out mini timer (Chrome, Edge)</span>
      <kbd>F</kbd><span>Full screen</span>
      <kbd>1</kbd>–<kbd>4</kbd><span>Today · Progress · Guide · Settings</span>
    </div><form method="dialog"><button class="btn">Close</button></form>`;
    document.body.append(d);
  }
  d.showModal();
}

/** Link actions for bookmarks, launchers and the installed app's shortcuts: ?do=start|pause|resume|stop|break&lane=eye|body */
function urlActions() {
  const p = new URLSearchParams(location.search);
  const act = p.get('do');
  if (!act) return;
  const s = store.get().session;
  if (act === 'start' && !s.running) app.actions.start();
  else if (act === 'pause') ctrl.pause(Number(p.get('min')) || null);
  else if (act === 'resume') ctrl.resume();
  else if (act === 'stop') ctrl.stop();
  else if (act === 'break') {
    if (!store.get().session.running) app.actions.start();
    ctrl.breakNow(p.get('lane') === 'body' ? 'body' : 'eye');
  }
  history.replaceState(null, '', location.pathname + location.hash);
  render(false);
}

/* ---------- Boot ---------- */
applyTheme();
applyAudioPrefs();
shell();
const fullscreen = createFullscreenButton($<HTMLButtonElement>('[data-act="fullscreen"]') ?? document.createElement('button'));
$('[data-act="pip"]')?.addEventListener('click', togglePip);
render(true);
window.addEventListener('hashchange', () => {
  view = viewFromHash();
  render(true);
  window.scrollTo({ top: 0 });
});
document.addEventListener('keydown', onKey);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') ctrl.tick();
});
// Browsers only allow audio after a gesture; the first click or key anywhere enables chimes.
const unlock = () => {
  unlockAudio();
  setTimeout(() => ctrl.scheduleTones(), 50);
  document.removeEventListener('pointerdown', unlock);
  document.removeEventListener('keydown', unlock);
};
document.addEventListener('pointerdown', unlock);
document.addEventListener('keydown', unlock);

navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
  const d = e.data as { type?: string; action?: string; tag?: string };
  if (d?.type !== 'ergo-notification') return;
  ctrl.markSeen();
  if (d.action === 'done') ctrl.done();
  else if (d.action === 'snooze') ctrl.snooze(5);
});

try {
  const worker = new Worker(new URL('./core/ticker.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = () => ctrl.tick();
} catch {
  setInterval(() => ctrl.tick(), 1000);
}

if (store.get().settings.autoStart && !store.get().session.running) app.actions.start();
urlActions();
setTimeout(() => {
  const s = store.get();
  if (s.session.running && s.settings.sound && !audioReady()) toast('Click anywhere to turn on break chimes.', { icon: 'bell', id: 'unlock' });
  if (s.session.running && s.settings.notify && !notifyGranted() && typeof Notification !== 'undefined' && Notification.permission === 'default')
    toast('Allow notifications to see breaks while you work in other apps.', { icon: 'bell', duration: 10_000, actions: [{ label: 'Allow', primary: true, run: () => void requestNotify() }] });
}, 1500);

setupPwa(() => ctrl.activeBreaks().length > 0);
setTimeout(() => {
  const sp = document.getElementById('splash');
  sp?.classList.add('out');
  setTimeout(() => sp?.remove(), 500);
}, 650);

// Handy for debugging and for agents driving the page.
Object.assign(window, { ergo: { ctrl, store, version: __APP_VERSION__ } });
