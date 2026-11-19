// Offline reading: on install, cache every page listed in the sitemap.
// Pages are fetched fresh when online and served from the cache when not.
const CACHE = 'dhikr-v1';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = ['/'];
    try {
      const xml = await (await fetch('/sitemap.xml')).text();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(new URL(m[1]).pathname);
    } catch (e) {}
    await Promise.allSettled(urls.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      try {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('/'));
      }
    }
    const hit = await cache.match(req);
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  })());
});
