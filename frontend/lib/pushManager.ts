'use client';

import { getApiBaseUrl } from '@/lib/api';

/**
 * Converts a base64url string to Uint8Array for applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects current device platform for tailored PWA & push experience
 */
export function getDevicePlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Checks if the app is currently running as an installed standalone PWA
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Fetches the backend public VAPID key
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/notifications/vapid-key`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.public_key || null;
  } catch (err) {
    console.warn('[Push] Failed to fetch VAPID key:', err);
    return null;
  }
}

export interface SubscribePushOptions {
  channels?: string[];
  token?: string | null;
}

export interface PushSubscriptionResult {
  success: boolean;
  permission?: NotificationPermission;
  error?: string;
}

/**
 * Full seamless browser Web Push subscription flow:
 * 1. Register/verify Service Worker
 * 2. Request Notification Permission
 * 3. Subscribe with VAPID Application Server Key
 * 4. Submit endpoint & channel keys to Backend
 */
export async function subscribeToPush(
  options: SubscribePushOptions = {}
): Promise<PushSubscriptionResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Web Push is not supported in this browser environment.' };
  }

  // 1. Request Notification permission
  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, permission: perm, error: 'Notification permission was denied.' };
    }
  }

  try {
    // 2. Ensure Service Worker is registered and ready
    const registration = await navigator.serviceWorker.ready;

    // 3. Fetch server public VAPID key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, permission: perm, error: 'Server VAPID public key unavailable.' };
    }

    // 4. Subscribe via PushManager
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let sub = await registration.pushManager.getSubscription();

    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const subJSON = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = subJSON.keys?.p256dh || '';
    const auth = subJSON.keys?.auth || '';

    if (!endpoint || !p256dh || !auth) {
      return { success: false, permission: perm, error: 'Failed to extract push encryption keys from browser.' };
    }

    // 5. Send registration payload to backend
    const apiBase = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const payload = {
      endpoint,
      p256dh,
      auth,
      device_type: getDevicePlatform(),
      channels: options.channels || ['all', 'live_matches', 'goal_alerts', 'betslip_alerts'],
      user_agent: navigator.userAgent,
    };

    const res = await fetch(`${apiBase}/notifications/subscribe`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Push] Backend subscription failed:', errText);
    }

    localStorage.setItem('slipradar_push_subscribed', 'true');
    localStorage.setItem('slipradar_push_endpoint', endpoint);
    localStorage.setItem('slipradar_alerts_enabled', 'true');

    return { success: true, permission: perm };
  } catch (err: any) {
    console.error('[Push] Subscribe error:', err);
    return { success: false, permission: perm, error: err.message || 'Subscription failed.' };
  }
}

/**
 * Unsubscribes client from Web Push
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      // Notify backend
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }

    localStorage.removeItem('slipradar_push_subscribed');
    localStorage.removeItem('slipradar_push_endpoint');
    return true;
  } catch (err) {
    console.warn('[Push] Unsubscribe error:', err);
    return false;
  }
}

/**
 * Checks if browser currently has an active push subscription
 */
export async function checkPushSubscriptionState(): Promise<{
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  endpoint?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { isSubscribed: false, permission: 'unsupported' };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { isSubscribed: false, permission };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return {
      isSubscribed: !!sub,
      permission,
      endpoint: sub?.endpoint,
    };
  } catch {
    return { isSubscribed: false, permission };
  }
}

/**
 * Triggers a test push notification from the backend to verify the pipeline
 */
export async function sendTestPushNotification(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return false;

    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
