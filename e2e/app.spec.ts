import { expect, open, test } from './helpers';

// awayMin is raised because fastForward jumps the clock in one step, which otherwise reads as the laptop sleeping.
const quiet = { settings: { nudges: { blink: { on: false, everyMin: 10 }, posture: { on: false, everyMin: 15 } }, notify: false, awayMin: 60 } };

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
