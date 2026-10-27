// Captures README screenshots from a running preview server (npm run preview -- --port 4179).
import { chromium, devices } from '@playwright/test';

const base = process.env.URL ?? 'http://localhost:4179/ergo/';
const out = process.argv[2] ?? 'docs';
const T0 = new Date('2026-06-01T09:00:00').getTime();
const day = (n, h) => T0 - n * 86400000 + h * 3600000;
// A plausible week of history so Progress has something to show.
const log = [];
for (let d = 6; d >= 0; d--) {
  for (let i = 0; i < 14 - d; i++) log.push({ t: day(d, i * 0.35), lane: 'eye', rule: '20-20-20', kind: 'break', status: (i + d) % 5 === 0 ? 'skipped' : 'done', sec: 20 });
  for (let i = 0; i < 9 - (d % 3); i++) log.push({ t: day(d, i * 0.5 + 0.2), lane: 'body', rule: '20-8-2', kind: 'break', status: (i + d) % 4 === 0 ? 'skipped' : 'done', sec: 120 });
  for (let i = 0; i < 6; i++) log.push({ t: day(d, i * 0.5 + 0.1), lane: 'body', rule: '20-8-2', kind: 'cue', status: i % 3 ? 'done' : 'shown', sec: 0 });
}
const days = {};
for (let d = 6; d >= 0; d--) {
  const k = new Date(day(d, 0)).toLocaleDateString('en-CA');
  days[k] = { activeSec: (4 + ((d * 7) % 4)) * 3600 + 1800 };
}
const seed = { log, days, checklist: { 'screen-distance': true, 'screen-height': true, glare: true, feet: true, arms: true, 'sit-stand': true, 'move-daily': true }, settings: { notify: false, awayMin: 600 } };

async function shot(ctxOpts, name, fn, theme = 'dark') {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...ctxOpts, colorScheme: theme });
  const page = await ctx.newPage();
  await page.clock.install({ time: T0 + 6.4 * 3600000 });
  await page.addInitScript((s) => {
    if (localStorage.getItem('ergo:v1:seeded')) return;
    localStorage.setItem('ergo:v1:seeded', '1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem(`ergo:v1:${k}`, JSON.stringify(v));
  }, seed);
  await page.goto(base);
  await page.waitForTimeout(1200);
  await fn(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await browser.close();
  console.log('wrote', name);
}

const desktop = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 };
const phone = { ...devices['iPhone 14'] };
const running = async (p) => {
  await p.getByRole('button', { name: 'Start reminders' }).click();
  await p.clock.fastForward('12:10');
  await p.waitForTimeout(1500);
};
await shot(desktop, 'screenshot-desktop', running);
await shot(desktop, 'screenshot-light', running, 'light');
await shot(desktop, 'screenshot-break', async (p) => {
  await p.getByRole('button', { name: 'Start reminders' }).click();
  await p.keyboard.press('b');
  await p.clock.fastForward('00:40');
  await p.waitForTimeout(1500);
});
await shot(desktop, 'screenshot-eye-break', async (p) => {
  await p.getByRole('button', { name: 'Start reminders' }).click();
  await p.keyboard.press('e');
  await p.clock.fastForward('00:06');
  await p.waitForTimeout(1500);
});
await shot(desktop, 'screenshot-progress', async (p) => {
  await p.getByRole('link', { name: 'Progress' }).click();
  await p.waitForTimeout(1200);
});
await shot(desktop, 'screenshot-guide', async (p) => {
  await p.getByRole('link', { name: 'Guide' }).click();
  await p.waitForTimeout(900);
});
await shot(phone, 'screenshot-mobile', running);
