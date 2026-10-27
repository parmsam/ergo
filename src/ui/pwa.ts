import { registerSW } from 'virtual:pwa-register';
import { toast } from './toast';

/** Registers the service worker. New versions wait for the user so a break in progress isn't cut off. */
export function setupPwa(isBusy: () => boolean) {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      toast(isBusy() ? 'A new version is ready. Reload after this break.' : 'A new version of ergo is available.', {
        icon: 'bolt',
        duration: 60_000,
        actions: [{ label: 'Reload', primary: true, run: () => void updateSW(true) }],
      });
    },
    onOfflineReady() {
      toast('ergo now works offline.', { icon: 'check', duration: 4000 });
    },
  });
}
