import { EXERCISES } from '../core/exercises';
import { CHECKLIST, FACTS, setupPct } from '../core/guide';
import { BODY_RULES, EYE_RULES, NUDGES, STRENGTH_LABEL, evidenceUrl } from '../core/rules';
import type { Rule } from '../core/types';
import type { AppCtx } from './ctx';
import { esc, ring } from './dom';
import { icons } from './icons';

function ruleCard(r: Rule, selected: boolean) {
  return `<article class="card rule-card ${r.track} ${selected ? 'selected' : ''}">
    <div class="top"><h3>${r.track === 'eye' ? icons.eye : icons.body}${esc(r.name)}</h3><span class="badge ${r.strength}">${STRENGTH_LABEL[r.strength]}</span></div>
    <div class="tag">${esc(r.tagline)}</div>
    <p>${esc(r.summary)}</p>
    <div class="row">
      ${selected ? `<span class="chip">${icons.check} In use</span>` : `<button class="btn sm" data-use="${r.id}" data-track="${r.track}">Use this</button>`}
      <a class="btn sm ghost" href="${evidenceUrl(r.evidence)}" target="_blank" rel="noopener">${icons.link}Evidence</a>
    </div>
  </article>`;
}

export function renderGuide(app: AppCtx) {
  const { settings, checklist } = app.store.get();
  const groups = [...new Set(CHECKLIST.map((c) => c.group))];
  const areas = [...new Set(EXERCISES.map((e) => e.area))];
  const done = CHECKLIST.filter((c) => checklist[c.id]).length;

  return `<section class="view guide">
    <div class="section-title"><h2>The rules</h2><p>Pick one for your eyes and one for your body.</p></div>
    <div class="grid-2">${EYE_RULES.map((r) => ruleCard(r, settings.eyeRule === r.id)).join('')}</div>
    <div class="grid-2" style="margin-top:14px">${BODY_RULES.map((r) => ruleCard(r, settings.bodyRule === r.id)).join('')}</div>
    <p class="muted small" style="margin-top:12px">Evidence labels: <strong>Trial evidence</strong> means controlled studies support it; <strong>Mixed evidence</strong> means studies disagree; <strong>Expert guidance</strong> means recommended by specialists, but the exact numbers haven’t been tested. Nudges: ${(Object.keys(NUDGES) as (keyof typeof NUDGES)[])
      .map((k) => `<a href="${evidenceUrl(NUDGES[k].evidence)}" target="_blank" rel="noopener">${NUDGES[k].name.toLowerCase()}</a>`)
      .join(', ')}.</p>

    <div class="section card">
      <div class="section-title">
        <div><h2>Set up your workstation</h2><p class="muted small">Fix these once; they help every hour you work.</p></div>
        <div class="score-ring" style="width:64px">${ring(setupPct(checklist))}<div class="num" style="font-size:1rem" data-bind="setup">${done}/${CHECKLIST.length}</div></div>
      </div>
      ${groups
        .map(
          (g) => `<div class="check-group"><h3>${g}</h3>${CHECKLIST.filter((c) => c.group === g)
            .map(
              (c) => `<label class="check"><input type="checkbox" data-check="${c.id}" ${checklist[c.id] ? 'checked' : ''}/>
                <span><span class="t">${esc(c.text)}</span><span class="d"> ${esc(c.detail)} <a href="${evidenceUrl(c.evidence)}" target="_blank" rel="noopener">source</a></span></span></label>`,
            )
            .join('')}</div>`,
        )
        .join('')}
    </div>

    <div class="section">
      <div class="section-title"><h2>Exercise library</h2><p>What breaks will guide you through</p></div>
      ${areas
        .map(
          (a) => `<h3 class="muted small" style="margin:16px 0 8px;text-transform:uppercase;letter-spacing:.08em">${a}</h3><div class="grid-2">${EXERCISES.filter((e) => e.area === a)
            .map(
              (e) => `<details class="card ex-card"><summary>${esc(e.name)} <span class="muted">${e.steps.length} steps</span></summary>
                <ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${e.caution ? `<p class="caution">${esc(e.caution)}</p>` : ''}</details>`,
            )
            .join('')}</div>`,
        )
        .join('')}
      <p class="muted small" style="margin-top:10px">Stretch gently and never into pain. Evidence for specific stretches is thin; <a href="${evidenceUrl('stretching')}" target="_blank" rel="noopener">changing position and moving</a> is what matters most.</p>
    </div>

    <div class="section card">
      <div class="section-title"><h2>Why it matters</h2></div>
      <div class="facts">${FACTS.map((f) => `<div class="fact">${icons.bolt}<p>${esc(f.text)} <a class="small" href="${evidenceUrl(f.evidence)}" target="_blank" rel="noopener">source</a></p></div>`).join('')}</div>
      <p class="disclaimer">ergo is a habit tool, not medical advice. Persistent eye strain, headaches, numbness or pain are worth checking with a clinician.</p>
    </div>
  </section>`;
}

export function bindGuide(root: HTMLElement, app: AppCtx) {
  root.querySelectorAll<HTMLElement>('[data-use]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.use!;
      app.updateSettings((s) => (b.dataset.track === 'eye' ? (s.eyeRule = id) : (s.bodyRule = id)));
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-check]').forEach((c) =>
    c.addEventListener('change', () => app.store.update((d) => void (d.checklist[c.dataset.check!] = c.checked), ['checklist'])),
  );
}
