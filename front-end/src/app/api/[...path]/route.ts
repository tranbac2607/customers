import { type NextRequest, NextResponse } from 'next/server';

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

  // Forward response headers. Set-Cookie MUST pass through so the
  // browser stores the BE's auth cookies against the FE origin
  // (vercel.app), making subsequent requests same-origin/same-site
  // and avoiding third-party-cookie blocks on Chrome incognito /
  // mobile.
  const resHeaders = new Headers(res.headers);
  for (const h of HOP_BY_HOP) resHeaders.delete(h);

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
