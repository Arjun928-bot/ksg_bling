// Minimal service worker: lets the app be installed. It does not cache bills or stock,
// so staff always see live data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
