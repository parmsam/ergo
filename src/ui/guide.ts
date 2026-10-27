import { EXERCISES } from '../core/exercises';
import { CHECKLIST, FACTS, MYTHS, setupPct } from '../core/guide';
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
    <p class="muted small" style="margin-top:12px">Evidence labels: <strong>Trial evidence</strong> means controlled studies support it; <strong>Mixed evidence</strong> means studies disagree; <strong>Observational</strong> means large studies link it to better health, but haven’t proven cause; <strong>Expert guidance</strong> means recommended by specialists, but the exact numbers haven’t been tested. Nudges: ${(Object.keys(NUDGES) as (keyof typeof NUDGES)[])
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
          (a) => `<div class="area-head"><h3>${a}</h3><button class="btn sm ghost" data-expand="${esc(a)}" aria-expanded="false">Expand all</button></div><div class="grid-2" data-area="${esc(a)}">${EXERCISES.filter((e) => e.area === a)
            .map(
              (e) => `<details class="card ex-card"><summary>${esc(e.name)} <span class="muted">${e.steps.length} steps</span></summary>
                <ol>${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${e.caution ? `<p class="caution">${esc(e.caution)}</p>` : ''}${
                e.evidence
                  ? `<p class="small" style="margin-top:8px"><span class="badge ${e.strength ?? 'expert'}">${STRENGTH_LABEL[e.strength ?? 'expert']}</span> <a href="${evidenceUrl(e.evidence)}" target="_blank" rel="noopener">Evidence</a></p>`
                  : ''
              }</details>`,
            )
            .join('')}</div>`,
        )
        .join('')}
      <p class="muted small" style="margin-top:10px">Stretch gently and never into pain. Evidence for specific stretches is thin; <a href="${evidenceUrl('stretching')}" target="_blank" rel="noopener">changing position and moving</a> is what matters most.</p>
    </div>

    <div class="section">
      <div class="section-title"><h2>Myths</h2><p>Popular advice the evidence doesn’t back</p></div>
      <div class="grid-2">${MYTHS.map(
        (m) => `<article class="card myth"><p class="myth-claim">${icons.x}<s>${esc(m.myth)}</s></p><p class="myth-truth">${icons.check}<span>${esc(m.truth)} <a class="small" href="${evidenceUrl(m.evidence)}" target="_blank" rel="noopener">source</a></span></p></article>`,
      ).join('')}</div>
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
  // Per-area "Expand all / Collapse all", kept in sync when cards are toggled one at a time.
  root.querySelectorAll<HTMLButtonElement>('[data-expand]').forEach((btn) => {
    const cards = () => [...root.querySelectorAll<HTMLDetailsElement>(`[data-area="${CSS.escape(btn.dataset.expand!)}"] details`)];
    const sync = () => {
      const allOpen = cards().every((d) => d.open);
      btn.textContent = allOpen ? 'Collapse all' : 'Expand all';
      btn.setAttribute('aria-expanded', String(allOpen));
    };
    btn.addEventListener('click', () => {
      const open = !cards().every((d) => d.open);
      cards().forEach((d) => (d.open = open));
      sync();
    });
    cards().forEach((d) => d.addEventListener('toggle', sync));
  });
  root.querySelectorAll<HTMLInputElement>('[data-check]').forEach((c) =>
    c.addEventListener('change', () => app.store.update((d) => void (d.checklist[c.dataset.check!] = c.checked), ['checklist'])),
  );
}
