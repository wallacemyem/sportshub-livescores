/**
 * Admin API Resolution Helper
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18443/api/v1';
  }
  // Direct port access
  if (window.location.port === '19080') {
    return `http://${window.location.hostname}:18443/api/v1`;
  }
  return '/api/v1';
}
