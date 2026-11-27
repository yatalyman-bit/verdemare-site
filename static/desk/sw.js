// Verdemare Studio: works offline. Bump VERSION when you change the app.
const VERSION = "vd-13";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./voucher.html", "./logo.png", "./social.html", "./client-zip.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonts) return;
  if (url.pathname.includes("/api/")) return; // data always from the server
  // network first, so updates arrive; cache as fallback when offline
  e.respondWith(fetch(req).then(res => {
    if ((res.ok && !res.redirected) || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
