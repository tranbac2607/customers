import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';
const PROTECTED_PREFIXES = ['/customers', '/dashboard'];

const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    return NextResponse.next();
  }

  // Not authenticated: redirect to /login, preserving the original path as `next`.
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every page request, except API routes, static files, and image
  // optimization. (The backend has its own auth middleware for /api/*.)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
