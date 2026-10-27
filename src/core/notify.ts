/** System notifications. Prefers the service worker (needed on Android, and enables action buttons). */

export const notifySupported = () => typeof Notification !== 'undefined';
export const notifyGranted = () => notifySupported() && Notification.permission === 'granted';

export async function requestNotify(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export interface NotifyOptions {
  body: string;
  tag: string;
  /** Stay on screen until dismissed (used when escalating). */
  sticky?: boolean;
  actions?: { action: string; title: string }[];
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export async function notify(title: string, o: NotifyOptions) {
  if (!notifyGranted()) return;
  const icon = `${import.meta.env.BASE_URL}pwa-192.png`;
  const reg = await registration();
  try {
    if (reg) {
      await reg.showNotification(title, { body: o.body, tag: o.tag, icon, badge: icon, requireInteraction: o.sticky, actions: o.actions } as NotificationOptions);
      return;
    }
    const n = new Notification(title, { body: o.body, tag: o.tag, icon, requireInteraction: o.sticky });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some browsers throw for page-level notifications; nothing else to do */
  }
}

export async function closeNotifications(tag: string) {
  const reg = await registration();
  try {
    (await reg?.getNotifications({ tag }))?.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}
