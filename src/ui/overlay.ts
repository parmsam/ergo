import { breakLeft, type ActiveBreak, type Controller } from '../core/controller';
import { pickExercises, type Exercise } from '../core/exercises';
import { clock } from '../core/format';
import { ruleFor } from '../core/rules';
import type { Focus, Settings, Status } from '../core/types';
import { esc, ring, setRing } from './dom';
import { icons } from './icons';

const LANE_LABEL = { eye: 'Eye break', body: 'Body break', posture: 'Posture', snack: 'Exercise snack' } as const;

function visual(focus: Focus | undefined) {
  switch (focus) {
    case 'far':
      return '<div class="far"><i></i><i></i><i></i><b></b></div>';
    case 'eyes':
    case 'blink':
      return `<svg class="blink-eye" viewBox="0 0 100 60"><g class="lid"><path d="M5 30C20 10 35 5 50 5s30 5 45 25C80 50 65 55 50 55S20 50 5 30Z"/><circle class="iris" cx="50" cy="30" r="13"/></g></svg>`;
    case 'walk':
    case 'active':
      return '<div class="steps"><i></i><i></i><i></i><i></i></div>';
    default:
      return '<div class="breathe"><i></i><span></span></div>';
  }
}

export function createOverlay(o: { ctrl: Controller; settings: () => Settings; coachLine: (b: ActiveBreak) => string | null }) {
  let el: HTMLElement | null = null;
  let current: ActiveBreak | null = null;
  let exercises: Exercise[] = [];
  let stepIdx = -1;
  let restoreFocus: HTMLElement | null = null;
  let closeTimer = 0;

  /** The break to feature: the one with the most time left (a body break outranks an eye break). */
  const primary = () => o.ctrl.activeBreaks().sort((a, b) => b.end - a.end)[0] ?? null;

  function render(b: ActiveBreak) {
    current = b;
    clearTimeout(closeTimer);
    const s = o.settings();
    const rule = b.lane === 'eye' || b.lane === 'body' ? ruleFor(s, b.lane) : null;
    exercises = pickExercises(b.phase.focus, b.start / 60_000, b.phase.sec >= 120 ? 2 : 1);
    stepIdx = -1;
    const others = o.ctrl.activeBreaks().filter((x) => x.lane !== b.lane);
    const coach = b.escalated ? o.coachLine(b) : null;
    const card = s.overlay === 'card' && !b.escalated;
    const tone = b.lane === 'body' ? 'body' : 'eye';

    if (!el) {
      restoreFocus = document.activeElement as HTMLElement | null;
      el = document.createElement('div');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', card ? 'false' : 'true');
      el.setAttribute('aria-labelledby', 'ov-title');
      document.body.append(el);
    }
    el.className = `overlay ${tone} ${card ? 'card-mode' : ''} ${b.ringing ? 'ringing' : ''}`;
    delete el.dataset.state;
    document.body.classList.add('in-break');
    el.innerHTML = `<div class="ov">
      <div class="ov-kicker">${b.lane === 'body' ? icons.body : icons.eye}${LANE_LABEL[b.lane]}${rule ? ` · ${esc(rule.name)}` : ''}</div>
      <h1 class="ov-title" id="ov-title">${esc(b.phase.label)}</h1>
      <p class="ov-prompt">${esc(b.phase.prompt ?? '')}</p>
      <div class="ov-stage">
        ${ring(1)}
        <div class="ov-visual">${visual(b.phase.focus)}</div>
        <div class="ov-count" data-bind="ov-count">${clock(breakLeft(b, Date.now()))}</div>
      </div>
      ${exercises.length ? `<div class="ex card"><div class="ex-head"><h3 data-bind="ex-name"></h3><div class="dots" data-bind="ex-dots"></div></div><p class="ex-step" data-bind="ex-step"></p></div>` : ''}
      ${coach ? `<p class="ov-coach">${esc(coach)}</p>` : ''}
      ${b.ringing ? `<p class="ov-ringing" role="status">${icons.bell}Ringing until you respond. The countdown starts when you do.</p>` : ''}
      <div class="ov-actions">
        ${b.ringing ? `<button class="btn primary" data-ov="start">${icons.play}Start <kbd>↵</kbd></button>` : ''}
        <button class="btn ${b.ringing ? '' : 'primary'}" data-ov="done">${icons.check}Done <kbd>D</kbd></button>
        <button class="btn" data-ov="snooze">${icons.snooze}5 min <kbd>Z</kbd></button>
        <button class="btn ghost" data-ov="skip">${icons.skip}Skip <kbd>S</kbd></button>
      </div>
      ${others.length ? `<p class="ov-also">${icons.check} Also covers your ${others.map((x) => LANE_LABEL[x.lane].toLowerCase()).join(' and ')}</p>` : ''}
    </div>`;
    el.querySelector('[data-ov="start"]')?.addEventListener('click', () => o.ctrl.answer());
    el.querySelector('[data-ov="done"]')!.addEventListener('click', () => o.ctrl.done());
    el.querySelector('[data-ov="snooze"]')!.addEventListener('click', () => o.ctrl.snooze(5));
    el.querySelector('[data-ov="skip"]')!.addEventListener('click', () => o.ctrl.skip());
    if (!card) el.querySelector<HTMLElement>(b.ringing ? '[data-ov="start"]' : '[data-ov="done"]')?.focus({ preventScroll: true });
    refresh(Date.now());
  }

  function refresh(now: number) {
    if (!el || !current || el.dataset.state === 'done') return;
    const b = current;
    const total = b.phase.sec * 1000;
    const left = breakLeft(b, now);
    setRing(el.querySelector('.ov-stage .ring'), left / total);
    const count = el.querySelector('[data-bind="ov-count"]');
    if (count) count.textContent = clock(left);
    if (document.visibilityState === 'visible') o.ctrl.markSeen();

    // Step through the exercises evenly across the break, 5–20 s per step.
    const steps = exercises.flatMap((ex) => ex.steps.map((step, i) => ({ ex, step, i })));
    if (!steps.length) return;
    const per = Math.max(5_000, Math.min(20_000, total / steps.length));
    const idx = b.ringing ? 0 : Math.min(steps.length - 1, Math.floor((now - b.start) / per)) % steps.length;
    if (idx !== stepIdx) {
      stepIdx = idx;
      const { ex, step, i } = steps[idx];
      el.querySelector('[data-bind="ex-name"]')!.textContent = ex.name;
      el.querySelector('[data-bind="ex-dots"]')!.innerHTML = ex.steps.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
      const p = el.querySelector<HTMLElement>('[data-bind="ex-step"]')!;
      p.textContent = step;
      p.style.animation = 'none';
      void p.offsetWidth; // restart the slide-in
      p.style.animation = '';
    }
  }

  function close() {
    const node = el;
    el = null;
    current = null;
    document.body.classList.remove('in-break');
    if (!node) return;
    node.classList.add('closing');
    setTimeout(() => node.remove(), 400);
    restoreFocus?.focus?.({ preventScroll: true });
  }

  /** A break ended: show the next one, a brief check mark, or just close. */
  function ended(_b: ActiveBreak, status: Status) {
    const next = primary();
    if (next) return render(next);
    if (!el) return;
    if (status !== 'done') return close();
    el.dataset.state = 'done';
    el.innerHTML = `<div class="ov-done">
      <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M30 52l13 13 27-29"/></svg>
      <h1 class="ov-title">Nice. Back to it.</h1>
    </div>`;
    closeTimer = window.setTimeout(close, 1600);
  }

  return {
    open: () => {
      const p = primary();
      if (p) render(p);
    },
    refresh,
    ended,
    close,
    isOpen: () => !!el,
  };
}
