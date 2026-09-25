/**
 * Fixed-window rate limiting (cahier des charges section 23).
 *
 * The counters live in the process, which is enough for a single instance and
 * for slowing down scripted abuse. Behind several instances this becomes a
 * per-instance limit; the interface is kept narrow so it can be backed by
 * Redis later without touching the call sites.
 *
 * Login attempts additionally have a persistent counter on the user row, so
 * locking an account survives a restart.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

let lastSweep = 0;

function sweep(now: number): void {
  // Amortised cleanup: at most once a minute, never on every call.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}

/**
 * Best-effort client address. Trusts the proxy headers a platform sets, and
 * falls back to a constant so the limiter still groups anonymous traffic.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export const LIMITS = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  booking: { limit: 12, windowSeconds: 60 * 60 },
  proofUpload: { limit: 10, windowSeconds: 60 * 60 },
  quoteRequest: { limit: 6, windowSeconds: 60 * 60 },
  availability: { limit: 240, windowSeconds: 60 * 60 },
} as const;
