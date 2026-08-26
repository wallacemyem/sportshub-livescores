/**
 * API & WebSocket Endpoint Resolution Helper
 * Supports direct non-standard port access and Next.js reverse proxy rewrites.
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://backend:8080/api/v1';
  }
  return '/api/v1';
}

export function getWsUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://backend:8080/ws';
  }
  const isHttps = window.location.protocol === 'https:';
  const proto = isHttps ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function getAdminUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:19080';
  }
  return `http://${window.location.hostname}:19080`;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('slipradar_auth_token');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
