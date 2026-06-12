import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// BE internal URL — server-only. NOT exposed to the browser (no
// NEXT_PUBLIC_ prefix), so the BE origin never leaks into the
// client bundle. In Vercel, set this to the Render BE URL. In dev,
// defaults to localhost:4000.
const BE_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Vercel Hobby: 10s; Pro: 60s for serverless functions. Pin to 60s
// so the BE's 15s axios timeout + cold start has headroom.
export const maxDuration = 60;

// Headers we must NOT forward in either direction. RFC 7230 hop-by-hop
// headers + Host (Node fetch rejects if mismatched).
//
// Cookie is INTENTIONALLY NOT in this set: the FE-domain httpOnly
// cookies (accessToken, refreshToken) that the BE sets on login
// and refresh MUST be forwarded back to the BE on subsequent
// requests, otherwise the BE's auth middleware (which reads
// `req.cookies.accessToken`) cannot identify the user and returns
// 401 on every protected endpoint.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

// Options shape for `cookies().set()` (next/headers). Kept narrow
// to just the attributes the BE actually uses today; expand if
// the BE starts emitting others.
type SetCookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  domain?: string;
};

// Parse a single Set-Cookie value like
//   "access_token=abc; Path=/; Expires=Wed, 12 Jun 2026 …; HttpOnly; Secure; SameSite=None"
// into the (name, value, options) shape cookies().set() wants.
// Returns null for unparseable values (e.g. a cookie with no '=').
function parseSetCookie(
  raw: string,
): { name: string; value: string; options: SetCookieOptions } | null {
  const parts = raw.split(';').map((s) => s.trim());
  if (parts.length === 0) return null;
  const [pair, ...attrs] = parts;
  const eq = pair.indexOf('=');
  if (eq === -1) return null;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const options: SetCookieOptions = {};
  for (const attr of attrs) {
    const [k, v] = attr.split('=').map((s) => s.trim());
    const key = k.toLowerCase();
    if (key === 'path') options.path = v;
    else if (key === 'max-age') {
      const n = Number(v);
      if (!Number.isNaN(n)) options.maxAge = n;
    } else if (key === 'expires') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) options.expires = d;
    } else if (key === 'httponly') options.httpOnly = true;
    else if (key === 'secure') options.secure = true;
    else if (key === 'samesite') {
      const s = (v ?? 'lax').toLowerCase();
      if (s === 'lax' || s === 'strict' || s === 'none') {
        options.sameSite = s;
      }
    } else if (key === 'domain') options.domain = v;
    // Other attributes (Priority, Partitioned, …) are silently
    // dropped here. The auth cookies we care about (access_token,
    // refresh_token) only use the parsed ones.
  }
  return { name, value, options };
}

async function proxy(
  req: NextRequest,
  // Next.js 15+ makes `params` a Promise — must await before reading.
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).join('/');
  const search = req.nextUrl.search; // includes "?" if any
  const target = `${BE_BASE}/api/${path}${search}`;

  // Build forward headers. The BE relies on Cookie to authenticate
  // the user, so forward it as-is. Strip hop-by-hop and host (the
  // fetch implementation re-derives host from the target URL).
  const headers = new Headers(req.headers);
  for (const h of HOP_BY_HOP) headers.delete(h);
  // Help the BE log the original host if it cares.
  headers.set('x-forwarded-host', req.nextUrl.host);
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Next.js exposes the raw request body as a ReadableStream. Pass
    // it through so the BE sees the exact same bytes (JSON,
    // url-encoded, or multipart) the browser sent. Node's fetch
    // accepts duplex for streamed bodies.
    init.body = req.body as ReadableStream<Uint8Array> | null;
    (init as RequestInit & { duplex: 'half' }).duplex = 'half';
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    // BE unreachable, DNS fail, etc. — return 502 with our standard
    // ApiFailure shape so axios rejects cleanly instead of timing
    // out the 15s window.
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_GATEWAY', message: 'Upstream unreachable' },
      },
      { status: 502 },
    );
  }

  // Re-set the BE's cookies on the OUTGOING response via the
  // next/headers cookies() API. Forwarding them as raw `Set-Cookie`
  // response headers (the previous attempt) works in some
  // runtimes but is silently stripped on Vercel's edge layer,
  // which is why login succeeded but every subsequent request
  // came back unauthenticated on Chrome incognito / Safari /
  // mobile. Per the Next.js docs, `cookies().set()` in a Route
  // Handler is the supported path and goes through Next.js's
  // own response object, which the edge layer honors.
  const setCookies = (res.headers as Headers).getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    const cookieStore = await cookies();
    for (const raw of setCookies) {
      const parsed = parseSetCookie(raw);
      if (!parsed) continue;
      try {
        cookieStore.set(parsed.name, parsed.value, parsed.options);
      } catch {
        // Skip cookies whose attributes we can't translate
        // (e.g. SameSite=None over plain HTTP). A single bad
        // cookie must not break the whole response.
      }
    }
  }

  // Forward the rest of the response headers (status, body,
  // content-type, …). We deliberately do NOT re-append
  // `Set-Cookie` here — the next/headers cookies() call above
  // is what gets the cookies out to the browser.
  const resHeaders = new Headers(res.headers);
  for (const h of HOP_BY_HOP) resHeaders.delete(h);
  resHeaders.delete('set-cookie');

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
