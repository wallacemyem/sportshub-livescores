/**
 * API & WebSocket Endpoint Resolution Helper
 * Supports direct non-standard port access (17080 / 18443) and production reverse proxy domains (games.wallacecloud.online).
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18443/api/v1';
  }
  // Direct port access
  if (window.location.port === '17080') {
    return `http://${window.location.hostname}:18443/api/v1`;
  }
  // Domain / Reverse Proxy access
  return '/api/v1';
}

export function getWsUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18443/ws';
  }
  // Direct port access
  if (window.location.port === '17080') {
    return `ws://${window.location.hostname}:18443/ws`;
  }
  // Domain / Reverse Proxy access (SSL & standard port aware)
  const isHttps = window.location.protocol === 'https:';
  const proto = isHttps ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
