/** Inline stroke icons (24×24, currentColor). */
const svg = (body: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const icons = {
  eye: svg('<path d="M2.5 12C5 7.5 8.2 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.7 6.5-9.5 6.5S5 16.5 2.5 12Z"/><circle cx="12" cy="12" r="3"/>'),
  body: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v7M8 10.5l4-2 4 2M9.5 21l2.5-6.5 2.5 6.5"/>'),
  stand: svg('<circle cx="12" cy="4" r="2"/><path d="M12 7v8M9 9.5h6M10 21v-6h4v6"/>'),
  walk: svg('<circle cx="13.5" cy="4" r="2"/><path d="M11 21l2-6-2.5-2.5L12 8l3 3 3 1M8.5 11l2-3M14.5 15l2.5 6"/>'),
  blink: svg('<path d="M2.5 11c2.5 3.5 5.7 5 9.5 5s7-1.5 9.5-5M5.5 14.5 4 17M9.5 16l-.6 2.8M14.5 16l.6 2.8M18.5 14.5 20 17"/>'),
  posture: svg('<path d="M12 3v18M8 7c2 1.5 6 1.5 8 0M8 12c2 1.5 6 1.5 8 0M8 17c2 1.5 6 1.5 8 0"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none"/>'),
  pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>'),
  stop: svg('<rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" stroke="none"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  snooze: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2.5M5 3.5 2.5 6M19 3.5 21.5 6"/>'),
  skip: svg('<path d="M5 5l9 7-9 7V5ZM18 5v14"/>'),
  home: svg('<path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  bolt: svg('<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z"/>'),
  flame: svg('<path d="M12 21.5c-4 0-7-2.7-7-6.5 0-3.5 2.5-5.5 4-8 .5 2 1.5 3 3 3.5-.5-3 1-6 3.5-8 0 4 3.5 6.5 3.5 11.5 0 4.3-3 7.5-7 7.5Z"/>'),
  link: svg('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
  bell: svg('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21h4"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
};

export const logo = (size = 28) =>
  `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="var(--logo-bg)"/>
    <path class="logo-eye" d="M7 32c6.5-10 15-15 25-15s18.5 5 25 15c-6.5 10-15 15-25 15S13.5 42 7 32Z" fill="none" stroke="var(--eye)" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="9.5" fill="none" stroke="var(--eye)" stroke-opacity=".22" stroke-width="4"/>
    <circle class="logo-arc" cx="32" cy="32" r="9.5" fill="none" stroke="var(--body)" stroke-width="4" stroke-linecap="round" stroke-dasharray="44 60" transform="rotate(-90 32 32)"/>
    <circle cx="32" cy="32" r="3.2" fill="var(--text)"/>
  </svg>`;
