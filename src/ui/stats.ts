import { duration, pct, timeOfDay } from '../core/format';
import { setupPct } from '../core/guide';
import { NUDGES, BODY_RULES, EYE_RULES, evidenceUrl } from '../core/rules';
import { adherence, dayKey, ergoScore, lastDays, streak, summarize, type DaySummary } from '../core/stats';
import type { LogEntry } from '../core/types';
import type { AppCtx } from './ctx';
import { esc, ring } from './dom';
import { icons } from './icons';

const W = 640;
const H = 200;
const ML = 36;
const MB = 26;
const MT = 10;
/** Right margin, room for the goal label. */
const MR = 58;

const weekday = (key: string) => new Date(`${key}T12:00`).toLocaleDateString([], { weekday: 'short' });
const longDate = (key: string) => new Date(`${key}T12:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

/** Bar with rounded top corners only, anchored to the baseline. */
function bar(x: number, y: number, w: number, h: number, cls: string) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `<path class="${cls} grow" d="M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z"/>`;
}

function adherenceChart(days: DaySummary[], goalPct: number) {
  const ih = H - MB - MT;
  const gw = (W - ML - MR) / days.length;
  const bw = Math.min(22, gw * 0.28);
  const y = (v: number) => MT + ih * (1 - v);
  const grid = [0, 0.5, 1]
    .map((v) => `<line x1="${ML}" x2="${W - MR}" y1="${y(v)}" y2="${y(v)}"/><text x="${ML - 8}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`)
    .join('');
  const cols = days
    .map((d, i) => {
      const cx = ML + gw * i + gw / 2;
      const e = adherence(d.eye);
      const b = adherence(d.body);
      const tip = `${longDate(d.key)}|Eyes: ${d.eye.done}/${d.eye.done + d.eye.skipped + d.eye.missed} (${pct(e)})|Body: ${d.body.done}/${d.body.done + d.body.skipped + d.body.missed} (${pct(b)})`;
      return `<g class="col" data-tip="${esc(tip)}">
        <rect class="hit" x="${ML + gw * i + 2}" y="${MT}" width="${gw - 4}" height="${ih}" rx="8"/>
        ${e != null ? bar(cx - bw - 1, y(e), bw, ih * e, 'bar-eye') : ''}
        ${b != null ? bar(cx + 1, y(b), bw, ih * b, 'bar-body') : ''}
        ${e == null && b == null ? `<text x="${cx}" y="${y(0) - 6}" text-anchor="middle" class="axis-none">–</text>` : ''}
        <text x="${cx}" y="${H - 6}" text-anchor="middle">${weekday(d.key)}</text>
      </g>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Break adherence by day, eyes and body, last 7 days">
    <g class="grid axis">${grid}</g>
    <line class="goal" x1="${ML}" x2="${W - MR}" y1="${y(goalPct / 100)}" y2="${y(goalPct / 100)}"/>
    <text class="goal-label" x="${W - MR + 6}" y="${y(goalPct / 100) + 4}">goal ${goalPct}%</text>
    <g class="axis">${cols}</g>
  </svg>`;
}

/** Estimated sitting per day, with the daily budget as a reference line (budgetH 0 = no line). */
function sittingChart(days: DaySummary[], budgetH: number) {
  const ih = H - MB - MT;
  const gw = (W - ML - MR) / days.length;
  const bw = Math.min(30, gw * 0.45);
  const top = Math.ceil(Math.max(1, budgetH, ...days.map((d) => d.sittingSec / 3600)));
  const y = (h: number) => MT + ih * (1 - h / top);
  const grid = [0, top / 2, top]
    .map((v) => `<line x1="${ML}" x2="${W - MR}" y1="${y(v)}" y2="${y(v)}"/><text x="${ML - 8}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(1)}h</text>`)
    .join('');
  const cols = days
    .map((d, i) => {
      const cx = ML + gw * i + gw / 2;
      const h = d.sittingSec / 3600;
      return `<g class="col" data-tip="${esc(`${longDate(d.key)}|Sitting (est.): ${duration(d.sittingSec)}|Screen time: ${duration(d.activeSec)}|Standing: ${duration(d.stand.sec)}`)}">
        <rect class="hit" x="${ML + gw * i + 2}" y="${MT}" width="${gw - 4}" height="${ih}" rx="8"/>
        ${bar(cx - bw / 2, y(h), bw, y(0) - y(h), budgetH && h > budgetH ? 'bar-over' : 'bar-time')}
        <text x="${cx}" y="${H - 6}" text-anchor="middle">${weekday(d.key)}</text>
      </g>`;
    })
    .join('');
  const line = budgetH
    ? `<line class="goal" x1="${ML}" x2="${W - MR}" y1="${y(budgetH)}" y2="${y(budgetH)}"/><text class="goal-label" x="${W - MR + 6}" y="${y(budgetH) + 4}">budget ${budgetH}h</text>`
    : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated sitting time by day, last 7 days${budgetH ? `, against a ${budgetH} hour budget` : ''}"><g class="grid axis">${grid}</g>${line}<g class="axis">${cols}</g></svg>`;
}

const LANE_NAME: Record<string, string> = { eye: 'Eye break', body: 'Body break', blink: 'Blink', posture: NUDGES.posture.name, snack: NUDGES.snack.name };
const ruleName = (id: string) => [...EYE_RULES, ...BODY_RULES].find((r) => r.id === id)?.name ?? (id.startsWith('custom') ? 'Custom' : '');

function logRow(e: LogEntry) {
  const lane = e.lane === 'body' || e.lane === 'snack' ? 'body' : 'eye';
  const label = e.kind === 'cue' && e.lane === 'body' ? 'Stand cue' : LANE_NAME[e.lane];
  const icon =
    e.kind === 'cue' && e.lane === 'body' ? icons.stand : e.lane === 'body' ? icons.walk : e.lane === 'eye' ? icons.eye : (e.lane as string) === 'blink' ? icons.blink : e.lane === 'snack' ? icons.bolt : icons.posture;
  return `<div class="log-row ${lane}"><span class="muted">${timeOfDay(e.t)}</span>${icon}<span>${label} <span class="muted small">${esc(ruleName(e.rule))}</span></span><span class="st ${e.status}">${e.status}</span></div>`;
}

export function renderStats(app: AppCtx) {
  const { log, days, settings, checklist } = app.store.get();
  const now = Date.now();
  const today = summarize(log, days, dayKey(now));
  const week = lastDays(log, days, now, 7);
  const score = ergoScore(today, setupPct(checklist));
  const run = streak(log, days, now, settings.goalPct);
  const recent = log.filter((e) => e.kind === 'break' || e.lane === 'body' || e.lane === 'snack').slice(-25).reverse();
  const totalFar = week.reduce((s, d) => s + d.eye.sec, 0);
  const totalMove = week.reduce((s, d) => s + d.body.sec, 0);

  return `<section class="view stats">
    <div class="card score-hero">
      <div class="score-ring">
        <svg width="0" height="0" style="position:absolute"><defs><linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--eye)"/><stop offset="1" stop-color="var(--body)"/></linearGradient></defs></svg>
        ${ring((score ?? 0) / 100)}
        <div class="num">${score ?? '–'}<small>ergo score</small></div>
      </div>
      <div>
        <h2>${score == null ? 'Your score appears after your first breaks' : score >= 80 ? 'Great rhythm today' : score >= 50 ? 'Decent rhythm. Keep the breaks coming' : 'Room to improve today'}</h2>
        <p class="muted" style="margin-top:6px">Today’s eye and body break follow-through (40% each) plus your workstation setup (20%).</p>
        <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <span class="chip">${icons.flame}<strong>${run}</strong> day streak at ≥${settings.goalPct}%</span>
          <span class="chip">${icons.eye}<strong>${duration(totalFar)}</strong> resting eyes this week</span>
          <span class="chip">${icons.walk}<strong>${duration(totalMove)}</strong> moving this week</span>
        </div>
      </div>
    </div>

    <div class="section card">
      <div class="section-title"><h2>Breaks taken, last 7 days</h2></div>
      <div class="legend"><span><i style="background:var(--eye)"></i>Eyes</span><span><i style="background:var(--body)"></i>Body</span></div>
      <div class="chart">${adherenceChart(week, settings.goalPct)}<div class="tooltip" hidden></div></div>
      <details class="table-view"><summary>Show as table</summary>
        <div class="table-scroll"><table><thead><tr><th>Day</th><th class="num">Eye breaks</th><th class="num">Body breaks</th><th class="num">Stood up</th><th class="num">Sitting (est.)</th><th class="num">Screen time</th></tr></thead>
        <tbody>${week
          .map(
            (d) =>
              `<tr><td>${longDate(d.key)}</td><td class="num">${d.eye.done}/${d.eye.done + d.eye.skipped + d.eye.missed}</td><td class="num">${d.body.done}/${d.body.done + d.body.skipped + d.body.missed}</td><td class="num">${d.stand.done}</td><td class="num">${duration(d.sittingSec)}</td><td class="num">${duration(d.activeSec)}</td></tr>`,
          )
          .join('')}</tbody></table></div>
      </details>
    </div>

    <div class="section card">
      <div class="section-title"><h2>Sitting, last 7 days</h2><p>Estimated: time ergo ran, minus standing and body breaks</p></div>
      <div class="chart">${sittingChart(week, settings.sitBudgetH)}<div class="tooltip" hidden></div></div>
      ${settings.sitBudgetH ? `<p class="muted small">Canada’s 24-hour movement guidelines suggest 8 hours or less of sitting a day, including off-screen time, which ergo can’t see. <a href="${evidenceUrl('sitting-budget')}" target="_blank" rel="noopener">Evidence</a></p>` : ''}
    </div>

    <div class="section card">
      <div class="section-title"><h2>Today’s log</h2><p>${today.eye.done + today.body.done} breaks · ${today.nudges} nudges</p></div>
      <div class="log-list">${recent.filter((e) => dayKey(e.t) === today.key).map(logRow).join('') || '<p class="muted">Nothing yet today.</p>'}</div>
    </div>
  </section>`;
}

export function bindStats(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.chart').forEach((chart) => {
    const tip = chart.querySelector<HTMLElement>('.tooltip')!;
    chart.querySelectorAll<SVGGElement>('.col').forEach((col) => {
      col.addEventListener('pointerenter', () => {
        const [title, ...lines] = (col.dataset.tip ?? '').split('|');
        tip.innerHTML = `<strong>${esc(title)}</strong>${lines.map((l) => `<div>${esc(l)}</div>`).join('')}`;
        const hit = col.querySelector('.hit')!.getBoundingClientRect();
        const box = chart.getBoundingClientRect();
        tip.style.left = `${Math.max(70, Math.min(box.width - 70, hit.left - box.left + hit.width / 2))}px`;
        tip.style.top = `${hit.top - box.top + 20}px`;
        tip.hidden = false;
      });
      col.addEventListener('pointerleave', () => (tip.hidden = true));
    });
  });
}
