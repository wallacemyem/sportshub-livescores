/**
 * SlipRadar client-side fast cache layer
 * Provides instant 0ms resolution on initial load and preserves external API tokens & rate limits.
 */

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string, maxAgeMs: number = CACHE_TTL_MS): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`slipradar_cache_${key}`);
    if (!raw) return null;

    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    const age = Date.now() - envelope.timestamp;

    if (age > maxAgeMs) {
      return null; // Expired
    }
    return envelope.data;
  } catch (e) {
    console.warn(`[CACHE] Failed to read ${key}:`, e);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`slipradar_cache_${key}`, JSON.stringify(envelope));
  } catch (e) {
    console.warn(`[CACHE] Failed to write ${key}:`, e);
  }
}

export function clearCache(key?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) {
      localStorage.removeItem(`slipradar_cache_${key}`);
    } else {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('slipradar_cache_'));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('[CACHE] Failed to clear:', e);
  }
}
