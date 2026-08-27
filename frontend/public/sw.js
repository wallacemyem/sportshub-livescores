// SlipRadar Advanced Live Match & Web Push Service Worker
const SW_VERSION = 'v2.1.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Prune old caches if any
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// 1. Handle Web Push Events (Background notifications & Live Match Updates)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { title: '⚽ SlipRadar Alert', body: event.data.text() };
    }

    const title = data.title || '⚽ SlipRadar Live Alert';
    const tag = data.tag || (data.match_id ? `sr-live-${data.match_id}` : 'sr-general');
    const isLiveScore = tag.startsWith('sr-live-');

    const options = {
      body: data.body || 'Live score update in active match',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/badge-72.png',
      tag: tag,
      // If silent is explicitly requested (e.g. clock tick), do not make sound/vibrate
      silent: data.silent === true,
      // Renotify alerts the user again even if the card with the same tag is already on screen
      renotify: data.renotify !== false && !data.silent,
      // Keeps the ongoing live score card pinned in the shade on platforms that support it
      requireInteraction: data.requireInteraction !== false && isLiveScore,
      vibrate: data.vibrate || (data.silent ? [] : [200, 100, 200]),
      timestamp: Date.now(),
      data: {
        url: data.url || (data.match_id ? `/match/${data.match_id}` : '/live'),
        matchId: data.match_id,
        kind: data.type || (isLiveScore ? 'live_activity' : 'broadcast'),
        ...data.data,
      },
      actions: [
        {
          action: 'open_match',
          title: isLiveScore ? '⚡ Match Center' : 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[SW] Error displaying push notification:', e);
  }
});

// 2. Handle Notification Interaction (Clicks & Action Buttons)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/live';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open with the same target URL, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          const clientPath = new URL(client.url).pathname;
          const targetPath = new URL(urlToOpen, self.location.origin).pathname;
          if (clientPath === targetPath || clientPath === '/live') {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 3. Handle Direct Messages from App Tabs (for foreground live activity sync)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === 'SYNC_LIVE_ACTIVITY' && payload) {
    const { title, body, matchId, alert } = payload;
    self.registration.showNotification(title, {
      body,
      tag: `sr-live-${matchId}`,
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      silent: !alert,
      renotify: !!alert,
      requireInteraction: true,
      vibrate: alert ? [200, 100, 200] : [],
      data: { url: `/match/${matchId}`, matchId, kind: 'live-activity' },
    });
  } else if (type === 'CLEAR_LIVE_ACTIVITY' && payload?.matchId) {
    self.registration.getNotifications({ tag: `sr-live-${payload.matchId}` }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  } else if (type === 'CLEAR_ALL_ACTIVITIES') {
    self.registration.getNotifications().then((notifications) => {
      notifications.filter((n) => n.tag?.startsWith('sr-live-')).forEach((n) => n.close());
    });
  }
});
