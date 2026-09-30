// Offline support: cache the app shell, serve it cache-first, refresh in the background.
var CACHE = 'grocery-list-v1';
var ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;

  // ignoreSearch so shared links (?data=...) still load offline.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          var key = new URL(e.request.url);
          key.search = '';
          caches.open(CACHE).then(function (c) { c.put(key.toString(), copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
