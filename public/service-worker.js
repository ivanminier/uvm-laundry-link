const CACHE_NAME = 'laundrylink-static-v3';
const SHELL_URLS = ['/index.html', '/manifest.json', '/favicon.ico', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('laundrylink-static-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const path = new URL(request.url).pathname;
          await cache.put(path === '/' ? '/index.html' : path, response.clone());
        }
        return response;
      } catch {
        const path = new URL(request.url).pathname;
        return await cache.match(path === '/' ? '/index.html' : path) || Response.error();
      }
    }

    const path = new URL(request.url).pathname;
    if (['/site.css', '/referrals.js', '/robots.txt', '/sitemap.xml'].includes(path)) {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return await cache.match(request) || Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }));
});

self.addEventListener('push', (event) => {
  let notification;
  try {
    notification = event.data?.json();
  } catch {
    return;
  }
  if (typeof notification?.title !== 'string') return;
  event.waitUntil(self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: '/logo192.png',
    tag: notification.tag,
    data: { path: notification.path },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.path;
  const url = new URL(typeof path === 'string' && path.startsWith('#room/') ? path : '/', self.location.origin + '/');
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const matching = windows.find((client) => client.url === url.href);
    if (matching) {
      matching.postMessage({ type: 'OPEN_MACHINE', path: url.hash });
      return matching.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});
