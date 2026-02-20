const CACHE_NAME = 'songbook-cache-v1';
const CORE_ASSETS = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'songs.json',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'audio/amazing_grace.mp3',
    'audio/another_song.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            )
        )
    );
    self.clients.claim();
});

function isHttpRequest(request) {
    return request.url.startsWith('http://') || request.url.startsWith('https://');
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || !isHttpRequest(request)) return;

    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    if (isSameOrigin && url.pathname.endsWith('/songs.json')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    if (isSameOrigin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    return response;
                });
            })
        );
    }
});
