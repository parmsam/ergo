const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text for interpolation into HTML templates. */
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** SVG progress ring. `frac` 0..1 is how much is filled. */
export const R = 52;
export const CIRC = 2 * Math.PI * R;
export const ring = (frac: number, attrs = '') =>
  `<svg class="ring" viewBox="0 0 120 120" ${attrs}><circle class="track" cx="60" cy="60" r="${R}"/><circle class="prog" cx="60" cy="60" r="${R}" stroke-dasharray="${CIRC.toFixed(2)}" stroke-dashoffset="${(CIRC * (1 - frac)).toFixed(2)}"/></svg>`;

export function setRing(svg: Element | null, frac: number) {
  const c = svg?.querySelector('.prog');
  c?.setAttribute('stroke-dashoffset', (CIRC * (1 - Math.max(0, Math.min(1, frac)))).toFixed(2));
}
