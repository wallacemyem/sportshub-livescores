'use client';

import type { Match } from '@/types';
import { formatClock, formatScore, scoreNoun } from '@/lib/sportFormat';

/**
 * Ongoing, self-updating notifications for live matches.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT
 *
 * On Android (Chrome/Edge) a notification re-shown under the same `tag`
 * replaces the previous one in place. With `silent: true` and
 * `renotify: false` it updates without re-alerting, which gives a single
 * persistent card that tracks the score and clock for the duration of a match.
 * That is the web platform's closest equivalent to a live activity, and it is
 * what this module builds.
 *
 * It is NOT an iOS Live Activity. ActivityKit — the Dynamic Island and lock
 * screen widgets — is only available to native apps; there is no web API for
 * it, installed PWA or otherwise. On iOS 16.4+ an installed PWA can receive
 * web push and show ordinary notifications, and this module works there to
 * that extent, but the Dynamic Island presentation requires shipping a native
 * app. See NOTIFICATIONS.md.
 *
 * Everything here degrades quietly: no service worker, no permission, or an
 * unsupported browser simply means no activity is posted.
 */

const TAG_PREFIX = 'sr-live-';

/** Matches we are currently showing an activity for. */
const active = new Set<string>();

function tagFor(matchId: string): string {
  return `${TAG_PREFIX}${matchId}`;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Body line: "Arsenal 2 - 1 Man City · 68'". */
function activityBody(match: Match): string {
  return `${match.home_team.name} ${formatScore(match)} ${match.away_team.name} · ${formatClock(match)}`;
}

export interface ActivityOptions {
  /** Set when this update is a score change, so it alerts rather than updating quietly. */
  alert?: boolean;
  /** Which side just scored, used for the alert title. */
  scoringSide?: 'HOME' | 'AWAY';
}

/**
 * Post or update the activity for one match.
 *
 * Called on every poll for every tracked live match. Updates are silent; only
 * a score change alerts.
 */
export async function updateLiveActivity(
  match: Match,
  options: ActivityOptions = {}
): Promise<void> {
  const registration = await getRegistration();
  if (!registration) return;

  if (match.status !== 'LIVE' && match.status !== 'HALF_TIME') {
    await endLiveActivity(match.id);
    return;
  }

  const { alert = false, scoringSide } = options;

  const scorer =
    scoringSide === 'HOME' ? match.home_team.name : scoringSide === 'AWAY' ? match.away_team.name : '';
  const unit = scoreNoun(match.sport, 1).toUpperCase();

  const title = alert
    ? `${match.sport === 'soccer' ? 'GOAL' : unit}! ${scorer}`
    : `${match.home_team.short_name || match.home_team.name} v ${match.away_team.short_name || match.away_team.name}`;

  try {
    await registration.showNotification(title, {
      body: activityBody(match),
      tag: tagFor(match.id),
      // A quiet in-place refresh unless something actually happened.
      silent: !alert,
      renotify: alert,
      // Keeps the card on screen for the duration of the match on platforms
      // that honour it, which is what makes it read as an ongoing activity.
      requireInteraction: true,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      timestamp: Date.now(),
      data: {
        url: `/match/${match.id}`,
        matchId: match.id,
        kind: 'live-activity',
      },
    } as NotificationOptions);

    active.add(match.id);
  } catch {
    // Some browsers reject requireInteraction or renotify without a tag;
    // an activity is a nicety, so failure is not surfaced.
  }
}

/** Remove the activity for a match that has finished or is no longer tracked. */
export async function endLiveActivity(matchId: string): Promise<void> {
  active.delete(matchId);

  const registration = await getRegistration();
  if (!registration) return;

  try {
    const shown = await registration.getNotifications({ tag: tagFor(matchId) });
    shown.forEach((n) => n.close());
  } catch {
    // ignore
  }
}

/**
 * Reconcile the set of activities against the matches that should have one.
 *
 * Anything previously shown that is no longer live, or no longer in the
 * tracked set, is closed. This is what stops finished matches leaving a stale
 * card pinned in the shade.
 */
export async function syncLiveActivities(
  liveMatches: Match[],
  scoredIds: Map<string, 'HOME' | 'AWAY'> = new Map()
): Promise<void> {
  const registration = await getRegistration();
  if (!registration) return;

  const shouldBeActive = new Set(liveMatches.map((m) => m.id));

  for (const id of Array.from(active)) {
    if (!shouldBeActive.has(id)) await endLiveActivity(id);
  }

  await Promise.all(
    liveMatches.map((m) =>
      updateLiveActivity(m, {
        alert: scoredIds.has(m.id),
        scoringSide: scoredIds.get(m.id),
      })
    )
  );
}

/** Close every activity, e.g. when the user turns alerts off. */
export async function clearAllLiveActivities(): Promise<void> {
  const registration = await getRegistration();
  if (registration) {
    try {
      const shown = await registration.getNotifications();
      shown
        .filter((n) => n.tag?.startsWith(TAG_PREFIX))
        .forEach((n) => n.close());
    } catch {
      // ignore
    }
  }
  active.clear();
}

/**
 * Register the service worker.
 *
 * This was never called anywhere, which is why notifications only ever worked
 * while a tab was focused: without a registration there is no push handler and
 * no way to show a notification that outlives the page.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/** What the current platform can actually do, for honest UI copy. */
export interface NotificationCapability {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  /** iOS requires the PWA to be installed to the home screen before push works. */
  requiresInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  /** True only where an ongoing, updating notification is expected to work well. */
  supportsOngoing: boolean;
}

export function getNotificationCapability(): NotificationCapability {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      supported: false,
      permission: 'unsupported',
      requiresInstall: false,
      isIOS: false,
      isStandalone: false,
      supportsOngoing: false,
    };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  return {
    supported: true,
    permission: Notification.permission,
    // On iOS, Safari only exposes push to an installed home-screen PWA.
    requiresInstall: isIOS && !isStandalone,
    isIOS,
    isStandalone,
    // iOS shows these as ordinary notifications; it does not keep them updating
    // in place the way Android does.
    supportsOngoing: !isIOS,
  };
}
