// Renders the PWA/apple-touch PNG icons from the SVG mark using Playwright's Chromium.
// Run after changing the logo: npm run icons
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const eye = `<path d="M7 32c6.5-10 15-15 25-15s18.5 5 25 15c-6.5 10-15 15-25 15S13.5 42 7 32Z" fill="none" stroke="#5ee0c9" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="32" cy="32" r="9.5" fill="none" stroke="#5ee0c9" stroke-opacity=".22" stroke-width="4"/>
  <circle cx="32" cy="32" r="9.5" fill="none" stroke="#ffb36b" stroke-width="4" stroke-linecap="round" stroke-dasharray="44 60" transform="rotate(-90 32 32)"/>
  <circle cx="32" cy="32" r="3.2" fill="#eef7f5"/>`;
const grad = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16303a"/><stop offset="1" stop-color="#0b161a"/></linearGradient></defs>`;

/** rounded: transparent corners (normal icons). full: full-bleed square (apple-touch, maskable). scale shrinks the mark into the maskable safe zone. */
const svg = (size, { rounded = true, scale = 1 } = {}) => {
  const o = 32 - 32 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${grad}
    <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#bg)"/>
    <g transform="translate(${o} ${o}) scale(${scale})">${eye}</g></svg>`;
};

const targets = [
  ['public/pwa-192.png', 192, {}],
  ['public/pwa-512.png', 512, {}],
  ['public/pwa-maskable-512.png', 512, { rounded: false, scale: 0.72 }],
  ['public/apple-touch-icon.png', 180, { rounded: false, scale: 0.86 }],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, opts] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, opts)}</body></html>`);
  writeFileSync(file, await page.locator('svg').screenshot({ omitBackground: true }));
  console.log('wrote', file);
}
await browser.close();
