import type { TrackId } from '../core/types';
import { ring, setRing } from './dom';
import { icons } from './icons';

/**
 * Pop-out mini timer: a small always-on-top window (Document Picture-in-Picture,
 * Chromium only) showing both countdowns and driving the real controller.
 */
interface DocumentPictureInPicture {
  requestWindow(opts?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}
const api = () => (window as Window & { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
export const pipSupported = () => !!api();

export interface PipLane {
  id: TrackId;
  title: string;
  time: string;
  sub: string;
  /** Ring fill, 0..1. */
  frac: number;
}

export interface PipState {
  running: boolean;
  paused: boolean;
  lanes: PipLane[];
  /** The break in progress, if any: the window switches to it. */
  brk: { lane: TrackId; label: string; time: string; frac: number } | null;
}

// Layout for the small window; tokens, rings and buttons come from the page's own CSS.
const PIP_STYLES = `
  html, body { margin: 0; height: 100%; }
  body { display: grid; place-items: center; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font); }
  .pip { display: grid; gap: 12px; width: 100%; padding: 12px 14px; box-sizing: border-box; }
  .pip-lanes { display: grid; gap: 8px; }
  .pip-lane { --c: var(--eye); display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; }
  .pip-lane.body, .pip-break.body { --c: var(--body); }
  .pip-lane .ring { width: 44px; height: 44px; }
  .pip-lane .ring circle { stroke-width: 10; }
  .pip-time { font-size: 1.5rem; font-weight: 300; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .pip-sub { display: block; font-size: 0.75rem; color: var(--muted); }
  .pip-break { --c: var(--eye); display: grid; justify-items: center; gap: 2px; text-align: center; }
  .pip-break .pip-kicker { color: var(--c); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .pip-break .pip-time { font-size: 2.4rem; }
  .pip-row { display: flex; gap: 8px; justify-content: center; }
  .pip-row .btn { padding: 8px 16px; font-size: 0.85rem; }
  [hidden] { display: none !important; }
`;

/** Copies the page's stylesheets (inline and linked, incl. fonts) into another document. */
function copyStyles(doc: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = doc.createElement('style');
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join('\n');
      doc.head.append(style);
    } catch {
      // Cross-origin sheet: link to it instead.
      if (!sheet.href) continue;
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = sheet.href;
      doc.head.append(link);
    }
  }
  const pip = doc.createElement('style');
  pip.textContent = PIP_STYLES;
  doc.head.append(pip);
}

const laneRows = (lanes: PipLane[]) =>
  lanes
    .map((l) => `<div class="pip-lane ${l.id}" data-lane="${l.id}">${ring(0)}<div><div class="pip-time" role="timer" aria-label="${l.title}"></div><span class="pip-sub"></span></div></div>`)
    .join('');

const set = (el: Element, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

export function createPip(deps: { getState(): PipState; toggle(): void; done(): void; skip(): void; onClose(): void }) {
  let win: Window | null = null;
  let root: HTMLElement | null = null;

  /** ergo's theme is a data attribute on the page root; "auto" follows the system in both windows. */
  function syncTheme() {
    if (!win) return;
    const t = document.documentElement.dataset.theme;
    const dst = win.document.documentElement;
    if (t) dst.dataset.theme = t;
    else delete dst.dataset.theme;
  }

  function update() {
    if (!root || !win) return;
    const s = deps.getState();
    const q = (sel: string) => root!.querySelector<HTMLElement>(sel)!;
    q('.pip-lanes').hidden = !!s.brk;
    q('.pip-break').hidden = !s.brk;
    q('.pip-toggle').hidden = !!s.brk;
    q('.pip-done').hidden = !s.brk;
    q('.pip-skip').hidden = !s.brk;
    if (s.brk) {
      const b = q('.pip-break');
      b.className = `pip-break ${s.brk.lane}`;
      set(q('.pip-kicker'), s.brk.lane === 'body' ? 'Body break' : 'Eye break');
      set(q('.pip-break .pip-label'), s.brk.label);
      set(q('.pip-break .pip-time'), s.brk.time);
    } else {
      // A track switched on or off in Settings while the window is open.
      const box = q('.pip-lanes');
      const ids = s.lanes.map((l) => l.id).join();
      if (box.dataset.ids !== ids) {
        box.dataset.ids = ids;
        box.innerHTML = laneRows(s.lanes);
      }
      for (const l of s.lanes) {
        const row = q(`.pip-lane[data-lane="${l.id}"]`);
        set(row.querySelector('.pip-time')!, s.running ? l.time : '–');
        set(row.querySelector('.pip-sub')!, s.running ? l.sub : l.title);
        setRing(row.querySelector('.ring'), s.running ? l.frac : 0);
      }
      const t = q('.pip-toggle');
      const label = !s.running ? 'Start' : s.paused ? 'Resume' : 'Pause';
      if (t.dataset.label !== label) {
        t.dataset.label = label;
        t.innerHTML = `${!s.running || s.paused ? icons.play : icons.pause}${label}`;
        t.classList.toggle('primary', label !== 'Pause');
      }
    }
    syncTheme();
  }

  async function open() {
    const pip = api();
    if (!pip || win) return;
    win = await pip.requestWindow({ width: 260, height: 210 });
    const doc = win.document;
    doc.title = 'ergo';
    copyStyles(doc);
    doc.body.innerHTML = `
      <main class="pip">
        <div class="pip-lanes"></div>
        <div class="pip-break" hidden><span class="pip-kicker"></span><strong class="pip-label"></strong><div class="pip-time" role="timer"></div></div>
        <div class="pip-row">
          <button class="btn pip-toggle" type="button"></button>
          <button class="btn primary pip-done" type="button" hidden>${icons.check}Done</button>
          <button class="btn ghost pip-skip" type="button" hidden>${icons.skip}Skip</button>
        </div>
      </main>`;
    root = doc.querySelector('.pip');
    doc.querySelector('.pip-toggle')!.addEventListener('click', deps.toggle);
    doc.querySelector('.pip-done')!.addEventListener('click', deps.done);
    doc.querySelector('.pip-skip')!.addEventListener('click', deps.skip);
    doc.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        deps.toggle();
      }
    });
    win.addEventListener('pagehide', () => {
      win = null;
      root = null;
      deps.onClose();
    });
    update();
  }

  return {
    open,
    toggle: () => (win ? win.close() : void open()),
    isOpen: () => win !== null,
    update,
  };
}
