// Imported into the generated service worker. Clicking a notification focuses ergo;
// action buttons (Done / Snooze) are forwarded to the open page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action || 'open';
  const tag = event.notification.tag;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = all[0];
      if (client) {
        client.postMessage({ type: 'ergo-notification', action, tag });
        if (action === 'open' && 'focus' in client) await client.focus();
      } else if (action === 'open') {
        await self.clients.openWindow(self.registration.scope);
      }
    })(),
  );
});
