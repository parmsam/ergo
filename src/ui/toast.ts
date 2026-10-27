import { esc } from './dom';
import { icons } from './icons';

export interface ToastOptions {
  title?: string;
  icon?: keyof typeof icons;
  tone?: 'eye' | 'body';
  /** ms; 0 keeps it until an action or dismiss. */
  duration?: number;
  actions?: { label: string; primary?: boolean; run: () => void }[];
  id?: string;
}

const root = () => {
  let el = document.getElementById('toasts');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toasts';
    el.className = 'toasts';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  return el;
};

export function dismissToast(id: string) {
  const el = document.querySelector<HTMLElement>(`.toast[data-id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

export function toast(text: string, o: ToastOptions = {}) {
  if (o.id) document.querySelector(`.toast[data-id="${CSS.escape(o.id)}"]`)?.remove();
  const el = document.createElement('div');
  el.className = `toast ${o.tone ?? ''}`;
  if (o.id) el.dataset.id = o.id;
  el.innerHTML = `${o.icon ? `<div class="t-icon">${icons[o.icon]}</div>` : ''}
    <div class="t-text">${o.title ? `<strong>${esc(o.title)}</strong>` : ''}${esc(text)}</div>
    <div class="t-actions"></div>`;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  };
  const actions = el.querySelector('.t-actions')!;
  for (const a of o.actions ?? []) {
    const b = document.createElement('button');
    b.className = `btn sm ${a.primary ? 'primary' : 'ghost'}`;
    b.textContent = a.label;
    b.onclick = () => {
      a.run();
      close();
    };
    actions.append(b);
  }
  root().append(el);
  const d = o.duration ?? 5000;
  if (d > 0) setTimeout(close, d);
  return close;
}
