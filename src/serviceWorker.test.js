/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('preloads the canonical shell and compiled assets for the first offline navigation', async () => {
  const origin = 'https://uvmlaundry.com';
  const cache = new Map();
  const listeners = {};
  const oldCaches = ['laundrylink-static-v3', 'unrelated'];
  const shell = { ok: true, redirected: false };
  const entrypoints = ['/static/js/main.hash.js', '/static/css/main.hash.css'];
  const source = readFileSync('public/service-worker.js', 'utf8')
    .replace('const APP_ENTRYPOINTS = [];', `const APP_ENTRYPOINTS = ${JSON.stringify(entrypoints)};`);
  const self = {
    location: { origin },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn() },
  };
  const caches = {
    open: async () => ({
      addAll: async (requests) => {
        for (const request of requests) {
          cache.set(request.url, request.url === '/' ? shell : { ok: true, redirected: request.url === '/index.html' });
        }
      },
      match: async (path) => cache.get(path),
    }),
    keys: async () => oldCaches,
    delete: jest.fn(),
  };
  const fetch = jest.fn(async () => { throw new Error('Offline'); });
  runInNewContext(source, {
    self, caches, fetch, URL, Response: { error: () => ({ ok: false }) },
    Request: function (url) { this.url = url; },
  });
  const dispatch = async (name, event = {}) => {
    let result;
    const respond = (promise) => { result = promise; };
    listeners[name]({ ...event, waitUntil: respond, respondWith: respond });
    return result;
  };

  await dispatch('install');
  expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  expect(cache.has('/index.html')).toBe(false);
  expect(entrypoints.every((path) => cache.has(path))).toBe(true);
  await dispatch('activate');
  expect(caches.delete.mock.calls).toEqual([['laundrylink-static-v3']]);
  expect(self.clients.claim).toHaveBeenCalledTimes(1);
  const request = { url: origin + '/?source=pwa', method: 'GET', mode: 'navigate' };
  expect(await dispatch('fetch', { request })).toBe(shell);
  expect(fetch).toHaveBeenCalledWith(request);
});
