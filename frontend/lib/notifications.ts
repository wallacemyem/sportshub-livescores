'use client';

// Web Audio API Chimes for Goals, Points, and Kickoff
export function playMatchAlertSound(type: 'goal' | 'kickoff' | 'point' | 'event') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'goal') {
      // Triumphant double-chime for a goal
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5

      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.35); // C6

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.6);
      osc2.stop(ctx.currentTime + 0.6);
    } else if (type === 'kickoff') {
      // Referee whistle synth
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(2600, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // Single clean chime for point/event
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (err) {
    // AudioContext blocked or not allowed until interaction
  }
}

/**
 * Request permission for native browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Dispatch a native system notification via ServiceWorker or Notification API
 */
export async function sendMatchNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
    type?: 'goal' | 'kickoff' | 'point' | 'event';
  }
) {
  if (typeof window === 'undefined') return;

  // Play audio alert
  playMatchAlertSound(options.type || 'goal');

  // Trigger browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    const notifOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: options.tag,
      data: { url: options.url || '/live' },
    };

    // Prefer ServiceWorker showNotification for cross-platform stability
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          await reg.showNotification(title, notifOptions);
          return;
        }
      } catch {
        // Fallback to Window Notification constructor
      }
    }

    try {
      const n = new Notification(title, notifOptions);
      if (options.url) {
        n.onclick = () => {
          window.focus();
          window.location.href = options.url!;
          n.close();
        };
      }
    } catch (err) {
      console.warn('[Notification] Dispatch error:', err);
    }
  }
}
