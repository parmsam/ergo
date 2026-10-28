import { canRingWhenSilenced, playNow } from '../core/audio';
import { notify, notifyGranted, notifySupported, requestNotify } from '../core/notify';
import { BODY_RULES, EYE_RULES, ruleFor } from '../core/rules';
import { exportBackup, parseBackup } from '../core/storage';
import type { Settings } from '../core/types';
import type { AppCtx } from './ctx';
import { esc } from './dom';
import { icons } from './icons';
import { toast } from './toast';

const sw = (key: string, on: boolean) => `<input type="checkbox" class="switch" data-bool="${key}" ${on ? 'checked' : ''}/>`;

/** A settings row. Rows whose control is a dropdown stack on phones so long option text doesn't squeeze the label. */
const field = (label: string, hint: string, control: string) =>
  `<label class="field ${control.includes('<select') ? 'wide' : ''}"><span class="lbl">${label}${hint ? `<span class="hint">${hint}</span>` : ''}</span>${control}</label>`;

const num = (key: string, value: number, min: number, max: number, step = 1) =>
  `<input type="number" data-num="${key}" value="${value}" min="${min}" max="${max}" step="${step}" inputmode="numeric"/>`;

/** Controls that sit side by side on the right of a row. */
const ctl = (...parts: string[]) => `<span class="ctl">${parts.join('')}</span>`;
/** A number input with its unit, so every number row lines up. */
const withUnit = (input: string, unit: string) => `${input}<span class="unit">${unit}</span>`;

export function renderSettings(app: AppCtx) {
  const s = app.store.get().settings;
  const perm = !notifySupported() ? 'Not supported in this browser' : Notification.permission === 'granted' ? 'Allowed' : Notification.permission === 'denied' ? 'Blocked in browser settings' : 'Not yet allowed';

  return `<section class="view settings">
    <div class="card">
      <div class="section-title"><h2>Rules</h2><p><a href="#guide">Compare rules →</a></p></div>
      <div class="form">
        ${field('Eyes', esc(ruleFor(s, 'eye').tagline), `<select data-sel="eyeRule" aria-label="Eye rule">${[...EYE_RULES.map((r) => [r.id, r.name]), ['custom-eye', 'Custom…']]
          .map(([id, l]) => `<option value="${id}" ${s.eyeRule === id ? 'selected' : ''}>${esc(l)}</option>`)
          .join('')}</select>`)}
        ${s.eyeRule === 'custom-eye' ? `<div class="custom-row"><label>Every (min)${num('custom.eye.workMin', s.custom.eye.workMin, 1, 180)}</label><label>Look away (sec)${num('custom.eye.breakSec', s.custom.eye.breakSec, 5, 900, 5)}</label></div>` : ''}
        ${field('Body', esc(ruleFor(s, 'body').tagline), `<select data-sel="bodyRule" aria-label="Body rule">${[...BODY_RULES.map((r) => [r.id, r.name]), ['custom-body', 'Custom…']]
          .map(([id, l]) => `<option value="${id}" ${s.bodyRule === id ? 'selected' : ''}>${esc(l)}</option>`)
          .join('')}</select>`)}
        ${s.bodyRule === 'custom-body' ? `<div class="custom-row"><label>Sit (min)${num('custom.body.sitMin', s.custom.body.sitMin, 1, 180)}</label><label>Stand (min, 0 = none)${num('custom.body.standMin', s.custom.body.standMin, 0, 120)}</label><label>Move (min)${num('custom.body.moveMin', s.custom.body.moveMin, 1, 30)}</label></div>` : ''}
        ${field('Exercise snack', `Every ${s.nudges.snack.everyMin} min, one vigorous minute (stairs, brisk walk). Skip it if you have a heart condition unless your doctor says it’s fine.`, ctl(withUnit(num('nudges.snack.everyMin', s.nudges.snack.everyMin, 30, 480, 15), 'min'), sw('nudges.snack.on', s.nudges.snack.on)))}
        ${field('Posture reset nudge', `Every ${s.nudges.posture.everyMin} min, shift and reset your position (default interval, not researched)`, ctl(withUnit(num('nudges.posture.everyMin', s.nudges.posture.everyMin, 5, 120), 'min'), sw('nudges.posture.on', s.nudges.posture.on)))}
      </div>
    </div>

    <div class="section card">
      <div class="section-title"><h2>Breaks</h2></div>
      <div class="form">
        ${field('Break screen', 'Full screen is harder to ignore; a corner card is gentler', `<select data-sel="overlay"><option value="full" ${s.overlay === 'full' ? 'selected' : ''}>Full screen</option><option value="card" ${s.overlay === 'card' ? 'selected' : ''}>Corner card</option></select>`)}
        ${field('Honor system', 'A break that runs out without you pressing Skip counts as taken. Turn off to only count breaks you saw in ergo.', sw('trustBreaks', s.trustBreaks))}
        ${field('Moving rests your eyes too', 'A finished body break restarts the eye timer', sw('bodyResetsEye', s.bodyResetsEye))}
        ${field('Gentle escalation', 'After 2 skipped breaks in a row, the next one is full screen with a coaching note', sw('escalate', s.escalate))}
        ${field('Away threshold', 'If ergo’s own timer stalls this long (laptop asleep), cycles restart fresh. ergo never monitors your keyboard or mouse.', ctl(withUnit(num('awayMin', s.awayMin, 2, 60), 'min')))}
        ${field('Daily goal', 'Share of breaks to take for a streak day', ctl(withUnit(num('goalPct', s.goalPct, 10, 100, 5), '%')))}
        ${field('Sitting budget', 'Daily hours of sitting to aim under (Canadian guidelines: 8 or less). 0 hides it.', ctl(withUnit(num('sitBudgetH', s.sitBudgetH, 0, 16), 'h')))}
      </div>
    </div>

    <div class="section card">
      <div class="section-title"><h2>Alerts</h2></div>
      <div class="form">
        ${field('Sound', 'Soft chimes when a break starts and ends', sw('sound', s.sound))}
        ${field('Volume', '', ctl(`<input type="range" min="0.1" max="1" step="0.05" data-range="volume" value="${s.volume}"/>`, `<button class="btn sm ghost" data-act="test-sound">Test</button>`))}
        ${field(
          'Ring when iPhone is silenced',
          canRingWhenSilenced()
            ? 'Chimes play even with the silent switch on. ergo switches audio mode only for each chime, which may briefly pause music.'
            : 'For iPhone and iPad (Safari, iOS 17 or later). Not available in this browser.',
          sw('ringWhenSilenced', s.ringWhenSilenced),
        )}
        ${field('System notifications', `So you see breaks while working in other apps. Status: ${perm}`, ctl(notifyGranted() ? `<button class="btn sm ghost" data-act="test-notify">Test</button>` : `<button class="btn sm" data-act="allow-notify" ${notifySupported() ? '' : 'disabled'}>${icons.bell}Allow</button>`, sw('notify', s.notify)))}
      </div>
    </div>

    <div class="section card">
      <div class="section-title"><h2>App</h2></div>
      <div class="form">
        ${field('Theme', '', `<select data-sel="theme"><option value="auto" ${s.theme === 'auto' ? 'selected' : ''}>Match system</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option></select>`)}
        ${field('Start on open', 'Begin reminders automatically when you open ergo', sw('autoStart', s.autoStart))}
      </div>
      <div class="btn-row">
        <button class="btn sm" data-act="export">Export backup</button>
        <label class="btn sm">Import backup<input type="file" accept="application/json" data-act="import" hidden/></label>
        <button class="btn sm ghost" data-act="reset" style="color:var(--bad)">Erase history</button>
      </div>
    </div>

    <div class="section card">
      <div class="section-title"><h2>About</h2></div>
      <p class="muted">ergo <strong>v${__APP_VERSION__}</strong> · <a href="https://github.com/parmsam/ergo/blob/main/CHANGELOG.md" target="_blank" rel="noopener">changelog</a> · <a href="https://github.com/parmsam/ergo/tree/main/evidence" target="_blank" rel="noopener">evidence</a> · <a href="https://github.com/parmsam/ergo" target="_blank" rel="noopener">source</a></p>
      <p class="muted small" style="margin-top:8px">Private by design: no account, no server, no analytics, no activity monitoring. Everything stays in this browser.</p>
      <p class="muted small" style="margin-top:8px">Keyboard: <kbd>Space</kbd> start/pause · <kbd>E</kbd> eye break · <kbd>B</kbd> body break · <kbd>D</kbd> done · <kbd>Z</kbd> snooze · <kbd>S</kbd> skip · <kbd>1</kbd>–<kbd>4</kbd> tabs · <kbd>?</kbd> help</p>
    </div>
  </section>`;
}

/** Set a dotted path like "custom.eye.workMin" on settings. */
function setPath(obj: Settings, path: string, value: unknown) {
  const keys = path.split('.');
  let o = obj as unknown as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys.at(-1)!] = value;
}

export function bindSettings(root: HTMLElement, app: AppCtx) {
  root.querySelectorAll<HTMLInputElement>('[data-bool]').forEach((i) => i.addEventListener('change', () => app.updateSettings((s) => setPath(s, i.dataset.bool!, i.checked))));
  root.querySelectorAll<HTMLSelectElement>('[data-sel]').forEach((i) => i.addEventListener('change', () => app.updateSettings((s) => setPath(s, i.dataset.sel!, i.value))));
  root.querySelectorAll<HTMLInputElement>('[data-num]').forEach((i) =>
    i.addEventListener('change', () => {
      const v = Math.min(Number(i.max), Math.max(Number(i.min), Math.round(Number(i.value) || Number(i.min))));
      app.updateSettings((s) => setPath(s, i.dataset.num!, v));
    }),
  );
  root.querySelector<HTMLInputElement>('[data-range="volume"]')?.addEventListener('change', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    app.updateSettings((s) => (s.volume = v));
    playNow('eye', v);
  });
  root.querySelector('[data-act="test-sound"]')?.addEventListener('click', () => playNow('body', app.store.get().settings.volume));
  root.querySelector('[data-act="allow-notify"]')?.addEventListener('click', async () => {
    const r = await requestNotify();
    if (r === 'granted') app.updateSettings((s) => (s.notify = true));
    else toast(r === 'denied' ? 'Notifications are blocked. Allow them in your browser’s site settings.' : 'Notifications aren’t available here.', { icon: 'bell' });
    app.go('settings');
  });
  root.querySelector('[data-act="test-notify"]')?.addEventListener('click', () => void notify('Look far', { body: 'This is what a break reminder looks like.', tag: 'ergo-test' }));
  root.querySelector('[data-act="export"]')?.addEventListener('click', () => {
    const blob = new Blob([exportBackup(app.store.get())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ergo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  root.querySelector<HTMLInputElement>('[data-act="import"]')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const before = app.store.get().settings;
      app.store.update((d) => Object.assign(d, data), ['settings', 'log', 'days', 'checklist']);
      app.ctrl.settingsChanged(before);
      toast(`Imported ${data.log.length} log entries.`, { icon: 'check' });
    } catch (err) {
      toast(`Couldn’t import: ${(err as Error).message}`, { icon: 'x' });
    }
  });
  root.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
    if (!confirm('Erase all break history and screen-time totals? Settings are kept.')) return;
    app.store.update((d) => ((d.log = []), (d.days = {})), ['log', 'days']);
    toast('History erased.', { icon: 'check' });
  });
}
