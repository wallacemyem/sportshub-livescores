import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(base64Url: string): any {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('slipradar_token')?.value;
  const role = request.cookies.get('slipradar_role')?.value;
  const isAdminCookie = request.cookies.get('slipradar_is_admin')?.value;

  let isValidUser = false;
  let hasAdminRights = false;

  if (token) {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = decodeJwtPayload(parts[1]);
      if (payload && (!payload.exp || payload.exp > Date.now() / 1000)) {
        isValidUser = true;
        hasAdminRights =
          payload.is_admin === true ||
          payload.role === 'admin' ||
          role === 'admin' ||
          isAdminCookie === 'true';
      }
    }
  }

  // 1. If already logged in and visiting auth pages (login/register), redirect to /live
  if (isValidUser && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/live';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 2. Protect Admin Routes (Require Admin Token)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isValidUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!hasAdminRights) {
      const homeUrl = new URL('/live', request.url);
      homeUrl.searchParams.set('error', 'admin_access_denied');
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  // 3. Protect Blog Editor Route (Require Admin or Editor)
  if (pathname === '/blog/editor' || pathname.startsWith('/blog/editor/')) {
    if (!isValidUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!hasAdminRights) {
      const blogUrl = new URL('/blog', request.url);
      blogUrl.searchParams.set('error', 'editor_access_denied');
      return NextResponse.redirect(blogUrl);
    }
    return NextResponse.next();
  }

  // 4. Protect App Routes (/live, /match/*, /account, /pro, /support)
  const isProtectedAppRoute =
    pathname === '/live' ||
    pathname.startsWith('/live/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/pro' ||
    pathname.startsWith('/pro/') ||
    pathname === '/support' ||
    pathname.startsWith('/support/') ||
    pathname.startsWith('/match/');

  if (isProtectedAppRoute) {
    if (!isValidUser) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
