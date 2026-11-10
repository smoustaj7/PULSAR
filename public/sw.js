// AstroPulse service worker: makes the app usable with no network (spacecraft links are
// intermittent). Readings already live in localStorage, so caching the app shell is enough.
//   - Page navigations: network first, fall back to the cached shell when offline.
//   - Hashed build assets (/assets/*): cache first. A new build means new file names.
//   - Everything else (the 3D model, icons, manifest): served from cache when there is one,
//     and refreshed in the background, so an updated file reaches the next visit.
// Bump CACHE to force clients to drop old caches. v2 drops v1, which kept the model forever.
const CACHE = 'astropulse-v3'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  const save = (response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }

  // Content-hashed by Vite: the name changes whenever the file does, so the cache is never stale.
  if (new URL(request.url).pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(save)))
    return
  }

  // Same name across deploys: answer from cache for speed and offline use, but always
  // fetch a fresh copy behind it so the next visit gets any update.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request).then(save)
      if (!cached) return fresh
      event.waitUntil(fresh.catch(() => {}))
      return cached
    }),
  )
})
