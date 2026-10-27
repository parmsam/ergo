import { test as base, expect, type Page } from '@playwright/test';

/** Fails the test on any uncaught page error. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const T0 = new Date('2026-06-01T09:00:00').getTime();

/** Open the app with a fake clock and optional localStorage seed. */
export async function open(page: Page, seed: Record<string, unknown> = {}, path = '') {
  await page.clock.install({ time: T0 });
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(s)) localStorage.setItem(`ergo:v1:${k}`, JSON.stringify(v));
  }, seed);
  await page.goto(path);
  await expect(page.locator('#splash')).toHaveCount(0, { timeout: 5000 });
}
