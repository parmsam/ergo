import { expect, open, test } from './helpers';

// awayMin is raised because fastForward jumps the clock in one step, which otherwise reads as the laptop sleeping.
const quiet = { settings: { nudges: { posture: { on: false, everyMin: 15 }, snack: { on: false, everyMin: 120 } }, notify: false, awayMin: 60 } };

test('starts, runs an eye break at 20 min, and logs it', async ({ page }) => {
  await open(page, quiet);
  await expect(page.getByRole('heading', { name: 'Eyes' })).toBeVisible();
  await page.getByRole('button', { name: 'Start reminders' }).click();
  await expect(page.locator('[data-bind="status"]')).toHaveText('Running');

  await page.clock.fastForward('20:00');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 4000 });
  await expect(dialog.getByRole('heading', { name: 'Look far' })).toBeVisible();
  await dialog.getByRole('button', { name: /Done/ }).click();
  await expect(dialog).toBeHidden({ timeout: 4000 });

  await expect(page.locator('.tile').first()).toContainText('1');
  await expect(page).toHaveTitle(/👁 1?\d:\d\d · 🧍 \d+:\d\d/);
});

test('stand cue shows a toast on 20-8-2', async ({ page }) => {
  await open(page, quiet);
  await page.getByRole('button', { name: 'Start reminders' }).click();
  await page.clock.fastForward('20:00');
  await page.keyboard.press('d'); // dismiss the eye break that lands at the same time
  await expect(page.getByText('Time to stand')).toBeVisible({ timeout: 4000 });
  await page.getByRole('button', { name: 'I’m standing' }).click();
  await expect(page.getByText('Time to stand')).toBeHidden();
});

test('break now, snooze and skip from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcuts are a desktop feature');
  await open(page, quiet);
  await page.keyboard.press(' ');
  await page.keyboard.press('b');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Move' })).toBeVisible();
  await page.keyboard.press('z');
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 4000 });
  await page.keyboard.press('e');
  await page.keyboard.press('s');
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.locator('.log-row')).toHaveCount(2);
  await expect(page.locator('.log-row .st').first()).toHaveText('skipped');
});

test('changing the eye rule in the guide applies it', async ({ page }) => {
  await open(page, quiet, '#guide');
  await page.locator('.rule-card', { hasText: '30-30-30' }).getByRole('button', { name: 'Use this' }).click();
  await expect(page.locator('.rule-card.selected', { hasText: '30-30-30' })).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.locator('.lane.eye .time')).toHaveText('30:00');
});

test('workstation checklist persists', async ({ page }) => {
  await open(page, quiet, '#guide');
  await page.getByText('No glare: screen side-on to windows').click();
  await page.reload();
  await expect(page.locator('[data-check="glare"]')).toBeChecked();
});

test('link action starts a body break', async ({ page }) => {
  await open(page, quiet, '?do=break&lane=body');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Move' })).toBeVisible();
});

test('guide shows sourced myths and the 3 min active rule', async ({ page }) => {
  await open(page, quiet, '#guide');
  await expect(page.getByText('Blue-light glasses prevent digital eye strain.')).toBeVisible();
  await page.locator('.rule-card', { hasText: '3 min active / 30' }).getByRole('button', { name: 'Use this' }).click();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.locator('.lane.body .time')).toHaveText('30:00');
  await expect(page.locator('.tile', { hasText: 'Sitting (est.)' })).toContainText('of 8h budget');
});

test('exercise snack toast logs when acknowledged', async ({ page }) => {
  await open(page, { settings: { ...quiet.settings, nudges: { ...quiet.settings.nudges, snack: { on: true, everyMin: 30 } } } });
  await page.getByRole('button', { name: 'Start reminders' }).click();
  await page.clock.fastForward('30:00');
  await page.getByRole('button', { name: 'Did it' }).click({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.tile', { hasText: 'Exercise snacks' })).toContainText('1');
});

test('opening an exercise card does not stretch its row-mates', async ({ page }) => {
  await open(page, quiet, '#guide');
  const palming = page.locator('.ex-card', { hasText: 'Palming' });
  const farGaze = page.locator('.ex-card', { hasText: 'Far gaze' });
  const before = (await farGaze.boundingBox())!.height;
  await palming.locator('summary').click();
  await expect(palming.locator('ol')).toBeVisible();
  expect((await farGaze.boundingBox())!.height).toBe(before);
  await palming.locator('summary').dblclick();
  expect(await page.evaluate(() => String(getSelection()))).toBe('');
});

test('expand all opens and collapses an exercise area', async ({ page }) => {
  await open(page, quiet, '#guide');
  const eyes = page.locator('.area-head', { hasText: 'Eyes' });
  const cards = page.locator('[data-area="Eyes"] details');
  await eyes.getByRole('button', { name: 'Expand all' }).click();
  for (const d of await cards.all()) await expect(d).toHaveAttribute('open', '');
  await expect(eyes.getByRole('button')).toHaveText('Collapse all');
  await cards.first().locator('summary').click();
  await expect(eyes.getByRole('button')).toHaveText('Expand all');
  await eyes.getByRole('button').click();
  await eyes.getByRole('button', { name: 'Collapse all' }).click();
  for (const d of await cards.all()) await expect(d).not.toHaveAttribute('open', '');
});

test('pause menu, resume and end day update the controls', async ({ page }) => {
  await open(page, quiet);
  await page.getByRole('button', { name: 'Start reminders' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('menuitem', { name: 'For 30 minutes (meeting)' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('[data-bind="status"]')).toHaveText('Paused');
  await expect(page.locator('[data-bind="paused"]')).toContainText('Paused until');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('[data-bind="status"]')).toHaveText('Running');
  await page.getByRole('button', { name: 'End day' }).click();
  await expect(page.getByRole('button', { name: 'Start reminders' })).toBeVisible();
  await expect(page.locator('[data-bind="status"]')).toHaveText('Off');
});
