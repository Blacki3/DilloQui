/* Service Worker DILLOQUI — Web Push + click sulla notifica */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'DILLOQUI', body: 'Hai una nuova notifica', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    // payload non JSON
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'DILLOQUI', {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/favicon.svg',
      data: { url: data.url || '/' },
      tag: data.tag || 'dilloqui',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
