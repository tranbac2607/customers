import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side proxy for authentication checks.
 *
 * NOTE: When the FE (Vercel) and BE (Render) are on different domains,
 * the httpOnly auth cookies set by the BE are NOT visible to this proxy
 * because the browser only sends cookies back to the same domain that
 * set them. So we cannot make a secure auth decision here.
 *
 * Auth is therefore verified client-side: the dashboard layout calls
 * /auth/me on mount. If it returns 401, the user is redirected to
 * /login. The BE is the source of truth for protected data.
 *
 * This proxy is kept as a pass-through so we can add lightweight
 * cross-cutting concerns later (logging, request IDs, geo, etc.)
 * without changing the auth architecture.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
