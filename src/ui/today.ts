import { coach } from '../core/coach';
import { cycleMs, untilNext } from '../core/engine';
import { clock, duration, pct, timeOfDay } from '../core/format';
import { NUDGES, STRENGTH_LABEL, evidenceUrl, ruleFor } from '../core/rules';
import { adherence, dayKey, skipRun, summarize } from '../core/stats';
import type { NudgeId, Phase, TrackId } from '../core/types';
import type { AppCtx } from './ctx';
import { $, esc, ring, setRing } from './dom';
import { icons } from './icons';

const TRACKS: { id: TrackId; title: string; icon: string }[] = [
  { id: 'eye', title: 'Eyes', icon: icons.eye },
  { id: 'body', title: 'Posture & movement', icon: icons.body },
];

const short = (sec: number) => (sec >= 60 ? `${Math.round(sec / 60)}m` : `${sec}s`);

/** What the countdown leads to, e.g. "until you look away". */
function untilLabel(next: Phase | undefined) {
  if (!next) return '';
  if (next.kind === 'cue' && next.focus === 'stand') return 'until you stand';
  if (next.focus === 'far' || next.focus === 'eyes') return 'until you look away';
  if (next.focus === 'walk') return 'until a walk';
  return 'until you move';
}

function timeline(phases: Phase[]) {
  return `<div class="timeline" data-bind="timeline">${phases
    .map((p) => `<div class="seg ${p.kind}" style="flex:${p.sec} 0 6px" title="${esc(p.label)} ${short(p.sec)}"></div>`)
    .join('')}<div class="marker" data-bind="marker" style="left:0%"></div></div>
    <div class="timeline-legend">${phases.map((p) => `<span>${esc(p.label)} ${short(p.sec)}</span>`).join('')}</div>`;
}

export function renderToday(app: AppCtx) {
  const { settings, session, log, days, checklist } = app.store.get();
  const running = session.running;
  const paused = session.pausedAt != null;
  const now = Date.now();
  const today = summarize(log, days, dayKey(now));
  const note = coach({
    today,
    skips: { eye: skipRun(log, 'eye'), body: skipRun(log, 'body') },
    checklist,
    activeMin: today.activeSec / 60,
    sitBudgetH: settings.sitBudgetH,
    seed: Math.floor(now / 600_000),
  });

  const lanes = TRACKS.map((t) => {
    const rule = ruleFor(settings, t.id);
    return `<article class="lane card ${t.id} ${running ? '' : 'idle'}" data-lane="${t.id}">
      <div class="lane-head">
        <div class="lane-icon">${t.icon}</div>
        <div>
          <h2>${t.title}</h2>
          <button class="rule-link" data-go="settings" title="Change rule">${esc(rule.name)} · ${esc(rule.tagline)}</button>
        </div>
        <a class="badge ${rule.strength}" href="${evidenceUrl(rule.evidence)}" target="_blank" rel="noopener" title="Read the evidence">${STRENGTH_LABEL[rule.strength]}</a>
      </div>
      <div class="ring-wrap">
        ${ring(0)}
        <div class="ring-center">
          <div class="time" data-bind="time">${clock(rule.phases[0].sec * 1000)}</div>
          <div class="sub" data-bind="sub">${running ? '' : `cycle ${duration(cycleMs(rule.phases) / 1000)}`}</div>
        </div>
      </div>
      ${timeline(rule.phases)}
      <div class="lane-actions">
        <button class="btn sm ghost" data-act="break-now" data-lane="${t.id}" ${running && !paused ? '' : 'disabled'}>${icons.bolt}Break now</button>
      </div>
    </article>`;
  }).join('');

  const controls = !running
    ? `<button class="btn primary big" data-act="start">${icons.play}Start reminders</button>`
    : paused
      ? `<button class="btn primary big" data-act="resume">${icons.play}Resume</button>
         <button class="btn ghost" data-act="stop">${icons.stop}End day</button>`
      : `<div class="pause-menu">
           <button class="btn big" data-act="pause-menu" aria-haspopup="true" aria-expanded="false">${icons.pause}Pause</button>
         </div>
         <button class="btn ghost" data-act="stop">${icons.stop}End day</button>`;

  const nudges = (Object.keys(NUDGES) as NudgeId[])
    .map((id) => {
      const n = settings.nudges[id];
      return `<button class="chip nudge ${n.on ? '' : 'off'}" data-nudge="${id}" title="${n.on ? 'Turn off' : 'Turn on'}">
        ${id === 'snack' ? icons.bolt : icons.posture}
        <span>${NUDGES[id].name} every ${n.everyMin}m</span>
        <strong data-bind="nudge-${id}">${n.on ? '' : 'off'}</strong>
      </button>`;
    })
    .join('');

  const tile = (label: string, icon: string, value: string, sub: string, frac: number | null, c: string) =>
    `<div class="card tile" style="--c:var(--${c})"><div class="label">${icon}${label}</div><div class="value">${value} <small>${sub}</small></div>${
      frac != null ? `<div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div>` : ''
    }</div>`;
  const eyeDue = today.eye.done + today.eye.skipped + today.eye.missed;
  const bodyDue = today.body.done + today.body.skipped + today.body.missed;

  return `<section class="view today">
    ${!running ? `<p class="intro">Start when you sit down to work. ergo reminds you to rest your eyes and change position, and keeps a private record in this browser.</p>` : ''}
    <div class="controls">${controls}</div>
    <p class="paused-note" data-bind="paused" ${paused ? '' : 'hidden'}></p>
    <div class="lanes section">${lanes}</div>
    <div class="section nudges">${nudges}</div>
    <div class="section">
      <div class="section-title"><h2>Today</h2><button class="rule-link" data-go="stats">See progress →</button></div>
      <div class="tiles">
        ${tile('Eye breaks', icons.eye, `${today.eye.done}`, `of ${eyeDue} · ${pct(adherence(today.eye))}`, adherence(today.eye), 'eye')}
        ${tile('Body breaks', icons.walk, `${today.body.done}`, `of ${bodyDue} · ${pct(adherence(today.body))}`, adherence(today.body), 'body')}
        ${tile('Stood up', icons.stand, `${today.stand.done}`, `of ${today.stand.shown} cues`, today.stand.shown ? today.stand.done / today.stand.shown : null, 'body')}
        ${
          settings.sitBudgetH
            ? tile('Sitting (est.)', icons.chart, duration(today.sittingSec), `of ${settings.sitBudgetH}h budget`, Math.min(1, today.sittingSec / (settings.sitBudgetH * 3600)), today.sittingSec > settings.sitBudgetH * 3600 ? 'bad' : 'eye')
            : tile('Screen time', icons.chart, duration(today.activeSec), 'tracked', null, 'eye')
        }
        ${settings.nudges.snack.on ? tile('Exercise snacks', icons.bolt, `${today.snacks.done}`, `of ${today.snacks.shown}`, today.snacks.shown ? today.snacks.done / today.snacks.shown : null, 'body') : ''}
      </div>
    </div>
    <div class="section card coach ${note.tone}">
      <div class="avatar">${note.tone === 'nudge' ? icons.flame : icons.bolt}</div>
      <div>
        <p>${esc(note.text)}</p>
        ${note.evidence ? `<a class="src" href="${evidenceUrl(note.evidence)}" target="_blank" rel="noopener">${icons.link}Source</a>` : ''}
      </div>
    </div>
  </section>`;
}

export function bindToday(root: HTMLElement, app: AppCtx) {
  root.querySelector('[data-act="start"]')?.addEventListener('click', () => app.actions.start());
  root.querySelector('[data-act="resume"]')?.addEventListener('click', () => (app.ctrl.resume(), app.refresh()));
  root.querySelector('[data-act="stop"]')?.addEventListener('click', () => (app.ctrl.stop(), app.refresh()));
  root.querySelectorAll<HTMLElement>('[data-act="break-now"]').forEach((b) => b.addEventListener('click', () => app.ctrl.breakNow(b.dataset.lane as TrackId)));
  root.querySelectorAll<HTMLElement>('[data-nudge]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.nudge as NudgeId;
      app.updateSettings((s) => (s.nudges[id].on = !s.nudges[id].on));
    }),
  );
  const pm = root.querySelector<HTMLElement>('[data-act="pause-menu"]');
  pm?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wrap = pm.parentElement!;
    const open = wrap.querySelector('.menu');
    if (open) return open.remove(), pm.setAttribute('aria-expanded', 'false');
    pm.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = [
      [15, 'For 15 minutes'],
      [30, 'For 30 minutes (meeting)'],
      [60, 'For an hour'],
      [0, 'Until I resume'],
    ]
      .map(([m, l]) => `<button role="menuitem" data-min="${m}">${l}</button>`)
      .join('');
    menu.addEventListener('click', (ev) => {
      const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-min]');
      if (!t) return;
      app.ctrl.pause(Number(t.dataset.min) || null);
      app.refresh();
    });
    wrap.append(menu);
    (menu.firstElementChild as HTMLElement).focus();
    const off = () => (menu.remove(), pm.setAttribute('aria-expanded', 'false'), document.removeEventListener('click', off));
    setTimeout(() => document.addEventListener('click', off));
  });
}

export function tickToday(root: HTMLElement, app: AppCtx, now: number) {
  const { settings, session } = app.store.get();
  if (!session.running) return;
  for (const t of TRACKS) {
    const card = $(`.lane[data-lane="${t.id}"]`, root);
    const st = app.ctrl.stateOf(t.id, now);
    if (!card || !st) continue;
    const phases = ruleFor(settings, t.id).phases;
    const next = phases[(st.index + 1) % phases.length];
    card.dataset.kind = st.phase.kind;
    let frac = st.progress;
    let sub = '';
    if (st.phase.kind === 'work') {
      // Count down to whatever interrupts the work phase next.
      sub = untilLabel(next);
    } else if (st.phase.kind === 'cue') {
      sub = `${st.phase.label.toLowerCase()} · then ${next.label.toLowerCase()}`;
    } else {
      frac = 1 - st.progress;
      sub = st.phase.label.toLowerCase() + ' now';
    }
    $('[data-bind="time"]', card)!.textContent = clock(st.remaining);
    $('[data-bind="sub"]', card)!.textContent = session.pausedAt ? 'paused' : sub;
    setRing($('.ring', card), frac);
    const marker = $('[data-bind="marker"]', card);
    if (marker) marker.style.left = `${(st.cycleProgress * 100).toFixed(2)}%`;
  }
  for (const id of Object.keys(NUDGES) as NudgeId[]) {
    const el = $(`[data-bind="nudge-${id}"]`, root);
    if (!el || !settings.nudges[id].on) continue;
    const l = app.ctrl.lanes().find((x) => x.id === id);
    const anchor = session.anchors[id];
    if (!l || anchor == null) continue;
    const ms = untilNext(l.phases, anchor, app.ctrl.effectiveNow(now), 'cue');
    el.textContent = ms === 0 ? 'now' : clock(ms);
  }
  const p = $('[data-bind="paused"]', root);
  if (p && session.pausedAt) p.textContent = session.pausedUntil ? `Paused until ${timeOfDay(session.pausedUntil)} (${clock(session.pausedUntil - now)})` : 'Paused';
}
