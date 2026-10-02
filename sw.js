// Service worker: makes the app installable and shows maintenance notifications,
// even when the app is closed. The number on the icon = unread notifications.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAITf_I-gz_btPtnoIYnM4K0ihTtTBU66s',
  authDomain: 'crown-maintenance.firebaseapp.com',
  projectId: 'crown-maintenance',
  storageBucket: 'crown-maintenance.firebasestorage.app',
  messagingSenderId: '497420751997',
  appId: '1:497420751997:web:ad48a5fb3ba9689407cd14'
});
const messaging = firebase.messaging();

// New request arrives while the app is closed or in the background
messaging.onBackgroundMessage(async payload => {
  const d = payload.data || {};
  await self.registration.showNotification(d.title || 'New maintenance request', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'req-' + Date.now(),          // each request is its own notification, so the count adds up
    data: { url: d.url || './' }
  });
  const open = await self.registration.getNotifications();
  if (self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(open.length); } catch (e) {} }
});

// Tapping a notification opens the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    return clients.openWindow(e.notification.data && e.notification.data.url || './');
  })());
});

// ---- App shell (lets Chrome install it) ----
const CACHE = 'maintenance-app-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
