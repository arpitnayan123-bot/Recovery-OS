import { NextResponse } from "next/server";

/* ============================================================
   Gap 1: Simple in-memory rate limiter (no Redis needed)
   ============================================================ */

type RateBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateBucket>();

/** Check rate limit. Returns null if OK, or a 429 NextResponse if blocked. */
export function rateLimit(key: string, max: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count++;
  if (bucket.count > max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

/** Rate limit presets */
export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 15 * 60_000 }, // 5 attempts / 15 min
  SIGNUP: { max: 3, windowMs: 60 * 60_000 }, // 3 signups / hour
  CHAT: { max: 20, windowMs: 60_000 }, // 20 messages / min
} as const;

/* ============================================================
   Gap 6: CSRF protection — same-origin check on POST endpoints
   ============================================================ */

/** Returns true if the request origin matches the expected origin (CSRF-safe). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  // allow same-origin requests (origin matches host)
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host === host;
    } catch (e) { console.error("[origin-check]", e);
      return false;
    }
  }
  // allow requests with no origin (server-to-server, curl) in dev
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

/** Reject cross-origin POSTs. Returns null if OK, or a 403 NextResponse. */
export function csrfCheck(req: Request): NextResponse | null {
  if (req.method === "GET") return null; // GETs are safe
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  return null;
}

/* ============================================================
   Gap 5: Secure cookie options for production
   ============================================================ */

export function secureCookieOpts() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd, // only set secure flag over HTTPS in production
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
